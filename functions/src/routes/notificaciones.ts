import { ensureSchema } from "../db/schema";
import { readSession } from "../auth/session";
import type { App } from "../types";
import { errorResponse } from "./helpers";

export function registerNotificacionesRoutes(app: App) {
  app.get("/api/notificaciones", async (c) => {
    await ensureSchema(c.env.DB);
    const session = await readSession(c);
    if (session?.tipo !== "jefe") return c.json(errorResponse("Acceso de administrador requerido"), 403);

    const { results } = await c.env.DB.prepare(
      `SELECT o.venta_id, o.orden_omitido, o.detectado_en_orden, o.detectado_el,
              c.nombre AS cliente, l.leido_el
       FROM venta_etapas_omisiones o
       JOIN ventas v ON v.id = o.venta_id
       JOIN clientes c ON c.id = v.cliente_id
       LEFT JOIN notificaciones_lecturas l
         ON l.usuario_id = ? AND l.venta_id = o.venta_id AND l.orden_omitido = o.orden_omitido
       WHERE o.orden_omitido = 1
       ORDER BY o.detectado_el DESC, o.venta_id DESC, o.orden_omitido DESC`,
    ).bind(session.actor_id).all();

    return c.json({ success: true, data: {
      no_leidas: results.filter((row) => row.leido_el == null).length,
      notificaciones: results,
    } });
  });

  app.post("/api/notificaciones/marcar-todas-leidas", async (c) => {
    await ensureSchema(c.env.DB);
    const session = await readSession(c);
    if (session?.tipo !== "jefe") return c.json(errorResponse("Acceso de administrador requerido"), 403);

    await c.env.DB.prepare(
      `INSERT OR IGNORE INTO notificaciones_lecturas (usuario_id, venta_id, orden_omitido)
       SELECT ?, venta_id, orden_omitido FROM venta_etapas_omisiones WHERE orden_omitido = 1`,
    ).bind(session.actor_id).run();
    return c.json({ success: true, data: null });
  });
}
