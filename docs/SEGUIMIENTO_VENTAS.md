# Seguimiento de ventas por rol

## Flujo

Cada usuario con rol `trabajador` tiene una etapa fija: `0 Inicial`, `1 Imprimir`,
`2 Planchar`, `3 Entregado`. Tras iniciar sesión, el trabajador ve únicamente
`Cliente | Diseño | Estado | Fecha | Acciones` y registra **su** etapa al
terminar. No se asigna un responsable por venta ni se muestran tiempos de
trabajo.

Una etapa posterior se puede registrar aunque falte una anterior. En ese caso
se crea una alerta permanente para el jefe en `venta_etapas_omisiones`. Aunque
la etapa anterior se registre después, la alerta conserva que se omitió en el
momento del avance. El jefe ve el estado de producción en la columna `Proceso`:
**Impreso** al crear la venta, **Planchado** cuando se registra Impresión y
**Procesado** cuando se registra Planchar y **Terminado** cuando se registra Entregado. El modal de información
muestra la línea de tiempo `Impreso → Planchado → Procesado → Terminado` y el detalle de las
etapas omitidas. `Impreso` es el estado inicial de la venta; no implica que un
trabajador ya haya registrado la etapa de impresión.

La migración `0002_ventas_historicas_terminadas.sql` marca todas las ventas
existentes en ese momento como **Terminado**, sin inventar registros de etapas.
Esas ventas se conservan en la vista del jefe y no aparecen como pendientes a
los trabajadores. Las ventas creadas después inician en **Impreso** y pasan a
**Terminado** al registrar la etapa Entregado.

## Datos y API

La migración ejecutable está en
[`../functions/migrations/0001_seguimiento_usuarios.sql`](../functions/migrations/0001_seguimiento_usuarios.sql).
El esquema de referencia está en [`sql/2026-10-23_seguimiento_ventas.sql`](sql/2026-10-23_seguimiento_ventas.sql).
Las cuentas de jefe y trabajador viven en `usuarios`. Las columnas nuevas son
`nombre`, `rol`, `etapa_orden`, `activo`, `password_salt` y `password_alg`.
`sesiones.usuario_id` y `venta_etapas_registradas.trabajador_id` apuntan a
`usuarios.id`. El Worker migra las bases antiguas sin cambiar los ID de los
administradores. Si existieran nombres de usuario repetidos entre ambas tablas
antiguas, detiene la migración para evitar fusionar personas distintas.
`registrado_el` y `detectado_el` son fechas de auditoría en UTC, no se usan
para calcular productividad ni duración. `ensureSchema` conserva compatibilidad
con bases locales antiguas.

| Ruta | Acceso | Función |
| --- | --- | --- |
| `POST /api/login` | Público | Devuelve sesión con `rol` y etapa si es trabajador. |
| `POST /api/trabajadores/cuentas` | Jefe | Crea cuenta con `nombre`, `username`, `password` (mínimo 8 caracteres) y `etapa_orden`. |
| `GET /api/trabajador/ventas` | Trabajador | Lista reducida de ventas y estado de su etapa. |
| `POST /api/trabajador/ventas/:id/registrar` | Trabajador | Registra solo su etapa y alertas por etapas anteriores omitidas. |
| `GET /api/seguimiento/resumen` | Jefe | Datos de la columna `Proceso`. |

Las cuentas de trabajadores se crean mediante el endpoint del jefe, usando el
token devuelto por su login en el encabezado `Authorization: Bearer <token>`.
Las contraseñas nuevas se guardan con PBKDF2 y sal individual. El hash SHA-256
anterior del jefe se reemplaza por PBKDF2 tras su primer login correcto. Las
sesiones duran siete días y en D1 solo se guarda el hash del token.

Para desarrollo local, ejecutar `wrangler dev --local` en `functions/` y después
iniciar el frontend con `PUBLIC_API_BASE_URL=http://127.0.0.1:8787/api`.
La URL de D1 del Worker publicado no se usa en esta configuración local.

## Publicación

El backend se despliega en Cloudflare Workers y el frontend en Vercel. La
migración `0001_seguimiento_usuarios.sql` se aplicó a la D1 de producción el
23/10/2026 antes de publicar el Worker. El respaldo anterior está en la carpeta
local ignorada `functions/.wrangler/backups/`; D1 Time Travel conserva otro
punto de recuperación. La migración automática de `ensureSchema` absorbe
`trabajador_cuentas` en bases locales antiguas y conserva sus registros de
etapas y sesiones. El archivo `docs/sql` es solo una referencia del esquema.
