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
import { Loader2, FileText, ChevronLeft, ChevronRight, DollarSign } from "lucide-react";
import type { Client } from "@/lib/api";
import { salesApi, pagosApi } from "@/lib/api";
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
    adelantoAmount?: number;
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
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [showImagePreview, setShowImagePreview] = React.useState(false);
  const [imageZoom, setImageZoom] = React.useState(1);
  const [parsedEntries, setParsedEntries] = React.useState<ParsedEntry[]>([]);
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [analyzeProgress, setAnalyzeProgress] = React.useState(0);
  const [analyzeMessage, setAnalyzeMessage] = React.useState("");
  const progressRef = React.useRef<number>(0);
  const progressTimerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const [currentEntry, setCurrentEntry] = React.useState(0);
  const [fileNames, setFileNames] = React.useState<string>("");
  const [estado, setEstado] = React.useState<"Debe" | "Crédito" | "Pagó">("Debe");
  const [adelantoAmount, setAdelantoAmount] = React.useState<string>("");

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
      setEstado("Debe");
      setAdelantoAmount("");
      setIsAnalyzing(false);
      setAnalyzeProgress(0);
      setImagePreview(null);
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    }
  }, [isOpen]);

  React.useEffect(() => {
    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, []);

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
    setIsAnalyzing(true);
    setAnalyzeProgress(0);
    setAnalyzeMessage("Leyendo imagen...");
    progressRef.current = 0;

    // Simulate progress while waiting for AI
    const phase1Messages = ["Enviando imagen...", "Leyendo texto en imagen...", "Extrayendo nombres..."];
    const phase2Messages = ["Analizando con IA...", "Interpretando datos...", "Procesando resultados..."];
    let msgIdx = 0;
    let currentPhase = 1;

    progressTimerRef.current = setInterval(() => {
      progressRef.current += Math.random() * 3 + 0.5;
      if (progressRef.current > 45) progressRef.current = 45;
      setAnalyzeProgress(Math.round(progressRef.current));

      const newMsgIdx = Math.min(
        Math.floor(progressRef.current / 15),
        phase1Messages.length - 1,
      );
      if (newMsgIdx !== msgIdx) {
        msgIdx = newMsgIdx;
        setAnalyzeMessage(phase1Messages[msgIdx]);
      }
    }, 500);

    try {
      const images = await Promise.all(files.map(readFileAsBase64));
      setImagePreview(images[0] || null);

      // Phase 1: Extract filenames from image
      const imageResponse = await fetch(`${BOT_URL}/parse-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: images.map((d) => ({ data: d })) }),
      });
      const imageResult = await imageResponse.json();

      if (!imageResult.filenames_extracted || imageResult.filenames_extracted.length === 0) {
        showToast.error("No se encontraron nombres de archivos en la imagen");
        return;
      }

      // Phase 2: Parse filenames into structured data
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      progressRef.current = 45;
      setAnalyzeProgress(45);
      setAnalyzeMessage("Interpretando datos...");
      msgIdx = 0;

      progressTimerRef.current = setInterval(() => {
        progressRef.current += Math.random() * 3 + 0.5;
        if (progressRef.current > 90) progressRef.current = 90;
        setAnalyzeProgress(Math.round(progressRef.current));

        const newMsgIdx = Math.min(
          Math.floor((progressRef.current - 45) / 15),
          phase2Messages.length - 1,
        );
        if (newMsgIdx !== msgIdx) {
          msgIdx = newMsgIdx;
          setAnalyzeMessage(phase2Messages[msgIdx]);
        }
      }, 500);

      const parseResponse = await fetch(`${BOT_URL}/parse-files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filenames: imageResult.filenames_extracted }),
      });
      const parseResult = await parseResponse.json();

      if (parseResult.entries && parseResult.entries.length > 0) {
        setParsedEntries(parseResult.entries);
        setFileNames(imageResult.filenames_extracted.join("\n"));
        showToast.success(`${parseResult.entries.length} trabajo${parseResult.entries.length !== 1 ? "s" : ""} analizado${parseResult.entries.length !== 1 ? "s" : ""}`);
      } else {
        showToast.error("No se pudo analizar los nombres");
      }
    } catch (err) {
      showToast.error("Error al analizar con IA");
    } finally {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      setAnalyzeProgress(100);
      setAnalyzeMessage("¡Completado!");
      setTimeout(() => {
        setIsAnalyzing(false);
        setAnalyzeProgress(0);
        setAnalyzeMessage("");
      }, 600);
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
      estado: estado,
      nota: (formData.get("nota") as string) || undefined,
      fecha: (formData.get("fecha") as string) || undefined,
    };

    const adelantoNum = Number(adelantoAmount) || 0;

    try {
      if (parsedEntries.length > 0) {
        // Batch mode: create directly via API
        await salesApi.create(data);
        
        if (estado === "Pagó" && data.pago > 0) {
          await pagosApi.create({
            cliente_id: data.cliente_id,
            pago: data.pago,
            nota: `Pago completo - ${data.diseno}`,
          });
        } else if (estado === "Crédito" && adelantoNum > 0) {
          await pagosApi.create({
            cliente_id: data.cliente_id,
            pago: adelantoNum,
            nota: `Adelanto - ${data.diseno}`,
          });
        }

        showToast.success(`Registrado: ${data.diseno}`);

        if (currentEntry < parsedEntries.length - 1) {
          // Advance to next entry
          setCurrentEntry((p) => p + 1);
          setSelectedClientId(null);
          setEstado("Debe");
          setAdelantoAmount("");
        } else {
          // All done
          showToast.success("Todos los trabajos fueron registrados");
          onBatchComplete?.();
          onClose();
        }
      } else {
        // Normal mode: pass to parent (opens confirm modal)
        await onSuccess?.({ ...data, adelantoAmount: estado === "Crédito" ? adelantoNum : undefined });
      }
    } catch {
      showToast.error("Error al registrar la venta");
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentParsed = parsedEntries[currentEntry];

  return (
    <>
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isSubmitting && !isAnalyzing) onClose();
      }}
    >
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-[500px] max-h-[95vh] overflow-y-auto bg-white border-slate-200 rounded-2xl p-0 shadow-2xl">
        {isSubmitting && (
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-[2px] flex flex-col items-center justify-center z-50">
            <div className="bg-white p-5 rounded-2xl shadow-xl flex flex-col items-center">
              <Loader2 className="h-8 w-8 text-[#30b7ff] animate-spin mb-3" />
              <p className="text-sm font-semibold text-slate-700">Preparando registro...</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="p-4 sm:p-6">
            <DialogHeader className="mb-3 sm:mb-4">
              <DialogTitle className="text-lg sm:text-xl font-bold text-slate-900 font-display">
                Registrar Venta
              </DialogTitle>
            </DialogHeader>

            {/* FILE UPLOAD */}
            <div className="mb-4">
              {isAnalyzing ? (
                <div className="bg-white rounded-xl border border-indigo-100 p-4 shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                      <Loader2 className="h-4 w-4 text-indigo-600 animate-spin" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-indigo-800">
                        {analyzeProgress < 50 ? "Fase 1: Extracción de Información" : "Fase 2: Comprensión de Información"}
                      </p>
                      <p className="text-xs text-indigo-500">{analyzeMessage}</p>
                    </div>
                    <span className="text-sm font-bold text-indigo-600 tabular-nums">{analyzeProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-indigo-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-indigo-500 to-[#30b7ff] rounded-full transition-all duration-300 ease-out" style={{ width: `${analyzeProgress}%` }} />
                  </div>
                </div>
              ) : parsedEntries.length > 0 ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 rounded-xl border border-emerald-100">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                    <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M5 13l4 4L19 7"/></svg>
                  </div>
                  <span className="text-xs font-semibold text-emerald-700 flex-1">
                    {parsedEntries.length} archivo{parsedEntries.length !== 1 ? "s" : ""} analizado{parsedEntries.length !== 1 ? "s" : ""}
                  </span>
                  {imagePreview && (
                    <button type="button" onClick={() => { setShowImagePreview(true); setImageZoom(1); }} className="text-xs text-indigo-600 hover:text-indigo-700 hover:bg-white/60 px-2 py-1 rounded-md font-medium transition-colors">Ver imagen</button>
                  )}
                  <button type="button" onClick={() => { fileInputRef.current?.click(); }} className="text-xs text-slate-500 hover:text-slate-700 hover:bg-white/60 px-2 py-1 rounded-md font-medium transition-colors">Cambiar</button>
                  <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={handleFileSelect} />
                </div>
              ) : (
                <>
                  <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={handleFileSelect} />
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="rounded-lg border-slate-300 text-slate-600 gap-1.5">
                      <FileText className="h-4 w-4" />
                      Cargar archivos
                    </Button>
                    {selectedFiles.length > 0 && (
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {selectedFiles.length} archivo{selectedFiles.length !== 1 ? "s" : ""}
                      </span>
                    )}
                    {imagePreview && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => { setShowImagePreview(true); setImageZoom(1); }} className="text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 gap-1 h-7">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.3-4.3"/><path d="M11 8v6M8 11h6"/></svg>
                        Ver imagen
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1.5">
                    Sube una <strong>captura de pantalla</strong> con la lista de archivos. La IA extraerá los nombres y los analizará automáticamente.
                  </p>
                </>
              )}
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

            <div className="space-y-2.5 sm:space-y-3">
              <div className="space-y-1 sm:space-y-1.5">
                <Label htmlFor="diseno" className="text-slate-700 font-semibold text-xs sm:text-sm">Diseño / Trabajo</Label>
                <Input ref={disenoRef} id="diseno" name="diseno" placeholder="Ej. Tarjetas x100" required className="rounded-xl border-slate-200 focus-visible:ring-[#30b7ff] h-9 sm:h-10 text-sm" />
              </div>

              <div className="space-y-1 sm:space-y-1.5">
                <Label className="text-slate-700 font-semibold text-xs sm:text-sm">Cliente</Label>
                <ClientAutocomplete clients={clients} value={selectedClientId} onChange={setSelectedClientId} placeholder="Buscar cliente..." onClientAdded={onClientAdded} />
                <input type="hidden" name="cliente_id" value={selectedClientId || ""} />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                <div className="space-y-1 sm:space-y-1.5">
                  <Label htmlFor="pago" className="text-slate-700 font-semibold text-xs sm:text-sm">Costo Total (S/)</Label>
                  <Input id="pago" name="pago" type="number" step="0.01" placeholder="0.00" required className="rounded-xl border-slate-200 focus-visible:ring-[#30b7ff] h-9 sm:h-10 text-sm" />
                </div>
                <div className="space-y-1 sm:space-y-1.5">
                  <Label htmlFor="cantidad" className="text-slate-700 font-semibold text-xs sm:text-sm">Cantidad</Label>
                  <Input ref={cantidadRef} id="cantidad" name="cantidad" placeholder="Ej. 100" className="rounded-xl border-slate-200 focus-visible:ring-[#30b7ff] h-9 sm:h-10 text-sm" />
                </div>
                <div className="space-y-1 sm:space-y-1.5">
                  <Label htmlFor="metro_total" className="text-slate-700 font-semibold text-xs sm:text-sm">Metro Total</Label>
                  <Input ref={metroTotalRef} id="metro_total" name="metro_total" type="number" step="0.01" placeholder="0.00" className="rounded-xl border-slate-200 focus-visible:ring-[#30b7ff] h-9 sm:h-10 text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                <div className="space-y-1 sm:space-y-1.5">
                  <Label htmlFor="maquina" className="text-slate-700 font-semibold text-xs sm:text-sm">Máquina</Label>
                  <Input ref={maquinaRef} id="maquina" name="maquina" placeholder="Ej. Plotter 1" className="rounded-xl border-slate-200 focus-visible:ring-[#30b7ff] h-9 sm:h-10 text-sm" />
                </div>
                <div className="space-y-1 sm:space-y-1.5">
                  <Label htmlFor="estado" className="text-slate-700 font-semibold text-xs sm:text-sm">Estado</Label>
                  <select
                    id="estado"
                    name="estado"
                    value={estado}
                    onChange={(e) => { const newEstado = e.target.value as "Debe" | "Crédito" | "Pagó"; setEstado(newEstado); }}
                    className="w-full h-9 sm:h-10 px-2 sm:px-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#30b7ff]"
                  >
                    <option value="Debe">Debe</option>
                    <option value="Crédito">Crédito</option>
                    <option value="Pagó">Pagó</option>
                  </select>
                </div>
                <div className="space-y-1 sm:space-y-1.5">
                  <Label htmlFor="fecha" className="text-slate-700 font-semibold text-xs sm:text-sm">Fecha</Label>
                  <Input id="fecha" name="fecha" type="date" className="rounded-xl border-slate-200 focus-visible:ring-[#30b7ff] h-9 sm:h-10 text-sm" defaultValue={new Date().toISOString().split("T")[0]} />
                </div>
              </div>

              {estado === "Crédito" && (
                <div className="p-2.5 sm:p-3 bg-amber-50 rounded-xl border border-amber-100 space-y-1 sm:space-y-1.5">
                  <Label htmlFor="adelantoAmount" className="text-amber-800 font-semibold text-xs sm:text-sm flex items-center gap-1.5">
                    <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-600" />
                    Monto del Adelanto (S/)
                  </Label>
                  <Input id="adelantoAmount" name="adelantoAmount" type="number" step="0.01" placeholder="0.00" value={adelantoAmount} onChange={(e) => setAdelantoAmount(e.target.value)} required className="rounded-xl border-amber-200 focus-visible:ring-amber-400 bg-white text-slate-800 h-9 sm:h-10 text-sm" />
                </div>
              )}

              <div className="space-y-1 sm:space-y-1.5">
                <Label htmlFor="nota" className="text-slate-700 font-semibold text-xs sm:text-sm">Nota</Label>
                <Textarea id="nota" name="nota" placeholder="Alguna observación..." className="rounded-xl border-slate-200 resize-none h-14 sm:h-16 text-sm focus-visible:ring-[#30b7ff]" />
              </div>
            </div>
          </div>

          <DialogFooter className="bg-slate-50 px-4 sm:px-6 py-3 border-t border-slate-100 flex gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-100 text-sm h-9 sm:h-10 flex-1 sm:flex-none" disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" className="rounded-xl bg-[#30b7ff] hover:bg-[#209fdf] text-white shadow-sm text-sm h-9 sm:h-10 flex-1 sm:flex-none" disabled={isSubmitting || !selectedClientId}>
              {isSubmitting ? "Registrando..." : parsedEntries.length > 1 ? `Registrar (${currentEntry + 1}/${parsedEntries.length})` : "Registrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    {/* IMAGE PREVIEW MODAL */}
    {showImagePreview && imagePreview && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className="relative w-full max-w-5xl max-h-[90vh] overflow-auto rounded-2xl bg-white shadow-2xl">
          <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-2 bg-white/90 backdrop-blur border-b border-slate-100">
            <span className="text-sm font-medium text-slate-600">Vista previa de la imagen</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setImageZoom((z) => Math.max(0.5, z - 0.25))}
                className="h-8 w-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-600"
                title="Alejar"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.3-4.3"/><path d="M8 11h6"/></svg>
              </button>
              <span className="text-xs text-slate-500 w-10 text-center tabular-nums">{Math.round(imageZoom * 100)}%</span>
              <button
                onClick={() => setImageZoom((z) => Math.min(3, z + 0.25))}
                className="h-8 w-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-600"
                title="Acercar"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.3-4.3"/><path d="M11 8v6M8 11h6"/></svg>
              </button>
              <button
                onClick={() => setImageZoom(1)}
                className="h-8 w-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-xs font-medium text-slate-600"
                title="Reset"
              >
                1:1
              </button>
              <button
                onClick={() => setShowImagePreview(false)}
                className="h-8 w-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-600 ml-2"
                title="Cerrar"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
          </div>
          <div className="flex items-center justify-center p-4 min-h-[200px]">
            <img
              src={imagePreview}
              alt="Vista previa"
              style={{ transform: `scale(${imageZoom})`, transformOrigin: "top center" }}
              className="max-w-full transition-transform duration-200"
            />
          </div>
        </div>
      </div>
    )}
    </>
  );
}
