# Corrección de fechas de ventas en D1

`creado_el` es una marca de tiempo UTC. Entre `00:00:00` y `04:59:59` UTC,
el día comercial de Lima es el día anterior. A las `05:00:00` UTC ya es
medianoche en Lima y no se debe restar un día.

1. Revisar las filas candidatas con
   [`2026-09-30_ventas_fecha_lima_preview.sql`](2026-09-30_ventas_fecha_lima_preview.sql).
2. Revisar cualquier fecha elegida manualmente que coincida con el día UTC;
   la base no permite distinguirla del valor predeterminado anterior.
3. Ejecutar [`2026-09-30_ventas_fecha_lima.sql`](2026-09-30_ventas_fecha_lima.sql)
   en la D1 de producción. Conserva `creado_el`, actualiza `fecha` y crea el
   trigger para ventas futuras.
4. Volver a ejecutar el archivo de vista previa: ya no debe mostrar las filas
   corregidas.

La columna `clientes.estado` no forma parte del esquema actual del código.
Si existe solo en producción, está vacía y no tiene dependencias, se puede
retirar por separado con
[`2026-09-30_clientes_estado_unused.sql`](2026-09-30_clientes_estado_unused.sql).

El frontend usa `America/Lima` y presenta las fechas de ventas como
`DD/MM/YYYY`. El Worker del backend también debe desplegarse para que sus
consultas de reportes usen el día de Lima; el directorio `functions/` está
excluido de Git en este repositorio.
