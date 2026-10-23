import { z } from "zod";
import { ensureSchema } from "../db/schema";
import type { App } from "../types";
import { errorResponse, getIdParam } from "./helpers";

const pagoCreateSchema = z.object({
    cliente_id: z.number().int().positive(),
    pago: z.number().positive(),
    nota: z.string().nullable().optional(),
    fecha: z.string().nullable().optional(),
});

export function registerPagosRoutes(app: App) {
    app.get("/api/pagos", async (c) => {
        await ensureSchema(c.env.DB);

        const { results } = await c.env.DB.prepare(
            `SELECT p.id, p.cliente_id, c.nombre as cliente_nombre, p.pago, p.nota, p.fecha
             FROM pagos p
             LEFT JOIN clientes c ON c.id = p.cliente_id
             ORDER BY p.id DESC`
        ).all();

        return c.json({ success: true, data: results });
    });

    app.post("/api/pagos", async (c) => {
        await ensureSchema(c.env.DB);

        const rawBody = await c.req.json().catch(() => null);
        if (rawBody === null) {
            return c.json(errorResponse("JSON invalido"), 400);
        }

        const parsed = pagoCreateSchema.safeParse(rawBody);
        if (!parsed.success) {
            return c.json(errorResponse("Datos invalidos", parsed.error.flatten()), 400);
        }

        const payload = parsed.data;
        const clienteExiste = await c.env.DB.prepare("SELECT id FROM clientes WHERE id = ?")
            .bind(payload.cliente_id)
            .first();

        if (!clienteExiste) {
            return c.json(errorResponse("cliente_id no existe"), 400);
        }

        let insert;
        if (payload.fecha) {
            insert = await c.env.DB.prepare(
                "INSERT INTO pagos (cliente_id, pago, nota, fecha) VALUES (?, ?, ?, ?)"
            ).bind(payload.cliente_id, payload.pago, payload.nota ?? null, payload.fecha).run();
        } else {
            insert = await c.env.DB.prepare(
                "INSERT INTO pagos (cliente_id, pago, nota) VALUES (?, ?, ?)"
            ).bind(payload.cliente_id, payload.pago, payload.nota ?? null).run();
        }

        const created = await c.env.DB.prepare(
            `SELECT p.id, p.cliente_id, c.nombre as cliente_nombre, p.pago, p.nota, p.fecha
             FROM pagos p
             LEFT JOIN clientes c ON c.id = p.cliente_id
             WHERE p.id = ?`
        ).bind(insert.meta.last_row_id).first();

        return c.json({ success: true, data: created }, 201);
    });

    app.put("/api/pagos/:id", async (c) => {
        await ensureSchema(c.env.DB);

        const id = getIdParam(c.req.param("id"));
        if (!id) {
            return c.json(errorResponse("ID de pago invalido"), 400);
        }

        const rawBody = await c.req.json().catch(() => null);
        if (rawBody === null) {
            return c.json(errorResponse("JSON invalido"), 400);
        }

        const parsed = pagoCreateSchema.safeParse(rawBody);
        if (!parsed.success) {
            return c.json(errorResponse("Datos invalidos", parsed.error.flatten()), 400);
        }

        const payload = parsed.data;
        let result;

        if (payload.fecha !== undefined) {
            result = await c.env.DB.prepare(
                "UPDATE pagos SET cliente_id = ?, pago = ?, nota = ?, fecha = ? WHERE id = ?"
            ).bind(payload.cliente_id, payload.pago, payload.nota ?? null, payload.fecha ?? null, id).run();
        } else {
            result = await c.env.DB.prepare(
                "UPDATE pagos SET cliente_id = ?, pago = ?, nota = ? WHERE id = ?"
            ).bind(payload.cliente_id, payload.pago, payload.nota ?? null, id).run();
        }

        if (!result.meta.changes) {
            return c.json(errorResponse("Pago no encontrado"), 404);
        }

        const updated = await c.env.DB.prepare(
            `SELECT p.id, p.cliente_id, c.nombre as cliente_nombre, p.pago, p.nota, p.fecha
             FROM pagos p
             LEFT JOIN clientes c ON c.id = p.cliente_id
             WHERE p.id = ?`
        ).bind(id).first();

        return c.json({ success: true, data: updated });
    });

    app.delete("/api/pagos/:id", async (c) => {
        await ensureSchema(c.env.DB);

        const id = getIdParam(c.req.param("id"));
        if (!id) {
            return c.json(errorResponse("ID de pago invalido"), 400);
        }

        const result = await c.env.DB.prepare("DELETE FROM pagos WHERE id = ?").bind(id).run();

        if (!result.meta.changes) {
            return c.json(errorResponse("Pago no encontrado"), 404);
        }

        return c.json({ success: true });
    });
}
