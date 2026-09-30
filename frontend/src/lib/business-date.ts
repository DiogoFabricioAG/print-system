export const BUSINESS_TIME_ZONE = "America/Lima";

export function getLimaDateKey(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function getBusinessDateKey(value?: string | null): string | null {
  if (!value?.trim()) return null;

  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  // SQLite CURRENT_TIMESTAMP has no suffix, but its value is UTC.
  const hasTimeZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(trimmed);
  const normalized = trimmed.replace(" ", "T") + (hasTimeZone ? "" : "Z");
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : getLimaDateKey(parsed);
}

export function formatBusinessDate(value?: string | null): string {
  const dateKey = getBusinessDateKey(value);
  if (!dateKey) return "-";
  const [year, month, day] = dateKey.split("-");
  return `${day}/${month}/${year}`;
}

// Dates selected in a calendar are local calendar days, not UTC instants.
export function getCalendarDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
