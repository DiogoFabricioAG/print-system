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
import { ClientAutocomplete } from "@/components/ui/client-autocomplete";
import { Loader2, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import type { Client } from "@/lib/api";
import { salesApi } from "@/lib/api";
import { showToast } from "@/lib/toast";

interface RegisterSellModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (data: {
    diseno: string;
    cliente_id: number;
    pago: number;
    cantidad?: string;
    metro_total?: number;
    maquina?: string;
    estado?: string;
    nota?: string;
    fecha?: string;
  }) => void;
  clients: Client[];
  onClientAdded?: (client: Client) => void;
  onBatchComplete?: () => void;
}

interface ParsedEntry {
  cliente: string | null;
  diseno: string | null;
  cantidad: number | null;
  metros: number | null;
  maquina: string | null;
}

const BOT_URL = "https://bot.diogofabricio17.workers.dev";

export function RegisterSellModal({
  isOpen,
  onClose,
  onSuccess,
  clients,
  onClientAdded,
  onBatchComplete,
}: RegisterSellModalProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [selectedClientId, setSelectedClientId] = React.useState<number | null>(null);

  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([]);
  const [parsedEntries, setParsedEntries] = React.useState<ParsedEntry[]>([]);
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [currentEntry, setCurrentEntry] = React.useState(0);
  const [fileNames, setFileNames] = React.useState<string>("");

  const disenoRef = React.useRef<HTMLInputElement>(null);
  const cantidadRef = React.useRef<HTMLInputElement>(null);
  const metroTotalRef = React.useRef<HTMLInputElement>(null);
  const maquinaRef = React.useRef<HTMLInputElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!isOpen) {
      setSelectedClientId(null);
      setSelectedFiles([]);
      setParsedEntries([]);
      setCurrentEntry(0);
      setFileNames("");
    }
  }, [isOpen]);

  // Auto-apply current entry when page changes
  React.useEffect(() => {
    if (parsedEntries.length > 0) {
      const entry = parsedEntries[currentEntry];
      if (disenoRef.current) disenoRef.current.value = entry.diseno || "";
      if (cantidadRef.current) cantidadRef.current.value = entry.cantidad ? String(entry.cantidad) : "";
      if (metroTotalRef.current) metroTotalRef.current.value = entry.metros ? String(entry.metros) : "";
      if (maquinaRef.current) maquinaRef.current.value = entry.maquina || "";
    }
  }, [currentEntry, parsedEntries]);

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Error leyendo archivo"));
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setSelectedFiles(files);
    setParsedEntries([]);
    setCurrentEntry(0);

    // Auto-analyze with vision model
    setIsAnalyzing(true);
    try {
      const images = await Promise.all(files.map(readFileAsBase64));
      const response = await fetch(`${BOT_URL}/parse-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: images.map((d) => ({ data: d })) }),
      });
      const result = await response.json();
      if (result.entries && result.entries.length > 0) {
        setParsedEntries(result.entries);
        setFileNames((result.filenames_extracted || []).join("\n"));
        showToast.success(`${result.entries.length} trabajo${result.entries.length !== 1 ? "s" : ""} analizado${result.entries.length !== 1 ? "s" : ""}`);
      } else {
        showToast.error(result.error || "No se pudo analizar la imagen");
      }
    } catch (err) {
      showToast.error("Error al analizar con IA");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedClientId || isSubmitting) return;

    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const data = {
      diseno: formData.get("diseno") as string,
      cliente_id: selectedClientId,
      pago: Number(formData.get("pago")),
      cantidad: (formData.get("cantidad") as string) || undefined,
      metro_total: formData.get("metro_total") ? Number(formData.get("metro_total")) : undefined,
      maquina: (formData.get("maquina") as string) || undefined,
      estado: (formData.get("estado") as string) || "Debe",
      nota: (formData.get("nota") as string) || undefined,
      fecha: (formData.get("fecha") as string) || undefined,
    };

    try {
      if (parsedEntries.length > 0) {
        // Batch mode: create directly via API
        await salesApi.create(data);
        showToast.success(`Registrado: ${data.diseno}`);

        if (currentEntry < parsedEntries.length - 1) {
          // Advance to next entry
          setCurrentEntry((p) => p + 1);
          setSelectedClientId(null);
        } else {
          // All done
          showToast.success("Todos los trabajos fueron registrados");
          onBatchComplete?.();
          onClose();
        }
      } else {
        // Normal mode: pass to parent (opens confirm modal)
        await onSuccess?.(data);
      }
    } catch {
      showToast.error("Error al registrar la venta");
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentParsed = parsedEntries[currentEntry];

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isSubmitting) onClose();
      }}
    >
      <DialogContent className="sm:max-w-[500px] bg-white border-slate-200 rounded-2xl p-0 overflow-hidden shadow-2xl">
        {isSubmitting && (
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-[2px] flex flex-col items-center justify-center z-50">
            <div className="bg-white p-5 rounded-2xl shadow-xl flex flex-col items-center">
              <Loader2 className="h-8 w-8 text-[#30b7ff] animate-spin mb-3" />
              <p className="text-sm font-semibold text-slate-700">Preparando registro...</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-xl font-bold text-slate-900 font-display">
                Registrar Venta
              </DialogTitle>
            </DialogHeader>

            {/* FILE UPLOAD */}
            <div className="mb-4">
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-lg border-slate-300 text-slate-600 gap-1.5"
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                  {isAnalyzing ? "Analizando..." : "Cargar archivos"}
                </Button>
                {selectedFiles.length > 0 && (
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {selectedFiles.length} archivo{selectedFiles.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1.5">
                Sube una <strong>captura de pantalla</strong> con la lista de archivos. La IA extraerá los nombres y los analizará automáticamente.
              </p>
            </div>

            {/* PAGINATOR */}
            {parsedEntries.length > 1 && (
              <div className="flex items-center justify-between mb-3 bg-slate-50 rounded-lg px-3 py-2 border border-slate-200">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-lg text-slate-500"
                  disabled={currentEntry === 0}
                  onClick={() => setCurrentEntry((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-semibold text-slate-700">
                  {currentEntry + 1} de {parsedEntries.length}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-lg text-slate-500"
                  disabled={currentEntry === parsedEntries.length - 1}
                  onClick={() => setCurrentEntry((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* CURRENT ENTRY INFO */}
            {currentParsed && (
              <div className="mb-3 p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                <p className="text-sm font-semibold text-indigo-800 truncate">
                  {currentParsed.diseno || "Sin diseño"}
                </p>
                <div className="flex flex-wrap gap-x-3 text-xs text-indigo-600 mt-0.5">
                  {currentParsed.cliente && <span>Cliente: {currentParsed.cliente}</span>}
                  {currentParsed.cantidad && <span>Cant: {currentParsed.cantidad}</span>}
                  {currentParsed.metros && <span>Metros: {currentParsed.metros}</span>}
                  {currentParsed.maquina && <span>Máq: {currentParsed.maquina}</span>}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="diseno" className="text-slate-700 font-semibold text-sm">Diseño / Trabajo</Label>
                <Input ref={disenoRef} id="diseno" name="diseno" placeholder="Ej. Tarjetas x100" required className="rounded-xl border-slate-200 focus-visible:ring-[#30b7ff]" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-slate-700 font-semibold text-sm">Cliente</Label>
                <ClientAutocomplete clients={clients} value={selectedClientId} onChange={setSelectedClientId} placeholder="Buscar cliente..." onClientAdded={onClientAdded} />
                <input type="hidden" name="cliente_id" value={selectedClientId || ""} />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="pago" className="text-slate-700 font-semibold text-sm">Pago (S/)</Label>
                  <Input id="pago" name="pago" type="number" step="0.01" placeholder="0.00" required className="rounded-xl border-slate-200 focus-visible:ring-[#30b7ff]" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cantidad" className="text-slate-700 font-semibold text-sm">Cantidad</Label>
                  <Input ref={cantidadRef} id="cantidad" name="cantidad" placeholder="Ej. 100" className="rounded-xl border-slate-200 focus-visible:ring-[#30b7ff]" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="metro_total" className="text-slate-700 font-semibold text-sm">Metro Total</Label>
                  <Input ref={metroTotalRef} id="metro_total" name="metro_total" type="number" step="0.01" placeholder="0.00" className="rounded-xl border-slate-200 focus-visible:ring-[#30b7ff]" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="maquina" className="text-slate-700 font-semibold text-sm">Máquina</Label>
                  <Input ref={maquinaRef} id="maquina" name="maquina" placeholder="Ej. Plotter 1" className="rounded-xl border-slate-200 focus-visible:ring-[#30b7ff]" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="estado" className="text-slate-700 font-semibold text-sm">Estado</Label>
                  <select id="estado" name="estado" className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-[#30b7ff]" defaultValue="Debe">
                    <option value="Debe">Debe</option>
                    <option value="Crédito">Crédito</option>
                    <option value="Pagó">Pagó</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="fecha" className="text-slate-700 font-semibold text-sm">Fecha</Label>
                  <Input id="fecha" name="fecha" type="date" className="rounded-xl border-slate-200 focus-visible:ring-[#30b7ff]" defaultValue={new Date().toISOString().split("T")[0]} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="nota" className="text-slate-700 font-semibold text-sm">Nota</Label>
                <Textarea id="nota" name="nota" placeholder="Alguna observación..." className="rounded-xl border-slate-200 resize-none h-16 text-sm focus-visible:ring-[#30b7ff]" />
              </div>
            </div>
          </div>

          <DialogFooter className="bg-slate-50 px-6 py-3 border-t border-slate-100 flex gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-100" disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" className="rounded-xl bg-[#30b7ff] hover:bg-[#209fdf] text-white shadow-sm" disabled={isSubmitting || !selectedClientId}>
              {isSubmitting ? "Registrando..." : parsedEntries.length > 1 ? `Registrar (${currentEntry + 1}/${parsedEntries.length})` : "Registrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
