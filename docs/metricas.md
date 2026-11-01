# Métricas del negocio

`/metricas` se abre desde el cuarto acceso del inicio, «Ver Métricas».
El gráfico anterior deja de cargarse en el inicio. El estado de resultados
existente conserva su funcionamiento.

El endpoint autenticado `GET /api/metricas?desde=YYYY-MM-DD&hasta=YYYY-MM-DD&agrupacion=dia`
admite hasta 366 días inclusivos y agrupaciones `dia`, `semana` (lunes) o `mes`.
Compara con los mismos días de duración inmediatamente anteriores al inicio.
Las fechas explícitas de ventas y pagos son comerciales; los timestamps UTC
de compras y las ventas sin fecha se convierten al día de Lima.

El gráfico diario y su tabla omiten domingos sin ventas, cobros, gastos
ni compras de insumos. Los domingos con movimientos se conservan. Los totales,
la duración del periodo de comparación y los límites semanales/mensuales no cambian.

- Ventas: importe de las ventas creadas para el periodo, con cualquier estado.
- Costo estimado: porcentaje `costo_venta_porcentaje` del negocio, aplicado por día.
- Gastos operativos: compras de tipo `GASTO` del periodo.
- Utilidad operativa estimada: ventas − costo estimado − gastos operativos.
- Cobros registrados: pagos por su propia fecha; pueden pertenecer a otras ventas.
- Flujo de caja del periodo: cobros − compras `INSUMO` − compras `GASTO`.

La utilidad mostrada es anterior a impuestos y depreciación, y no equivale a la
utilidad neta del estado de resultados anterior. No se duplican costos restando
insumos y además el porcentaje estimado. Los cobros dependen de que los pagos
se hayan registrado: no se infieren a partir del estado «Pagó». El flujo no incluye
saldos iniciales y no representa el saldo bancario.

Se calcula en céntimos; los totales del gráfico y la tabla se obtienen de las
mismas filas diarias. La API usa un batch de consultas de solo lectura y no necesita
migración. La estimación puede mostrar pérdidas. Un periodo sin ventas tiene margen
no aplicable, en vez de un porcentaje artificial.

Verificación desde `functions`: `node tests/metrics.cjs`. Usa D1 local en memoria,
sin datos ni escrituras de producción.
