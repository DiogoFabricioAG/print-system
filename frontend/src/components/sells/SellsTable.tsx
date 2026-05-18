import * as React from "react";
import { Info, Edit2, ChevronLeft, ChevronRight, Banknote } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

export interface SellData {
  id: string;
  design: string;
  client: string;
  clientId: number;
  amount: number;
  pago_actual: number;
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
  onAddPayment: (sell: SellData) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const getStatusBadge = (status: string) => {
  const styles: Record<string, string> = {
    Debe: "bg-rose-50 text-rose-600 border-rose-200",
    Crédito: "bg-amber-50 text-amber-600 border-amber-200",
    Pagó: "bg-emerald-50 text-emerald-600 border-emerald-200",
    // Compatibilidad
    "Pago": "bg-emerald-50 text-emerald-600 border-emerald-200",
    "En Producción": "bg-amber-50 text-amber-600 border-amber-200",
    "Cancelado": "bg-emerald-50 text-emerald-600 border-emerald-200",
  };

  return styles[status] || "bg-slate-50 text-slate-600 border-slate-200";
};

export function SellsTable({
  sells,
  onViewSell,
  onEditSell,
  onAddPayment,
  currentPage,
  totalPages,
  onPageChange,
}: SellsTableProps) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow className="border-slate-200 hover:bg-transparent">
              <TableHead className="font-semibold text-slate-700 py-4 px-6">
                Cliente
              </TableHead>
              <TableHead className="font-semibold text-slate-700 py-4 px-6">
                Diseño
              </TableHead>
              <TableHead className="font-semibold text-slate-700 py-4 px-6">
                Pago
              </TableHead>
              <TableHead className="font-semibold text-slate-700 py-4 px-6">
                Estado
              </TableHead>
              <TableHead className="text-right font-semibold text-slate-700 py-4 px-6">
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sells.map((sell) => (
              <TableRow
                key={sell.id}
                className="border-slate-100 hover:bg-slate-50/50 transition-colors"
              >
                <TableCell className="font-medium text-slate-900 py-4 px-6">
                  {sell.client}
                </TableCell>
                <TableCell className="text-slate-600 py-4 px-6 max-w-[250px] truncate">
                  {sell.design}
                </TableCell>
                <TableCell className="text-slate-600 py-4 px-6 tabular-nums font-medium">
                  S/ {sell.amount.toLocaleString("es-PE")}
                  {sell.pago_actual > 0 && sell.pago_actual < sell.amount && (
                    <span className="block text-xs text-amber-500 font-semibold mt-0.5">
                      Pagado: S/ {sell.pago_actual.toLocaleString("es-PE")}
                    </span>
                  )}
                </TableCell>
                <TableCell className="py-4 px-6">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${getStatusBadge(sell.status)}`}
                  >
                    {sell.status}
                  </span>
                </TableCell>
                <TableCell className="text-right py-4 px-6">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 rounded-lg border-slate-200 text-amber-500 hover:text-amber-600 hover:bg-amber-50 disabled:opacity-50 disabled:bg-slate-50 disabled:text-slate-400"
                      onClick={() => onAddPayment(sell)}
                      title={sell.status === "Pagó" || sell.status === "Pago" ? "Venta cancelada" : "Aumentar Pago"}
                      disabled={sell.status === "Pagó" || sell.status === "Pago"}
                    >
                      <Banknote className="h-4 w-4" />
                    </Button>
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
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {sells.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-32 text-center text-slate-500"
                >
                  No se encontraron ventas.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">
            Página {currentPage} de {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-lg border-slate-200"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-lg border-slate-200"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
