import { z } from "zod";
import { ensureSchema } from "../db/schema";
import type { App } from "../types";
import { errorResponse, getIdParam } from "./helpers";
import { syncCompraToSheets, deleteCompraFromSheets } from "../sheets";

const compraCreateSchema = z.object({
    tipo: z.enum(["INSUMO", "GASTO"]),
    categoria: z.string().min(1, "Categoría es requerida"),
    monto: z.number().positive("El monto debe ser mayor a 0"),
    notas: z.string().nullable().optional(),
});

const compraUpdateSchema = z.object({
    tipo: z.enum(["INSUMO", "GASTO"]).optional(),
    categoria: z.string().min(1).optional(),
    monto: z.number().positive().optional(),
    notas: z.string().nullable().optional(),
});

export function registerComprasRoutes(app: App) {
    app.get("/api/compras", async (c) => {
        await ensureSchema(c.env.DB);

        const { results } = await c.env.DB.prepare(
            `SELECT id, tipo, categoria, monto, notas, creado_el FROM compras ORDER BY id DESC`,
        ).all();

        return c.json({ success: true, data: results });
    });

    app.get("/api/compras/:id", async (c) => {
        await ensureSchema(c.env.DB);

        const id = getIdParam(c.req.param("id"));
        if (!id) {
            return c.json(errorResponse("ID de compra invalido"), 400);
        }

        const compra = await c.env.DB.prepare(
            `SELECT id, tipo, categoria, monto, notas, creado_el FROM compras WHERE id = ?`,
        )
            .bind(id)
            .first();

        if (!compra) {
            return c.json(errorResponse("Compra no encontrada"), 404);
        }

        return c.json({ success: true, data: compra });
    });

    app.post("/api/compras", async (c) => {
        await ensureSchema(c.env.DB);

        const rawBody = await c.req.json().catch(() => null);
        if (rawBody === null) {
            return c.json(errorResponse("JSON invalido"), 400);
        }

        const parsed = compraCreateSchema.safeParse(rawBody);
        if (!parsed.success) {
            return c.json(errorResponse("Datos invalidos", parsed.error.flatten()), 400);
        }

        const payload = parsed.data;

        const insert = await c.env.DB.prepare(
            `INSERT INTO compras (tipo, categoria, monto, notas) VALUES (?, ?, ?, ?)`,
        )
            .bind(payload.tipo, payload.categoria, payload.monto, payload.notas ?? null)
            .run();

        const created = await c.env.DB.prepare(
            `SELECT id, tipo, categoria, monto, notas, creado_el FROM compras WHERE id = ?`,
        )
            .bind(insert.meta.last_row_id)
            .first();

        if (created) {
            try {
                await syncCompraToSheets(created as any, false, c.env as any);
            } catch (e) {
                console.error("Error syncing compra to sheets:", e);
            }
        }

        return c.json({ success: true, data: created }, 201);
    });

    app.put("/api/compras/:id", async (c) => {
        await ensureSchema(c.env.DB);

        const id = getIdParam(c.req.param("id"));
        if (!id) {
            return c.json(errorResponse("ID de compra invalido"), 400);
        }

        const rawBody = await c.req.json().catch(() => null);
        if (rawBody === null) {
            return c.json(errorResponse("JSON invalido"), 400);
        }

        const parsed = compraUpdateSchema.safeParse(rawBody);
        if (!parsed.success) {
            return c.json(errorResponse("Datos invalidos", parsed.error.flatten()), 400);
        }

        const existing = await c.env.DB.prepare(
            `SELECT id, tipo, categoria, monto, notas FROM compras WHERE id = ?`,
        )
            .bind(id)
            .first<{ tipo: string; categoria: string; monto: number; notas: string }>();

        if (!existing) {
            return c.json(errorResponse("Compra no encontrada"), 404);
        }

        const pl = parsed.data;
        await c.env.DB.prepare(
            `UPDATE compras SET tipo = ?, categoria = ?, monto = ?, notas = ? WHERE id = ?`,
        )
            .bind(
                pl.tipo ?? existing.tipo,
                pl.categoria ?? existing.categoria,
                pl.monto ?? existing.monto,
                pl.notas !== undefined ? pl.notas : existing.notas,
                id,
            )
            .run();

        const updated = await c.env.DB.prepare(
            `SELECT id, tipo, categoria, monto, notas, creado_el FROM compras WHERE id = ?`,
        )
            .bind(id)
            .first();

        if (updated) {
            try {
                await syncCompraToSheets(updated as any, true, c.env as any);
            } catch (e) {
                console.error("Error syncing compra to sheets:", e);
            }
        }

        return c.json({ success: true, data: updated });
    });

    app.delete("/api/compras/:id", async (c) => {
        await ensureSchema(c.env.DB);

        const id = getIdParam(c.req.param("id"));
        if (!id) {
            return c.json(errorResponse("ID de compra invalido"), 400);
        }

        const compra = await c.env.DB.prepare("SELECT id, tipo FROM compras WHERE id = ?")
            .bind(id)
            .first<{ id: number; tipo: string }>();

        if (!compra) {
            return c.json(errorResponse("Compra no encontrada"), 404);
        }

        await c.env.DB.prepare("DELETE FROM compras WHERE id = ?")
            .bind(id)
            .run();

        try {
            await deleteCompraFromSheets(compra.id, compra.tipo, c.env as any);
        } catch (e) {
            console.error("Error deleting compra from sheets:", e);
        }

        return c.json({ success: true });
    });
}
