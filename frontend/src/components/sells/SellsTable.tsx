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
      <div className="grid gap-3 sm:grid-cols-2 lg:hidden">
        {sells.map((sell) => (
          <article key={sell.id} className={`rounded-2xl border bg-white p-4 shadow-sm ${highlightedId === sell.id ? "border-amber-300" : "border-slate-200"}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <a href={`/clientes/detalle?id=${sell.clientId}`} className="block break-words text-base font-bold text-slate-900 hover:text-sky-600">{sell.client}</a>
                <p className="mt-1 text-xs text-slate-500">Venta #{sell.id} · {formatBusinessDate(sell.date)}</p>
              </div>
              <span className={`shrink-0 rounded-lg border px-2 py-1 text-xs font-bold ${getStatusBadge(sell.status)}`}>{sell.status}</span>
            </div>
            <div className="mt-4 border-t border-slate-100 pt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Diseño</p>
              <p className="mt-1 break-words text-sm leading-6 text-slate-800">{sell.design}</p>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 rounded-xl bg-slate-50 p-3">
              <div>
                <p className="text-xs text-slate-500">Pago</p>
                <p className="mt-1 text-sm font-bold tabular-nums text-slate-900">S/ {sell.amount.toLocaleString("es-PE")}</p>
                <p className="mt-1 text-xs text-slate-600">{sell.metodo_pago ?? "Yape"}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
              <span>Metro: {sell.metro_total != null ? `${sell.metro_total} m` : "—"}</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-4">
              <Button variant="outline" className="min-h-11 rounded-xl border-slate-200 text-slate-700" onClick={() => onViewSell(sell)}><Info className="mr-2 h-4 w-4" /> Información</Button>
              <Button variant="outline" className="min-h-11 rounded-xl border-slate-200 text-slate-700" onClick={() => onEditSell(sell)}><Edit2 className="mr-2 h-4 w-4" /> Editar</Button>
              {onViewNote && sell.nota && <Button variant="outline" className="col-span-2 min-h-11 rounded-xl border-amber-200 text-amber-700" onClick={() => onViewNote(sell)}><StickyNote className="mr-2 h-4 w-4" /> Ver nota</Button>}
            </div>
          </article>
        ))}
        {sells.length === 0 && <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 sm:col-span-2">No se encontraron ventas.</div>}
      </div>
      <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm lg:block">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow className="border-slate-200 hover:bg-transparent">
              <TableHead className="font-semibold text-slate-700 py-4 px-3 xl:px-6">
                Cliente
              </TableHead>
              <TableHead className="font-semibold text-slate-700 py-4 px-3 xl:px-6">
                Diseño
              </TableHead>
              <TableHead className="font-semibold text-slate-700 py-4 px-3 xl:px-6">
                Metro
              </TableHead>
              <TableHead className="font-semibold text-slate-700 py-4 px-3 xl:px-6">
                Pago
              </TableHead>
              <TableHead className="font-semibold text-slate-700 py-4 px-3 xl:px-6">
                Estado
              </TableHead>
              <TableHead className="font-semibold text-slate-700 py-4 px-3 xl:px-6">
                Fecha
              </TableHead>
              <TableHead className="text-right font-semibold text-slate-700 py-4 px-3 xl:px-6">
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
                <TableCell className="max-w-[180px] truncate font-medium text-slate-900 py-4 px-3 xl:px-6 xl:max-w-[240px]">
                  <a
                    href={`/clientes/detalle?id=${sell.clientId}`}
                    className="block truncate hover:text-sky-700 transition-colors underline-offset-4 hover:underline"
                    title={`${sell.client} ? Ver perfil del cliente`}
                  >
                    {sell.client}
                  </a>
                </TableCell>
                <TableCell className="text-slate-600 py-4 px-3 xl:px-6 max-w-[200px] truncate xl:max-w-[250px]">
                  {sell.design}
                </TableCell>
                <TableCell className="text-slate-600 py-4 px-3 xl:px-6 tabular-nums whitespace-nowrap">
                  {sell.metro_total != null ? `${sell.metro_total} m` : "-"}
                </TableCell>
                <TableCell className="text-slate-600 py-4 px-3 xl:px-6 tabular-nums font-medium">
                  S/ {sell.amount.toLocaleString("es-PE")}
                  <span className="mt-1 block text-xs font-normal text-slate-500">{sell.metodo_pago ?? "Yape"}</span>
                </TableCell>
                <TableCell className="py-4 px-3 xl:px-6">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${getStatusBadge(sell.status)}`}
                  >
                    {sell.status}
                  </span>
                </TableCell>
                <TableCell className="text-slate-600 py-4 px-3 xl:px-6 max-w-[200px] truncate xl:max-w-[250px]">
                  {formatBusinessDate(sell.date)}
                </TableCell>
                <TableCell className="text-right py-4 px-3 xl:px-6">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 rounded-lg border-slate-200 text-slate-600 hover:bg-slate-100"
                      onClick={() => onViewSell(sell)}
                      title="Ver detalles"
                    >
                      <Info className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 rounded-lg border-slate-200 text-slate-600 hover:bg-slate-100"
                      onClick={() => onEditSell(sell)}
                      title="Editar"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    {onViewNote && sell.nota && (
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 rounded-lg border-amber-200 text-amber-600 hover:bg-amber-50 hover:border-amber-300"
                        onClick={() => onViewNote(sell)}
                        title="Ver nota"
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
