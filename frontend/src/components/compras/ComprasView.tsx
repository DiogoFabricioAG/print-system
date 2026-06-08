import * as React from "react";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  Package,
  ShoppingCart,
} from "lucide-react";
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
import { comprasApi, type Compra } from "@/lib/api";
import { showToast } from "@/lib/toast";

export interface CompraData {
  id: string;
  tipo: string;
  categoria: string;
  monto: number;
  notas: string;
  creado_el: string;
}

function mapCompraToViewModel(compra: Compra): CompraData {
  return {
    id: String(compra.id),
    tipo: compra.tipo,
    categoria: compra.categoria,
    monto: compra.monto,
    notas: compra.notas || "",
    creado_el: compra.creado_el,
  };
}

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

function ComprasToolbar({
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
      <div className="relative flex-1 w-full">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-slate-400" />
        </div>
        <Input
          type="text"
          placeholder="Buscar en compras..."
          value={searchTerm}
          onChange={(e) => onSearch(e.target.value)}
          className="pl-10 h-12 rounded-xl border-slate-200 bg-white"
        />
      </div>

      <div className="flex items-center gap-2 w-full lg:w-auto">
        <DateRangePicker
          dateRange={dateRange}
          onDateRangeChange={onDateRangeChange}
        />
      </div>

      <Button
        onClick={onRegisterClick}
        className="w-full lg:w-auto h-12 px-6 rounded-xl bg-blue-600  hover:bg-blue-700 cursor-pointer text-white font-semibold shadow-sm gap-2"
      >
        <Plus className="h-4 w-4" />
        Agregar Compra
      </Button>
    </div>
  );
}

function ComprasTable({
  compras,
  onEdit,
  onDelete,
  hasMore,
  onLoadMore,
}: {
  compras: CompraData[];
  onEdit: (compra: CompraData) => void;
  onDelete: (compra: CompraData) => void;
  hasMore: boolean;
  onLoadMore: () => void;
}) {
  const observerTarget = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      { threshold: 0.1, rootMargin: "150px" },
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, onLoadMore]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      <Table>
        <TableHeader className="bg-slate-50/50">
          <TableRow className="border-slate-200 hover:bg-transparent">
            <TableHead className="w-[80px] font-semibold text-slate-700 py-4 px-6">
              Tipo
            </TableHead>
            <TableHead className="font-semibold text-slate-700 py-4 px-6">
              Categoría
            </TableHead>
            <TableHead className="font-semibold text-slate-700 py-4 px-6">
              Notas
            </TableHead>
            <TableHead className="font-semibold text-slate-700 py-4 px-6">
              Monto
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
          {compras.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={6}
                className="h-32 text-center text-slate-500"
              >
                No se encontraron compras.
              </TableCell>
            </TableRow>
          ) : (
            compras.map((compra) => (
              <TableRow
                key={compra.id}
                className="border-slate-100 hover:bg-slate-50/50 transition-colors"
              >
                <TableCell className="py-4 px-6">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${
                      compra.tipo === "INSUMO"
                        ? "bg-blue-50 text-blue-600 border-blue-200"
                        : "bg-amber-50 text-amber-600 border-amber-200"
                    }`}
                  >
                    {compra.tipo === "INSUMO" ? (
                      <Package className="h-3 w-3" />
                    ) : (
                      <ShoppingCart className="h-3 w-3" />
                    )}
                    {compra.tipo === "INSUMO" ? "Insumo" : "Gasto"}
                  </span>
                </TableCell>
                <TableCell className="font-medium text-slate-900 py-4 px-6">
                  {compra.categoria}
                </TableCell>
                <TableCell className="text-slate-600 py-4 px-6 max-w-[250px] truncate">
                  {compra.notas || "-"}
                </TableCell>
                <TableCell className="text-slate-600 py-4 px-6 tabular-nums font-medium">
                  S/{" "}
                  {compra.monto.toLocaleString("es-PE", {
                    minimumFractionDigits: 2,
                  })}
                </TableCell>
                <TableCell className="text-slate-600 py-4 px-6 whitespace-nowrap">
                  {compra.creado_el ? compra.creado_el.split(" ")[0] : "-"}
                </TableCell>
                <TableCell className="text-right py-4 px-6">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 rounded-lg border-slate-200 text-slate-600 hover:bg-slate-100"
                      onClick={() => onEdit(compra)}
                      title="Editar"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 rounded-lg border-slate-200 text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => onDelete(compra)}
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
      {hasMore && (
        <div ref={observerTarget} className="flex justify-center py-6">
          <div className="flex items-center gap-2 text-sm text-slate-500 font-semibold bg-slate-50 border border-slate-100 rounded-full px-5 py-2 shadow-sm animate-pulse">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            Cargando más compras...
          </div>
        </div>
      )}
    </div>
  );
}

function RegisterCompraModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: {
    tipo: "INSUMO" | "GASTO";
    categoria: string;
    monto: number;
    notas?: string;
  }) => Promise<void>;
}) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [selectedTipo, setSelectedTipo] = React.useState<"INSUMO" | "GASTO">(
    "INSUMO",
  );

  const categoriasInsumo = ["Materiales", "Tintas", "Herramientas"];
  const categoriasGasto = [
    "Alquiler",
    "Servicios",
    "Publicidad",
    "Mantenimiento",
    "Transporte",
    "Personal",
    "Otros",
  ];

  const categorias =
    selectedTipo === "INSUMO" ? categoriasInsumo : categoriasGasto;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const montoNum = parseFloat(formData.get("monto") as string);

    if (isNaN(montoNum) || montoNum <= 0) {
      showToast.error("Ingresa un monto válido");
      setIsSubmitting(false);
      return;
    }

    try {
      await onSuccess({
        tipo: formData.get("tipo") as "INSUMO" | "GASTO",
        categoria: formData.get("categoria") as string,
        monto: montoNum,
        notas: (formData.get("notas") as string) || undefined,
      });
    } catch {
      // error handled by parent
    } finally {
      setIsSubmitting(false);
    }
  };

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
              <Loader2 className="h-8 w-8 text-blue-600 animate-spin mb-3" />
              <p className="text-sm font-semibold text-slate-700">
                Preparando registro...
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="p-8">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-2xl font-bold text-slate-900 font-display">
                Agregar Compra
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tipo" className="text-slate-700 font-semibold">
                  Tipo
                </Label>
                <select
                  id="tipo"
                  name="tipo"
                  required
                  value={selectedTipo}
                  onChange={(e) =>
                    setSelectedTipo(e.target.value as "INSUMO" | "GASTO")
                  }
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="INSUMO">Insumo (Materia Prima)</option>
                  <option value="GASTO">Gasto Operativo</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="categoria"
                  className="text-slate-700 font-semibold"
                >
                  Categoría
                </Label>
                <select
                  id="categoria"
                  name="categoria"
                  required
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccionar...</option>
                  {categorias.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="monto" className="text-slate-700 font-semibold">
                  Monto (S/)
                </Label>
                <Input
                  id="monto"
                  name="monto"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  required
                  className="rounded-xl border-slate-200 focus-visible:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notas" className="text-slate-700 font-semibold">
                  Notas / Descripción
                </Label>
                <Textarea
                  id="notas"
                  name="notas"
                  placeholder="Detalles de la compra..."
                  className="rounded-xl border-slate-200 resize-none h-24 focus-visible:ring-blue-500"
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
              className="rounded-xl bg-blue-600 cursor-pointer hover:bg-blue-700 text-white shadow-sm"
              disabled={isSubmitting}
            >
              Registrar Compra
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditCompraModal({
  compra,
  isOpen,
  onClose,
  onSuccess,
}: {
  compra: CompraData | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: {
    tipo?: "INSUMO" | "GASTO";
    categoria?: string;
    monto?: number;
    notas?: string;
  }) => Promise<void>;
}) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [selectedTipo, setSelectedTipo] = React.useState<"INSUMO" | "GASTO">(
    (compra?.tipo as "INSUMO" | "GASTO") || "INSUMO",
  );

  React.useEffect(() => {
    if (compra) setSelectedTipo(compra.tipo as "INSUMO" | "GASTO");
  }, [compra]);

  const categoriasInsumo = ["Materiales", "Tintas", "Herramientas"];
  const categoriasGasto = [
    "Alquiler",
    "Servicios",
    "Publicidad",
    "Mantenimiento",
    "Transporte",
    "Personal",
    "Otros",
  ];

  const categorias =
    selectedTipo === "INSUMO" ? categoriasInsumo : categoriasGasto;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const montoStr = formData.get("monto") as string;

    try {
      await onSuccess({
        tipo: selectedTipo,
        categoria: (formData.get("categoria") as string) || undefined,
        monto: montoStr ? parseFloat(montoStr) : undefined,
        notas: (formData.get("notas") as string) || undefined,
      });
    } catch {
      // error handled by parent
    } finally {
      setIsSubmitting(false);
    }
  };

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
              <Loader2 className="h-8 w-8 text-blue-600 animate-spin mb-3" />
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
                Editar Compra
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label
                  htmlFor="tipo-edit"
                  className="text-slate-700 font-semibold"
                >
                  Tipo
                </Label>
                <select
                  id="tipo-edit"
                  name="tipo"
                  value={selectedTipo}
                  onChange={(e) =>
                    setSelectedTipo(e.target.value as "INSUMO" | "GASTO")
                  }
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="INSUMO">Insumo (Materia Prima)</option>
                  <option value="GASTO">Gasto Operativo</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="categoria-edit"
                  className="text-slate-700 font-semibold"
                >
                  Categoría
                </Label>
                <select
                  id="categoria-edit"
                  name="categoria"
                  defaultValue={compra?.categoria}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {categorias.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="monto-edit"
                  className="text-slate-700 font-semibold"
                >
                  Monto (S/)
                </Label>
                <Input
                  id="monto-edit"
                  name="monto"
                  type="number"
                  step="0.01"
                  defaultValue={compra?.monto}
                  placeholder="0.00"
                  className="rounded-xl border-slate-200 focus-visible:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="notas-edit"
                  className="text-slate-700 font-semibold"
                >
                  Notas / Descripción
                </Label>
                <Textarea
                  id="notas-edit"
                  name="notas"
                  defaultValue={compra?.notas}
                  placeholder="Detalles de la compra..."
                  className="rounded-xl border-slate-200 resize-none h-24 focus-visible:ring-blue-500"
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
              className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
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

export function ComprasView() {
  const [compras, setCompras] = React.useState<CompraData[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [dateRange, setDateRange] = React.useState<DateRange>({
    from: undefined,
    to: undefined,
  });
  const [visibleCount, setVisibleCount] = React.useState(15);

  const ITEMS_TO_LOAD = 15;

  const [isRegisterModalOpen, setIsRegisterModalOpen] = React.useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [editingCompra, setEditingCompra] = React.useState<CompraData | null>(
    null,
  );
  const [isConfirmModalOpen, setIsConfirmModalOpen] = React.useState(false);
  const [deletingCompra, setDeletingCompra] = React.useState<CompraData | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = React.useState(false);

  const fetchCompras = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = await comprasApi.getAll();
      setCompras(data.map(mapCompraToViewModel));
    } catch (error) {
      showToast.error("Error al cargar compras");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchCompras();
  }, [fetchCompras]);

  const filteredCompras = React.useMemo(() => {
    let result = compras;

    if (searchTerm) {
      result = result.filter(
        (c) =>
          c.categoria.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.notas.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.tipo.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    if (dateRange.from || dateRange.to) {
      result = result.filter((c) => {
        const compraDate = new Date(c.creado_el);
        const from = dateRange.from ? new Date(dateRange.from) : null;
        const to = dateRange.to ? new Date(dateRange.to) : null;

        if (from && compraDate < from) return false;
        if (to) {
          const toEnd = new Date(to);
          toEnd.setHours(23, 59, 59, 999);
          if (compraDate > toEnd) return false;
        }
        return true;
      });
    }

    return result;
  }, [compras, searchTerm, dateRange]);

  const paginatedCompras = React.useMemo(() => {
    return filteredCompras.slice(0, visibleCount);
  }, [filteredCompras, visibleCount]);

  const hasMore = filteredCompras.length > visibleCount;

  const totalInsumos = React.useMemo(
    () =>
      filteredCompras
        .filter((c) => c.tipo === "INSUMO")
        .reduce((sum, c) => sum + c.monto, 0),
    [filteredCompras],
  );
  const totalGastos = React.useMemo(
    () =>
      filteredCompras
        .filter((c) => c.tipo === "GASTO")
        .reduce((sum, c) => sum + c.monto, 0),
    [filteredCompras],
  );

  React.useEffect(() => {
    setVisibleCount(ITEMS_TO_LOAD);
  }, [searchTerm, dateRange]);

  const handleRegisterSuccess = async (data: {
    tipo: "INSUMO" | "GASTO";
    categoria: string;
    monto: number;
    notas?: string;
  }) => {
    try {
      await comprasApi.create(data);
      showToast.success("Compra registrada correctamente");
      setIsRegisterModalOpen(false);
      fetchCompras();
    } catch (error) {
      showToast.error("Error al registrar compra");
    }
  };

  const handleEditSuccess = async (data: {
    tipo?: "INSUMO" | "GASTO";
    categoria?: string;
    monto?: number;
    notas?: string;
  }) => {
    if (!editingCompra) return;
    try {
      const cleanData: any = {};
      if (data.tipo) cleanData.tipo = data.tipo;
      if (data.categoria) cleanData.categoria = data.categoria;
      if (data.monto !== undefined) cleanData.monto = data.monto;
      if (data.notas !== undefined) cleanData.notas = data.notas;

      await comprasApi.update(Number(editingCompra.id), cleanData);
      showToast.success("Compra actualizada correctamente");
      setIsEditModalOpen(false);
      setEditingCompra(null);
      fetchCompras();
    } catch (error) {
      showToast.error("Error al actualizar compra");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingCompra || isDeleting) return;
    try {
      setIsDeleting(true);
      await comprasApi.delete(Number(deletingCompra.id));
      showToast.success("Compra eliminada correctamente");
      setIsConfirmModalOpen(false);
      setDeletingCompra(null);
      fetchCompras();
    } catch (error) {
      showToast.error("Error al eliminar compra");
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Cargando compras...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ComprasToolbar
        onSearch={setSearchTerm}
        searchTerm={searchTerm}
        onRegisterClick={() => setIsRegisterModalOpen(true)}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
      />

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-blue-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-600">
                Total Insumos
              </h3>
              <p className="text-xs text-slate-400">Materia prima</p>
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">
            S/{" "}
            {totalInsumos.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-blue-600 mt-1 font-medium bg-blue-50 inline-block px-2 py-0.5 rounded-md">
            {filteredCompras.filter((c) => c.tipo === "INSUMO").length} compras
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-amber-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-600">
                Total Gastos
              </h3>
              <p className="text-xs text-slate-400">Operativos</p>
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">
            S/{" "}
            {totalGastos.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-amber-600 mt-1 font-medium bg-amber-50 inline-block px-2 py-0.5 rounded-md">
            {filteredCompras.filter((c) => c.tipo === "GASTO").length} compras
          </p>
        </div>
      </div>

      <ComprasTable
        compras={paginatedCompras}
        onEdit={(compra) => {
          setEditingCompra(compra);
          setIsEditModalOpen(true);
        }}
        onDelete={(compra) => {
          setDeletingCompra(compra);
          setIsConfirmModalOpen(true);
        }}
        hasMore={hasMore}
        onLoadMore={() => setVisibleCount((p) => p + ITEMS_TO_LOAD)}
      />

      <RegisterCompraModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        onSuccess={handleRegisterSuccess}
      />

      <EditCompraModal
        compra={editingCompra}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingCompra(null);
        }}
        onSuccess={handleEditSuccess}
      />

      <ConfirmModal
        isOpen={isConfirmModalOpen}
        onClose={() => {
          setIsConfirmModalOpen(false);
          setDeletingCompra(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="¿Eliminar compra?"
        message="Esta acción no se puede deshacer. ¿Estás seguro de eliminar esta compra?"
        confirmText="Sí, eliminar"
      />
    </div>
  );
}
