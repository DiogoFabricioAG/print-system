import * as React from "react";
import { Pie, PieChart, Cell } from "recharts";
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
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";

const chartConfig = {
  count: {
    label: "Clientes",
  },
  Nuevos: {
    label: "Nuevos",
    color: "#30b7ff",
  },
  Recurrentes: {
    label: "Recurrentes",
    color: "#34d1bf",
  },
} satisfies ChartConfig;

interface ClientsPieChartProps {
  data?: { type: string; count: number; fill: string }[];
}

export function ClientsPieChart({ data = [] }: ClientsPieChartProps) {
  const displayData =
    data.length > 0
      ? data
      : [
          { type: "Nuevos", count: 0, fill: "#30b7ff" },
          { type: "Recurrentes", count: 0, fill: "#34d1bf" },
        ];

  return (
    <Card className="h-full border-slate-200 shadow-sm bg-white flex flex-col">
      <CardHeader className="items-center pb-4 text-center md:pb-6">
        <CardTitle className="text-lg font-semibold text-slate-800">
          Proporcion de Clientes
        </CardTitle>
        <CardDescription className="text-sm text-slate-500">
          Nuevos vs Recurrentes
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex justify-center pb-8">
        <div className="flex flex-col items-center w-full">
          <ChartContainer
            config={chartConfig}
            className="mx-auto aspect-square max-h-[250px] w-full"
          >
            <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    hideLabel
                    className="bg-white border-slate-200 shadow-lg text-sm"
                  />
                }
              />
              <Pie
                data={displayData}
                dataKey="count"
                nameKey="type"
                innerRadius={70}
                outerRadius={95}
                strokeWidth={4}
                stroke="#ffffff"
              >
                {displayData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      entry.fill ||
                      (entry.type === "Nuevos" ? "#30b7ff" : "#34d1bf")
                    }
                  />
                ))}
              </Pie>
              <ChartLegend
                content={
                  <ChartLegendContent className="text-sm font-medium text-slate-600" />
                }
                className="mt-4"
              />
            </PieChart>
          </ChartContainer>

          <div className="mt-4 space-y-2 text-center">
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-full bg-[#30b7ff]"></span>
              <span className="text-xs text-slate-500">
                <strong>Nuevo:</strong> Cliente con 1 venta realizada
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-full bg-[#34d1bf]"></span>
              <span className="text-xs text-slate-500">
                <strong>Recurrente:</strong> Cliente con +1 venta realizada
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
