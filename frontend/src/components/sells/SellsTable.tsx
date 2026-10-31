import * as React from "react";
import { Info, Edit2, Loader2, StickyNote } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { formatBusinessDate } from "@/lib/business-date";

export interface SellData {
  id: string;
  design: string;
  client: string;
  clientId: number;
  amount: number;
  metodo_pago?: "Yape" | "Efectivo";
  status: string;
  date: string;
  nota?: string;
  cantidad?: string;
  metro_total?: number;
  maquina?: string;
}

interface SellsTableProps {
  sells: SellData[];
  onViewSell: (sell: SellData) => void;
  onEditSell: (sell: SellData) => void;
  onViewNote?: (sell: SellData) => void;
  highlightedId?: string;
  hasMore: boolean;
  onLoadMore: () => void;
}

const getStatusBadge = (status: string) => {
  const styles: Record<string, string> = {
    Debe: "bg-rose-50 text-rose-600 border-rose-200",
    Crédito: "bg-amber-50 text-amber-600 border-amber-200",
    Pagó: "bg-emerald-50 text-emerald-600 border-emerald-200",
    // Compatibilidad
    Pago: "bg-emerald-50 text-emerald-600 border-emerald-200",
    "En Producción": "bg-amber-50 text-amber-600 border-amber-200",
    Cancelado: "bg-emerald-50 text-emerald-600 border-emerald-200",
  };

  return styles[status] || "bg-slate-50 text-slate-600 border-slate-200";
};

export function SellsTable({
  sells,
  onViewSell,
  onEditSell,
  onViewNote,
  highlightedId,
  hasMore,
  onLoadMore,
}: SellsTableProps) {
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
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <p className="border-b border-slate-100 px-3 py-2 text-xs text-slate-600 lg:hidden">Desliza para ver todas las columnas.</p>
        <Table aria-label="Ventas" className="min-w-[900px]">
          <TableHeader className="bg-slate-50">
            <TableRow className="border-slate-200 hover:bg-transparent">
              <TableHead className="sticky left-0 z-20 bg-slate-50 font-semibold text-slate-700 py-2 px-3 xl:px-4">
                Cliente
              </TableHead>
              <TableHead className="font-semibold text-slate-700 py-2 px-3 xl:px-4">
                Diseño
              </TableHead>
              <TableHead className="font-semibold text-slate-700 py-2 px-3 xl:px-4">
                Metro
              </TableHead>
              <TableHead className="font-semibold text-slate-700 py-2 px-3 xl:px-4">
                Pago
              </TableHead>
              <TableHead className="font-semibold text-slate-700 py-2 px-3 xl:px-4">
                Estado
              </TableHead>
              <TableHead className="font-semibold text-slate-700 py-2 px-3 xl:px-4">
                Fecha
              </TableHead>
              <TableHead className="text-right font-semibold text-slate-700 py-2 px-3 xl:px-4">
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sells.map((sell) => (
              <TableRow
                key={sell.id}
                className={`border-slate-100 hover:bg-slate-50/50 transition-colors ${
                  highlightedId === sell.id
                    ? "bg-amber-50/80 ring-1 ring-amber-200 shadow-[0_0_0_4px_rgba(251,191,36,0.1)]"
                    : ""
                }`}
              >
                <TableCell className={`sticky left-0 z-10 max-w-[140px] truncate font-medium text-slate-900 py-2 px-3 xl:px-4 sm:max-w-[180px] xl:max-w-[240px] ${highlightedId === sell.id ? "bg-amber-50" : "bg-white"}`}>
                  <a
                    href={`/clientes/detalle?id=${sell.clientId}`}
                    className="block truncate hover:text-sky-700 transition-colors underline-offset-4 hover:underline"
                    title={`${sell.client} - Ver perfil del cliente`}
                  >
                    {sell.client}
                  </a>
                </TableCell>
                <TableCell className="text-slate-600 py-2 px-3 xl:px-4 max-w-[200px] truncate xl:max-w-[250px]" title={sell.design}>
                  {sell.design}
                </TableCell>
                <TableCell className="text-slate-600 py-2 px-3 xl:px-4 tabular-nums whitespace-nowrap">
                  {sell.metro_total != null ? `${sell.metro_total} m` : "-"}
                </TableCell>
                <TableCell className="text-slate-600 py-2 px-3 xl:px-4 tabular-nums font-medium">
                  S/ {sell.amount.toLocaleString("es-PE")}
                  <span className="mt-1 block text-xs font-normal text-slate-500">{sell.metodo_pago ?? "Yape"}</span>
                </TableCell>
                <TableCell className="py-2 px-3 xl:px-4">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${getStatusBadge(sell.status)}`}
                  >
                    {sell.status}
                  </span>
                </TableCell>
                <TableCell className="text-slate-600 py-2 px-3 xl:px-4 max-w-[200px] truncate xl:max-w-[250px]">
                  {formatBusinessDate(sell.date)}
                </TableCell>
                <TableCell className="text-right py-2 px-3 xl:px-4">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-11 w-11 rounded-lg sm:h-9 sm:w-9 border-slate-200 text-slate-600 hover:bg-slate-100"
                      onClick={() => onViewSell(sell)}
                      title="Ver detalles"
                      aria-label={`Ver detalles de venta ${sell.id}`}
                    >
                      <Info className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-11 w-11 rounded-lg sm:h-9 sm:w-9 border-slate-200 text-slate-600 hover:bg-slate-100"
                      onClick={() => onEditSell(sell)}
                      title="Editar"
                      aria-label={`Editar venta ${sell.id}`}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    {onViewNote && sell.nota && (
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-11 w-11 rounded-lg sm:h-9 sm:w-9 border-amber-200 text-amber-600 hover:bg-amber-50 hover:border-amber-300"
                        onClick={() => onViewNote(sell)}
                        title="Ver nota"
                        aria-label={`Ver nota de venta ${sell.id}`}
                      >
                        <StickyNote className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {sells.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-32 text-center text-slate-500"
                >
                  No se encontraron ventas.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {hasMore && (
        <div ref={observerTarget} className="flex justify-center py-6">
          <div className="flex items-center gap-2 text-sm text-slate-500 font-semibold bg-slate-50 border border-slate-100 rounded-full px-5 py-2 shadow-sm animate-pulse">
            <Loader2 className="h-4 w-4 animate-spin text-sky-700" />
            Cargando más trabajos...
          </div>
        </div>
      )}
    </div>
  );
}
