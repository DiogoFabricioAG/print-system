// This snapshot is also checked inside the write batch, so another request
// cannot claim a payment or change the balance between review and confirmation.
const paymentSnapshotSql = `SELECT
    v.cliente_id, v.estado,
    COALESCE((SELECT ROUND(SUM(pago) * 100) FROM pagos WHERE venta_id = v.id), 0) AS linked_cents,
    json_object(
        'venta', v.id, 'cliente', v.cliente_id, 'estado', v.estado, 'total', ROUND(v.pago * 100),
        'linked', COALESCE((SELECT ROUND(SUM(pago) * 100) FROM pagos WHERE venta_id = v.id), 0),
        'available', json((SELECT json_group_array(json_object('id', id, 'cents', ROUND(pago * 100)))
            FROM (SELECT id, pago FROM pagos WHERE cliente_id = v.cliente_id
                AND venta_id IS NULL AND pago > 0 ORDER BY id)))
    ) AS version
    FROM ventas v WHERE v.id = ?`;

export interface PaymentResolution {
    version: string;
    existing_payment_ids: number[];
    new_payment_amount: number;
}

export async function getSalePaymentReview(db: D1Database, saleId: number, total: number) {
    const snapshot = await db.prepare(paymentSnapshotSql).bind(saleId).first<{
        cliente_id: number; estado: string | null; linked_cents: number; version: string;
    }>();
    if (!snapshot) return null;
    const { results: payments } = await db.prepare(
        `SELECT id, pago, nota, fecha FROM pagos
         WHERE cliente_id = ? AND venta_id IS NULL AND pago > 0 ORDER BY fecha DESC, id DESC`,
    ).bind(snapshot.cliente_id).all<{ id: number; pago: number; nota: string | null; fecha: string | null }>();
    return {
        code: "SALE_PAYMENT_REVIEW" as const,
        pending_amount: Math.max(Math.round(total * 100) - snapshot.linked_cents, 0) / 100,
        payments,
        version: snapshot.version,
        cliente_id: snapshot.cliente_id,
        estado: snapshot.estado,
    };
}

export async function resolveSalePayment(
    db: D1Database,
    saleId: number,
    payload: { cliente_id: number; pago: number; estado?: string | null; diseno: string; fecha?: string | null },
    resolution: PaymentResolution,
    update: D1PreparedStatement,
) {
    const review = await getSalePaymentReview(db, saleId, payload.pago);
    if (!review || review.version !== resolution.version || review.estado === "Pagó"
        || payload.estado !== "Pagó" || review.cliente_id !== payload.cliente_id) {
        return null;
    }
    const ids = new Set(resolution.existing_payment_ids);
    const selected = review.payments.filter(payment => ids.has(payment.id));
    if (ids.size !== resolution.existing_payment_ids.length || selected.length !== ids.size) return null;
    const selectedCents = selected.reduce((sum, payment) => sum + Math.round(payment.pago * 100), 0);
    const newCents = Math.max(Math.round(review.pending_amount * 100) - selectedCents, 0);
    if (Math.round(resolution.new_payment_amount * 100) !== newCents) return null;

    // SQLite's json() raises on invalid JSON. Used as an assertion in D1.batch,
    // this aborts and rolls back ALL writes if the financial snapshot is stale.
    const statements = [db.prepare(`SELECT json(CASE WHEN
        (SELECT version FROM (${paymentSnapshotSql})) = ?
        THEN 'true' ELSE 'PAYMENT_SNAPSHOT_CHANGED' END)`)
        .bind(saleId, resolution.version)];
    for (const payment of selected) {
        statements.push(db.prepare("UPDATE pagos SET venta_id = ? WHERE id = ?")
            .bind(saleId, payment.id));
    }
    if (newCents > 0) {
        statements.push(db.prepare(`INSERT INTO pagos (cliente_id, venta_id, pago, nota, fecha)
            SELECT cliente_id, id, ?, ?,
                COALESCE(NULLIF(?, ''), NULLIF(fecha, ''), date(creado_el, '-5 hours'), date('now', '-5 hours'))
            FROM ventas WHERE id = ?`)
            .bind(newCents / 100, `Pago completo venta #${saleId} - ${payload.diseno}`, payload.fecha ?? null, saleId));
    }
    statements.push(update);
    try {
        const results = await db.batch(statements);
        return results[results.length - 1];
    } catch (error) {
        if (error instanceof Error && error.message.includes("malformed JSON")) return null;
        throw error;
    }
}
