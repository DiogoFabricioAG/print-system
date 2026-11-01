import type { App } from "../types";
import { ensureSchema } from "../db/schema";
import { errorResponse } from "./helpers";
import { groupDays, limaToday, periodRange, shiftDay, summarize, type Grouping, type MetricDay } from "../metrics";

type QueryRow = { fecha?: string; centimos?: number; cantidad?: number; tipo?: string; categoria?: string; cliente_id?: number; nombre?: string; valor?: string };

export function registerMetricasRoutes(app: App) {
    app.get("/api/metricas", async c => {
        c.header("Cache-Control", "no-store");
        const today = limaToday();
        let period;
        try { period = periodRange(c.req.query("desde") ?? today.slice(0, 7) + "-01", c.req.query("hasta") ?? today); }
        catch (error) { return c.json(errorResponse(error instanceof Error ? error.message : "Rango inválido"), 400); }
        const grouping = c.req.query("agrupacion") ?? "dia";
        if (!["dia", "semana", "mes"].includes(grouping)) return c.json(errorResponse("Agrupación inválida. Usa día, semana o mes."), 400);
        await ensureSchema(c.env.DB);
        const db = c.env.DB;
        // One read batch keeps the charts and their totals on the same snapshot.
        // All date comparisons use the commercial day in Lima, inclusive.
        const results = await db.batch<QueryRow>([
            db.prepare(`WITH movimientos AS (
                SELECT pago, COALESCE(NULLIF(fecha, ''), date(creado_el, '-5 hours')) AS dia FROM ventas
            ) SELECT dia AS fecha, CAST(ROUND(SUM(pago) * 100) AS INTEGER) AS centimos, COUNT(*) AS cantidad
              FROM movimientos WHERE dia BETWEEN ? AND ? GROUP BY dia ORDER BY dia`).bind(period.anterior_inicio, period.fin),
            db.prepare(`SELECT date(fecha) AS fecha, CAST(ROUND(SUM(pago) * 100) AS INTEGER) AS centimos
              FROM pagos WHERE date(fecha) BETWEEN ? AND ? GROUP BY date(fecha)`).bind(period.anterior_inicio, period.fin),
            db.prepare(`SELECT date(creado_el, '-5 hours') AS fecha, tipo, CAST(ROUND(SUM(monto) * 100) AS INTEGER) AS centimos
              FROM compras WHERE date(creado_el, '-5 hours') BETWEEN ? AND ? GROUP BY fecha, tipo`).bind(period.anterior_inicio, period.fin),
            db.prepare(`SELECT categoria, CAST(ROUND(SUM(monto) * 100) AS INTEGER) AS centimos
              FROM compras WHERE tipo = 'GASTO' AND date(creado_el, '-5 hours') BETWEEN ? AND ?
              GROUP BY categoria ORDER BY centimos DESC, categoria`).bind(period.inicio, period.fin),
            db.prepare(`SELECT v.cliente_id, COALESCE(c.nombre, 'Cliente sin nombre') AS nombre,
                CAST(ROUND(SUM(v.pago) * 100) AS INTEGER) AS centimos, COUNT(*) AS cantidad
              FROM ventas v LEFT JOIN clientes c ON c.id = v.cliente_id
              WHERE COALESCE(NULLIF(v.fecha, ''), date(v.creado_el, '-5 hours')) BETWEEN ? AND ?
              GROUP BY v.cliente_id, c.nombre ORDER BY centimos DESC, v.cliente_id LIMIT 5`).bind(period.inicio, period.fin),
            db.prepare("SELECT valor FROM variables_negocio WHERE clave = 'costo_venta_porcentaje'"),
        ]);
        const configuredRate = results[5]?.results[0]?.valor ?? "50";
        const costRate = Number(configuredRate);
        if (!configuredRate.trim() || !Number.isFinite(costRate) || costRate < 0 || costRate > 100) {
            return c.json(errorResponse("Revisa el porcentaje de costo de venta del negocio: debe estar entre 0 y 100."), 500);
        }
        const days = new Map<string, MetricDay>();
        for (let day = period.anterior_inicio; day <= period.fin; day = shiftDay(day, 1)) {
            days.set(day, { fecha: day, ventas: 0, costo_estimado: 0, gastos: 0, utilidad: 0, cobros: 0, insumos: 0, flujo_caja: 0, cantidad: 0 });
        }
        for (const row of results[0]?.results ?? []) {
            const day = days.get(row.fecha ?? "");
            if (day) { day.ventas = row.centimos ?? 0; day.cantidad = row.cantidad ?? 0; }
        }
        for (const row of results[1]?.results ?? []) {
            const day = days.get(row.fecha ?? ""); if (day) day.cobros = row.centimos ?? 0;
        }
        for (const row of results[2]?.results ?? []) {
            const day = days.get(row.fecha ?? "");
            if (day && row.tipo === "GASTO") day.gastos = row.centimos ?? 0;
            if (day && row.tipo === "INSUMO") day.insumos = row.centimos ?? 0;
        }
        for (const day of days.values()) {
            day.costo_estimado = Math.round(day.ventas * costRate / 100);
            day.utilidad = day.ventas - day.costo_estimado - day.gastos;
            day.flujo_caja = day.cobros - day.gastos - day.insumos;
        }
        const current = [...days.values()].filter(day => day.fecha >= period.inicio);
        const previous = [...days.values()].filter(day => day.fecha < period.inicio);
        const series = groupDays(current, grouping as Grouping);
        return c.json({ success: true, data: {
            periodo: period, agrupacion: grouping, costo_porcentaje: costRate,
            resumen: summarize(current), anterior: summarize(previous), serie: series,
            domingos_omitidos: grouping === "dia" ? current.length - series.length : 0,
            gastos_categorias: (results[3]?.results ?? []).map(row => ({ categoria: row.categoria ?? "Sin categoría", monto: (row.centimos ?? 0) / 100 })),
            clientes: (results[4]?.results ?? []).map(row => ({ id: row.cliente_id, nombre: row.nombre, ventas: (row.centimos ?? 0) / 100, cantidad: row.cantidad })),
        } });
    });
}
