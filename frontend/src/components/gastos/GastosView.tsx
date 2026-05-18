import * as React from "react";
import { Search, Plus, Edit2, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateRangePicker } from "@/components/sells/DateRangePicker";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { gastosApi, type Gasto } from "@/lib/api";
import { showToast } from "@/lib/toast";

export interface GastoData {
  id: string;
  notas: string;
  monto: number;
  creado_el: string;
}

function mapGastoToViewModel(gasto: Gasto): GastoData {
  return {
    id: String(gasto.id),
    notas: gasto.notas,
    monto: gasto.monto,
    creado_el: gasto.creado_el,
  };
}

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

function GastosToolbar({
  onSearch,
  searchTerm,
  onRegisterClick,
  dateRange,
  onDateRangeChange,
}: {
  onSearch: (term: string) => void;
  searchTerm: string;
  onRegisterClick: () => void;
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
}) {
  return (
    <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4 w-full">
      <div className="relative flex-1 w-full flex items-center gap-2">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <Input
            type="text"
            placeholder="Buscar en notas..."
            value={searchTerm}
            onChange={(e) => onSearch(e.target.value)}
            className="pl-10 h-12 rounded-xl border-slate-200 bg-white"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 w-full lg:w-auto">
        <DateRangePicker
          dateRange={dateRange}
          onDateRangeChange={onDateRangeChange}
        />
      </div>

      <Button
        onClick={onRegisterClick}
        className="w-full lg:w-auto h-12 px-6 rounded-xl bg-[#30b7ff] hover:bg-[#209fdf] text-white font-semibold shadow-sm gap-2"
      >
        <Plus className="h-4 w-4" />
        Agregar Gasto
      </Button>
    </div>
  );
}

function GastosTable({
  gastos,
  onEditGasto,
  onDeleteGasto,
}: {
  gastos: GastoData[];
  onEditGasto: (gasto: GastoData) => void;
  onDeleteGasto: (gasto: GastoData) => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      <Table>
        <TableHeader className="bg-slate-50/50">
          <TableRow className="border-slate-200 hover:bg-transparent">
            <TableHead className="font-semibold text-slate-700 py-4 px-6">
              Notas
            </TableHead>
            <TableHead className="font-semibold text-slate-700 py-4 px-6">
              Pago
            </TableHead>
            <TableHead className="font-semibold text-slate-700 py-4 px-6">
              Fecha
            </TableHead>
            <TableHead className="text-right font-semibold text-slate-700 py-4 px-6">
              Acciones
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {gastos.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={4}
                className="h-32 text-center text-slate-500"
              >
                No se encontraron gastos.
              </TableCell>
            </TableRow>
          ) : (
            gastos.map((gasto) => (
              <TableRow
                key={gasto.id}
                className="border-slate-100 hover:bg-slate-50/50 transition-colors"
              >
                <TableCell className="font-medium text-slate-900 py-4 px-6 max-w-[300px] truncate">
                  {gasto.notas || "-"}
                </TableCell>
                <TableCell className="text-slate-600 py-4 px-6 tabular-nums font-medium">
                  S/{" "}
                  {gasto.monto.toLocaleString("es-PE", {
                    minimumFractionDigits: 2,
                  })}
                </TableCell>
                <TableCell className="text-slate-600 py-4 px-6 whitespace-nowrap">
                  {gasto.creado_el ? gasto.creado_el.split(" ")[0] : "-"}
                </TableCell>
                <TableCell className="text-right py-4 px-6">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 rounded-lg border-slate-200 text-slate-600 hover:bg-slate-100"
                      onClick={() => onEditGasto(gasto)}
                      title="Editar"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 rounded-lg border-slate-200 text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => onDeleteGasto(gasto)}
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function RegisterGastoModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean
  onClose: () => void
  onSuccess: (data: { notas: string; monto: number }) => void
}) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (isSubmitting) return;
    setIsSubmitting(true)
    
    const formData = new FormData(e.currentTarget)
    const montoNum = parseFloat(formData.get("monto") as string)
    
    if (isNaN(montoNum) || montoNum <= 0) {
      showToast.error("Ingresa un monto válido")
      setIsSubmitting(false)
      return
    }

    onSuccess({
      notas: formData.get("notas") as string,
      monto: montoNum,
    })
    setIsSubmitting(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open && !isSubmitting) onClose()
    }}>
      <DialogContent className="sm:max-w-[500px] bg-white border-slate-200 rounded-2xl p-0 overflow-hidden shadow-2xl">
        {/* Overlay de carga */}
        {isSubmitting && (
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-[2px] flex flex-col items-center justify-center z-50">
            <div className="bg-white p-5 rounded-2xl shadow-xl flex flex-col items-center">
              <Loader2 className="h-8 w-8 text-[#30b7ff] animate-spin mb-3" />
              <p className="text-sm font-semibold text-slate-700">Preparando registro...</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="p-8">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-2xl font-bold text-slate-900 font-display">
                Agregar Gasto
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="monto" className="text-slate-700 font-semibold">
                  Pago (S/)
                </Label>
                <Input
                  id="monto"
                  name="monto"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  required
                  className="rounded-xl border-slate-200 focus-visible:ring-[#30b7ff]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notas" className="text-slate-700 font-semibold">
                  Notas / Descripción
                </Label>
                <Textarea
                  id="notas"
                  name="notas"
                  placeholder="Detalles del gasto..."
                  required
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
              Registrar Gasto
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditGastoModal({
  gasto,
  isOpen,
  onClose,
  onSuccess,
}: {
  gasto: GastoData | null
  isOpen: boolean
  onClose: () => void
  onSuccess: (data: { notas: string; monto: number }) => void
}) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (isSubmitting) return;
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    const montoNum = parseFloat(formData.get("monto") as string)

    if (isNaN(montoNum) || montoNum <= 0) {
      showToast.error("Ingresa un monto válido")
      setIsSubmitting(false)
      return
    }

    onSuccess({
      notas: formData.get("notas") as string,
      monto: montoNum,
    })
    setIsSubmitting(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open && !isSubmitting) onClose()
    }}>
      <DialogContent className="sm:max-w-[500px] bg-white border-slate-200 rounded-2xl p-0 overflow-hidden shadow-2xl">
        {/* Overlay de carga */}
        {isSubmitting && (
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-[2px] flex flex-col items-center justify-center z-50">
            <div className="bg-white p-5 rounded-2xl shadow-xl flex flex-col items-center">
              <Loader2 className="h-8 w-8 text-[#ff9f43] animate-spin mb-3" />
              <p className="text-sm font-semibold text-slate-700">Preparando actualización...</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="p-8">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-2xl font-bold text-slate-900 font-display">
                Editar Gasto
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="monto" className="text-slate-700 font-semibold">
                  Monto (S/)
                </Label>
                <Input
                  id="monto"
                  name="monto"
                  type="number"
                  step="0.01"
                  defaultValue={gasto?.monto}
                  placeholder="0.00"
                  required
                  className="rounded-xl border-slate-200 focus-visible:ring-[#30b7ff]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notas" className="text-slate-700 font-semibold">
                  Notas / Descripción
                </Label>
                <Textarea
                  id="notas"
                  name="notas"
                  defaultValue={gasto?.notas}
                  placeholder="Detalles del gasto..."
                  required
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
              Actualizar Gasto
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function GastosView() {
  const [gastos, setGastos] = React.useState<GastoData[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [dateRange, setDateRange] = React.useState<DateRange>({
    from: undefined,
    to: undefined,
  });
  const [hasFiltered, setHasFiltered] = React.useState(false);

  const [isRegisterModalOpen, setIsRegisterModalOpen] = React.useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = React.useState(false);

  const [selectedGasto, setSelectedGasto] = React.useState<GastoData | null>(
    null,
  );
  const [pendingGastoData, setPendingGastoData] = React.useState<{
    notas: string;
    monto: number;
  } | null>(null);
  const [isEditing, setIsEditing] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = await gastosApi.getAll();
      setGastos(data.map(mapGastoToViewModel));
    } catch (error) {
      showToast.error("Error al cargar gastos");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();

    // Check if we need to open the register modal from URL
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get("modal") === "register") {
      setIsRegisterModalOpen(true);
      // Clean up the URL so refresh doesn't reopen it
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [fetchData]);

  const filteredGastos = React.useMemo(() => {
    let result = gastos;

    if (searchTerm) {
      result = result.filter((g) =>
        (g.notas || "").toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    if (dateRange.from || dateRange.to) {
      result = result.filter((g) => {
        if (!g.creado_el) return false;

        const gastoDate = new Date(g.creado_el);
        const from = dateRange.from ? new Date(dateRange.from) : null;
        const to = dateRange.to ? new Date(dateRange.to) : null;

        if (from && gastoDate < from) return false;
        if (to && gastoDate > to) return false;
        return true;
      });
    }

    return result;
  }, [gastos, searchTerm, dateRange]);

  React.useEffect(() => {
    if (hasFiltered) {
      showToast.success(`Filtro aplicado: ${filteredGastos.length} resultados`);
      setHasFiltered(false);
    }
  }, [searchTerm, dateRange, filteredGastos.length, hasFiltered]);

  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range);
    setHasFiltered(true);
  };

  const totalGastos = React.useMemo(() => {
    return filteredGastos.reduce((sum, g) => sum + g.monto, 0);
  }, [filteredGastos]);

  const handleRegisterClick = (data: { notas: string; monto: number }) => {
    setPendingGastoData(data);
    setIsEditing(false);
    setIsDeleting(false);
    setIsConfirmModalOpen(true);
  };

  const handleEditClick = (data: { notas: string; monto: number }) => {
    setPendingGastoData(data);
    setIsEditing(true);
    setIsDeleting(false);
    setIsConfirmModalOpen(true);
  };

  const handleDeleteClick = (gasto: GastoData) => {
    setSelectedGasto(gasto);
    setIsDeleting(true);
    setIsEditing(false);
    setIsConfirmModalOpen(true);
  };

  const handleConfirmSubmit = async () => {
    try {
      if (isDeleting && selectedGasto) {
        await gastosApi.delete(Number(selectedGasto.id));
        showToast.success("Gasto eliminado correctamente");
      } else if (isEditing && pendingGastoData) {
        await gastosApi.update(Number(selectedGasto?.id), pendingGastoData);
        showToast.success("Gasto actualizado correctamente");
        setIsEditModalOpen(false);
      } else if (pendingGastoData) {
        await gastosApi.create(pendingGastoData);
        showToast.success("Gasto registrado correctamente");
        setIsRegisterModalOpen(false);
      }
      setIsConfirmModalOpen(false);
      setPendingGastoData(null);
      setSelectedGasto(null);
      fetchData();
    } catch (error) {
      showToast.error(
        `Error al ${isDeleting ? "eliminar" : isEditing ? "actualizar" : "registrar"} gasto`,
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Cargando gastos...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <GastosToolbar
        searchTerm={searchTerm}
        onSearch={(term) => {
          setSearchTerm(term);
          if (term) setHasFiltered(true);
        }}
        dateRange={dateRange}
        onDateRangeChange={handleDateRangeChange}
        onRegisterClick={() => setIsRegisterModalOpen(true)}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-sm font-medium text-slate-500 mb-1">
            Total Gastos
          </h3>
          <p className="text-3xl font-bold text-slate-900 font-display">
            S/{" "}
            {totalGastos.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <GastosTable
        gastos={filteredGastos}
        onEditGasto={(gasto) => {
          setSelectedGasto(gasto);
          setIsEditModalOpen(true);
        }}
        onDeleteGasto={handleDeleteClick}
      />

      <RegisterGastoModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        onSuccess={handleRegisterClick}
      />

      <EditGastoModal
        gasto={selectedGasto}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedGasto(null);
        }}
        onSuccess={handleEditClick}
      />

      <ConfirmModal
        isOpen={isConfirmModalOpen}
        onClose={() => {
          setIsConfirmModalOpen(false);
          setPendingGastoData(null);
          if (!isEditModalOpen) {
            setSelectedGasto(null);
          }
        }}
        onConfirm={handleConfirmSubmit}
        title={
          isDeleting
            ? "¿Eliminar gasto?"
            : isEditing
              ? "¿Actualizar gasto?"
              : "¿Registrar gasto?"
        }
        message={
          isDeleting
            ? "¿Estás seguro de que deseas eliminar este gasto?"
            : isEditing
              ? "¿Estás seguro de que deseas actualizar este gasto?"
              : "¿Estás seguro de que deseas registrar este gasto?"
        }
        confirmText={
          isDeleting
            ? "Sí, eliminar"
            : isEditing
              ? "Sí, actualizar"
              : "Sí, registrar"
        }
      />
    </div>
  );
}
