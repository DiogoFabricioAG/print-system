// Only link legacy payments whose note identifies exactly one sale. An amount
// or date match alone is not evidence that a payment belongs to that sale.
export const linkLegacySalePayments = String.raw`
UPDATE pagos SET venta_id = (
    SELECT v.id FROM ventas v
    WHERE v.cliente_id = pagos.cliente_id AND (
        pagos.nota IN ('Pago total venta #' || v.id, 'Adelanto venta #' || v.id)
        OR (pagos.nota = 'Pago completo - ' || v."diseño"
            AND ROUND(pagos.pago * 100) = ROUND(v.pago * 100))
        OR pagos.nota = 'Adelanto - ' || v."diseño"
    )
)
WHERE venta_id IS NULL AND 1 = (
    SELECT COUNT(*) FROM ventas v
    WHERE v.cliente_id = pagos.cliente_id AND (
        pagos.nota IN ('Pago total venta #' || v.id, 'Adelanto venta #' || v.id)
        OR (pagos.nota = 'Pago completo - ' || v."diseño"
            AND ROUND(pagos.pago * 100) = ROUND(v.pago * 100))
        OR pagos.nota = 'Adelanto - ' || v."diseño"
    )
);`;

// Creation already registers payments through the web/watcher. This trigger
// covers the missing path: changing an existing sale's state to Pagó. SQLite
// runs the payment insert in the same transaction as the state change.
export const paidSaleTrigger = String.raw`
CREATE TRIGGER IF NOT EXISTS ventas_registrar_pago_al_cambiar_estado
AFTER UPDATE OF estado ON ventas
WHEN NEW.estado = 'Pagó' AND OLD.estado IS NOT 'Pagó' AND NEW.pago > 0
BEGIN
    INSERT INTO pagos (cliente_id, venta_id, pago, nota, fecha)
    SELECT NEW.cliente_id, NEW.id,
        ROUND(NEW.pago - COALESCE(SUM(p.pago), 0), 2),
        'Pago completo venta #' || NEW.id || ' - ' || NEW."diseño",
        COALESCE(NULLIF(NEW.fecha, ''), date(NEW.creado_el, '-5 hours'), date('now', '-5 hours'))
    FROM pagos p WHERE p.venta_id = NEW.id
    HAVING ROUND(NEW.pago * 100) > ROUND(COALESCE(SUM(p.pago), 0) * 100);
END;`;

export async function ensureSalePaymentsSchema(db: D1Database) {
    const { results } = await db.prepare("PRAGMA table_info(pagos)").all<{ name: string }>();
    if (!results.some((column) => column.name === "venta_id")) {
        await db.batch([
            db.prepare("ALTER TABLE pagos ADD COLUMN venta_id INTEGER REFERENCES ventas(id) ON DELETE SET NULL"),
            db.prepare(linkLegacySalePayments),
        ]);
    }
    await db.batch([
        db.prepare("CREATE INDEX IF NOT EXISTS pagos_venta_id ON pagos(venta_id)"),
        db.prepare(paidSaleTrigger),
    ]);
}
