import { formatBusinessDate } from "@/lib/business-date";
import type { SellData } from "./SellsTable";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  User,
  Scissors,
  CalendarDays,
  MonitorPlay,
  PackageOpen,
  StickyNote,
  X,
} from "lucide-react";

interface SellDetailModalProps {
  sell: SellData | null;
  isOpen: boolean;
  onClose: () => void;
}

export function SellDetailModal({
  sell,
  isOpen,
  onClose,
}: SellDetailModalProps) {
  if (!sell) return null;

  const getStatusColor = (status: string) => {
    const colors: Record<string, { bg: string; text: string; border: string }> =
      {
        "Debe": {
          bg: "bg-rose-50",
          text: "text-rose-600",
          border: "border-rose-200",
        },
        "Crédito": {
          bg: "bg-amber-50",
          text: "text-amber-600",
          border: "border-amber-200",
        },
        "Pagó": {
          bg: "bg-emerald-50",
          text: "text-emerald-600",
          border: "border-emerald-200",
        },
        // Compatibilidad
        "Pago": { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-200" },
        "En Producción": { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-200" },
        "Cancelado": { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-200" },
      };
    return (
      colors[status] || {
        bg: "bg-slate-50",
        text: "text-slate-600",
        border: "border-slate-200",
      }
    );
  };

  const statusStyle = getStatusColor(sell.status);


  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent showCloseButton={false} className="max-h-[calc(100dvh-1rem)] max-w-[calc(100%-1rem)] overflow-y-auto rounded-2xl border-slate-200 bg-slate-50 p-0 shadow-2xl sm:max-h-[90vh] sm:max-w-[600px]">
        {/* Top Header con Status Gradient */}
        <div
          className={`h-32 w-full absolute top-0 left-0 bg-gradient-to-b opacity-50 pointer-events-none ${statusStyle.bg}`}
        />

        <div className="relative z-10 p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:p-8">
          <DialogHeader className="mb-5 sm:mb-8">
            <div className="flex items-start justify-between">
              <div>
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border} mb-3`}
                >
                  {sell.status}
                </span>
                <DialogTitle className="font-display text-2xl font-bold leading-tight text-slate-900 sm:text-3xl">
                  S/{" "}
                  {sell.amount.toLocaleString("es-PE", {
                    minimumFractionDigits: 2,
                  })}
                </DialogTitle>
              </div>
              <button type="button" onClick={onClose} aria-label="Cerrar información" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm">
                <X className="h-5 w-5" />
              </button>
            </div>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 md:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">Método de pago</p>
              <p className="mt-1 font-semibold text-slate-800">{sell.metodo_pago ?? "Yape"}</p>
            </div>
            {/* Cliente */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm flex gap-3 sm:gap-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0">
                <User className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Cliente
                </p>
                <p className="font-bold text-slate-800 leading-tight">
                  <a 
                    href={`/clientes/detalle?id=${sell.clientId}`} 
                    className="hover:text-sky-700 transition-colors underline-offset-4 hover:underline"
                    title="Ver perfil del cliente"
                  >
                    {sell.client}
                  </a>
                </p>
              </div>
            </div>

            {/* Fecha */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm flex gap-3 sm:gap-4">
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center shrink-0">
                <CalendarDays className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Fecha
                </p>
                <p className="font-bold text-slate-800 leading-tight">
                  {formatBusinessDate(sell.date)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-4">
            {/* Diseño */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex gap-3 sm:gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
                <Scissors className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Diseño / Trabajo
                </p>
                <p className="font-medium text-slate-800">{sell.design}</p>
              </div>
            </div>

            {/* Detalles Técnicos */}
            <div className="p-4 sm:p-5 bg-slate-50/50 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <PackageOpen className="w-3.5 h-3.5" /> Cant.
                </p>
                <p className="font-medium text-slate-700">
                  {sell.cantidad || "-"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <MonitorPlay className="w-3.5 h-3.5" /> Máquina
                </p>
                <p className="font-medium text-slate-700">
                  {sell.maquina || "-"}
                </p>
              </div>
            </div>
          </div>

          {/* Notas */}
          {sell.nota && (
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm flex gap-3 sm:gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
                <StickyNote className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Notas / Observaciones
                </p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">
                  {sell.nota}
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
