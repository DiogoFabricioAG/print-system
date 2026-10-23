import * as React from "react";
import { AlertTriangle, Check, LogOut, Search } from "lucide-react";
import { authApi, trackingApi, type WorkerSale } from "@/lib/api";
import { formatBusinessDate, getBusinessDateKey } from "@/lib/business-date";
import { showToast } from "@/lib/toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type SaleFilter = "Pendientes" | "Registradas" | "Todas";

function saleDate(sale: WorkerSale): string {
  return formatBusinessDate(getBusinessDateKey(sale.fecha) ?? getBusinessDateKey(sale.creado_el) ?? "");
}

export function WorkerSalesView() {
  const [sales, setSales] = React.useState<WorkerSale[]>([]);
  const [stage, setStage] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState<SaleFilter>("Pendientes");
  const [visibleCount, setVisibleCount] = React.useState(20);
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [busyId, setBusyId] = React.useState<number | null>(null);
  const [name, setName] = React.useState("");
  const [confirmSale, setConfirmSale] = React.useState<WorkerSale | null>(null);

  const load = React.useCallback(async () => {
    const data = await trackingApi.getWorkerSales();
    setStage(data.etapa);
    setSales(data.ventas);
  }, []);

  React.useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("printsystem_user") ?? "null");
      setName(stored?.nombre || stored?.username || "Trabajador");
    } catch { setName("Trabajador"); }
    load().catch((cause) => setError(cause instanceof Error ? cause.message : "No se pudieron cargar las ventas"))
      .finally(() => setLoading(false));
  }, [load]);

  const pendingCount = sales.filter((sale) => sale.estado === "Pendiente").length;
  const registeredCount = sales.length - pendingCount;
  React.useEffect(() => setVisibleCount(20), [search, filter]);

  const filtered = sales.filter((sale) => {
    const matchesSearch = `${sale.cliente} ${sale.diseno}`.toLocaleLowerCase().includes(search.toLocaleLowerCase());
    const matchesFilter = filter === "Todas" || (filter === "Pendientes" ? sale.estado === "Pendiente" : sale.estado === "Registrado");
    return matchesSearch && matchesFilter;
  });
  const visible = filtered.slice(0, visibleCount);

  function register(sale: WorkerSale) {
    if (sale.faltantes_anteriores > 0) {
      setConfirmSale(sale);
      return;
    }
    void performRegister(sale);
  }

  async function performRegister(sale: WorkerSale) {
    setConfirmSale(null);
    setBusyId(sale.id);
    setError("");
    try {
      await trackingApi.markStage(sale.id);
      await load();
      showToast.success(`${stage} registrado para la venta #${sale.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo registrar la etapa");
    } finally {
      setBusyId(null);
    }
  }

  async function logout() {
    await authApi.logout().catch(() => undefined);
    localStorage.removeItem("printsystem_user");
    window.location.href = "/login";
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-3 py-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:space-y-6 sm:px-6 sm:py-8">
      <header className="flex items-start justify-between gap-3 rounded-2xl bg-slate-900 px-4 py-5 text-white sm:px-6 sm:py-7">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-sky-300">Vista del trabajador</p>
          <h1 className="mt-2 text-xl font-bold leading-tight sm:text-2xl">Trabajos de {stage || "producción"}</h1>
          <p className="mt-2 text-sm text-slate-300">{name} · Registra tu etapa al terminar.</p>
        </div>
        <button type="button" onClick={logout} aria-label="Cerrar sesión" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/30 hover:bg-white/10 sm:w-auto sm:gap-2 sm:px-3">
          <LogOut className="h-5 w-5" /> <span className="hidden text-sm font-semibold sm:inline">Salir</span>
        </button>
      </header>

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      <div className="relative w-full sm:max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar cliente o diseño" aria-label="Buscar cliente o diseño"
          className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-sky-400" />
      </div>

      <div className="grid grid-cols-3 gap-2" aria-label="Filtrar ventas">
        {(["Pendientes", "Registradas", "Todas"] as const).map((option) => (
          <button key={option} type="button" onClick={() => setFilter(option)} aria-pressed={filter === option}
            className={`min-h-11 rounded-xl px-2 py-2 text-xs font-semibold sm:text-sm ${filter === option ? "bg-sky-700 text-white" : "border border-slate-200 bg-white text-slate-600"}`}>
            {option} <span className="tabular-nums opacity-75">{option === "Pendientes" ? pendingCount : option === "Registradas" ? registeredCount : sales.length}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:hidden">
        {visible.map((sale) => (
          <article key={sale.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="break-words text-base font-bold text-slate-900">{sale.cliente}</p>
                <p className="mt-1 text-xs text-slate-500">Venta #{sale.id} · {saleDate(sale)}</p>
              </div>
              <span className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold ${sale.estado === "Registrado" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{sale.estado}</span>
            </div>
            <div className="mt-4 border-t border-slate-100 pt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Diseño</p>
              <p className="mt-1 break-words text-sm leading-6 text-slate-800">{sale.diseno}</p>
            </div>
            {sale.estado === "Pendiente" && sale.faltantes_anteriores > 0 && (
              <p className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-800">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> Hay etapas anteriores sin registrar. Puedes continuar; el jefe verá un aviso.
              </p>
            )}
            {sale.estado === "Registrado" ? (
              <p className="mt-4 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-50 text-sm font-semibold text-emerald-700"><Check className="h-5 w-5" /> Etapa registrada</p>
            ) : (
              <button type="button" disabled={busyId !== null} onClick={() => register(sale)} className="mt-4 min-h-12 w-full rounded-xl bg-sky-700 px-4 text-sm font-bold text-white hover:bg-sky-800 disabled:opacity-50">
                {busyId === sale.id ? "Guardando..." : `Registrar ${stage}`}
              </button>
            )}
          </article>
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm lg:block">
        <table className="w-full min-w-[42rem] text-left text-sm">
          <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-600">
            <tr><th className="px-5 py-4">Cliente</th><th className="px-5 py-4">Diseño</th><th className="px-5 py-4">Estado</th><th className="px-5 py-4">Fecha</th><th className="px-5 py-4 text-right">Acciones</th></tr>
          </thead>
          <tbody>
            {visible.map((sale) => (
              <tr key={sale.id} className="border-t border-slate-100">
                <td className="px-5 py-4 font-semibold text-slate-900">{sale.cliente}</td>
                <td className="px-5 py-4 text-slate-700">{sale.diseno}<span className="ml-2 text-xs text-slate-400">#{sale.id}</span></td>
                <td className="px-5 py-4">
                  <span className={`rounded-lg px-2.5 py-1 text-xs font-bold ${sale.estado === "Registrado" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{sale.estado}</span>
                  {sale.estado === "Pendiente" && sale.faltantes_anteriores > 0 && <span className="mt-2 flex items-center gap-1 text-xs text-amber-700"><AlertTriangle className="h-3.5 w-3.5" /> Etapas previas sin registrar</span>}
                </td>
                <td className="px-5 py-4 text-slate-600">{saleDate(sale)}</td>
                <td className="px-5 py-4 text-right">
                  {sale.estado === "Registrado"
                    ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"><Check className="h-4 w-4" /> Hecho</span>
                    : <button type="button" disabled={busyId !== null} onClick={() => register(sale)} className="rounded-lg bg-sky-700 px-3 py-2 text-xs font-bold text-white hover:bg-sky-800 disabled:opacity-50">{busyId === sale.id ? "Guardando..." : `Registrar ${stage}`}</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {loading && <p className="rounded-xl bg-white px-5 py-8 text-center text-sm text-slate-500">Cargando ventas...</p>}
      {!loading && filtered.length === 0 && <p className="rounded-xl bg-white px-5 py-8 text-center text-sm text-slate-500">{filter === "Pendientes" ? "No tienes trabajos pendientes." : "No hay ventas para mostrar."}</p>}
      {filtered.length > visibleCount && <button type="button" onClick={() => setVisibleCount((count) => count + 20)} className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700">Mostrar más ventas</button>}

      <Dialog open={confirmSale !== null} onOpenChange={(open) => { if (!open && busyId === null) setConfirmSale(null); }}>
        <DialogContent className="max-w-[calc(100%-1.5rem)] rounded-2xl bg-white p-5 sm:max-w-md sm:p-6">
          <DialogHeader>
            <DialogTitle className="pr-8 text-lg font-bold text-slate-900">Etapas anteriores sin registrar</DialogTitle>
          </DialogHeader>
          <p className="text-sm leading-6 text-slate-600">Puedes registrar {stage} de la venta #{confirmSale?.id}. El jefe recibirá un aviso de que faltan {confirmSale?.faltantes_anteriores} etapa(s) anteriores.</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <button type="button" onClick={() => setConfirmSale(null)} className="min-h-12 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700">Cancelar</button>
            <button type="button" onClick={() => confirmSale && void performRegister(confirmSale)} className="min-h-12 rounded-xl bg-sky-700 px-3 text-sm font-bold text-white hover:bg-sky-800">Registrar {stage}</button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
