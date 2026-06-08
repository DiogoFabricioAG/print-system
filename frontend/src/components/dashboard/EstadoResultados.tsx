import * as React from "react";
import { Loader2, Printer, BarChart3, FileText, Banknote, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface LineaResultado {
  monto: number;
  pct: number;
}

interface GastosDetalle {
  total: number;
  pct: number;
  detalle: { categoria: string; monto: number; pct: number }[];
}

interface ResultadoData {
  periodo: { filtro: string; inicio: string; fin: string };
  ventas_totales: LineaResultado;
  costo_ventas: LineaResultado;
  utilidad_bruta: LineaResultado;
  gastos_administracion: GastosDetalle;
  gastos_ventas: GastosDetalle;
  depreciacion: GastosDetalle;
  gastos_operativos: LineaResultado;
  utilidad_antes_impuestos: LineaResultado;
  impuesto_renta: LineaResultado;
  utilidad_neta: LineaResultado;
}

type TabKey = "resultados" | "flujos" | "balance";

const API_BASE = "https://functions.diogofabricio17.workers.dev";

function fmt(n: number) {
  return `S/ ${n.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`;
}

function Linea({
  label,
  monto,
  pct,
  bold,
  color,
  indent,
}: {
  label: string;
  monto: number;
  pct: number;
  bold?: boolean;
  color?: string;
  indent?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between py-2 px-3 rounded-lg ${
        bold ? "bg-slate-50 font-bold text-slate-900" : "hover:bg-slate-50/50"
      } ${indent ? "pl-8" : ""}`}
    >
      <span className={`text-sm ${bold ? "text-slate-900" : "text-slate-600"}`}>
        {label}
      </span>
      <div className="flex items-center gap-4 text-right">
        <span className={`text-sm tabular-nums ${color || ""} ${bold ? "text-slate-900 font-bold" : "text-slate-700"}`}>
          {fmt(monto)}
        </span>
        <span className={`text-xs tabular-nums w-12 text-right ${color || "text-slate-400"}`}>
          {pct.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

function PrintModal({
  data,
  onClose,
}: {
  data: ResultadoData | null;
  onClose: () => void;
}) {
  const printRef = React.useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const w = window.open("", "_blank");
    if (!w || !data) return;
    const content = printRef.current?.innerHTML || "";
    w.document.write(`
      <html>
        <head>
          <title>Estado de Resultados</title>
          <style>
            body { font-family: 'Segoe UI', sans-serif; padding: 40px; color: #1e293b; }
            h1 { font-size: 20px; margin-bottom: 4px; }
            .periodo { color: #64748b; font-size: 13px; margin-bottom: 20px; }
            .row { display: flex; justify-content: space-between; padding: 8px 12px; border-radius: 6px; }
            .row.bold { background: #f8fafc; font-weight: bold; }
            .row.indent { padding-left: 32px; }
            .label { font-size: 13px; }
            .values { display: flex; gap: 24px; text-align: right; }
            .amount { font-size: 13px; }
            .pct { font-size: 11px; color: #94a3b8; width: 48px; text-align: right; }
            .divider { border-top: 1px solid #e2e8f0; margin: 4px 0; }
            .divider2 { border-top: 2px solid #cbd5e1; margin: 4px 0; }
            .green { color: #059669; }
            .red { color: #e11d48; }
            .blue { color: #2563eb; }
            .header { font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; padding: 4px 12px; border-bottom: 1px solid #e2e8f0; margin-bottom: 4px; }
            @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          ${content}
        </body>
      </html>
    `);
    w.document.close();
  };

  if (!data) return null;

  const lines = [
    { label: "Ventas Totales", monto: data.ventas_totales.monto, pct: 100, bold: true, cls: "green" },
    { label: "Costo de Ventas", monto: data.costo_ventas.monto, pct: data.costo_ventas.pct, cls: "red" },
    { label: "Utilidad Bruta", monto: data.utilidad_bruta.monto, pct: data.utilidad_bruta.pct, bold: true, cls: data.utilidad_bruta.monto >= 0 ? "green" : "red" },
  ];

  if (data.gastos_administracion.total > 0) {
    lines.push({ label: "Gastos de Administración", monto: data.gastos_administracion.total, pct: data.gastos_administracion.pct, bold: true, cls: "red" });
    for (const g of data.gastos_administracion.detalle) {
      lines.push({ label: `  ${g.categoria}`, monto: g.monto, pct: g.pct, cls: "red" });
    }
  }
  if (data.gastos_ventas.total > 0) {
    lines.push({ label: "Gastos de Ventas", monto: data.gastos_ventas.total, pct: data.gastos_ventas.pct, bold: true, cls: "red" });
    for (const g of data.gastos_ventas.detalle) {
      lines.push({ label: `  ${g.categoria}`, monto: g.monto, pct: g.pct, cls: "red" });
    }
  }
  if (data.depreciacion.total > 0) {
    lines.push({ label: "Depreciación", monto: data.depreciacion.total, pct: data.depreciacion.pct, bold: true, cls: "red" });
    for (const d of data.depreciacion.detalle) {
      lines.push({ label: `  ${d.nombre}`, monto: d.monto, pct: d.pct, cls: "red" });
    }
  }
  lines.push({ label: "Utilidad Antes de Impuestos", monto: data.utilidad_antes_impuestos.monto, pct: data.utilidad_antes_impuestos.pct, bold: true, cls: data.utilidad_antes_impuestos.monto >= 0 ? "blue" : "red" });
  lines.push({ label: "Impuesto a la Renta (1.5%)", monto: data.impuesto_renta.monto, pct: data.impuesto_renta.pct, cls: "red" });
  lines.push({ label: "UTILIDAD NETA", monto: data.utilidad_neta.monto, pct: data.utilidad_neta.pct, bold: true, cls: data.utilidad_neta.monto >= 0 ? "green" : "red" });

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">Exportar PDF</h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint} className="rounded-lg gap-1.5 border-slate-200">
              <Printer className="h-4 w-4" />
              Imprimir
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-lg">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div ref={printRef} className="p-5 overflow-auto">
          <h1 className="text-lg font-bold text-slate-900">Estado de Resultados</h1>
          <p className="text-sm text-slate-500 mb-4">{data.periodo.inicio} al {data.periodo.fin}</p>
          <div className="flex items-center justify-between py-2 px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
            <span>Concepto</span>
            <div className="flex items-center gap-6">
              <span>Monto</span>
              <span className="w-12 text-right">%</span>
            </div>
          </div>
          {lines.map((l, i) => (
            <React.Fragment key={i}>
              {l.label === "Utilidad Bruta" && <div className="border-t border-slate-200 my-1" />}
              {l.label === "Gastos de Administración" && <div className="border-t border-slate-100 my-1" />}
              {l.label === "Utilidad Antes de Impuestos" && <div className="border-t border-slate-200 my-1" />}
              {l.label === "UTILIDAD NETA" && <div className="border-t-2 border-slate-300 my-1" />}
              <div className={`flex items-center justify-between py-2 px-3 rounded-lg ${l.bold ? "bg-slate-50 font-bold" : ""} ${l.label?.startsWith("  ") ? "pl-8" : ""}`}>
                <span className="text-sm text-slate-700">{l.label}</span>
                <div className="flex items-center gap-6 text-right">
                  <span className={`text-sm tabular-nums ${l.cls || ""}`}>{fmt(l.monto)}</span>
                  <span className={`text-xs tabular-nums w-12 text-right ${l.cls || "text-slate-400"}`}>{l.pct.toFixed(1)}%</span>
                </div>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

export function EstadosFinancieros() {
  const [activeTab, setActiveTab] = React.useState<TabKey>("resultados");
  const [filtro, setFiltro] = React.useState<"semana" | "mes" | "anual">("mes");
  const [data, setData] = React.useState<ResultadoData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [showPrint, setShowPrint] = React.useState(false);

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/estado-resultados?filtro_tiempo=${filtro}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        setError(json.error || "Error desconocido");
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }, [filtro]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const periodos: { value: "semana" | "mes" | "anual"; label: string }[] = [
    { value: "semana", label: "Semana" },
    { value: "mes", label: "Mes" },
    { value: "anual", label: "Anual" },
  ];

  const tabs: { key: TabKey; label: string; icon: React.ElementType; soon: boolean }[] = [
    { key: "resultados", label: "Estado de Resultados", icon: BarChart3, soon: false },
    { key: "flujos", label: "Estado de Flujos de Efectivo", icon: FileText, soon: true },
    { key: "balance", label: "Balance General", icon: Banknote, soon: true },
  ];

  return (
    <Card className="h-full border-slate-200 shadow-sm bg-white flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-slate-800">
            Estados Financieros
          </CardTitle>
        </div>
        {/* TABS */}
        <div className="flex gap-1 mt-3 bg-slate-100 rounded-lg p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => !tab.soon && setActiveTab(tab.key)}
              disabled={tab.soon}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-semibold rounded-md transition-all ${
                activeTab === tab.key
                  ? "bg-white text-slate-900 shadow-sm"
                  : tab.soon
                  ? "text-slate-400 cursor-not-allowed"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <tab.icon className={`h-3.5 w-3.5 ${activeTab === tab.key ? "text-emerald-600" : ""}`} />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.key === "resultados" ? "Resultados" : tab.key === "flujos" ? "Flujos" : "Balance"}</span>
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-auto pt-0">
        {/* TAB: RESULTADOS */}
        {activeTab === "resultados" && (
          <>
            <div className="flex items-center justify-between mb-3">
              <div>
                {data && (
                  <p className="text-xs text-slate-500">
                    {data.periodo.inicio} al {data.periodo.fin}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex bg-slate-100 rounded-lg p-0.5 gap-0.5">
                  {periodos.map((p) => (
                    <button
                      key={p.value}
                      onClick={() => setFiltro(p.value)}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                        filtro === p.value
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPrint(true)}
                  disabled={!data}
                  className="rounded-lg gap-1.5 border-slate-200 text-slate-600 h-8 text-xs"
                >
                  <Printer className="h-3.5 w-3.5" />
                  PDF
                </Button>
              </div>
            </div>

            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            )}
            {error && (
              <div className="text-center py-8 text-rose-500 text-sm">{error}</div>
            )}
            {data && !loading && (
              <div className="space-y-0.5">
                <div className="flex items-center justify-between py-2 px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
                  <span>Concepto</span>
                  <div className="flex items-center gap-4">
                    <span>Monto</span>
                    <span className="w-12 text-right">%</span>
                  </div>
                </div>

                <Linea label="Ventas Totales" monto={data.ventas_totales.monto} pct={100} bold color="text-emerald-600" />
                <Linea label="Costo de Ventas" monto={data.costo_ventas.monto} pct={data.costo_ventas.pct} color="text-rose-600" />
                <div className="border-t border-slate-200 my-1" />
                <Linea label="Utilidad Bruta" monto={data.utilidad_bruta.monto} pct={data.utilidad_bruta.pct} bold color={data.utilidad_bruta.monto >= 0 ? "text-emerald-600" : "text-rose-600"} />

                {data.gastos_administracion.total > 0 && (
                  <>
                    <div className="border-t border-slate-100 my-1" />
                    <Linea label="Gastos de Administración" monto={data.gastos_administracion.total} pct={data.gastos_administracion.pct} bold color="text-rose-600" />
                    {data.gastos_administracion.detalle.map((g) => (
                      <Linea key={g.categoria} label={`  ${g.categoria}`} monto={g.monto} pct={g.pct} indent color="text-rose-500" />
                    ))}
                  </>
                )}
                {data.gastos_ventas.total > 0 && (
                  <>
                    <Linea label="Gastos de Ventas" monto={data.gastos_ventas.total} pct={data.gastos_ventas.pct} bold color="text-rose-600" />
                    {data.gastos_ventas.detalle.map((g) => (
                      <Linea key={g.categoria} label={`  ${g.categoria}`} monto={g.monto} pct={g.pct} indent color="text-rose-500" />
                    ))}
                  </>
                )}
                {data.depreciacion.total > 0 && (
                  <>
                    <Linea label="Depreciación" monto={data.depreciacion.total} pct={data.depreciacion.pct} bold color="text-rose-600" />
                    {data.depreciacion.detalle.map((d) => (
                      <Linea key={d.nombre} label={`  ${d.nombre}`} monto={d.monto} pct={d.pct} indent color="text-rose-500" />
                    ))}
                  </>
                )}

                <div className="border-t border-slate-200 my-1" />
                <Linea label="Utilidad Antes de Impuestos" monto={data.utilidad_antes_impuestos.monto} pct={data.utilidad_antes_impuestos.pct} bold color={data.utilidad_antes_impuestos.monto >= 0 ? "text-blue-600" : "text-rose-600"} />
                <Linea label="Impuesto a la Renta (1.5%)" monto={data.impuesto_renta.monto} pct={data.impuesto_renta.pct} color="text-rose-600" />
                <div className="border-t-2 border-slate-300 my-1" />
                <Linea label="UTILIDAD NETA" monto={data.utilidad_neta.monto} pct={data.utilidad_neta.pct} bold color={data.utilidad_neta.monto >= 0 ? "text-emerald-600" : "text-rose-600"} />
              </div>
            )}
          </>
        )}

        {/* TAB: FLUJOS */}
        {activeTab === "flujos" && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="h-12 w-12 text-slate-300 mb-4" />
            <p className="text-lg font-semibold text-slate-500">Estado de Flujos de Efectivo</p>
            <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded mt-2">
              PRÓXIMAMENTE
            </span>
          </div>
        )}

        {/* TAB: BALANCE */}
        {activeTab === "balance" && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Banknote className="h-12 w-12 text-slate-300 mb-4" />
            <p className="text-lg font-semibold text-slate-500">Balance General</p>
            <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded mt-2">
              PRÓXIMAMENTE
            </span>
          </div>
        )}
      </CardContent>

      {showPrint && <PrintModal data={data} onClose={() => setShowPrint(false)} />}
    </Card>
  );
}
