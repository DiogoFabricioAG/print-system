import { z } from "zod";
import { ensureSchema } from "../db/schema";
import type { App } from "../types";
import { errorResponse, getIdParam } from "./helpers";

const variableCreateSchema = z.object({
    clave: z.string().min(1),
    valor: z.string().min(1),
});

export function registerVariablesRoutes(app: App) {
    app.get("/api/variables-negocio", async (c) => {
        await ensureSchema(c.env.DB);
        const { results } = await c.env.DB.prepare(
            `SELECT id, clave, valor FROM variables_negocio ORDER BY id`,
        ).all();
        return c.json({ success: true, data: results });
    });

    app.get("/api/variables-negocio/:clave", async (c) => {
        await ensureSchema(c.env.DB);
        const clave = c.req.param("clave");
        const row = await c.env.DB.prepare(
            `SELECT id, clave, valor FROM variables_negocio WHERE clave = ?`,
        ).bind(clave).first();

        if (!row) return c.json(errorResponse("Variable no encontrada"), 404);
        return c.json({ success: true, data: row });
    });

    app.post("/api/variables-negocio", async (c) => {
        await ensureSchema(c.env.DB);
        const rawBody = await c.req.json().catch(() => null);
        if (!rawBody) return c.json(errorResponse("JSON invalido"), 400);

        const parsed = variableCreateSchema.safeParse(rawBody);
        if (!parsed.success) return c.json(errorResponse("Datos invalidos", parsed.error.flatten()), 400);

        const pl = parsed.data;
        const insert = await c.env.DB.prepare(
            `INSERT INTO variables_negocio (clave, valor) VALUES (?, ?)`,
        ).bind(pl.clave, pl.valor).run();

        const created = await c.env.DB.prepare(
            `SELECT id, clave, valor FROM variables_negocio WHERE id = ?`,
        ).bind(insert.meta.last_row_id).first();

        return c.json({ success: true, data: created }, 201);
    });

    app.put("/api/variables-negocio/:clave", async (c) => {
        await ensureSchema(c.env.DB);
        const clave = c.req.param("clave");

        const rawBody = await c.req.json().catch(() => null);
        if (!rawBody) return c.json(errorResponse("JSON invalido"), 400);

        const existing = await c.env.DB.prepare(
            `SELECT id FROM variables_negocio WHERE clave = ?`,
        ).bind(clave).first();

        if (!existing) return c.json(errorResponse("Variable no encontrada"), 404);

        await c.env.DB.prepare(
            `UPDATE variables_negocio SET valor = ? WHERE clave = ?`,
        ).bind(rawBody.valor, clave).run();

        const updated = await c.env.DB.prepare(
            `SELECT id, clave, valor FROM variables_negocio WHERE clave = ?`,
        ).bind(clave).first();

        return c.json({ success: true, data: updated });
    });

    app.delete("/api/variables-negocio/:clave", async (c) => {
        await ensureSchema(c.env.DB);
        const clave = c.req.param("clave");

        const existing = await c.env.DB.prepare(
            `SELECT id FROM variables_negocio WHERE clave = ?`,
        ).bind(clave).first();

        if (!existing) return c.json(errorResponse("Variable no encontrada"), 404);

        await c.env.DB.prepare("DELETE FROM variables_negocio WHERE clave = ?").bind(clave).run();
        return c.json({ success: true });
    });
}
