import { test } from "node:test";
import assert from "node:assert/strict";
import { containsAmountCell, sumAmountRange } from "../src/lib/amount-range.ts";

const rows = [{ deuda: 100.1, pago: 0 }, { deuda: 0, pago: 20.2 }, { deuda: 0.2, pago: 0 }, { deuda: 0, pago: 10.1 }];
test("suma un rango inclusivo en una columna con céntimos exactos", () => {
  assert.deepEqual(sumAmountRange(rows, { anchor: { row: 0, column: "deuda" }, end: { row: 2, column: "deuda" } }),
    { deuda: 100.3, pago: 0, total: 100.3, count: 2 });
});
test("permite selección inversa y rectangular en ambas columnas", () => {
  const range = { anchor: { row: 3, column: "pago" }, end: { row: 1, column: "deuda" } };
  assert.deepEqual(sumAmountRange(rows, range), { deuda: 0.2, pago: 30.3, total: 30.5, count: 3 });
  assert.equal(containsAmountCell(range, { row: 0, column: "pago" }), false);
});
test("una celda vacía no suma ni cuenta como importe", () => {
  assert.deepEqual(sumAmountRange(rows, { anchor: { row: 0, column: "pago" }, end: { row: 0, column: "pago" } }),
    { deuda: 0, pago: 0, total: 0, count: 0 });
});
