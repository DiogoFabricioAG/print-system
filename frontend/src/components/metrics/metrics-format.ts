import { formatBusinessDate, getLimaDateKey } from "@/lib/business-date";
import type { MetricsData } from "@/lib/api";

export const money = (value: number) => `S/ ${value.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const compactMoney = (value: number) => new Intl.NumberFormat("es-PE", { notation: "compact", maximumFractionDigits: 1 }).format(value);
export const dateLabel = formatBusinessDate;
export function addDays(day: string, amount: number) { return new Date(Date.parse(day + "T12:00:00Z") + amount * 86400000).toISOString().slice(0, 10); }
export const presets = [
  { id: "hoy", label: "Hoy" }, { id: "semana", label: "7 días" },
  { id: "mes", label: "Este mes" }, { id: "anterior", label: "Mes pasado" },
  { id: "anual", label: "Este año" },
] as const;
export function presetRange(id: string, today = getLimaDateKey()) {
  if (id === "hoy") return { desde: today, hasta: today };
  if (id === "semana") return { desde: addDays(today, -6), hasta: today };
  if (id === "anual") return { desde: today.slice(0, 4) + "-01-01", hasta: today };
  if (id === "anterior") {
    const end = addDays(today.slice(0, 7) + "-01", -1);
    return { desde: end.slice(0, 7) + "-01", hasta: end };
  }
  return { desde: today.slice(0, 7) + "-01", hasta: today };
}
export function exportMetrics(data: MetricsData) {
  const rows: (string | number)[][] = [
    ["Métricas Kromata SAC", "Desde", data.periodo.inicio, "Hasta", data.periodo.fin],
    ["Utilidad operativa estimada antes de impuestos y depreciación"],
    ["Costo de venta estimado (%)", data.costo_porcentaje],
    ["Ventas", "Costo estimado", "Gastos operativos", "Utilidad estimada", "Cobros registrados", "Compra de insumos", "Flujo de caja"],
    [data.resumen.ventas, data.resumen.costo_estimado, data.resumen.gastos, data.resumen.utilidad, data.resumen.cobros, data.resumen.insumos, data.resumen.flujo_caja],
    [], ["Inicio", "Fin", "Ventas", "Costo estimado", "Gastos operativos", "Utilidad estimada", "Cobros registrados", "Compra de insumos", "Flujo de caja", "Número de ventas"],
    ...data.serie.map(row => [row.inicio, row.fin, row.ventas, row.costo_estimado, row.gastos, row.utilidad, row.cobros, row.insumos, row.flujo_caja, row.cantidad]),
    [], ["Categoría de gasto", "Monto"], ...data.gastos_categorias.map(row => [row.categoria, row.monto]),
  ];
  const safe = (cell: string | number) => {
    const value = typeof cell === "string" && /^[=+@\-\t\r\n]/.test(cell) ? "'" + cell : String(cell);
    return `"${value.replaceAll('"', '""')}"`;
  };
  const url = URL.createObjectURL(new Blob(["\uFEFF" + rows.map(row => row.map(safe).join(";")).join("\r\n")], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a"); link.href = url; link.download = `kromata-metricas-${data.periodo.inicio}-${data.periodo.fin}.csv`;
  document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
