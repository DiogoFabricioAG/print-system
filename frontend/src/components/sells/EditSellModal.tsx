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
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import type { SellData } from "./SellsTable"

interface EditSellModalProps {
  sell: SellData | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (data: {
    diseno: string
    cliente_id: number
    pago: number
    cantidad?: string
    metro_total?: number
    maquina?: string
    estado?: string
    nota?: string
  }) => void;
}

export function EditSellModal({ sell, isOpen, onClose, onSuccess }: EditSellModalProps) {
  const [status, setStatus] = React.useState("");
  const [design, setDesign] = React.useState("");
  const [nota, setNota] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (sell) {
      setStatus(sell.status);
      setDesign(sell.design);
      setNota(sell.nota || "");
    }
  }, [sell]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sell) return
    
    setIsSubmitting(true)
    
    const data = {
      diseno: design,
      cliente_id: sell.clientId,
      pago: sell.amount,
      estado: status,
      nota: nota || undefined,
    }

    try {
      await onSuccess?.(data)
    } finally {
      setIsSubmitting(false)
    }
  };

  if (!sell) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[450px] bg-white border-slate-200 rounded-2xl p-0 overflow-hidden shadow-2xl">
        <form onSubmit={handleSubmit}>
          <div className="p-8">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-2xl font-bold text-slate-900 font-display">
                Actualizar Venta
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-5">
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <span className="text-xs font-semibold text-slate-500 uppercase">Cliente</span>
                <p className="text-base font-medium text-slate-800 mt-1">{sell.client}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="design" className="text-slate-700 font-semibold">Diseño / Trabajo</Label>
                <Input 
                  id="design" 
                  value={design}
                  onChange={(e) => setDesign(e.target.value)}
                  placeholder="Ej. Tarjetas de presentación x100" 
                  required 
                  className="rounded-xl border-slate-200 focus-visible:ring-[#30b7ff]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status" className="text-slate-700 font-semibold">Estado de la Venta</Label>
                <select 
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#30b7ff]"
                >
                  <option value="Debe">Debe</option>
                  <option value="En Producción">En Producción</option>
                  <option value="Cancelado">Cancelado</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nota" className="text-slate-700 font-semibold">Nota</Label>
                <Textarea 
                  id="nota" 
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  placeholder="Alguna observación..." 
                  className="rounded-xl border-slate-200 resize-none h-20 focus-visible:ring-[#30b7ff]"
                />
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
              className="rounded-xl bg-[#ff9f43] hover:bg-[#e68c34] text-white shadow-sm"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}