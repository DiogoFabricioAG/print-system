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
import { Loader2 } from "lucide-react"

interface RegisterClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (data: { nombre: string; numero?: number; descripcion?: string }) => void;
}

export function RegisterClientModal({ isOpen, onClose, onSuccess }: RegisterClientModalProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (isSubmitting) return;
    setIsSubmitting(true)
    
    const formData = new FormData(e.currentTarget)
    const data = {
      nombre: formData.get("name") as string,
      numero: formData.get("phone") ? Number(formData.get("phone")) : undefined,
      descripcion: formData.get("description") as string || undefined,
    }

    try {
      await onSuccess?.(data)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open && !isSubmitting) onClose()
    }}>
      <DialogContent className="sm:max-w-[450px] bg-white border-slate-200 rounded-2xl p-0 overflow-hidden shadow-2xl">
        {/* Overlay de carga */}
        {isSubmitting && (
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-[2px] flex flex-col items-center justify-center z-50">
            <div className="bg-white p-5 rounded-2xl shadow-xl flex flex-col items-center">
              <Loader2 className="h-8 w-8 text-[#30b7ff] animate-spin mb-3" />
              <p className="text-sm font-semibold text-slate-700">Registrando cliente...</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="p-8">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-2xl font-bold text-slate-900 font-display">
                Registrar Cliente
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-slate-700 font-semibold">Nombre del Cliente</Label>
                <Input 
                  id="name" 
                  name="name"
                  placeholder="Ej. Empresa Alpha SAC" 
                  required 
                  className="rounded-xl border-slate-200 focus-visible:ring-[#30b7ff]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-slate-700 font-semibold">Número de Celular</Label>
                <Input 
                  id="phone" 
                  name="phone"
                  type="tel"
                  placeholder="Ej. 999999999" 
                  className="rounded-xl border-slate-200 focus-visible:ring-[#30b7ff]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-slate-700 font-semibold">Descripción del Cliente</Label>
                <Textarea 
                  id="description" 
                  name="description"
                  placeholder="Ej. Cliente frecuente, suele pedir facturas..." 
                  className="rounded-xl border-slate-200 resize-none h-24 focus-visible:ring-[#30b7ff]"
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
              disabled={isSubmitting}
            >
              {isSubmitting ? "Registrando..." : "Registrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
