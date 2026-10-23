import { z } from "zod";
import { ensureSchema } from "../db/schema";
import { hashWorkerPassword, randomToken, readSession } from "../auth/session";
import type { App } from "../types";
import { errorResponse, getIdParam } from "./helpers";

const ETAPAS = ["Inicial", "Imprimir", "Planchar", "Entregado"] as const;
const cuentaSchema = z.object({
  nombre: z.string().trim().min(2).max(80),
  username: z.string().trim().min(3).max(40).regex(/^[a-zA-Z0-9._-]+$/),
  password: z.string().min(8).max(128),
  etapa_orden: z.number().int().min(0).max(3),
});

export function registerSeguimientoRoutes(app: App) {
  app.post("/api/trabajadores/cuentas", async (c) => {
    await ensureSchema(c.env.DB);
    const session = await readSession(c);
    if (session?.tipo !== "jefe") return c.json(errorResponse("Solo el jefe puede crear cuentas"), 403);
    const parsed = cuentaSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json(errorResponse("Datos de trabajador inválidos", parsed.error.flatten()), 400);
    const { nombre, username, password, etapa_orden } = parsed.data;
    const salt = randomToken();
    try {
      const result = await c.env.DB.prepare(
        `INSERT INTO usuarios (nombre, username, password, password_salt, password_alg, rol, etapa_orden)
         VALUES (?, ?, ?, ?, 'pbkdf2', 'trabajador', ?)`,
      ).bind(nombre, username, await hashWorkerPassword(password, salt), salt, etapa_orden).run();
      return c.json({ success: true, data: { id: result.meta.last_row_id, nombre, username, etapa_orden } }, 201);
    } catch (cause) {
      if (cause instanceof Error && /UNIQUE constraint failed/i.test(cause.message)) {
        return c.json(errorResponse("El usuario ya existe"), 409);
      }
      throw cause;
    }
  });

  app.get("/api/seguimiento/resumen", async (c) => {
    await ensureSchema(c.env.DB);
    const [registradas, omisiones] = await Promise.all([
      c.env.DB.prepare("SELECT venta_id, orden FROM venta_etapas_registradas ORDER BY orden").all(),
      c.env.DB.prepare("SELECT venta_id, orden_omitido, detectado_en_orden, detectado_el FROM venta_etapas_omisiones ORDER BY detectado_el").all(),
    ]);
    const bySale: Record<number, { registradas: number[]; omisiones: Array<{ etapa: string; detectada_al_registrar: string; fecha: string }> }> = {};
    for (const row of registradas.results) {
      const id = Number(row.venta_id);
      (bySale[id] ??= { registradas: [], omisiones: [] }).registradas.push(Number(row.orden));
    }
    for (const row of omisiones.results) {
      const id = Number(row.venta_id);
      (bySale[id] ??= { registradas: [], omisiones: [] }).omisiones.push({
        etapa: ETAPAS[Number(row.orden_omitido)] ?? "Desconocida",
        detectada_al_registrar: ETAPAS[Number(row.detectado_en_orden)] ?? "Desconocida",
        fecha: String(row.detectado_el),
      });
    }
    return c.json({ success: true, data: bySale });
  });

  app.get("/api/trabajador/ventas", async (c) => {
    await ensureSchema(c.env.DB);
    const session = await readSession(c);
    if (session?.tipo !== "trabajador" || session.etapa_orden == null) return c.json(errorResponse("Acceso de trabajador requerido"), 403);
    const { results } = await c.env.DB.prepare(
      `SELECT v.id, c.nombre AS cliente, v."diseño" AS diseno, v.fecha, v.creado_el,
              r.registrado_el,
              (SELECT COUNT(*) FROM venta_etapas_registradas p WHERE p.venta_id = v.id AND p.orden < ?) AS anteriores_registradas
       FROM ventas v JOIN clientes c ON c.id = v.cliente_id
       LEFT JOIN venta_etapas_registradas r ON r.venta_id = v.id AND r.orden = ?
       ORDER BY v.id DESC`,
    ).bind(session.etapa_orden, session.etapa_orden).all();
    return c.json({ success: true, data: {
      etapa: ETAPAS[session.etapa_orden],
      etapa_orden: session.etapa_orden,
      ventas: results.map((row) => ({
        ...row,
        estado: row.registrado_el ? "Registrado" : "Pendiente",
        faltantes_anteriores: session.etapa_orden! - Number(row.anteriores_registradas),
      })),
    } });
  });

  app.post("/api/trabajador/ventas/:id/registrar", async (c) => {
    await ensureSchema(c.env.DB);
    const session = await readSession(c);
    if (session?.tipo !== "trabajador" || session.etapa_orden == null) return c.json(errorResponse("Acceso de trabajador requerido"), 403);
    const id = getIdParam(c.req.param("id"));
    if (!id) return c.json(errorResponse("ID de venta inválido"), 400);
    const orden = session.etapa_orden;
    const [registro] = await c.env.DB.batch([
      c.env.DB.prepare(
        `INSERT OR IGNORE INTO venta_etapas_registradas (venta_id, orden, trabajador_id)
         SELECT id, ?, ? FROM ventas WHERE id = ?`,
      ).bind(orden, session.actor_id, id),
      c.env.DB.prepare(
        `INSERT OR IGNORE INTO venta_etapas_omisiones (venta_id, orden_omitido, detectado_en_orden)
         SELECT ?, n.orden, ? FROM (
           SELECT 0 AS orden UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3
         ) n WHERE n.orden < ?
           AND EXISTS (SELECT 1 FROM venta_etapas_registradas WHERE venta_id = ? AND orden = ?)
           AND NOT EXISTS (SELECT 1 FROM venta_etapas_registradas WHERE venta_id = ? AND orden = n.orden)`,
      ).bind(id, orden, orden, id, orden, id),
    ]);
    if (!registro?.meta.changes) return c.json(errorResponse("Venta inexistente o etapa ya registrada"), 409);
    return c.json({ success: true, data: { venta_id: id, etapa: ETAPAS[orden] } }, 201);
  });
}
