# Seguimiento trasladado a Work System

La aplicaci?n de trabajos se separ? de Print System en un repositorio y
un despliegue independientes:

- Repositorio: https://github.com/DiogoFabricioAG/work-system
- Aplicaci?n: https://task-system.diogoabregu.tech

Print System mantiene clientes, ventas, importes, m?todos de pago y el listener.
Work System consulta ventas y registra las etapas de producci?n, con vistas
propias para el jefe y los trabajadores. La columna Proceso y su l?nea de tiempo
ya no forman parte de las ventas en Print System.

## D1 compartida

Se conservan `usuarios`, `clientes`, `ventas`, `venta_etapas_registradas` y
`venta_etapas_omisiones`, con sus datos e ID. Work System no modifica las
columnas comerciales de ventas. No hay sincronizaci?n ni copias entre bases.

Las cuentas son las mismas, pero hay que iniciar sesi?n en cada aplicaci?n:
Print System usa `sesiones` y Work System usa `work_sesiones`. Un token de una
aplicaci?n no es v?lido en la otra. Los trabajadores acceden exclusivamente a
Work System; la URL antigua `/trabajador/ventas` redirige al nuevo acceso.

## Migraciones y API

Las migraciones hist?ricas 0001 a 0004 de Print System se conservan. Las
migraciones propias de Work System usan su tabla `work_migrations`. Las rutas
`/api/seguimiento/*`, `/api/trabajador/*` y `/api/trabajadores/*` se retiraron del
Worker de Print System y viven en el Worker de Work System.

El flujo actual sigue siendo Impreso -> Planchado -> Procesado, con Terminado
para los hist?ricos. Las omisiones se consultan en el detalle de cada trabajo.
No hay campana ni centro de notificaciones. Ver README del repositorio nuevo
para desarrollo, pruebas, publicaci?n y API.
