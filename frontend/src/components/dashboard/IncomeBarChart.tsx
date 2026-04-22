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

const chartConfig = {
  income: {
    label: "Ingreso ($)",
    color: "#30b7ff",
  },
} satisfies ChartConfig;

interface IncomeBarChartProps {
  data?: { date: string; income: number }[];
}

export function IncomeBarChart({ data = [] }: IncomeBarChartProps) {
  const displayData =
    data.length > 0
      ? data
      : [
          { date: "17/04", income: 0 },
          { date: "18/04", income: 0 },
          { date: "19/04", income: 0 },
          { date: "20/04", income: 0 },
          { date: "21/04", income: 0 },
        ];

  console.log("IncomeBarChart received data:", JSON.stringify(displayData))

  return (
    <Card className="h-full border-slate-200 shadow-sm bg-white flex flex-col">
      <CardHeader className="pb-6 md:pb-8">
        <CardTitle className="text-lg font-semibold text-slate-800">
          Dinero Ingresado
        </CardTitle>
        <CardDescription className="text-sm text-slate-500">
          Últimos 7 días de facturación
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 w-full px-2 sm:px-6 pb-6">
        <ChartContainer
          config={chartConfig}
          className="h-full w-full min-h-[250px]"
        >
          <BarChart
            data={displayData}
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
              tickFormatter={(value) => `$${value}`}
              width={60}
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
              radius={[6, 6, 0, 0]}
              maxBarSize={48}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
