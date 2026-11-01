import { Bar, ComposedChart, Line, CartesianGrid, XAxis, YAxis, ReferenceLine } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { MetricsData } from "@/lib/api";
import { money, compactMoney, dateLabel } from "./metrics-format";

export function MetricsTrend({ data, mode }: { data: MetricsData; mode: "utilidad" | "caja" }) {
  const cash = mode === "caja";
  const rows = data.serie.map(row => ({ ...row, egresos: 0 - Math.round((row.insumos + row.gastos) * 100) / 100 }));
  const config: ChartConfig = cash ? { cobros: { label: "Cobros", color: "#0369a1" }, egresos: { label: "Egresos", color: "#b45309" }, flujo_caja: { label: "Flujo de caja", color: "#047857" } } : { ventas: { label: "Ventas", color: "#0369a1" }, utilidad: { label: "Utilidad estimada", color: "#047857" } };
  return <figure aria-label={cash ? "Cobros, egresos y flujo de caja del periodo" : "Ventas y utilidad operativa estimada del periodo"} className="min-w-0">
    <ChartContainer config={config} className="aspect-auto h-[280px] w-full sm:h-[330px]">
      <ComposedChart accessibilityLayer data={rows} stackOffset="sign" margin={{ top: 12, right: 8, left: 0, bottom: 10 }}>
        <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 4" />
        <XAxis dataKey="inicio" tickFormatter={value => dateLabel(String(value)).slice(0, 5)} tickLine={false} axisLine={false} minTickGap={32} tickMargin={12} />
        <YAxis tickFormatter={value => compactMoney(Number(value))} width={52} tickLine={false} axisLine={false} tickMargin={8} />
        <ReferenceLine y={0} stroke="#94a3b8" />
        <ChartTooltip content={<ChartTooltipContent labelFormatter={label => dateLabel(String(label))} formatter={(value, name) => <span className="flex w-full justify-between gap-5"><span className="text-slate-600">{name}</span><strong className="font-medium tabular-nums">{money(Number(value))}</strong></span>} />} />
        <Bar dataKey={cash ? "cobros" : "ventas"} name={cash ? "Cobros" : "Ventas"} stackId={cash ? "caja" : undefined} fill="#0369a1" fillOpacity={0.2} stroke="#0369a1" strokeWidth={1} radius={[3, 3, 0, 0]} maxBarSize={32} isAnimationActive={false} />
        {cash && <Bar dataKey="egresos" name="Egresos" stackId="caja" fill="#b45309" fillOpacity={0.65} radius={[0, 0, 3, 3]} maxBarSize={32} isAnimationActive={false} />}
        <Line dataKey={cash ? "flujo_caja" : "utilidad"} name={cash ? "Flujo de caja" : "Utilidad estimada"} stroke="#047857" strokeWidth={2.5} type="linear" dot={rows.length <= 10 ? { r: 3 } : false} activeDot={{ r: 5 }} isAnimationActive={false} />
      </ComposedChart>
    </ChartContainer>
    <figcaption className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-slate-600"><span><span aria-hidden="true" className="mr-2 inline-block h-2 w-3 bg-sky-700/40" />{cash ? "Cobros registrados" : "Ventas registradas"}</span>{cash && <span><span aria-hidden="true" className="mr-2 inline-block h-2 w-3 bg-amber-700/70" />Egresos (bajo cero)</span>}<span><span aria-hidden="true" className="mr-2 inline-block h-0.5 w-4 align-middle bg-emerald-700" />{cash ? "Flujo de caja" : "Utilidad estimada"}</span><span className="text-slate-500">Importes en soles (S/)</span></figcaption>
  </figure>;
}
