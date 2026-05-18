import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Loader2, Banknote, Receipt } from "lucide-react"
import type { SellData } from "./SellsTable"

interface AddPaymentModalProps {
  sell: SellData | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newPagoActual: number) => void;
}

export function AddPaymentModal({ sell, isOpen, onClose, onSuccess }: AddPaymentModalProps) {
  const [amountToAdd, setAmountToAdd] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!isOpen) {
      setAmountToAdd("");
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sell || isSubmitting) return;

    const numAmount = parseFloat(amountToAdd);
    if (isNaN(numAmount) || numAmount <= 0) return;

    const newTotal = (sell.pago_actual || 0) + numAmount;
    
    setIsSubmitting(true);

    try {
      await onSuccess?.(newTotal);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!sell) return null;

  const currentPayment = sell.pago_actual || 0;
  const missingAmount = sell.amount - currentPayment;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open && !isSubmitting) onClose()
    }}>
      <DialogContent className="sm:max-w-[450px] bg-white border-slate-200 rounded-2xl p-0 overflow-hidden shadow-2xl">
        {/* Overlay de carga */}
        {isSubmitting && (
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-[2px] flex flex-col items-center justify-center z-50">
            <div className="bg-white p-5 rounded-2xl shadow-xl flex flex-col items-center">
              <Loader2 className="h-8 w-8 text-[#f59e0b] animate-spin mb-3" />
              <p className="text-sm font-semibold text-slate-700">Procesando pago...</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="p-8">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-2xl font-bold text-slate-900 font-display flex items-center gap-2">
                <Banknote className="h-6 w-6 text-amber-500" />
                Aumentar Pago
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Información General */}
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col gap-1 text-sm text-slate-600">
                <p><span className="font-semibold text-slate-700">Cliente:</span> {sell.client}</p>
                <p><span className="font-semibold text-slate-700">Diseño:</span> {sell.design}</p>
              </div>

              {/* Contadores */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Receipt className="w-3.5 h-3.5" /> Total
                  </p>
                  <p className="text-lg font-bold text-slate-800">
                    S/ {sell.amount.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Falta pagar
                  </p>
                  <p className="text-lg font-bold text-rose-600">
                    S/ {Math.max(0, missingAmount).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="amountToAdd" className="text-slate-700 font-semibold">
                  Monto a agregar (S/)
                </Label>
                <Input 
                  id="amountToAdd" 
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={missingAmount > 0 ? missingAmount : undefined}
                  value={amountToAdd}
                  onChange={(e) => setAmountToAdd(e.target.value)}
                  placeholder="Ej. 50.00" 
                  required 
                  className="rounded-xl border-slate-200 focus-visible:ring-[#f59e0b] h-12 text-lg font-medium"
                />
                {currentPayment > 0 && (
                  <p className="text-xs text-slate-500 font-medium">
                    Pago actual acumulado: S/ {currentPayment.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                  </p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="bg-slate-50 px-8 py-4 border-t border-slate-100 flex gap-3 sm:justify-end">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-100"
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button 
              type="submit"
              className="rounded-xl bg-amber-500 hover:bg-amber-600 text-white shadow-sm"
              disabled={isSubmitting || !amountToAdd}
            >
              Registrar Pago
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}