-- creado_el is UTC. Lima is UTC-5; the UTC date is one day ahead of Lima
-- from 00:00:00 through 04:59:59 UTC. Keep explicitly chosen dates intact.
-- Run the preview SELECT first.

UPDATE ventas
SET fecha = date(creado_el, '-5 hours')
WHERE creado_el IS NOT NULL
  AND time(creado_el) >= '00:00:00'
  AND time(creado_el) < '05:00:00'
  AND (fecha IS NULL OR fecha = date(creado_el));

CREATE TRIGGER IF NOT EXISTS ventas_fecha_lima_after_insert
AFTER INSERT ON ventas
WHEN NEW.creado_el IS NOT NULL AND (
  NEW.fecha IS NULL OR (
    time(NEW.creado_el) >= '00:00:00' AND
    time(NEW.creado_el) < '05:00:00' AND
    NEW.fecha = date(NEW.creado_el)
  )
)
BEGIN
  UPDATE ventas
  SET fecha = date(NEW.creado_el, '-5 hours')
  WHERE id = NEW.id;
END;
