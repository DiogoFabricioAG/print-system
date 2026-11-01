-- Historical amounts are preserved. Only unambiguous references are linked.
ALTER TABLE pagos ADD COLUMN venta_id INTEGER REFERENCES ventas(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS pagos_venta_id ON pagos(venta_id);

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
);

-- Web/watcher creation already records payments. Cover state transitions.
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
END;
