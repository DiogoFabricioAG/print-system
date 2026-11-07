import * as React from "react"
import type { SalePaymentReview, SalePaymentResolution } from "@/lib/api"
import { formatBusinessDate } from "@/lib/business-date"

const money = (value: number) => `S/ ${value.toFixed(2)}`

export function SalePaymentReviewFields({ review, onChange }: {
  review: SalePaymentReview
  onChange: (resolution: SalePaymentResolution | null) => void
}) {
  const [mode, setMode] = React.useState<"existing" | "new" | null>(null)
  const [selected, setSelected] = React.useState<number[]>([])

  React.useEffect(() => {
    setMode(null)
    setSelected([])
    onChange(null)
  }, [review, onChange])

  const selectedCents = review.payments
    .filter(payment => selected.includes(payment.id))
    .reduce((sum, payment) => sum + Math.round(payment.pago * 100), 0)
  const newAmount = Math.max(Math.round(review.pending_amount * 100) - (mode === "existing" ? selectedCents : 0), 0) / 100

  React.useEffect(() => {
    onChange(mode && (mode === "new" || selected.length > 0) ? {
      version: review.version,
      existing_payment_ids: mode === "existing" ? selected : [],
      new_payment_amount: newAmount,
    } : null)
  }, [mode, selected, newAmount, review.version, onChange])

  return (
    <fieldset className="mt-5 min-w-0 space-y-3">
      <legend className="mb-3 text-sm font-medium text-slate-900">
        Pendiente de esta venta: {money(review.pending_amount)}
      </legend>
      <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3">
        <input type="radio" name="sale-payment-source" checked={mode === "existing"}
          onChange={() => setMode("existing")} className="mt-1 h-4 w-4 shrink-0 accent-sky-700" />
        <span className="text-sm text-slate-900">Usar pagos ya registrados</span>
      </label>
      {mode === "existing" && (
        <div className="max-h-44 overflow-y-auto rounded-lg border border-slate-200">
          {review.payments.length === 0 && <p className="p-3 text-sm text-slate-600">Estos pagos ya fueron actualizados. Vuelve a editar la venta.</p>}
          {review.payments.map(payment => (
            <label key={payment.id} className="flex min-h-14 cursor-pointer items-start gap-3 border-b border-slate-100 p-3 last:border-0 hover:bg-slate-50">
              <input type="checkbox" checked={selected.includes(payment.id)}
                onChange={event => setSelected(ids => event.target.checked ? [...ids, payment.id] : ids.filter(id => id !== payment.id))}
                className="mt-1 h-4 w-4 shrink-0 accent-sky-700" />
              <span className="min-w-0 flex-1 text-sm">
                <span className="flex flex-wrap justify-between gap-x-3 font-medium text-slate-900">
                  <span>{money(payment.pago)}</span><span>{formatBusinessDate(payment.fecha)}</span>
                </span>
                <span className="mt-1 block break-words text-slate-600">{payment.nota || `Pago #${payment.id}`}</span>
              </span>
            </label>
          ))}
        </div>
      )}
      <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3">
        <input type="radio" name="sale-payment-source" checked={mode === "new"}
          onChange={() => setMode("new")} className="mt-1 h-4 w-4 shrink-0 accent-sky-700" />
        <span className="text-sm text-slate-900">Es un cobro nuevo
          <span className="mt-1 block text-slate-600">Los pagos anteriores corresponden a otros trabajos.</span>
        </span>
      </label>
      {mode && (mode === "new" || selected.length > 0) && (
        <p role="status" className="rounded-lg bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">
          {mode === "existing" && <>Se vincularán {money(selectedCents / 100)} de pagos existentes, conservando sus fechas. </>}
          {newAmount > 0 ? <>Se registrará un nuevo pago de <strong>{money(newAmount)}</strong>{mode === "existing" ? " por la diferencia" : ""}.</> : <>No se creará otro pago.</>}
          {mode === "existing" && selectedCents > Math.round(review.pending_amount * 100) && <> Los pagos superan el pendiente en {money((selectedCents - Math.round(review.pending_amount * 100)) / 100)} y se vincularán completos.</>}
        </p>
      )}
    </fieldset>
  )
}
