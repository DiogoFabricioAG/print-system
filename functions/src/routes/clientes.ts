import { z } from "zod";
import { ensureSchema } from "../db/schema";
import type { App } from "../types";
import { errorResponse, getIdParam } from "./helpers";
import { syncSaleToSheets, deleteSaleFromSheets } from "../sheets";
import { createClientSheet } from "../sheets";

const clienteCreateSchema = z.object({
    nombre: z.string().min(1),
    numero: z.number().int().nullable().optional(),
    descripcion: z.string().nullable().optional(),
});

export function registerClientesRoutes(app: App) {
    app.get("/api/clientes", async (c) => {
        await ensureSchema(c.env.DB);

        const { results } = await c.env.DB.prepare(
            "SELECT id, nombre, numero, descripcion, creado_el FROM clientes ORDER BY id DESC",
        ).all();

        return c.json({ success: true, data: results });
    });

    app.get("/api/clientes/:id", async (c) => {
        await ensureSchema(c.env.DB);

        const id = getIdParam(c.req.param("id"));
        if (!id) {
            return c.json(errorResponse("ID de cliente invalido"), 400);
        }

        const cliente = await c.env.DB.prepare(
            "SELECT id, nombre, numero, descripcion, creado_el FROM clientes WHERE id = ?",
        )
            .bind(id)
            .first();

        if (!cliente) {
            return c.json(errorResponse("Cliente no encontrado"), 404);
        }

        return c.json({ success: true, data: cliente });
    });

    app.post("/api/clientes", async (c) => {
        await ensureSchema(c.env.DB);

        const rawBody = await c.req.json().catch(() => null);
        if (rawBody === null) {
            return c.json(errorResponse("JSON invalido"), 400);
        }

        const parsed = clienteCreateSchema.safeParse(rawBody);
        if (!parsed.success) {
            return c.json(errorResponse("Datos invalidos", parsed.error.flatten()), 400);
        }

        const payload = parsed.data;
        const insert = await c.env.DB.prepare(
            "INSERT INTO clientes (nombre, numero, descripcion) VALUES (?, ?, ?)",
        )
            .bind(payload.nombre, payload.numero ?? null, payload.descripcion ?? null)
            .run();

        const created = await c.env.DB.prepare(
            "SELECT id, nombre, numero, descripcion, creado_el FROM clientes WHERE id = ?",
        )
            .bind(insert.meta.last_row_id)
            .first<{ nombre: string }>();

        if (created) {
            try {
                await createClientSheet(created.nombre, c.env as any);
            } catch (e) {
                console.error("Error creating client sheet:", e);
            }
        }

        return c.json({ success: true, data: created }, 201);
    });

    app.put("/api/clientes/:id", async (c) => {
        await ensureSchema(c.env.DB);

        const id = getIdParam(c.req.param("id"));
        if (!id) {
            return c.json(errorResponse("ID de cliente invalido"), 400);
        }

        const rawBody = await c.req.json().catch(() => null);
        if (rawBody === null) {
            return c.json(errorResponse("JSON invalido"), 400);
        }

        const parsed = clienteCreateSchema.safeParse(rawBody);
        if (!parsed.success) {
            return c.json(errorResponse("Datos invalidos", parsed.error.flatten()), 400);
        }

        const payload = parsed.data;
        const result = await c.env.DB.prepare(
            "UPDATE clientes SET nombre = ?, numero = ?, descripcion = ? WHERE id = ?",
        )
            .bind(payload.nombre, payload.numero ?? null, payload.descripcion ?? null, id)
            .run();

        if (!result.meta.changes) {
            return c.json(errorResponse("Cliente no encontrado"), 404);
        }

        const updated = await c.env.DB.prepare(
            "SELECT id, nombre, numero, descripcion, creado_el FROM clientes WHERE id = ?",
        )
            .bind(id)
            .first();

        return c.json({ success: true, data: updated });
    });

    app.get("/api/clientes/:id/detalle", async (c) => {
        await ensureSchema(c.env.DB);

        const id = getIdParam(c.req.param("id"));
        if (!id) {
            return c.json(errorResponse("ID de cliente invalido"), 400);
        }

        const cliente = await c.env.DB.prepare(
            "SELECT id, nombre, numero, descripcion, creado_el FROM clientes WHERE id = ?",
        )
            .bind(id)
            .first();

        if (!cliente) {
            return c.json(errorResponse("Cliente no encontrado"), 404);
        }

        const clienteId = cliente.id;

        const totalVentasResult = await c.env.DB.prepare(
            "SELECT COALESCE(SUM(pago), 0) as total FROM ventas WHERE cliente_id = ?",
        ).bind(clienteId).first() as { total: number };

        const totalPagosResult = await c.env.DB.prepare(
            "SELECT COALESCE(SUM(pago), 0) as total FROM pagos WHERE cliente_id = ?",
        ).bind(clienteId).first() as { total: number };

        const ultimaCompraResult = await c.env.DB.prepare(
            "SELECT MAX(COALESCE(fecha, date(creado_el, '-5 hours'))) as ultima FROM ventas WHERE cliente_id = ?",
        ).bind(clienteId).first() as { ultima: string | null };

        const ultimoPagoResult = await c.env.DB.prepare(
            "SELECT MAX(COALESCE(fecha, date('now'))) as ultimo FROM pagos WHERE cliente_id = ?",
        ).bind(clienteId).first() as { ultimo: string | null };

        const debeResult = await c.env.DB.prepare(
            "SELECT COUNT(*) as count FROM ventas WHERE cliente_id = ? AND (estado = 'Debe' OR estado = 'Crédito')",
        ).bind(clienteId).first() as { count: number };

        const historialResult = await c.env.DB.prepare(`
            SELECT
                'venta' as tipo,
                id,
                "diseño" AS descripcion,
                pago as deuda,
                0 as pago,
                COALESCE(fecha, date(creado_el, '-5 hours')) AS fecha
            FROM ventas
            WHERE cliente_id = ?

            UNION ALL

            SELECT
                'pago' as tipo,
                id,
                COALESCE(nota, 'Abono') AS descripcion,
                0 as deuda,
                pago as pago,
                fecha
            FROM pagos
            WHERE cliente_id = ?

            ORDER BY fecha DESC
        `).bind(clienteId, clienteId).all();

        let diasDesdeUltimaCompra = 0;
        if (ultimaCompraResult?.ultima) {
            const ultimaFecha = new Date(ultimaCompraResult.ultima);
            const hoy = new Date();
            const diffMs = hoy.getTime() - ultimaFecha.getTime();
            diasDesdeUltimaCompra = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        }

        let diasDesdeUltimoPago = 0;
        if (ultimoPagoResult?.ultimo) {
            const ultimoPagoFecha = new Date(ultimoPagoResult.ultimo);
            const hoy = new Date();
            const diffMs = hoy.getTime() - ultimoPagoFecha.getTime();
            diasDesdeUltimoPago = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        }

        const totalVentas = totalVentasResult?.total ?? 0;
        const totalPagos = totalPagosResult?.total ?? 0;

        const metricas = {
            total_ventas: totalVentas,
            total_pagos: totalPagos,
            ultima_compra: ultimaCompraResult?.ultima ?? null,
            dias_desde_ultima_compra: diasDesdeUltimaCompra,
            ultimo_pago: ultimoPagoResult?.ultimo ?? null,
            dias_desde_ultimo_pago: diasDesdeUltimoPago,
            debe: (totalVentas - totalPagos) > 0.01,
        };

        const historial = (historialResult.results ?? []).map((v: any) => ({
            tipo: v.tipo,
            id: v.id,
            descripcion: v.descripcion,
            deuda: v.deuda,
            pago: v.pago,
            fecha: v.fecha,
        }));

        return c.json({
            success: true,
            data: {
                ...cliente,
                metricas,
                historial,
            },
        });
    });

    app.delete("/api/clientes/:id", async (c) => {
        await ensureSchema(c.env.DB);

        const id = getIdParam(c.req.param("id"));
        if (!id) {
            return c.json(errorResponse("ID de cliente invalido"), 400);
        }

        const result = await c.env.DB.prepare("DELETE FROM clientes WHERE id = ?")
            .bind(id)
            .run();

        if (!result.meta.changes) {
            return c.json(errorResponse("Cliente no encontrado"), 404);
        }

        return c.json({ success: true });
    });
}
