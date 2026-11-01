const DAY = 86_400_000;
export type Grouping = "dia" | "semana" | "mes";
export type MetricDay = { fecha: string; ventas: number; costo_estimado: number; gastos: number; utilidad: number; cobros: number; insumos: number; flujo_caja: number; cantidad: number };

export function dateKey(date: Date) { return date.toISOString().slice(0, 10); }
export function shiftDay(value: string, offset: number) { return dateKey(new Date(Date.parse(value + "T12:00:00Z") + offset * DAY)); }
export function limaToday(now = new Date()) { return dateKey(new Date(now.getTime() - 5 * 60 * 60 * 1000)); }
export function validDate(value: string) {
    return /^\d{4}-\d{2}-\d{2}$/.test(value) && value >= "1900-01-01" && value <= "9998-12-31"
        && !Number.isNaN(Date.parse(value + "T12:00:00Z")) && dateKey(new Date(value + "T12:00:00Z")) === value;
}
export function periodRange(start: string, end: string) {
    if (!validDate(start) || !validDate(end) || start > end) throw new Error("Elige un rango de fechas válido, con el inicio antes del final.");
    const days = Math.round((Date.parse(end + "T12:00:00Z") - Date.parse(start + "T12:00:00Z")) / DAY) + 1;
    if (days > 366) throw new Error("Consulta hasta 366 días por periodo.");
    return { inicio: start, fin: end, dias: days, anterior_inicio: shiftDay(start, -days), anterior_fin: shiftDay(start, -1) };
}
const money = (cents: number) => Math.round(cents) / 100;
export function summarize(days: MetricDay[]) {
    const sum = (key: keyof Omit<MetricDay, "fecha">) => days.reduce((total, day) => total + day[key], 0);
    const ventas = sum("ventas"), cantidad = sum("cantidad");
    return { ventas: money(ventas), costo_estimado: money(sum("costo_estimado")), gastos: money(sum("gastos")),
        utilidad: money(sum("utilidad")), cobros: money(sum("cobros")), insumos: money(sum("insumos")),
        flujo_caja: money(sum("flujo_caja")), cantidad, ticket_promedio: cantidad ? money(ventas / cantidad) : 0,
        margen: ventas > 0 ? Math.round(sum("utilidad") / ventas * 10000) / 100 : null };
}
export function groupDays(days: MetricDay[], grouping: Grouping) {
    const groups = new Map<string, { inicio: string; fin: string; days: MetricDay[] }>();
    for (const day of days) {
        const weekday = new Date(day.fecha + "T12:00:00Z").getUTCDay();
        const key = grouping === "mes" ? day.fecha.slice(0, 7) : grouping === "semana" ? shiftDay(day.fecha, -((weekday + 6) % 7)) : day.fecha;
        const group = groups.get(key) ?? { inicio: day.fecha, fin: day.fecha, days: [] };
        group.fin = day.fecha; group.days.push(day); groups.set(key, group);
    }
    return [...groups.values()].map(group => ({ inicio: group.inicio, fin: group.fin, ...summarize(group.days) }));
}
