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
  topClientsData: { name: string; amount: number }[];
  balanceData?: { date: string; income: number; expense: number }[];
}

export function DashboardCharts({
  topClientsData = [],
  balanceData = [],
}: DashboardChartsProps) {
  const [activeChart, setActiveChart] = React.useState<"balance" | "clients">(
    "balance",
  );

  const displayBalanceData =
    balanceData.length > 0
      ? balanceData
      : [
          { date: "Lun 17/04", income: 0, expense: 0 },
          { date: "Mar 18/04", income: 0, expense: 0 },
        ];

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

      <CardContent className="flex-1 w-full px-2 sm:px-6 pb-6 min-h-[350px]">
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
              data={topClientsData}
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
