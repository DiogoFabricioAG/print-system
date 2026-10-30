import * as React from "react";
import { createPortal } from "react-dom";
import { Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ClientDetail } from "@/lib/api";
import { formatBusinessDate } from "@/lib/business-date";
import { containsAmountCell, sumAmountRange, type AmountCell, type AmountColumn, type AmountRange } from "@/lib/amount-range";

type HistoryRow = ClientDetail["historial"][number];
const money = (value: number) => `S/ ${value.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function ClientHistoryTable({ rows, onEditPayment, onDeletePayment }: {
  rows: HistoryRow[];
  onEditPayment: (row: HistoryRow) => void;
  onDeletePayment: (id: number) => void;
}) {
  const [range, setRange] = React.useState<AmountRange | null>(null);
  const dragging = React.useRef(false);
  const awaitingEnd = React.useRef(false);
  const pointerType = React.useRef("");
  const tableRef = React.useRef<HTMLTableElement>(null);

  const clear = React.useCallback(() => {
    dragging.current = false;
    awaitingEnd.current = false;
    setRange(null);
  }, []);

  React.useEffect(clear, [rows, clear]);
  React.useEffect(() => {
    const stop = () => { dragging.current = false; };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") clear(); };
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    window.addEventListener("blur", stop);
    window.addEventListener("keydown", escape);
    return () => {
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
      window.removeEventListener("blur", stop);
      window.removeEventListener("keydown", escape);
    };
  }, [clear]);

  function selectEndpoint(cell: AmountCell, extend = false) {
    const extendRange = awaitingEnd.current || extend;
    setRange((previous) => previous && extendRange
      ? { anchor: previous.anchor, end: cell } : { anchor: cell, end: cell });
    awaitingEnd.current = !extendRange;
  }

  function amountButton(item: HistoryRow, row: number, column: AmountColumn) {
    const cell = { row, column };
    const selected = range !== null && containsAmountCell(range, cell);
    const amount = item[column];
    const label = column === "deuda" ? "Deuda" : "Pago";
    return (
      <button
        type="button"
        data-amount-row={row}
        data-amount-column={column}
        aria-pressed={selected}
        aria-label={`${label}, fila ${row + 1}: ${money(amount > 0 ? amount : 0)}`}
        aria-describedby="amount-range-help"
        className={`block min-h-14 w-full cursor-cell select-none whitespace-nowrap px-6 py-4 text-left text-sm font-bold tabular-nums outline-offset-[-2px] focus-visible:outline-2 focus-visible:outline-sky-700 ${column === "deuda" ? "text-rose-600" : "text-emerald-600"} ${selected ? "bg-sky-100 ring-1 ring-inset ring-sky-400" : "hover:bg-sky-50"}`}
        onPointerDown={(event) => {
          pointerType.current = event.pointerType;
          if (event.pointerType !== "mouse" || event.button !== 0) return;
          event.preventDefault();
          event.currentTarget.focus({ preventScroll: true });
          dragging.current = true;
          awaitingEnd.current = false;
          setRange((previous) => event.shiftKey && previous ? { anchor: previous.anchor, end: cell } : { anchor: cell, end: cell });
        }}
        onPointerEnter={(event) => {
          if (dragging.current && (event.buttons & 1) === 1) {
            setRange((previous) => previous ? { anchor: previous.anchor, end: cell } : null);
          }
        }}
        onClick={(event) => {
          if (pointerType.current !== "mouse" || event.detail === 0) selectEndpoint(cell, event.shiftKey);
        }}
        onKeyDown={(event) => {
          const rowOffset = event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0;
          const nextColumn = event.key === "ArrowLeft" ? "deuda" : event.key === "ArrowRight" ? "pago" : column;
          if (!rowOffset && nextColumn === column) return;
          event.preventDefault();
          const next: AmountCell = { row: Math.max(0, Math.min(rows.length - 1, row + rowOffset)), column: nextColumn };
          tableRef.current?.querySelector<HTMLButtonElement>(`[data-amount-row="${next.row}"][data-amount-column="${next.column}"]`)?.focus();
          if (event.shiftKey) {
            setRange((previous) => ({ anchor: previous?.anchor ?? cell, end: next }));
          }
        }}
      >{amount > 0 ? money(amount) : "—"}</button>
    );
  }

  const sum = range ? sumAmountRange(rows, range) : null;
  return (
    <>
      <p id="amount-range-help" className="border-b border-slate-100 px-6 py-3 text-sm text-slate-600">
        <span className="hidden sm:inline">Arrastra sobre los importes o usa Mayús + clic para sumar un rango.</span>
        <span className="sm:hidden">Para sumar un rango, toca el primer importe y luego el último.</span>
      </p>
      <Table ref={tableRef} className={range ? "mb-36 md:mb-24" : ""}>
        <TableHeader>
          <TableRow className="border-slate-100 hover:bg-transparent">
            {["Fecha", "Descripción", "Deuda", "Pago", "Acciones"].map((label) => <TableHead key={label} className="px-6 py-4 font-semibold text-slate-700">{label}</TableHead>)}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((item, index) => (
            <TableRow key={`${item.tipo}-${item.id}-${index}`} className="border-slate-50 hover:bg-slate-50/80">
              <TableCell className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">{formatBusinessDate(item.fecha)}</TableCell>
              <TableCell className="px-6 py-4">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex h-2 w-2 rounded-full ${item.tipo === "venta" ? "bg-rose-400" : "bg-emerald-400"}`} />
                  <span className="text-sm font-medium text-slate-800">{item.descripcion}</span>
                </div>
              </TableCell>
              <TableCell className="p-0">{amountButton(item, index, "deuda")}</TableCell>
              <TableCell className="p-0">{amountButton(item, index, "pago")}</TableCell>
              <TableCell className="px-6 py-4">
                {item.tipo === "pago" && <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600" onClick={() => onEditPayment(item)} title="Editar pago"><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600" onClick={() => onDeletePayment(item.id)} title="Eliminar pago"><Trash2 className="h-4 w-4" /></Button>
                </div>}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {range && sum && createPortal(
        <div className="fixed inset-x-4 bottom-24 z-40 mx-auto flex max-w-2xl items-center justify-between gap-3 rounded-2xl border border-sky-200 bg-white px-4 py-3 shadow-xl md:bottom-5">
          <div role="status" aria-live="polite" aria-atomic="true" className="min-w-0">
            <p className="text-xs font-medium text-slate-500">Filas {Math.min(range.anchor.row, range.end.row) + 1}–{Math.max(range.anchor.row, range.end.row) + 1} · {sum.count} montos</p>
            <p className="mt-1 text-base font-bold tabular-nums text-slate-900 sm:text-lg">Suma seleccionada: <span data-range-total>{money(sum.total)}</span></p>
            {range.anchor.column !== range.end.column && <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold tabular-nums"><span className="text-rose-600">Deuda: {money(sum.deuda)}</span><span className="text-emerald-600">Pago: {money(sum.pago)}</span></p>}
          </div>
          <button type="button" onClick={clear} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50" aria-label="Limpiar selección" title="Limpiar selección"><X className="h-5 w-5" /></button>
        </div>, document.body,
      )}
    </>
  );
}
