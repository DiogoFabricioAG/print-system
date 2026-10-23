import * as React from "react";
import { Bell, CheckCheck, ChevronLeft } from "lucide-react";
import { notificationsApi, type NotificationsResponse, type WorkNotification } from "@/lib/api";

const STAGES = ["", "Imprimir", "Planchar"];

function notificationDate(value: string): string {
  const date = new Date(value.includes("T") ? value : `${value.replace(" ", "T")}Z`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("es-PE", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Lima",
  }).format(date);
}

function NotificationItem({ item }: { item: WorkNotification }) {
  return (
    <li className={`border-b border-slate-100 last:border-b-0 ${item.leido_el ? "bg-white" : "bg-sky-50/70"}`}>
      <a href={`/ventas?venta=${item.venta_id}`} className="block px-4 py-3 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-sky-600">
        <span className="flex items-start justify-between gap-3">
          <span className="text-sm font-semibold text-slate-900">Venta #{item.venta_id} · {item.cliente}</span>
          {!item.leido_el && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-sky-700" aria-label="Sin leer" />}
        </span>
        <span className="mt-1 block text-sm text-slate-600">{STAGES[item.orden_omitido] ?? "Etapa"} no se registró antes de {STAGES[item.detectado_en_orden] ?? "la siguiente etapa"}.</span>
        <time className="mt-1 block text-xs text-slate-500">{notificationDate(item.detectado_el)}</time>
      </a>
    </li>
  );
}

export function NotificationBell() {
  const [data, setData] = React.useState<NotificationsResponse | null>(null);
  const [open, setOpen] = React.useState(false);
  const [showAll, setShowAll] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const rootRef = React.useRef<HTMLDivElement>(null);

  const refresh = React.useCallback(async () => {
    try {
      const result = await notificationsApi.getAll();
      setData(result);
      setError("");
    } catch {
      setError("No se pudieron cargar las notificaciones.");
    }
  }, []);

  React.useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => {
      if (!document.hidden) void refresh();
    }, 30000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  React.useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false);
    };
    const closeEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeEscape);
    };
  }, [open]);

  async function markAllRead() {
    setBusy(true);
    try {
      await notificationsApi.markAllRead();
      await refresh();
    } catch {
      setError("No se pudieron marcar las notificaciones como leídas.");
    } finally {
      setBusy(false);
    }
  }

  const notifications = data?.notificaciones ?? [];
  const visible = showAll ? notifications : notifications.slice(0, 5);
  const unread = data?.no_leidas ?? 0;

  return (
    <div ref={rootRef} className="sm:relative">
      <button
        type="button"
        aria-label={`Notificaciones${unread ? `, ${unread} sin leer` : ""}`}
        aria-expanded={open}
        aria-controls="notificaciones-panel"
        title="Notificaciones"
        onClick={() => {
          setOpen((wasOpen) => !wasOpen);
          setShowAll(false);
          if (!open) void refresh();
        }}
        className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-sky-600"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-rose-600 px-1 text-center text-[11px] font-bold leading-5 text-white">{unread > 99 ? "99+" : unread}</span>}
      </button>
      {open && (
        <section id="notificaciones-panel" aria-label="Notificaciones de trabajo" className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
            <div className="flex items-center gap-2">
              {showAll && <button type="button" onClick={() => setShowAll(false)} aria-label="Volver a las recientes" className="rounded-lg p-1 text-slate-600 hover:bg-slate-100"><ChevronLeft className="h-5 w-5" /></button>}
              <h2 className="font-bold text-slate-900">{showAll ? "Todas las notificaciones" : "Notificaciones"}</h2>
            </div>
            <span className="text-xs font-medium text-slate-500">{unread} sin leer</span>
          </div>
          {error && <p role="alert" className="px-4 py-3 text-sm text-rose-700">{error}</p>}
          <ul className="max-h-[min(60vh,28rem)] overflow-y-auto">
            {visible.map((item) => <NotificationItem key={`${item.venta_id}-${item.orden_omitido}`} item={item} />)}
          </ul>
          {!data && !error && <p className="px-4 py-8 text-center text-sm text-slate-600">Cargando notificaciones…</p>}
          {data && notifications.length === 0 && <p className="px-4 py-8 text-center text-sm text-slate-600">No hay notificaciones.</p>}
          <div className="flex flex-col gap-2 border-t border-slate-100 p-3">
            {!showAll && <button type="button" onClick={() => setShowAll(true)} className="min-h-11 rounded-xl px-3 text-sm font-semibold text-sky-700 hover:bg-sky-50">Ver todas las notificaciones</button>}
            <button type="button" onClick={markAllRead} disabled={busy || unread === 0} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-45"><CheckCheck className="h-4 w-4" /> Marcar todas como leídas</button>
          </div>
        </section>
      )}
    </div>
  );
}
