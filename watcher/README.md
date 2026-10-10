# Watcher EDA — PNG → Venta

Vigila una carpeta local y **registra una venta en Print System cada vez que aparece un PNG nuevo**, usando la API con `X-API-Key` (servicio externo).

```
entrada/nuevo.png
  → watchdog detecta el archivo y espera a que esté estable
  → valida que el nombre termine en .png + parsea el nombre
  → resuelve el cliente (si no existe, popup Tkinter: similar / crear / ignorar)
  → POST /api/ventas [+ POST /api/pagos si estado = Pagó]
  → clave de idempotencia en SQLite + mueve el archivo a procesados/
```

## Convención de nombre

```
[YYYY-MM-DD__]CLIENTE__DISEÑO__CANTIDAD__METROS__MAQUINA__MONTO[__ESTADO].png
```

| Campo | Ejemplos | Notas |
|---|---|---|
| FECHA (opcional) | `2026-10-08` | Fecha de la venta; por defecto hoy (America/Lima, vía API) |
| CLIENTE | `SR PABLO`, `JHONATAN` | Match sin tildes/mayúsculas contra la API |
| DISEÑO | `logo circular` | |
| CANTIDAD | `10uni`, `2polos`, `10` | Se guarda como texto |
| METROS | `1.5mts`, `150cm`, `2m` | `cm` se convierte a metros |
| MAQUINA | `DTF`, `impresion`, `plotter` | Alias configurables (`MAQUINA_ALIASES`) |
| MONTO | `S50`, `50`, `50.50` | Sin `/` (inválido en Windows) |
| ESTADO (opcional) | `Debe`, `Crédito`, `Pagó` | Por defecto `ESTADO_DEFAULT` (Debe). `Pagó` crea también el registro en pagos |

Ejemplos válidos:

```
SR PABLO__logo circular__10uni__1.5mts__DTF__S50.png
2026-10-08__JHONATAN__polo navidad__2polos__150cm__impresion__S120__Pagó.png
```

> El watcher comprueba la extensión `.png`, pero no inspecciona ni convierte el contenido: un TIFF que termine en `.png` también pasa. El separador por defecto es `__` (doble guion bajo) y se puede cambiar con `SEPARATOR` en `.env` (ej. `SEPARATOR=--`, útil para compartir el formato sin que WhatsApp lo ponga en cursiva). Un nombre fuera de convención abre un **formulario Tkinter** para completar la venta a mano (o va a `pendientes/` si la GUI está desactivada).

## Instalación

Requisitos: **Python 3.10+** (el instalador oficial de Windows incluye Tkinter).

```powershell
cd watcher
python -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt
Copy-Item .env.example .env
```

Edita `.env`:

```ini
WATCH_ROOT=C:\PrintSystem\ventas
# WATCH_FOLDER=D:\Disenos\cola   # opcional: carpeta monitoreada si es distinta de <WATCH_ROOT>\entrada
API_URL=https://functions.diogofabricio17.workers.dev/api
API_KEY=tu-api-key   # la generas con `npm run api-key` en functions/
```

## Mover a otra máquina

`.env` no se versiona: llévalo aparte (contiene la API key).

### Opción A — con Python instalado

1. Copia la carpeta `watcher/` al equipo destino (o clona el repo).
2. Instala Python 3.10+ (el instalador oficial de Windows incluye Tkinter) y crea el venv:
   ```powershell
   cd watcher
   python -m venv .venv
   .\.venv\Scripts\pip install -r requirements.txt
   ```
3. Crea `.env` con tu `API_KEY`, el `WATCH_ROOT` y (si aplica) el `WATCH_FOLDER` de esa máquina.
4. Prueba antes de dejarlo fijo:
   ```powershell
   .\.venv\Scripts\python watcher.py --validate "CLIENTE__diseno__1uni__1mts__DTF__S10.png"
   .\.venv\Scripts\python watcher.py --dry-run --once
   ```
5. Instala el arranque automático:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\install-task.ps1
   ```
6. Opcional: pon `GUI_ENABLED=false` si esa máquina no tendrá sesión interactiva (los casos dudosos irán a `pendientes/`).

### Opción B — sin Python en la máquina destino (exe portable)

1. En una máquina con Python (p. ej. esta), construye el ejecutable:
   ```powershell
   cd watcher
   powershell -ExecutionPolicy Bypass -File .\build-exe.ps1
   ```
   Genera `dist\PrintSystemWatcher.exe` (no requiere Python en el destino).
2. Copia a la máquina destino, **en la misma carpeta**: `PrintSystemWatcher.exe` + tu `.env` (ajusta `WATCH_ROOT`/`WATCH_FOLDER` de esa máquina).
3. Registra la tarea apuntando al ejecutable:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\install-task.ps1 -ExePath "C:\ruta\PrintSystemWatcher.exe"
   ```
   > Puedes copiar también `install-task.ps1`/`uninstall-task.ps1` a esa carpeta para gestionarla, o registrar la tarea manualmente en el Programador de tareas (al iniciar sesión, ejecutar el exe).
4. Notas del exe: arranca en 1-3 s (onefile); algunos antivirus pueden marcarlo la primera vez (agrega excepción); para actualizar, reconstruye aquí y reemplaza el `.exe`.

> La misma API key funciona desde cualquier máquina; si necesitas revocar el acceso de una, rótala con `npm run api-key` (functions/) y actualiza el `.env` de las máquinas vigentes.

## Uso

```powershell
.\.venv\Scripts\python watcher.py --validate "SR PABLO__logo__10uni__1.5mts__DTF__S50.png"
.\.venv\Scripts\python watcher.py --dry-run --once   # prueba sin enviar nada a la API
.\.venv\Scripts\python watcher.py                    # vigila en primer plano
.\.venv\Scripts\python watcher.py --stats            # procesados / reintentos / pendientes
```

| Flag | Descripción |
|---|---|
| `--once` | Procesa los PNG existentes en `entrada/` y sale |
| `--dry-run` | Parsea y resuelve, pero **no** envía nada a la API ni mueve archivos |
| `--validate NOMBRE.png` | Valida un nombre contra la convención |
| `--stats` | Estadísticas del estado local (SQLite) |
| `--no-gui` | Desactiva los diálogos Tkinter (todo lo dudoso va a `pendientes/`) |

## Tarea programada (Windows)

```powershell
powershell -ExecutionPolicy Bypass -File .\install-task.ps1
# Si ya existe y quieres reemplazarla:
powershell -ExecutionPolicy Bypass -File .\install-task.ps1 -Force
# Desinstalar:
powershell -ExecutionPolicy Bypass -File .\uninstall-task.ps1
```

- Se registra **al iniciar sesión** del usuario porque los popups Tkinter necesitan una sesión interactiva.
- Corre con `pythonw.exe` (sin consola); el log queda en `<WATCH_ROOT>\logs\watcher.log`.
- Si la tarea no muestra popups (p. ej. sin sesión), los casos dudosos van a `pendientes/` y el watcher sigue funcionando.
- Requiere el lock de instancia única: si ya hay un watcher corriendo, el segundo proceso sale solo.

## Carpetas y estados

```
<WATCH_ROOT>\
├── entrada\      PNG a procesar (solo si WATCH_FOLDER no está definido)
├── procesados\   ventas registradas correctamente
├── rechazados\   nombres inválidos o archivos ignorados (+ <archivo>.motivo.txt)
├── pendientes\   requieren revisión manual (API caída tras reintentos, sin GUI, etc.)
├── logs\         watcher.log (rotativo)
└── state.db      SQLite: procesados, reintentos y pendientes
```

> `WATCH_FOLDER` (opcional) define la carpeta **monitoreada** cuando los PNG llegan a otra ruta (otro disco, carpeta de red, salida de otro programa). Si no se define, se usa `<WATCH_ROOT>\entrada`.

## Confiabilidad

- **Idempotencia**: clave por nombre + tamaño + fecha de modificación. Eventos duplicados o reintentos del mismo archivo no se repiten; una re-subida del mismo PNG (nuevo mtime) **sí** registra una venta nueva (re-venta del mismo diseño).
- **Copias a medias**: espera a que el tamaño se estabilice antes de leer.
- **API caída / sin red**: cola de reintentos con backoff exponencial en SQLite (`MAX_RETRIES`, `RETRY_BASE_SECONDS`, `RETRY_MAX_SECONDS`).
- **Respuesta perdida tras un POST**: al reintentar se verifica `nota` (nombre + hash) contra `GET /api/ventas` para no duplicar.
- **401**: log crítico y `pendientes/`; revisa `API_KEY` en `.env`.

## Troubleshooting

| Síntoma | Causa probable |
|---|---|
| Todo va a `pendientes/` con "API key inválida (401)" | `API_KEY` mal copiada o rotada en Cloudflare |
| Los popups no aparecen | La tarea corre como SYSTEM o sin sesión; usa "Al iniciar sesión" o revisa `logs/watcher.log` |
| Los archivos no se mueven | Archivo abierto/bloqueado por otro programa (se reintenta el movimiento en el siguiente pase) |
| `--validate` dice INVÁLIDO | Revisa separador `__`, orden de campos y montos sin `/` |
