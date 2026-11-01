import { formatBusinessDate, getLimaDateKey } from "@/lib/business-date";

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
