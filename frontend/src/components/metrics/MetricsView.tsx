import * as React from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { metricsApi, type MetricsData } from "@/lib/api";
import { money, dateLabel, presetRange, presets } from "./metrics-format";
import { MetricsTrend } from "./MetricsTrend";

const control = "min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-700 focus-visible:ring-offset-2";
const button = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-700 focus-visible:ring-offset-2 disabled:opacity-50";

export function MetricsView() {
  const [range, setRange] = React.useState(() => presetRange("mes"));
  const [draft, setDraft] = React.useState(range);
  const [preset, setPreset] = React.useState("mes");
  const [grouping, setGrouping] = React.useState<MetricsData["agrupacion"]>("dia");
  const [data, setData] = React.useState<MetricsData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [validation, setValidation] = React.useState("");
  const [revision, setRevision] = React.useState(0);
  const [chart, setChart] = React.useState<"utilidad" | "caja">("utilidad");

  React.useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError("");
    metricsApi.get(range.desde, range.hasta, grouping, controller.signal)
      .then(result => { if (!controller.signal.aborted) setData(result); })
      .catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "No se pudieron cargar las métricas."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [range.desde, range.hasta, grouping, revision]);

  function choosePreset(id: string) {
    const next = presetRange(id); setRange(next); setDraft(next); setPreset(id); setValidation("");
  }
  function apply(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const days = (Date.parse(draft.hasta) - Date.parse(draft.desde)) / 86400000 + 1;
    if (!Number.isFinite(days) || days < 1 || days > 366) { setValidation("Elige un periodo de 1 a 366 días, con el inicio antes del final."); return; }
    setValidation(""); setRange(draft); setRevision(value => value + 1);
  }

  const total = data?.resumen;
  const difference = data ? data.resumen.utilidad - data.anterior.utilidad : 0;
  const categories = data?.gastos_categorias ?? [];
  const maxExpense = Math.max(...categories.map(row => row.monto), 1);
  const maxClient = Math.max(...(data?.clientes.map(row => row.ventas) ?? []), 1);

  return <section className="min-w-0 space-y-7 text-slate-900 sm:space-y-9" aria-label="Métricas">
    <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="grid grid-cols-3 gap-1.5 sm:flex sm:flex-wrap" role="group" aria-label="Periodos rápidos">
        {presets.map(item => <button key={item.id} type="button" aria-pressed={preset === item.id} onClick={() => choosePreset(item.id)} className={`${button} px-2 sm:px-4 ${preset === item.id ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"}`}>{item.label}</button>)}
      </div>
      <form onSubmit={apply} className="mt-5 grid grid-cols-2 items-end gap-3 sm:flex sm:flex-wrap">
        <div className="min-w-0 sm:w-40"><label htmlFor="metrics-from" className="mb-1.5 block text-xs font-semibold text-slate-600">Desde</label><input id="metrics-from" type="date" required min="1900-01-01" max="9998-12-31" className={`${control} w-full min-w-0`} value={draft.desde} onChange={event => { setDraft({ ...draft, desde: event.target.value }); setPreset(""); }} /></div>
        <div className="min-w-0 sm:w-40"><label htmlFor="metrics-to" className="mb-1.5 block text-xs font-semibold text-slate-600">Hasta</label><input id="metrics-to" type="date" required min="1900-01-01" max="9998-12-31" className={`${control} w-full min-w-0`} value={draft.hasta} onChange={event => { setDraft({ ...draft, hasta: event.target.value }); setPreset(""); }} /></div>
        <button type="submit" className={`${button} bg-sky-700 text-white hover:bg-sky-800`}>Aplicar periodo</button>
        <div className="min-w-0 sm:ml-auto sm:w-40"><label htmlFor="metrics-group" className="mb-1.5 block text-xs font-semibold text-slate-600">Agrupar gráficos</label><select id="metrics-group" value={grouping} onChange={event => setGrouping(event.target.value as MetricsData["agrupacion"])} className={`${control} w-full`}><option value="dia">Por día</option><option value="semana">Por semana</option><option value="mes">Por mes</option></select></div>
      </form>
      {validation && <p role="alert" className="mt-3 text-sm text-rose-700">{validation}</p>}
    </div>

    <div role="status" aria-live="polite" className="text-sm text-slate-600">{loading ? "Actualizando métricas…" : error ? "No se pudo cargar el periodo." : data ? `${dateLabel(data.periodo.inicio)} — ${dateLabel(data.periodo.fin)} · ${data.periodo.dias} ${data.periodo.dias === 1 ? "día" : "días"}` : ""}</div>
    {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-5"><p className="max-w-2xl text-sm text-rose-800">{error}</p><button className={`${button} bg-white text-rose-800 ring-1 ring-rose-200`} type="button" onClick={() => setRevision(value => value + 1)}>Reintentar</button></div>}

    {data && total && !error && <div aria-busy={loading} className={`min-w-0 space-y-8 ${loading ? "opacity-50" : ""}`}>
      <section className="grid gap-6 border-y border-slate-200 py-7 sm:grid-cols-[1.4fr_1fr] sm:gap-10" aria-labelledby="profit-title">
        <div><h3 id="profit-title" className="text-sm font-semibold text-slate-600">{total.utilidad < 0 ? "Pérdida operativa estimada" : "Utilidad operativa estimada"}</h3><p className={`mt-3 break-words font-display text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl ${total.utilidad < 0 ? "text-rose-700" : "text-emerald-700"}`}>{money(total.utilidad)}</p><p className="mt-3 text-sm text-slate-600">Antes de impuestos y depreciación.</p></div>
        <div className="flex flex-col justify-center gap-3 sm:border-l sm:border-slate-200 sm:pl-8">
          <div className="flex items-center gap-2"><span className={`inline-flex items-center gap-1 text-sm font-semibold tabular-nums ${difference < 0 ? "text-rose-700" : "text-emerald-700"}`}>{difference < 0 ? <ArrowDownRight className="size-4" /> : <ArrowUpRight className="size-4" />}{difference > 0 ? "+ " : ""}{money(difference)}</span><span className="text-xs text-slate-500">vs. periodo anterior</span></div>
          <p className="text-xs text-slate-500">{dateLabel(data.periodo.anterior_inicio)} — {dateLabel(data.periodo.anterior_fin)} · misma cantidad de días</p>
          <p className="text-sm text-slate-700">Margen sobre ventas <strong className="ml-2 tabular-nums">{total.margen === null ? "—" : `${total.margen.toLocaleString("es-PE")}%`}</strong></p>
        </div>
      </section>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-4 sm:gap-6">
        {[{ label: "Ventas registradas", value: money(total.ventas), note: `${total.cantidad} ${total.cantidad === 1 ? "venta" : "ventas"} en el periodo` }, { label: "Cobros registrados", value: money(total.cobros), note: "Según la fecha del pago" }, { label: "Gastos operativos", value: money(total.gastos), note: "Compras de tipo gasto" }, { label: "Venta promedio", value: money(total.ticket_promedio), note: "Importe por venta" }].map(item => <div key={item.label} className="min-w-0 border-l-2 border-slate-200 pl-3"><dt className="text-xs font-medium text-slate-600">{item.label}</dt><dd className="mt-2 break-words text-lg font-semibold tracking-tight tabular-nums sm:text-xl">{item.value}</dd><p className="mt-1.5 text-xs text-slate-500">{item.note}</p></div>)}
      </dl>

      <section className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-5 sm:p-6" aria-labelledby="trend-title">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4 px-1"><div><h3 id="trend-title" className="text-base font-semibold">{chart === "utilidad" ? "Evolución de ventas y utilidad" : "Entradas y salidas de caja"}</h3><p className="mt-1 text-xs text-slate-600">{chart === "utilidad" ? "El costo estimado y los gastos ya están descontados de la utilidad." : "Cobros registrados frente a insumos y gastos pagados en el periodo."}</p></div><div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1" role="group" aria-label="Tipo de gráfico">{([{ id: "utilidad", label: "Rentabilidad" }, { id: "caja", label: "Caja" }] as const).map(item => <button type="button" key={item.id} aria-pressed={chart === item.id} className={`${button} min-h-11 px-3 ${chart === item.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`} onClick={() => setChart(item.id)}>{item.label}</button>)}</div></div>
        <MetricsTrend data={data} mode={chart} />
        {!!data.domingos_omitidos && <p className="mt-3 px-1 text-xs text-slate-600">Domingos sin actividad omitidos. Los domingos con ventas, cobros o gastos se conservan.</p>}
        {total.cantidad === 0 && <p className="mt-3 px-1 text-sm text-slate-600">No hay ventas en este periodo. Los cobros y gastos registrados se muestran igualmente.</p>}
      </section>

      <div className="grid min-w-0 gap-8 lg:grid-cols-2 lg:gap-10">
        <section aria-labelledby="breakdown-title" className="min-w-0"><h3 id="breakdown-title" className="text-base font-semibold">De ventas a utilidad</h3><p className="mt-1 text-sm text-slate-600">El cálculo del periodo, paso a paso.</p><div className="mt-5 space-y-1">
          {[
            { label: "Ventas", amount: total.ventas, color: "bg-sky-700", sign: "" },
            { label: `Costo estimado · ${data.costo_porcentaje}%`, amount: total.costo_estimado, color: "bg-amber-700", sign: "− " },
            { label: "Gastos operativos", amount: total.gastos, color: "bg-slate-500", sign: "− " },
            { label: "Utilidad estimada", amount: total.utilidad, color: total.utilidad < 0 ? "bg-rose-700" : "bg-emerald-700", sign: "" },
          ].map((item, index) => <div key={item.label} className={`py-3 ${index === 3 ? "border-t border-slate-300 font-semibold" : ""}`}><div className="flex justify-between gap-3 text-sm"><span className="text-slate-700">{item.label}</span><span className="whitespace-nowrap tabular-nums">{item.sign}{money(item.amount)}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true"><div className={`h-full rounded-full ${item.color}`} style={{ width: `${Math.min(Math.abs(item.amount) / Math.max(total.ventas, total.gastos, 1) * 100, 100)}%` }} /></div></div>)}
        </div><p className="mt-3 text-xs leading-relaxed text-slate-600">El costo de venta usa el {data.costo_porcentaje}% configurado en el negocio. Las compras de insumos se muestran en caja y no se restan nuevamente de esta utilidad.</p></section>

        <section aria-labelledby="expenses-title" className="min-w-0"><h3 id="expenses-title" className="text-base font-semibold">En qué se gasta</h3><p className="mt-1 text-sm text-slate-600">Gastos operativos por categoría.</p><div className="mt-5 space-y-4">{categories.length ? categories.map(item => <div key={item.categoria}><div className="mb-2 flex justify-between gap-3 text-sm"><span className="min-w-0 break-words text-slate-700">{item.categoria}</span><span className="shrink-0 font-medium tabular-nums">{money(item.monto)}</span></div><div className="h-3 overflow-hidden rounded-sm bg-slate-100" aria-hidden="true"><div className="h-full rounded-sm bg-amber-700" style={{ width: `${item.monto / maxExpense * 100}%` }} /></div></div>) : <p className="border-y border-dashed border-slate-200 py-8 text-sm text-slate-500">Sin gastos operativos registrados en este periodo.</p>}</div></section>
      </div>

      <div className="grid min-w-0 gap-8 border-t border-slate-200 pt-8 lg:grid-cols-[1.4fr_1fr] lg:gap-10">
        <section aria-labelledby="clients-title" className="min-w-0"><h3 id="clients-title" className="text-base font-semibold">Clientes con más ventas</h3><p className="mt-1 text-sm text-slate-600">Los cinco mayores importes del periodo.</p><ol className="mt-5 space-y-4">{data.clientes.map(item => <li key={item.id}><div className="mb-2 flex justify-between gap-4 text-sm"><a href={`/clientes/detalle?id=${item.id}`} className="min-w-0 break-words font-medium text-sky-800 underline-offset-4 hover:underline focus-visible:underline">{item.nombre}</a><span className="shrink-0 tabular-nums">{money(item.ventas)} <span className="text-xs text-slate-500">· {item.cantidad} {item.cantidad === 1 ? "venta" : "ventas"}</span></span></div><div className="h-2 rounded-sm bg-slate-100" aria-hidden="true"><div className="h-full rounded-sm bg-sky-700" style={{ width: `${Math.max(item.ventas, 0) / maxClient * 100}%` }} /></div></li>)}</ol>{!data.clientes.length && <p className="py-8 text-sm text-slate-500">Sin ventas para comparar clientes.</p>}</section>
        <section aria-labelledby="cash-title" className="min-w-0 rounded-xl bg-slate-100 p-5 sm:p-6"><h3 id="cash-title" className="text-base font-semibold">Movimiento de caja</h3><dl className="mt-4 space-y-3 text-sm">{[{ label: "Cobros registrados", amount: total.cobros }, { label: "Compra de insumos", amount: -total.insumos }, { label: "Gastos operativos", amount: -total.gastos }].map(item => <div key={item.label} className="flex justify-between gap-3"><dt className="text-slate-600">{item.label}</dt><dd className="tabular-nums">{money(item.amount)}</dd></div>)}<div className="flex justify-between gap-3 border-t border-slate-300 pt-4 font-semibold"><dt>Flujo del periodo</dt><dd className={`tabular-nums ${total.flujo_caja < 0 ? "text-rose-700" : "text-emerald-700"}`}>{money(total.flujo_caja)}</dd></div></dl><p className="mt-4 text-xs leading-relaxed text-slate-600">Considera solo pagos registrados. Puede incluir cobros de ventas de otros periodos. No representa el saldo de la cuenta bancaria.</p></section>
      </div>

      <details className="rounded-xl border border-slate-200 bg-white"><summary className="cursor-pointer rounded-xl p-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-700 sm:px-6">Ver datos del gráfico en tabla</summary><div className="overflow-x-auto p-4 pt-0 sm:px-6" role="region" aria-label="Datos por periodo" tabIndex={0}><table className="w-full whitespace-nowrap text-left text-sm"><caption className="sr-only">Ventas, costos, gastos, utilidad y cobros, agrupados por {data.agrupacion}</caption><thead><tr className="border-b border-slate-200 text-xs text-slate-600">{["Periodo", "Ventas", "Costo estimado", "Gastos", "Utilidad", "Cobros"].map(label => <th key={label} scope="col" className="px-3 py-3 first:pl-0">{label}</th>)}</tr></thead><tbody>{data.serie.map(row => <tr key={row.inicio} className="border-b border-slate-100 last:border-0"><th scope="row" className="py-3 pr-3 font-medium">{dateLabel(row.inicio)}{row.inicio !== row.fin ? ` — ${dateLabel(row.fin)}` : ""}</th>{[row.ventas, row.costo_estimado, row.gastos, row.utilidad, row.cobros].map((value, index) => <td key={index} className="px-3 py-3 tabular-nums">{money(value)}</td>)}</tr>)}</tbody></table></div></details>
    </div>}
  </section>;
}
