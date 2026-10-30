export type AmountColumn = "deuda" | "pago";
export type AmountCell = { row: number; column: AmountColumn };
export type AmountRange = { anchor: AmountCell; end: AmountCell };
const COLUMNS: AmountColumn[] = ["deuda", "pago"];

export function containsAmountCell(range: AmountRange, cell: AmountCell): boolean {
  const firstColumn = COLUMNS.indexOf(range.anchor.column);
  const lastColumn = COLUMNS.indexOf(range.end.column);
  const column = COLUMNS.indexOf(cell.column);
  return cell.row >= Math.min(range.anchor.row, range.end.row) &&
    cell.row <= Math.max(range.anchor.row, range.end.row) &&
    column >= Math.min(firstColumn, lastColumn) && column <= Math.max(firstColumn, lastColumn);
}

export function sumAmountRange(rows: Array<{ deuda: number; pago: number }>, range: AmountRange) {
  const cents = { deuda: 0, pago: 0 };
  let count = 0;
  rows.forEach((row, index) => {
    COLUMNS.forEach((column) => {
      const amount = Number(row[column]);
      if (containsAmountCell(range, { row: index, column }) && Number.isFinite(amount) && amount > 0) {
        cents[column] += Math.round(amount * 100);
        count++;
      }
    });
  });
  const mixedColumns = range.anchor.column !== range.end.column;
  const totalCents = mixedColumns ? cents.deuda - cents.pago : cents.deuda + cents.pago;
  return { deuda: cents.deuda / 100, pago: cents.pago / 100, total: totalCents / 100, count };
}
