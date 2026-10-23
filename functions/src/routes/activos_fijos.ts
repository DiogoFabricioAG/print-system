import { z } from "zod";
import { ensureSchema } from "../db/schema";
import type { App } from "../types";
import { errorResponse, getIdParam } from "./helpers";

const activoCreateSchema = z.object({
    nombre: z.string().min(1),
    valor_compra: z.number().positive(),
    tasa_depreciacion_anual: z.number().min(0).max(1),
    fecha_compra: z.string(),
});

export function registerActivosFijosRoutes(app: App) {
    app.get("/api/activos-fijos", async (c) => {
        await ensureSchema(c.env.DB);
        const { results } = await c.env.DB.prepare(
            `SELECT id, nombre, valor_compra, tasa_depreciacion_anual, fecha_compra FROM activos_fijos ORDER BY id DESC`,
        ).all();
        return c.json({ success: true, data: results });
    });

    app.post("/api/activos-fijos", async (c) => {
        await ensureSchema(c.env.DB);
        const rawBody = await c.req.json().catch(() => null);
        if (!rawBody) return c.json(errorResponse("JSON invalido"), 400);

        const parsed = activoCreateSchema.safeParse(rawBody);
        if (!parsed.success) return c.json(errorResponse("Datos invalidos", parsed.error.flatten()), 400);

        const pl = parsed.data;
        const insert = await c.env.DB.prepare(
            `INSERT INTO activos_fijos (nombre, valor_compra, tasa_depreciacion_anual, fecha_compra) VALUES (?, ?, ?, ?)`,
        ).bind(pl.nombre, pl.valor_compra, pl.tasa_depreciacion_anual, pl.fecha_compra).run();

        const created = await c.env.DB.prepare(
            `SELECT id, nombre, valor_compra, tasa_depreciacion_anual, fecha_compra FROM activos_fijos WHERE id = ?`,
        ).bind(insert.meta.last_row_id).first();

        return c.json({ success: true, data: created }, 201);
    });

    app.put("/api/activos-fijos/:id", async (c) => {
        await ensureSchema(c.env.DB);
        const id = getIdParam(c.req.param("id"));
        if (!id) return c.json(errorResponse("ID invalido"), 400);

        const rawBody = await c.req.json().catch(() => null);
        if (!rawBody) return c.json(errorResponse("JSON invalido"), 400);

        const existing = await c.env.DB.prepare(
            `SELECT nombre, valor_compra, tasa_depreciacion_anual, fecha_compra FROM activos_fijos WHERE id = ?`,
        ).bind(id).first<{ nombre: string; valor_compra: number; tasa_depreciacion_anual: number; fecha_compra: string }>();

        if (!existing) return c.json(errorResponse("Activo no encontrado"), 404);

        await c.env.DB.prepare(
            `UPDATE activos_fijos SET nombre=?, valor_compra=?, tasa_depreciacion_anual=?, fecha_compra=? WHERE id=?`,
        ).bind(
            rawBody.nombre ?? existing.nombre,
            rawBody.valor_compra ?? existing.valor_compra,
            rawBody.tasa_depreciacion_anual ?? existing.tasa_depreciacion_anual,
            rawBody.fecha_compra ?? existing.fecha_compra,
            id,
        ).run();

        const updated = await c.env.DB.prepare(
            `SELECT id, nombre, valor_compra, tasa_depreciacion_anual, fecha_compra FROM activos_fijos WHERE id = ?`,
        ).bind(id).first();

        return c.json({ success: true, data: updated });
    });

    app.delete("/api/activos-fijos/:id", async (c) => {
        await ensureSchema(c.env.DB);
        const id = getIdParam(c.req.param("id"));
        if (!id) return c.json(errorResponse("ID invalido"), 400);

        const exists = await c.env.DB.prepare("SELECT id FROM activos_fijos WHERE id=?").bind(id).first();
        if (!exists) return c.json(errorResponse("Activo no encontrado"), 404);

        await c.env.DB.prepare("DELETE FROM activos_fijos WHERE id=?").bind(id).run();
        return c.json({ success: true });
    });
}
