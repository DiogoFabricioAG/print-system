import { z } from "zod";
import { ensureSchema } from "../db/schema";
import type { App } from "../types";
import { errorResponse, getIdParam } from "./helpers";
import { syncSaleToSheets, deleteSaleFromSheets } from "../sheets";

const ventaCreateSchema = z.object({
    diseno: z.string().min(1),
    cliente_id: z.number().int().positive(),
    cantidad: z.string().nullable().optional(),
    metro_total: z.number().nullable().optional(),
    maquina: z.string().nullable().optional(),
    pago: z.number(),
    metodo_pago: z.enum(["Yape", "Efectivo"]).optional(),
    estado: z.string().nullable().optional(),
    nota: z.string().nullable().optional(),
    fecha: z.string().nullable().optional(),
});

interface SaleSheetRecord {
    id: number;
    cliente_nombre: string | null;
    diseno: string;
    cantidad: string | null;
    metro_total: number | null;
    maquina: string | null;
    pago: number;
    metodo_pago: "Yape" | "Efectivo";
    estado: string | null;
    nota: string | null;
    creado_el: string;
}

export function registerVentasRoutes(app: App) {
    app.get("/api/ventas", async (c) => {
        await ensureSchema(c.env.DB);

        const { results } = await c.env.DB.prepare(
            `SELECT
				v.id,
				v."diseño" AS diseno,
				v.cliente_id,
				c.nombre AS cliente_nombre,
				v.cantidad,
				v.metro_total,
				v.maquina,
				v.pago,
                v.metodo_pago,
				v.estado,
				v.nota,
				v.creado_el,
                v.fecha
			FROM ventas v
			LEFT JOIN clientes c ON c.id = v.cliente_id
			ORDER BY v.id DESC`,
        ).all();

        return c.json({ success: true, data: results });
    });

    app.get("/api/ventas/:id", async (c) => {
        await ensureSchema(c.env.DB);

        const id = getIdParam(c.req.param("id"));
        if (!id) {
            return c.json(errorResponse("ID de venta invalido"), 400);
        }

        const venta = await c.env.DB.prepare(
            `SELECT
				v.id,
				v."diseño" AS diseno,
				v.cliente_id,
				c.nombre AS cliente_nombre,
				v.cantidad,
				v.metro_total,
				v.maquina,
				v.pago,
                v.metodo_pago,
				v.estado,
				v.nota,
				v.creado_el,
                v.fecha
			FROM ventas v
			LEFT JOIN clientes c ON c.id = v.cliente_id
			WHERE v.id = ?`,
        )
            .bind(id)
            .first<SaleSheetRecord>();

        if (!venta) {
            return c.json(errorResponse("Venta no encontrada"), 404);
        }

        return c.json({ success: true, data: venta });
    });

    app.post("/api/ventas", async (c) => {
        await ensureSchema(c.env.DB);

        const rawBody = await c.req.json().catch(() => null);
        if (rawBody === null) {
            return c.json(errorResponse("JSON invalido"), 400);
        }

        const parsed = ventaCreateSchema.safeParse(rawBody);
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
                `INSERT INTO ventas
                ("diseño", cliente_id, cantidad, metro_total, maquina, pago, estado, nota, fecha, metodo_pago)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            )
                .bind(
                    payload.diseno,
                    payload.cliente_id,
                    payload.cantidad ?? null,
                    payload.metro_total ?? null,
                    payload.maquina ?? null,
                    payload.pago,
                    payload.estado ?? null,
                    payload.nota ?? null,
                    payload.fecha,
                    payload.metodo_pago ?? "Yape"
                )
                .run();
        } else {
            insert = await c.env.DB.prepare(
                `INSERT INTO ventas
                ("diseño", cliente_id, cantidad, metro_total, maquina, pago, estado, nota, metodo_pago)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
            )
                .bind(
                    payload.diseno,
                    payload.cliente_id,
                    payload.cantidad ?? null,
                    payload.metro_total ?? null,
                    payload.maquina ?? null,
                    payload.pago,
                    payload.estado ?? null,
                    payload.nota ?? null,
                    payload.metodo_pago ?? "Yape"
                )
                .run();
        }

        const created = await c.env.DB.prepare(
            `SELECT
				v.id,
				v."diseño" AS diseno,
				v.cliente_id,
				c.nombre AS cliente_nombre,
				v.cantidad,
				v.metro_total,
				v.maquina,
				v.pago,
                v.metodo_pago,
				v.estado,
				v.nota,
				v.creado_el,
                v.fecha
			FROM ventas v
			LEFT JOIN clientes c ON c.id = v.cliente_id
			WHERE v.id = ?`,
        )
            .bind(insert.meta.last_row_id)
            .first<SaleSheetRecord>();

        if (created) {
            try {
                await syncSaleToSheets(created.cliente_nombre ?? "", {
                    id: created.id,
                    diseno: created.diseno,
                    cantidad: created.cantidad ?? undefined,
                    metro_total: created.metro_total ?? undefined,
                    maquina: created.maquina ?? undefined,
                    pago: created.pago,
                    estado: created.estado ?? undefined,
                    nota: created.nota ?? undefined,
                    creado_el: created.creado_el,
                }, false, c.env as any);
            } catch (e) {
                console.error("Error syncing to sheets:", e);
            }
        }

        return c.json({ success: true, data: created }, 201);
    });

    app.put("/api/ventas/:id", async (c) => {
        await ensureSchema(c.env.DB);

        const id = getIdParam(c.req.param("id"));
        if (!id) {
            return c.json(errorResponse("ID de venta invalido"), 400);
        }

        const rawBody = await c.req.json().catch(() => null);
        if (rawBody === null) {
            return c.json(errorResponse("JSON invalido"), 400);
        }

        const parsed = ventaCreateSchema.safeParse(rawBody);
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

        let result;
        if (payload.fecha !== undefined) {
             result = await c.env.DB.prepare(
                `UPDATE ventas
                SET "diseño" = ?, cliente_id = ?, cantidad = ?, metro_total = ?, maquina = ?, pago = ?, estado = ?, nota = ?, metodo_pago = COALESCE(?, metodo_pago), fecha = ?
                WHERE id = ?`
            )
                .bind(
                    payload.diseno,
                    payload.cliente_id,
                    payload.cantidad ?? null,
                    payload.metro_total ?? null,
                    payload.maquina ?? null,
                    payload.pago,
                    payload.estado ?? null,
                    payload.nota ?? null,
                    payload.metodo_pago ?? null,
                    payload.fecha ?? null,
                    id
                )
                .run();
        } else {
             result = await c.env.DB.prepare(
                `UPDATE ventas
                SET "diseño" = ?, cliente_id = ?, cantidad = ?, metro_total = ?, maquina = ?, pago = ?, estado = ?, nota = ?, metodo_pago = COALESCE(?, metodo_pago)
                WHERE id = ?`
            )
                .bind(
                    payload.diseno,
                    payload.cliente_id,
                    payload.cantidad ?? null,
                    payload.metro_total ?? null,
                    payload.maquina ?? null,
                    payload.pago,
                    payload.estado ?? null,
                    payload.nota ?? null,
                    payload.metodo_pago ?? null,
                    id
                )
                .run();
        }

        if (!result.meta.changes) {
            return c.json(errorResponse("Venta no encontrada"), 404);
        }

        const updated = await c.env.DB.prepare(
            `SELECT
				v.id,
				v."diseño" AS diseno,
				v.cliente_id,
				c.nombre AS cliente_nombre,
				v.cantidad,
				v.metro_total,
				v.maquina,
				v.pago,
                v.metodo_pago,
				v.estado,
				v.nota,
				v.creado_el,
                v.fecha
			FROM ventas v
			LEFT JOIN clientes c ON c.id = v.cliente_id
			WHERE v.id = ?`,
        )
            .bind(id)
            .first<SaleSheetRecord>();

        if (updated) {
            try {
                await syncSaleToSheets(updated.cliente_nombre ?? "", {
                    id: updated.id,
                    diseno: updated.diseno,
                    cantidad: updated.cantidad ?? undefined,
                    metro_total: updated.metro_total ?? undefined,
                    maquina: updated.maquina ?? undefined,
                    pago: updated.pago,
                    estado: updated.estado ?? undefined,
                    nota: updated.nota ?? undefined,
                    creado_el: updated.creado_el,
                }, true, c.env as any);
            } catch (e) {
                console.error("Error syncing to sheets:", e);
            }
        }

        return c.json({ success: true, data: updated });
    });

    app.delete("/api/ventas/:id", async (c) => {
        await ensureSchema(c.env.DB);

        const id = getIdParam(c.req.param("id"));
        if (!id) {
            return c.json(errorResponse("ID de venta invalido"), 400);
        }

        const venta = await c.env.DB.prepare(
            `SELECT v.id, v."diseño" AS diseno, v.cliente_id, v.cantidad, v.metro_total, v.maquina, v.pago,
                v.metodo_pago, v.estado, v.nota, v.creado_el, v.fecha, c.nombre AS cliente_nombre FROM ventas v LEFT JOIN clientes c ON c.id = v.cliente_id WHERE v.id = ?`,
        )
            .bind(id)
            .first<SaleSheetRecord>();

        if (!venta) {
            return c.json(errorResponse("Venta no encontrada"), 404);
        }

        const result = await c.env.DB.prepare("DELETE FROM ventas WHERE id = ?")
            .bind(id)
            .run();

        if (!result.meta.changes) {
            return c.json(errorResponse("Venta no encontrada"), 404);
        }

        if (venta) {
            try {
                await deleteSaleFromSheets(venta.cliente_nombre ?? "", venta.id, c.env as any);
            } catch (e) {
                console.error("Error deleting from sheets:", e);
            }
        }

        return c.json({ success: true });
    });
}
