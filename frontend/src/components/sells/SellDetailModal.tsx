import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface SellDetailModalProps {
  sell: any;
  isOpen: boolean;
  onClose: () => void;
}

export function SellDetailModal({ sell, isOpen, onClose }: SellDetailModalProps) {
  if (!sell) return null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
      "Sin Cobrar": { bg: "bg-[#fef3c7]", text: "text-[#b45309]", border: "border-[#fde047]" },
      "En Producción": { bg: "bg-[#dbeafe]", text: "text-[#1d4ed8]", border: "border-[#93c5fd]" },
      "Completado": { bg: "bg-[#dcfce7]", text: "text-[#15803d]", border: "border-[#86efac]" },
      "Cancelado": { bg: "bg-[#f1f5f9]", text: "text-[#64748b]", border: "border-[#cbd5e1]" },
    };
    return colors[status] || { bg: "bg-gray-100", text: "text-gray-700", border: "border-gray-200" };
  };

  const statusStyle = getStatusColor(sell.status);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] bg-slate-50 border-slate-200 rounded-2xl p-0 overflow-hidden shadow-2xl">
        <div className="p-8">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-3xl font-bold text-slate-900 font-display">
              Información de Venta
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Main Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-xl p-4 border border-slate-200">
                <span className="text-xs font-semibold text-slate-500 uppercase">Cliente</span>
                <p className="text-lg font-bold text-slate-800 mt-1">{sell.client}</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-slate-200">
                <span className="text-xs font-semibold text-slate-500 uppercase">Monto</span>
                <p className="text-lg font-bold text-slate-800 mt-1 tabular-nums">S/ {sell.amount.toLocaleString('es-PE')}</p>
              </div>
            </div>

            {/* Design Details */}
            <div className="bg-white rounded-xl p-4 border border-slate-200">
              <span className="text-xs font-semibold text-slate-500 uppercase">Diseño / Trabajo</span>
              <p className="text-base text-slate-800 mt-1">{sell.design}</p>
            </div>

            {/* Status and Date */}
            <div className="grid grid-cols-2 gap-4">
              <div className={`rounded-xl p-4 border ${statusStyle.bg} ${statusStyle.border}`}>
                <span className="text-xs font-semibold opacity-70 uppercase">Estado</span>
                <p className={`text-lg font-bold mt-1 ${statusStyle.text}`}>{sell.status}</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-slate-200">
                <span className="text-xs font-semibold text-slate-500 uppercase">Fecha</span>
                <p className="text-base font-medium text-slate-800 mt-1">{formatDate(sell.date)}</p>
              </div>
            </div>

            {/* Notas */}
            {sell.nota && (
              <div className="bg-white rounded-xl p-4 border border-slate-200">
                <span className="text-xs font-semibold text-slate-500 uppercase">Notas</span>
                <p className="text-base text-slate-800 mt-1 whitespace-pre-wrap">{sell.nota}</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}