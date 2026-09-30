import type { Compra, Sale } from "./api";
import { BUSINESS_TIME_ZONE, getBusinessDateKey, getLimaDateKey } from "./business-date";

export interface TopClientData {
  name: string;
  amount: number;
}

export interface BalanceData {
  date: string;
  income: number;
  expense: number;
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

  const today = getLimaDateKey();
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
