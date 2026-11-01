-- Do not create money movements when existing general payments need allocation.
CREATE TRIGGER IF NOT EXISTS ventas_exigir_asociacion_pagos
BEFORE UPDATE OF estado ON ventas
WHEN NEW.estado = 'Pagó' AND OLD.estado IS NOT 'Pagó'
    AND ROUND(NEW.pago * 100) > ROUND(COALESCE((
        SELECT SUM(pago) FROM pagos WHERE venta_id = NEW.id
    ), 0) * 100)
    AND EXISTS (
        SELECT 1 FROM pagos WHERE cliente_id = NEW.cliente_id AND venta_id IS NULL AND pago > 0
    )
BEGIN
    SELECT RAISE(ABORT, 'PAGOS_SIN_VENTA');
END;
