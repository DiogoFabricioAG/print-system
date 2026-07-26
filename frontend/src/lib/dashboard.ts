import type { Compra, Sale } from "./api";

export interface TopClientData {
  name: string;
  amount: number;
}

export interface BalanceData {
  date: string;
  income: number;
  expense: number;
}

const BUSINESS_TIME_ZONE = "America/Bogota";

function dateKeyFromParts(parts: Intl.DateTimeFormatPart[]): string {
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function formatDateKeyInBusinessTimeZone(date: Date): string {
  return dateKeyFromParts(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: BUSINESS_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date),
  );
}

/**
 * Converts a stored date to the business date used by the dashboard.
 * Explicit sale dates are date-only values; created_at timestamps are UTC.
 */
export function getBusinessDateKey(value?: string | null): string | null {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const hasTimeZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(trimmed);
  const normalized = trimmed.includes("T")
    ? hasTimeZone
      ? trimmed
      : `${trimmed}Z`
    : `${trimmed.replace(" ", "T")}Z`;
  const parsed = new Date(normalized);

  if (!Number.isNaN(parsed.getTime())) {
    return formatDateKeyInBusinessTimeZone(parsed);
  }

  return trimmed.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? null;
}

function dateKeyToUtcDate(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

function addDays(dateKey: string, days: number): string {
  const date = dateKeyToUtcDate(dateKey);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatDateLabel(dateKey: string): string {
  const date = dateKeyToUtcDate(dateKey);
  const weekday = new Intl.DateTimeFormat("es-CO", {
    weekday: "short",
    timeZone: BUSINESS_TIME_ZONE,
  }).format(date);
  const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  const [, month, day] = dateKey.split("-");
  return `${capitalizedWeekday} ${day}/${month}`;
}

export function mapTopClientsData(sales: Sale[]): TopClientData[] {
  const amountPerClient = new Map<string, TopClientData>();

  sales.forEach((sale) => {
    const name = sale.cliente_nombre?.trim() || "Desconocido";
    const key = name.toLocaleLowerCase();
    const current = amountPerClient.get(key);

    amountPerClient.set(key, {
      name: current?.name ?? name,
      amount: (current?.amount ?? 0) + (Number(sale.pago) || 0),
    });
  });

  const localClientKey = "cliente local";
  const localClientAmount = amountPerClient.get(localClientKey)?.amount ?? 0;
  const otherClients = [...amountPerClient.values()]
    .filter((client) => client.name.toLocaleLowerCase() !== localClientKey)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)
    .reverse();

  return [
    ...otherClients,
    ...(localClientAmount > 0 || otherClients.length === 0
      ? [{ name: "Cliente Local", amount: localClientAmount }]
      : []),
  ];
}

export function mapBalanceData(sales: Sale[], compras: Compra[]): BalanceData[] {
  const dailyData: Record<string, { income: number; expense: number }> = {};

  const ensureDay = (dateKey: string) => {
    dailyData[dateKey] ??= { income: 0, expense: 0 };
    return dailyData[dateKey];
  };

  sales.forEach((sale) => {
    if (sale.estado === "Cancelado") return;

    const dateKey = getBusinessDateKey(sale.fecha) ?? getBusinessDateKey(sale.creado_el);
    if (!dateKey) return;

    ensureDay(dateKey).income += Number(sale.pago) || 0;
  });

  compras.forEach((compra) => {
    const dateKey = getBusinessDateKey(compra.creado_el);
    if (!dateKey) return;

    ensureDay(dateKey).expense += Number(compra.monto) || 0;
  });

  const today = formatDateKeyInBusinessTimeZone(new Date());
  return Array.from({ length: 7 }, (_, index) => {
    const dateKey = addDays(today, index - 6);
    const day = dailyData[dateKey] ?? { income: 0, expense: 0 };

    return {
      date: formatDateLabel(dateKey),
      income: day.income,
      expense: day.expense,
    };
  });
}
