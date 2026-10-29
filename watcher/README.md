# Watcher EDA — PNG → Venta

Vigila una carpeta local y **registra una venta en Print System cada vez que aparece un PNG nuevo**, usando la API con `X-API-Key` (servicio externo).

```
entrada/nuevo.png
  → watchdog detecta el archivo y espera a que esté estable
  → valida que el nombre termine en .png + parsea el nombre
  → muestra siempre Tkinter para revisar/editar la venta y confirmar
  → POST /api/ventas; si se confirma Pagó/Crédito, también registra el pago/adelanto
  → renombra con el nombre estándar y mueve a procesados/; la nota conserva el nombre original
```

## Convención de nombre

```
DISEÑO - CLIENTE - CANTIDAD - METRAJE - PAGO - MAQUINA.png
```

| Campo | Ejemplos | Notas |
|---|---|---|
| DISEÑO | `polo navidad` | Va primero; no debe contener el delimitador ` - ` |
| CLIENTE | `karen - deyna`, `JHONATAN` | Va segundo; match sin tildes/mayúsculas contra la API |
| CANTIDAD | `2polos`, `10uni`, `4` | Se guarda como texto |
| METRAJE | `150cm`, `1.5mts`, `2m` | `cm` se convierte a metros |
| PAGO | `80 soles`, `S80`, `80.50` | Número mayor que cero |
| MAQUINA | `DTF`, `impresion`, `plotter` | Obligatoria; se guarda en la venta |

El diálogo de confirmación abre con estado `Debe` seleccionado, pero puedes cambiarlo a `Pagó` o `Crédito`. `Pagó` registra el pago total; `Crédito` pide el adelanto y registra ese abono. La fecha siempre es hoy (America/Lima), asignada por la API.

Ejemplo válido:

```
polo navidad - karen - deyna - 2polos - 150cm - 80 soles - DTF.png
```

Cada PNG abre un diálogo Tkinter **antes de guardar**, sin límite de tiempo y con vista previa de la imagen. Los campos se precargan del nombre y puedes confirmarlos o editarlos. Al guardar, el archivo se renombra con los datos confirmados; el nombre original queda en la nota de la venta. Si el nombre no se puede parsear, el mismo diálogo permite completar los datos manualmente. Si se cierra o no hay sesión interactiva, el archivo va a `pendientes/`. Mientras el diálogo esté abierto, el worker espera y los demás PNG permanecen en cola.

> El watcher comprueba la extensión `.png`, pero no inspecciona ni convierte el contenido: un TIFF/BMP que termine en `.png` también pasa. El separador es ` - `. Diseño no debe contener esa secuencia; cliente sí puede contenerla.

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
# ADDITIONAL_WATCH_FOLDERS=E:\RecepcionPNG;F:\Trabajos\salida
BLOCK_WEB_DOWNLOADS=true   # ignora descargas web; permite exportaciones locales
API_URL=https://functions.diogofabricio17.workers.dev/api
API_KEY=tu-api-key   # la generas con `npm run api-key` en functions/
SEPARATOR=" - "      # separador del nombre de archivo
```

El bloqueo de descargas web está activado por defecto (`BLOCK_WEB_DOWNLOADS=true`).
Si `WATCH_FOLDER` apunta a Descargas, puedes mantenerla vigilada sin registrar
PNG descargados de Internet. El
watcher lee `Zone.Identifier` (zonas 3 y 4) **antes de abrir la revisión, mover
el archivo desde una carpeta adicional o enviar la venta a la API**. El PNG
ignorado queda intacto en su carpeta. Un PNG creado localmente por CorelDRAW,
sin esa marca, sigue el flujo normal.

Esta marca identifica la procedencia web, **no el programa Chrome**: también
puede bloquear descargas de otros navegadores. Si Windows no conserva la marca
(por configuración, copia a un disco sin NTFS o eliminación manual), el watcher
no puede distinguir el origen y procesará el PNG. Para inspeccionar un ejemplo
en la máquina donde corre el watcher:

```powershell
Get-Content -LiteralPath 'C:\ruta\archivo.png' -Stream Zone.Identifier
```

Si en otra instalación necesitas procesar descargas web, configura
`BLOCK_WEB_DOWNLOADS=false` en su `.env`.

## Mover a otra máquina

### Actualizar con un botón (recomendado para equipos ya instalados)

La PC del negocio necesita **Git para Windows**, el repositorio clonado y la
tarea `PrintSystemWatcher` configurada para ejecutar `PrintSystemWatcher.exe`
con su `.env` al lado. No necesita Python ni GitHub CLI. Una vez, en la carpeta
del repositorio, ejecuta:

```powershell
git pull --ff-only origin main
powershell -NoProfile -ExecutionPolicy Bypass -File .\watcher\install-update-shortcut.ps1
```

También se puede instalar con doble clic en `watcher/Instalar Actualizador.cmd`.
Se crea **Actualizar Print System** en el escritorio. También se puede abrir
`watcher/Actualizar Watcher.cmd` con doble clic. Ejecutarlo con la misma cuenta
de Windows que usa el listener. Si Windows deniega modificar la tarea, usar
esa cuenta con permisos de administrador.

El botón actualiza `main` con `git pull --ff-only`, descarga el ejecutable de la
release correspondiente al último cambio del watcher y verifica su SHA256.
Luego pausa el supervisor, cierra el listener, reemplaza el ejecutable y vuelve
a iniciar la misma tarea, conservando sus disparadores y configuración. Verifica
un **heartbeat nuevo** antes de dar la actualización por terminada y reactiva el
supervisor. Si falla el arranque, restaura y arranca el `.exe.previous`.

El `.env`, la API key, carpetas vigiladas, imágenes y `state.db` se conservan.
Los archivos descargados quedan en `watcher/.updates/`, ignorado por Git. Los
cambios locales en archivos versionados impiden el `pull`; el actualizador no
los sobrescribe ni hace `reset`. Si la release aún se está compilando o falla
la descarga/verificación, la tarea instalada sigue funcionando.

**Primera actualización automática:** termina cualquier revisión de venta
abierta antes de aceptar el aviso. Las versiones que ya incluyen el protocolo
de actualización esperan a terminar la operación actual; si tarda más de 90
segundos, el actualizador cancela el reemplazo. Actualiza cuando no estén
llegando nuevos archivos, porque el listener se detiene brevemente.

Para nombres de tarea personalizados o verificar la descarga sin detener nada:

```powershell
.\watcher\update-watcher.ps1 -TaskName MiWatcher -HeartbeatTaskName MiSupervisor
.\watcher\update-watcher.ps1 -CheckOnly
```

Cada `push` a `main` que cambie `watcher/` dispara **Publicar Watcher Windows**
en GitHub Actions. Ejecuta las pruebas, compila en Windows y publica
`PrintSystemWatcher.exe` y `watcher-release.json` con el commit y SHA256 en la
release `watcher-<commit>`. Así, después de publicar cambios, el operador solo
necesita pulsar el acceso directo cuando la compilación haya terminado.

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
   .\.venv\Scripts\python watcher.py --validate "diseno - CLIENTE - 1uni - 1mts - 10 soles - DTF.png"
   .\.venv\Scripts\python watcher.py --dry-run --once
   ```
5. Instala el arranque automático:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\install-task.ps1
   ```
6. Opcional: pon `GUI_ENABLED=false` si esa máquina no tendrá sesión interactiva (los PNG irán a `pendientes/` porque requieren confirmación).

### Opción B — sin Python en la máquina destino (exe portable)

1. En una máquina con Python (p. ej. esta), construye el ejecutable:
   ```powershell
   cd watcher
   powershell -ExecutionPolicy Bypass -File .\build-exe.ps1
   ```
   Genera `dist\PrintSystemWatcher.exe` (no requiere Python en el destino).
2. Copia a la máquina destino, **en la misma carpeta**: `PrintSystemWatcher.exe`, `.env`, `install-task.ps1`, `uninstall-task.ps1`, `watcher-heartbeat.ps1`, `install-heartbeat.ps1`, `uninstall-heartbeat.ps1` y `status-task.ps1`. Ajusta `WATCH_ROOT`/`WATCH_FOLDER` en `.env`.
3. Registra la tarea apuntando al ejecutable:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\install-task.ps1 -ExePath "C:\ruta\PrintSystemWatcher.exe"
   ```
   > Puedes copiar también `install-task.ps1`/`uninstall-task.ps1` a esa carpeta para gestionarla, o registrar la tarea manualmente en el Programador de tareas (al iniciar sesión, ejecutar el exe).
4. Notas del exe: arranca en 1-3 s (onefile); algunos antivirus pueden marcarlo la primera vez (agrega excepción); para actualizar, reconstruye aquí y reemplaza el `.exe`.

> La misma API key funciona desde cualquier máquina; si necesitas revocar el acceso de una, rótala con `npm run api-key` (functions/) y actualiza el `.env` de las máquinas vigentes.

## Uso

```powershell
.\.venv\Scripts\python watcher.py --validate "logo - SR PABLO - 10uni - 1.5mts - 50 soles - DTF.png"
.\.venv\Scripts\python watcher.py --dry-run --once   # prueba sin enviar nada a la API
.\.venv\Scripts\python watcher.py                    # vigila en primer plano
.\.venv\Scripts\python watcher.py --stats            # procesados / reintentos / pendientes
.\.venv\Scripts\python demo-gui.py                    # demo visual con imagen generada
.\.venv\Scripts\python demo-gui.py --image "D:\RIP\foto.tif"  # demo con una imagen real
```

| Flag | Descripción |
|---|---|
| `--once` | Escanea y procesa los PNG que ya existen en las carpetas monitoreadas y sale |
| `--dry-run` | Abre la revisión y muestra en el log el payload; **no** envía nada a la API ni mueve archivos |
| `--validate NOMBRE.png` | Valida un nombre contra la convención |
| `--stats` | Estadísticas del estado local (SQLite) |
| `--no-gui` | Desactiva Tkinter; todos los PNG quedan en `pendientes/` para evitar guardar sin confirmación |

En modo continuo (`watcher.py` o la tarea programada), **solo procesa PNG creados o movidos a las carpetas después de iniciar el watcher**. Los que ya estaban allí se ignoran; usa `--once` si quieres procesarlos explícitamente.

## Tarea programada (Windows)

```powershell
powershell -ExecutionPolicy Bypass -File .\install-task.ps1
# Si ya existe y quieres reemplazarla:
powershell -ExecutionPolicy Bypass -File .\install-task.ps1 -Force
# Estado de tarea, log y conexión API:
powershell -ExecutionPolicy Bypass -File .\status-task.ps1
# Desinstalar:
powershell -ExecutionPolicy Bypass -File .\uninstall-task.ps1
```

### Heartbeat / auto-reinicio

El watcher actualiza `<WATCH_ROOT>\logs\watcher.heartbeat` cada 30 segundos. Instala el supervisor para revisar el pulso cada 5 minutos y reiniciar la tarea si se detiene o queda sin actualizar por 3 minutos:

```powershell
powershell -ExecutionPolicy Bypass -File .\install-heartbeat.ps1 -IntervalMinutes 5 -StaleMinutes 3
Start-ScheduledTask -TaskName PrintSystemWatcherHeartbeat
powershell -ExecutionPolicy Bypass -File .\status-task.ps1
```

Puedes cambiar `-IntervalMinutes` y `-StaleMinutes` al instalarlo. El supervisor corre al iniciar sesión; no necesita Python. Para quitarlo: `powershell -ExecutionPolicy Bypass -File .\uninstall-heartbeat.ps1`.

- Se registra **al iniciar sesión** del usuario porque los popups Tkinter necesitan una sesión interactiva.
- Corre con `pythonw.exe` (sin consola); el log queda en `<WATCH_ROOT>\logs\watcher.log`.
- Si la tarea no muestra popups (p. ej. sin sesión), los PNG van a `pendientes/`; no se registran sin confirmación.
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

> `WATCH_FOLDER` (opcional) define la carpeta **principal** monitoreada; si no se define, se usa `<WATCH_ROOT>\entrada`. `ADDITIONAL_WATCH_FOLDERS` (opcional) acepta varias rutas separadas por `;`. Los PNG nuevos de esas carpetas se mueven a la principal para centralizar el procesamiento. Si ya existe un archivo con el mismo nombre en la principal, la copia adicional va a `pendientes/` para evitar sobrescribirlo.

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
| `--validate` dice INVÁLIDO | Revisa el orden DISEÑO - CLIENTE - CANTIDAD - METRAJE - PAGO - MAQUINA |
