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
import { ClientAutocomplete } from "@/components/ui/client-autocomplete"
import type { Client } from "@/lib/api"

interface RegisterSellModalProps {
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
  clients: Client[];
}

export function RegisterSellModal({ isOpen, onClose, onSuccess, clients }: RegisterSellModalProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [selectedClientId, setSelectedClientId] = React.useState<number | null>(null)

  React.useEffect(() => {
    if (!isOpen) {
      setSelectedClientId(null)
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedClientId) return
    
    setIsSubmitting(true)
    
    const formData = new FormData(e.currentTarget)
    
    const data = {
      diseno: formData.get("diseno") as string,
      cliente_id: selectedClientId,
      pago: Number(formData.get("pago")),
      cantidad: formData.get("cantidad") as string || undefined,
      metro_total: formData.get("metro_total") ? Number(formData.get("metro_total")) : undefined,
      maquina: formData.get("maquina") as string || undefined,
      estado: formData.get("estado") as string || "Sin Cobrar",
      nota: formData.get("nota") as string || undefined,
    }

    try {
      await onSuccess?.(data)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] bg-white border-slate-200 rounded-2xl p-0 overflow-hidden shadow-2xl">
        <form onSubmit={handleSubmit}>
          <div className="p-8">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-2xl font-bold text-slate-900 font-display">
                Registrar Venta
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="diseno" className="text-slate-700 font-semibold">Diseño / Trabajo</Label>
                <Input 
                  id="diseno" 
                  name="diseno"
                  placeholder="Ej. Tarjetas de presentación x100" 
                  required 
                  className="rounded-xl border-slate-200 focus-visible:ring-[#30b7ff]"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-700 font-semibold">Cliente</Label>
                <ClientAutocomplete
                  clients={clients}
                  value={selectedClientId}
                  onChange={setSelectedClientId}
                  placeholder="Buscar cliente..."
                />
                <input type="hidden" name="cliente_id" value={selectedClientId || ""} />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pago" className="text-slate-700 font-semibold">Monto (S/)</Label>
                  <Input 
                    id="pago" 
                    name="pago"
                    type="number"
                    step="0.01"
                    placeholder="0.00" 
                    required 
                    className="rounded-xl border-slate-200 focus-visible:ring-[#30b7ff]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cantidad" className="text-slate-700 font-semibold">Cantidad</Label>
                  <Input 
                    id="cantidad" 
                    name="cantidad"
                    placeholder="Ej. 100" 
                    className="rounded-xl border-slate-200 focus-visible:ring-[#30b7ff]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="metro_total" className="text-slate-700 font-semibold">Metro Total</Label>
                  <Input 
                    id="metro_total" 
                    name="metro_total"
                    type="number"
                    step="0.01"
                    placeholder="Ej. 2.5" 
                    className="rounded-xl border-slate-200 focus-visible:ring-[#30b7ff]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maquina" className="text-slate-700 font-semibold">Máquina</Label>
                  <Input 
                    id="maquina" 
                    name="maquina"
                    placeholder="Ej. Plotter 1" 
                    className="rounded-xl border-slate-200 focus-visible:ring-[#30b7ff]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estado" className="text-slate-700 font-semibold">Estado</Label>
                  <select 
                    id="estado" 
                    name="estado"
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#30b7ff]"
                  >
                    <option value="Sin Cobrar">Sin Cobrar</option>
                    <option value="En Producción">En Producción</option>
                    <option value="Completado">Completado</option>
                    <option value="Cancelado">Cancelado</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nota" className="text-slate-700 font-semibold">Nota</Label>
                <Textarea 
                  id="nota" 
                  name="nota"
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
              className="rounded-xl bg-[#30b7ff] hover:bg-[#209fdf] text-white shadow-sm"
              disabled={isSubmitting || !selectedClientId}
            >
              {isSubmitting ? "Registrando..." : "Registrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}