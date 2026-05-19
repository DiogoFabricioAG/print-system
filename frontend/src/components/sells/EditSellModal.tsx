import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import type { SellData } from "./SellsTable";

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
    fecha?: string
  }) => void;
}

export function EditSellModal({
  sell,
  isOpen,
  onClose,
  onSuccess,
}: EditSellModalProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Estados locales para los campos
  const [design, setDesign] = React.useState("");
  const [pago, setPago] = React.useState("");
  const [cantidad, setCantidad] = React.useState("");
  const [metroTotal, setMetroTotal] = React.useState("");
  const [maquina, setMaquina] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [nota, setNota] = React.useState("");
  const [fecha, setFecha] = React.useState("");

  React.useEffect(() => {
    if (sell) {
      setDesign(sell.design);
      setPago(String(sell.amount));
      setCantidad(sell.cantidad || "");
      setMetroTotal(sell.metro_total ? String(sell.metro_total) : "");
      setMaquina(sell.maquina || "");
      setStatus(sell.status);
      setNota(sell.nota || "");

      // La fecha en `sell.date` podría venir como `YYYY-MM-DD` o un string de fecha largo
      // Necesitamos asegurar que el input type="date" reciba `YYYY-MM-DD`
      let formattedDate = "";
      if (sell.date) {
        if (sell.date.includes("-") && sell.date.length >= 10) {
          formattedDate = sell.date.substring(0, 10);
        } else {
          // Fallback por si la fecha viene en otro formato que Date pueda parsear
          try {
            const d = new Date(sell.date);
            if (!isNaN(d.getTime())) {
              formattedDate = d.toISOString().split("T")[0];
            }
          } catch (e) {}
        }
      }
      setFecha(formattedDate || new Date().toISOString().split("T")[0]);
    }
  }, [sell]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sell || isSubmitting) return;

    setIsSubmitting(true);

    const data = {
      diseno: design,
      cliente_id: sell.clientId, // El cliente no se cambia aquí
      pago: Number(pago),
      cantidad: cantidad || undefined,
      metro_total: metroTotal ? Number(metroTotal) : undefined,
      maquina: maquina || undefined,
      estado: status,
      nota: nota || undefined,
      fecha: fecha || undefined,
    };

    try {
      await onSuccess?.(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!sell) return null;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isSubmitting) onClose();
      }}
    >
      <DialogContent className="sm:max-w-[500px] bg-white border-slate-200 rounded-2xl p-0 overflow-hidden shadow-2xl">
        {/* Overlay de carga */}
        {isSubmitting && (
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-[2px] flex flex-col items-center justify-center z-50">
            <div className="bg-white p-5 rounded-2xl shadow-xl flex flex-col items-center">
              <Loader2 className="h-8 w-8 text-[#ff9f43] animate-spin mb-3" />
              <p className="text-sm font-semibold text-slate-700">
                Preparando actualización...
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="p-8">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-2xl font-bold text-slate-900 font-display">
                Actualizar Venta
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <span className="text-xs font-semibold text-slate-500 uppercase">
                  Cliente (No editable)
                </span>
                <p className="text-base font-medium text-slate-800 mt-1">
                  {sell.client}
                </p>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="design"
                  className="text-slate-700 font-semibold"
                >
                  Diseño / Trabajo
                </Label>
                <Input
                  id="design"
                  value={design}
                  onChange={(e) => setDesign(e.target.value)}
                  placeholder="Ej. Tarjetas de presentación x100"
                  required
                  className="rounded-xl border-slate-200 focus-visible:ring-[#30b7ff]"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="pago"
                    className="text-slate-700 font-semibold"
                  >
                    Pago (S/)
                  </Label>
                  <Input
                    id="pago"
                    type="number"
                    step="0.01"
                    value={pago}
                    onChange={(e) => setPago(e.target.value)}
                    placeholder="0.00"
                    required
                    className="rounded-xl border-slate-200 focus-visible:ring-[#30b7ff]"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="cantidad"
                    className="text-slate-700 font-semibold"
                  >
                    Cantidad
                  </Label>
                  <Input
                    id="cantidad"
                    value={cantidad}
                    onChange={(e) => setCantidad(e.target.value)}
                    placeholder="Ej. 100"
                    className="rounded-xl border-slate-200 focus-visible:ring-[#30b7ff]"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="metro_total"
                    className="text-slate-700 font-semibold"
                  >
                    Metro Total
                  </Label>
                  <Input
                    id="metro_total"
                    type="number"
                    step="0.01"
                    value={metroTotal}
                    onChange={(e) => setMetroTotal(e.target.value)}
                    placeholder="Ej. 2.5"
                    className="rounded-xl border-slate-200 focus-visible:ring-[#30b7ff]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="maquina"
                    className="text-slate-700 font-semibold"
                  >
                    Máquina
                  </Label>
                  <Input
                    id="maquina"
                    value={maquina}
                    onChange={(e) => setMaquina(e.target.value)}
                    placeholder="Ej. Plotter 1"
                    className="rounded-xl border-slate-200 focus-visible:ring-[#30b7ff]"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="status"
                    className="text-slate-700 font-semibold"
                  >
                    Estado
                  </Label>
                  <select
                    id="status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#30b7ff]"
                  >
                  <option value="Debe">Debe</option>
                  <option value="Crédito">Crédito</option>
                  <option value="Pagó">Pagó</option>
                  
                  {/* Si el registro antiguo tenía un valor diferente y aún no se actualiza */}
                  {!["Debe", "Crédito", "Pagó"].includes(status) && status && (
                     <option value={status} className="hidden">{status}</option>
                  )}
                </select>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="fecha"
                    className="text-slate-700 font-semibold"
                  >
                    Fecha
                  </Label>
                  <Input
                    id="fecha"
                    type="date"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    className="rounded-xl border-slate-200 focus-visible:ring-[#30b7ff]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nota" className="text-slate-700 font-semibold">
                  Nota
                </Label>
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
              Guardar Cambios
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
