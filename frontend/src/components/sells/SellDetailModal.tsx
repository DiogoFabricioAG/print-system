import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  User,
  Receipt,
  Scissors,
  CalendarDays,
  MonitorPlay,
  Ruler,
  PackageOpen,
  StickyNote,
} from "lucide-react";

interface SellDetailModalProps {
  sell: any;
  isOpen: boolean;
  onClose: () => void;
}

export function SellDetailModal({
  sell,
  isOpen,
  onClose,
}: SellDetailModalProps) {
  if (!sell) return null;

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    // Comprobar si ya viene en formato YYYY-MM-DD
    if (dateString.includes("-") && dateString.length === 10) {
      const [y, m, d] = dateString.split("-");
      return `${d}/${m}/${y}`;
    }
    const date = new Date(dateString);
    return date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

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
      <DialogContent className="sm:max-w-[600px] bg-slate-50 border-slate-200 rounded-2xl p-0 overflow-hidden shadow-2xl">
        {/* Top Header con Status Gradient */}
        <div
          className={`h-32 w-full absolute top-0 left-0 bg-gradient-to-b opacity-50 pointer-events-none ${statusStyle.bg}`}
        />

        <div className="p-8 relative z-10">
          <DialogHeader className="mb-8">
            <div className="flex items-start justify-between">
              <div>
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border} mb-3`}
                >
                  {sell.status}
                </span>
                <DialogTitle className="text-3xl font-bold text-slate-900 font-display leading-tight">
                  S/{" "}
                  {sell.amount.toLocaleString("es-PE", {
                    minimumFractionDigits: 2,
                  })}
                </DialogTitle>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-slate-200 flex items-center justify-center text-slate-400">
                <Receipt className="w-6 h-6" />
              </div>
            </div>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Cliente */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0">
                <User className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Cliente
                </p>
                <p className="font-bold text-slate-800 leading-tight">
                  <a 
                    href={`/clientes/detalle?id=${sell.clientId}`} 
                    className="hover:text-[#30b7ff] transition-colors underline-offset-4 hover:underline"
                    title="Ver perfil del cliente"
                  >
                    {sell.client}
                  </a>
                </p>
              </div>
            </div>

            {/* Fecha */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center shrink-0">
                <CalendarDays className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Fecha
                </p>
                <p className="font-bold text-slate-800 leading-tight">
                  {formatDate(sell.date)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-4">
            {/* Diseño */}
            <div className="p-5 border-b border-slate-100 flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
                <Scissors className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Diseño / Trabajo
                </p>
                <p className="font-medium text-slate-800">{sell.design}</p>
              </div>
            </div>

            {/* Detalles Técnicos */}
            <div className="p-5 bg-slate-50/50 grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <PackageOpen className="w-3.5 h-3.5" /> Cant.
                </p>
                <p className="font-medium text-slate-700">
                  {sell.cantidad || "-"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Ruler className="w-3.5 h-3.5" /> Metro
                </p>
                <p className="font-medium text-slate-700">
                  {sell.metro_total ? `${sell.metro_total} m` : "-"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
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
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
                <StickyNote className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
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
