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
import type { ClientData } from "./ClientDetailModal"

interface EditClientModalProps {
  client: ClientData | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (data: { nombre: string; numero?: number; descripcion?: string }) => void;
}

export function EditClientModal({ client, isOpen, onClose, onSuccess }: EditClientModalProps) {
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (client) {
      setName(client.name);
      setPhone(client.phone);
      setDescription(client.description);
    }
  }, [client]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true)

    const data = {
      nombre: name,
      numero: phone ? Number(phone) : undefined,
      descripcion: description || undefined,
    }

    try {
      await onSuccess?.(data)
    } finally {
      setIsSubmitting(false)
    }
  };

  if (!client) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[450px] bg-white border-slate-200 rounded-2xl p-0 overflow-hidden shadow-2xl">
        <form onSubmit={handleSubmit}>
          <div className="p-8">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-2xl font-bold text-slate-900 font-display">
                Editar Cliente
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="edit-name" className="text-slate-700 font-semibold">Nombre del Cliente</Label>
                <Input 
                  id="edit-name" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required 
                  className="rounded-xl border-slate-200 focus-visible:ring-[#30b7ff]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-phone" className="text-slate-700 font-semibold">Número de Celular</Label>
                <Input 
                  id="edit-phone" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required 
                  className="rounded-xl border-slate-200 focus-visible:ring-[#30b7ff]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description" className="text-slate-700 font-semibold">Descripción del Cliente</Label>
                <Textarea 
                  id="edit-description" 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
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
