import * as React from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { comprasApi, salesApi } from "@/lib/api";
import {
  mapBalanceData,
  mapTopClientsData,
  type BalanceData,
  type TopClientData,
} from "@/lib/dashboard";

const balanceConfig = {
  income: {
    label: "Ingresos (S/)",
    color: "#30b7ff",
  },
  expense: {
    label: "Gastos (S/)",
    color: "#ff9f43",
  },
} satisfies ChartConfig;

const topClientsConfig = {
  amount: {
    label: "Monto (S/)",
    color: "#34d1bf",
  },
} satisfies ChartConfig;

interface DashboardChartsProps {
  topClientsData?: TopClientData[];
  balanceData?: BalanceData[];
}

export function DashboardCharts({
  topClientsData: initialTopClientsData = [],
  balanceData: initialBalanceData = [],
}: DashboardChartsProps) {
  const [activeChart, setActiveChart] = React.useState<"balance" | "clients">(
    "balance",
  );
  const [topClientsData, setTopClientsData] = React.useState(initialTopClientsData);
  const [balanceData, setBalanceData] = React.useState(initialBalanceData);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let isCurrent = true;

    const loadDashboardData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [sales, compras] = await Promise.all([
          salesApi.getAll(),
          comprasApi.getAll(),
        ]);

        if (!isCurrent) return;

        setTopClientsData(mapTopClientsData(sales));
        setBalanceData(mapBalanceData(sales, compras));
      } catch (loadError) {
        console.error("Error fetching dashboard charts:", loadError);
        if (isCurrent) setError("No se pudieron actualizar las métricas");
      } finally {
        if (isCurrent) setLoading(false);
      }
    };

    void loadDashboardData();

    return () => {
      isCurrent = false;
    };
  }, []);

  const displayBalanceData =
    balanceData.length > 0
      ? balanceData
      : mapBalanceData([], []);
  const displayTopClientsData =
    topClientsData.length > 0
      ? topClientsData
      : [{ name: "Sin datos", amount: 0 }];

  return (
    <Card className="h-full border-slate-200 shadow-sm bg-white flex flex-col">
      <CardHeader className="pb-4 md:pb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <CardTitle className="text-lg font-semibold text-slate-800">
            Métricas de Ventas
          </CardTitle>
          <CardDescription className="text-sm text-slate-500">
            {activeChart === "balance" &&
              "Comparativa Ingresos vs Gastos diarios"}
            {activeChart === "clients" && "Top clientes por monto acumulado"}
          </CardDescription>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveChart("balance")}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeChart === "balance"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Balance
          </button>
          <button
            onClick={() => setActiveChart("clients")}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeChart === "clients"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Top Clientes
          </button>
        </div>
      </CardHeader>

      <CardContent className="relative flex-1 w-full px-2 sm:px-6 pb-6 min-h-[350px]">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 text-sm text-slate-500 backdrop-blur-[1px]">
            Actualizando métricas...
          </div>
        )}
        {error && (
          <p className="mb-2 text-center text-xs text-rose-500">{error}</p>
        )}
        {activeChart === "balance" && (
          <ChartContainer
            config={balanceConfig}
            className="h-full w-full min-h-[300px]"
          >
            <BarChart
              data={displayBalanceData}
              margin={{ top: 0, right: 0, bottom: 10, left: 0 }}
            >
              <CartesianGrid
                vertical={false}
                stroke="#e2e8f0"
                strokeDasharray="4 4"
              />
              <XAxis
                dataKey="date"
                tickLine={false}
                tickMargin={16}
                axisLine={false}
                className="text-xs sm:text-sm font-medium fill-slate-500"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={16}
                className="text-xs sm:text-sm font-medium fill-slate-500 tabular-nums"
                tickFormatter={(value) => `S/ ${value}`}
                width={80}
              />
              <ChartTooltip
                cursor={{ fill: "#f8fafc" }}
                content={
                  <ChartTooltipContent className="bg-white border-slate-200 shadow-lg text-sm" />
                }
              />
              <Bar
                dataKey="income"
                fill="var(--color-income)"
                radius={[4, 4, 0, 0]}
                maxBarSize={32}
                name="Ingresos"
              />
              <Bar
                dataKey="expense"
                fill="var(--color-expense)"
                radius={[4, 4, 0, 0]}
                maxBarSize={32}
                name="Gastos"
              />
            </BarChart>
          </ChartContainer>
        )}

        {activeChart === "clients" && (
          <ChartContainer
            config={topClientsConfig}
            className="h-full w-full min-h-[300px]"
          >
            <BarChart
              data={displayTopClientsData}
              layout="vertical"
              margin={{ top: 0, right: 20, bottom: 10, left: 10 }}
            >
              <CartesianGrid
                horizontal={false}
                stroke="#e2e8f0"
                strokeDasharray="4 4"
              />
              <XAxis
                type="number"
                tickLine={false}
                tickMargin={16}
                axisLine={false}
                className="text-xs sm:text-sm font-medium fill-slate-500 tabular-nums"
                tickFormatter={(value) => `S/ ${value}`}
              />
              <YAxis
                dataKey="name"
                type="category"
                tickLine={false}
                axisLine={false}
                tickMargin={16}
                width={120}
                className="text-xs sm:text-sm font-medium fill-slate-500"
              />
              <ChartTooltip
                cursor={{ fill: "#f8fafc" }}
                content={
                  <ChartTooltipContent className="bg-white border-slate-200 shadow-lg text-sm" />
                }
              />
              <Bar
                dataKey="amount"
                fill="var(--color-amount)"
                radius={[0, 6, 6, 0]}
                maxBarSize={32}
              />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
