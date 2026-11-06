# Evidencia de la arquitectura Kromata

Inventario de la implementación inspeccionada para el caso de estudio del portfolio.
Describe responsabilidades y tecnologías, sin incluir credenciales ni datos del negocio.

## Print System

Repositorio: `DiogoFabricioAG/print-system`.
Las fuentes públicas citadas por el diagrama se fijan al commit indicado en su especificación.

- `frontend/package.json` y `frontend/astro.config.mjs`: Astro 6, React 19,
  TypeScript y Tailwind CSS 4; compilación del sitio estático con islas React.
- `frontend/src/lib/api.ts`: solicitudes HTTPS hacia el Worker comercial;
  autorización de las sesiones mediante `Authorization: Bearer`.
- Vercel aloja el frontend en `print-system.diogoabregu.tech`, comprobado en los
  estados de despliegue del repositorio y en el sitio publicado.
- `functions/src/index.ts` y `functions/package.json`: API Hono y validación Zod.
- `functions/wrangler.jsonc`: Worker `functions`, con binding `DB` a `gamarra_db`.
- `functions/src/db/schema.ts`: clientes, ventas, pagos y cuentas `usuarios`.
- `functions/src/auth/session.ts`: sesiones propias en `sesiones`.
- `functions/src/middleware/api_key.ts`: sesiones del jefe para la web y
  `X-API-Key` para el consumidor de escritorio.
- `functions/src/routes/ventas.ts` y `functions/src/sheets.ts`: la venta se guarda
  primero en D1 y después se sincroniza a Sheets. El fallo de Sheets se registra
  y no revierte la venta ya persistida. Sheets es una integración secundaria.

## Job System / Work System

Repositorio: `DiogoFabricioAG/work-system`.
Revisión inspeccionada: `2346982bc5262eb76c8aab66bbc0704cc1f71783`.
Sus fuentes se revisaron localmente; este inventario público registra los hechos
verificados sin copiar el código del repositorio privado.

- `package.json`, `vite.config.ts` y `src/main.tsx`: React 19, Vite 7,
  TypeScript, Tailwind CSS 4, Base UI e iconos Lucide.
- `wrangler.jsonc`: Worker `gestion-trabajos`, con API y frontend en el mismo
  despliegue; `assets.directory=dist`, binding `ASSETS`, SPA como fallback y
  `run_worker_first` para `/api/*`.
- Dominio personalizado: `task-system.diogoabregu.tech`.
- El binding `DB` apunta a la misma D1 `gamarra_db` de Print System.
- `server/index.ts`: Hono y middleware de sesión para `/api/*`.
- `src/api.ts`: solicitudes relativas a `/api`, en el mismo origen del frontend.
- `server/auth.ts`: comparte `usuarios`, pero valida tokens exclusivamente
  contra `work_sesiones`, separadas de las sesiones comerciales.
- `server/tareas.ts`: sólo el jefe crea tareas desde una venta disponible;
  guarda `venta_id`, una copia de sus datos de trabajo y `entrega_limite` en UTC.
- `server/trabajadores.ts`: los trabajadores registran su propia etapa y se
  conserva la cuenta y fecha del registro; se registran omisiones de etapas.
- Tablas de producción: `work_tareas`, `work_tarea_etapas`,
  `work_tarea_omisiones` y `work_tarea_entregas`.
- Sólo el jefe registra la entrega; el servidor exige Impresión y Planchado
  registrados. Una venta nueva en Print System no crea una tarea automáticamente.
- `wrangler.jsonc`: migraciones independientes mediante `work_migrations`.
- `.github/workflows/check.yml`: GitHub Actions verifica build y pruebas.
  La publicación del Worker se realiza con Wrangler.

## Listener de Windows

- `watcher/requirements.txt`: Python, watchdog, requests, python-dotenv y Pillow.
- `watcher/watcher.py`: observa PNG, mantiene una cola local y solicita revisión
  de la venta antes del envío mediante la interfaz Tkinter.
- `watcher/source_filter.py`: comprueba `Zone.Identifier`; el filtro activado
  omite descargas web y permite exportaciones locales sin esa marca.
- `watcher/api_client.py`: envía ventas y, cuando corresponde, pagos o adelantos
  a la API comercial con `X-API-Key`. No escribe directamente en D1.
- `watcher/state.py`: SQLite local `state.db` para procesados, pendientes y reintentos.
- `watcher/install-task.ps1`: ejecución mediante el Programador de tareas de Windows.
- `.github/workflows/watcher-release.yml`: GitHub Actions compila el ejecutable
  con PyInstaller y publica una release junto con el SHA-256 del archivo.
- `watcher/update-watcher.ps1`: verifica y reemplaza el ejecutable, reinicia la
  tarea y comprueba el heartbeat. Conserva configuración y estado local.

## Persistencia y contratos

Las dos APIs acceden directamente a D1 mediante su binding; no hay una llamada
de API comercial a API de trabajos en este flujo. La separación funcional está
en las rutas, permisos, tablas y despliegues de cada aplicación. Los permisos de
producción se validan en el servidor; compartir usuarios no implica compartir sesión.

La cola del listener y su SQLite son locales al equipo Windows. Las tareas de
producción son registros de negocio creados por el administrador. No se representa
una cola de Cloudflare ni una creación automática de tareas que el código no implementa.
