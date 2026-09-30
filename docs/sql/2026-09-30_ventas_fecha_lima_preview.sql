-- Review these rows before running the update. A manually selected date
-- equal to the UTC creation date cannot be distinguished from the old default.
SELECT id, creado_el, fecha AS fecha_actual,
       date(creado_el, '-5 hours') AS fecha_lima
FROM ventas
WHERE creado_el IS NOT NULL
  AND time(creado_el) >= '00:00:00'
  AND time(creado_el) < '05:00:00'
  AND (fecha IS NULL OR fecha = date(creado_el))
ORDER BY creado_el, id;
