import { ensureSchema } from "../db/schema";
import type { App } from "../types";

function getDateRange(filtro: string) {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Lima",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
    const fin = `${values.year}-${values.month}-${values.day}`;
    const inicioDate = new Date(`${fin}T12:00:00Z`);

    switch (filtro) {
        case "semana": {
            inicioDate.setUTCDate(inicioDate.getUTCDate() - 6);
            break;
        }
        case "mes": {
            inicioDate.setUTCDate(1);
            break;
        }
        case "anual": {
            inicioDate.setUTCMonth(0, 1);
            break;
        }
        default:
            throw new Error("filtro_tiempo invalido. Usar: semana, mes, anual");
    }
    return { inicio: inicioDate.toISOString().slice(0, 10), fin };
}

function pct(valor: number, base: number): number {
    if (base === 0) return 0;
    return Math.round((valor / base) * 10000) / 100;
}

export function registerEstadoResultados(app: App) {
    app.get("/api/estado-resultados", async (c) => {
        await ensureSchema(c.env.DB);

        const filtro = c.req.query("filtro_tiempo") || "mes";
        if (!["semana", "mes", "anual"].includes(filtro)) {
            return c.json({ error: "filtro_tiempo invalido. Usar: semana, mes, anual" }, 400);
        }

        const { inicio, fin } = getDateRange(filtro);

        // 1. Ventas Totales
        const ventasResult = await c.env.DB.prepare(
            `SELECT COALESCE(SUM(pago), 0) as total FROM ventas WHERE COALESCE(fecha, date(creado_el, '-5 hours')) >= ? AND COALESCE(fecha, date(creado_el, '-5 hours')) <= ?`,
        ).bind(inicio, fin).first<{ total: number }>();
        const ventasTotales = ventasResult?.total ?? 0;

        // 2. Costo de Ventas — usa variable_negocio costo_venta_porcentaje
        const costoVar = await c.env.DB.prepare(
            `SELECT valor FROM variables_negocio WHERE clave = 'costo_venta_porcentaje'`,
        ).first<{ valor: string }>();
        const costoPct = costoVar?.valor ? parseFloat(costoVar.valor) / 100 : 0.5;
        const costoVentas = Math.round(ventasTotales * costoPct * 100) / 100;

        // 3. Utilidad Bruta
        const utilidadBruta = ventasTotales - costoVentas;

        // 4. Gastos Operativos (compras tipo GASTO) agrupados por categoria
        const gastosResult = await c.env.DB.prepare(
            `SELECT categoria, COALESCE(SUM(monto), 0) as total FROM compras WHERE tipo = 'GASTO' AND date(creado_el, '-5 hours') >= ? AND date(creado_el, '-5 hours') <= ? GROUP BY categoria`,
        ).bind(inicio, fin).all();
        const gastosRows = gastosResult.results as { categoria: string; total: number }[];

        let gastosAdminTotal = 0;
        let gastosVentasTotal = 0;
        const gastosAdmin: { categoria: string; monto: number; pct: number }[] = [];
        const gastosVentas: { categoria: string; monto: number; pct: number }[] = [];

        for (const row of gastosRows) {
            const monto = row.total;
            if (row.categoria === "Alquiler" || row.categoria === "Servicios") {
                gastosAdminTotal += monto;
                gastosAdmin.push({ categoria: row.categoria, monto, pct: pct(monto, ventasTotales) });
            } else {
                // Publicidad, Mantenimiento, Transporte, Personal, Otros → Gastos de Ventas/Administración
                // Asignamos a gastos de ventas según requerimiento: Publicidad -> Ventas, el resto a Admin
                if (row.categoria === "Publicidad") {
                    gastosVentasTotal += monto;
                    gastosVentas.push({ categoria: row.categoria, monto, pct: pct(monto, ventasTotales) });
                } else {
                    gastosAdminTotal += monto;
                    gastosAdmin.push({ categoria: row.categoria, monto, pct: pct(monto, ventasTotales) });
                }
            }
        }

        // 5. Depreciación
        const activosResult = await c.env.DB.prepare(
            `SELECT id, nombre, valor_compra, tasa_depreciacion_anual, fecha_compra FROM activos_fijos`,
        ).all();
        const activosRows = activosResult.results as { id: number; nombre: string; valor_compra: number; tasa_depreciacion_anual: number; fecha_compra: string }[];

        let depreciacionTotal = 0;
        const depreciacionDetalle: { nombre: string; monto: number; pct: number }[] = [];

        const inicioDate = new Date(inicio + "T00:00:00");
        const finDate = new Date(fin + "T23:59:59");

        for (const activo of activosRows) {
            const depMensual = (activo.valor_compra * activo.tasa_depreciacion_anual) / 12;
            let depPeriodo = 0;

            switch (filtro) {
                case "anual":
                    depPeriodo = depMensual * 12;
                    break;
                case "mes":
                    depPeriodo = depMensual;
                    break;
                case "semana":
                    depPeriodo = depMensual / 4.34524;
                    break;
            }

            const fechaCompra = new Date(activo.fecha_compra + "T00:00:00");
            if (fechaCompra > inicioDate) {
                // Activo comprado dentro del período: prorratear
                const diasTotales = Math.ceil((finDate.getTime() - inicioDate.getTime()) / (1000 * 60 * 60 * 24));
                const diasActivo = Math.ceil((finDate.getTime() - fechaCompra.getTime()) / (1000 * 60 * 60 * 24));
                if (diasTotales > 0 && diasActivo > 0) {
                    depPeriodo = depPeriodo * (diasActivo / diasTotales);
                } else {
                    depPeriodo = 0;
                }
            }

            depPeriodo = Math.round(depPeriodo * 100) / 100;
            depreciacionTotal += depPeriodo;
            if (depPeriodo > 0) {
                depreciacionDetalle.push({ nombre: activo.nombre, monto: depPeriodo, pct: pct(depPeriodo, ventasTotales) });
            }
        }

        // 6. Gastos Operativos Totales
        const gastosOperativosTotal = gastosAdminTotal + gastosVentasTotal + depreciacionTotal;

        // 7. Utilidad Antes de Impuestos
        const utilidadAntesImpuestos = utilidadBruta - gastosOperativosTotal;

        // 8. Impuesto a la Renta (1.5%)
        const impuestoRenta = Math.round(utilidadAntesImpuestos * 0.015 * 100) / 100;

        // 9. Utilidad Neta
        const utilidadNeta = utilidadAntesImpuestos - impuestoRenta;

        return c.json({
            success: true,
            data: {
                periodo: { filtro, inicio, fin },
                ventas_totales: { monto: ventasTotales, pct: 100 },
                costo_ventas: { monto: costoVentas, pct: pct(costoVentas, ventasTotales) },
                utilidad_bruta: { monto: utilidadBruta, pct: pct(utilidadBruta, ventasTotales) },
                gastos_administracion: {
                    total: gastosAdminTotal,
                    pct: pct(gastosAdminTotal, ventasTotales),
                    detalle: gastosAdmin,
                },
                gastos_ventas: {
                    total: gastosVentasTotal,
                    pct: pct(gastosVentasTotal, ventasTotales),
                    detalle: gastosVentas,
                },
                depreciacion: {
                    total: depreciacionTotal,
                    pct: pct(depreciacionTotal, ventasTotales),
                    detalle: depreciacionDetalle,
                },
                gastos_operativos: { total: gastosOperativosTotal, pct: pct(gastosOperativosTotal, ventasTotales) },
                utilidad_antes_impuestos: { monto: utilidadAntesImpuestos, pct: pct(utilidadAntesImpuestos, ventasTotales) },
                impuesto_renta: { monto: impuestoRenta, pct: pct(impuestoRenta, ventasTotales) },
                utilidad_neta: { monto: utilidadNeta, pct: pct(utilidadNeta, ventasTotales) },
            },
        });
    });
}
