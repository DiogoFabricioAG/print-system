#!/usr/bin/env python3
"""Watcher EDA: cada PNG nuevo en entrada/ registra una venta en Print System.

Convención de nombre:
    [YYYY-MM-DD__]CLIENTE__DISEÑO__CANTIDAD__METROS__MAQUINA__MONTO[__ESTADO].png

Uso:
    python watcher.py               # vigila entrada/ en primer plano
    python watcher.py --once        # procesa lo existente y sale
    python watcher.py --dry-run     # parsea y resuelve, sin enviar nada a la API
    python watcher.py --validate "SR PABLO__logo__10uni__1.5mts__DTF__S50.png"
    python watcher.py --stats
"""

from __future__ import annotations

import argparse
import hashlib
import json
import logging
import os
import queue
import shutil
import sys
import threading
import time
from datetime import datetime, timedelta, timezone
from logging.handlers import RotatingFileHandler
from pathlib import Path

from watchdog.events import FileSystemEventHandler
from watchdog.observers import Observer

from api_client import ApiClient, ApiError
from config import BASE_DIR, Config, ConfigError, load_config
from parser import (
    FilenameParseError,
    ParsedVenta,
    build_nota,
    parse_filename,
    validate_png,
)
from state import State

log = logging.getLogger("watcher")


# ─────────────────────────────────────────────────────────────────────────────
# Infraestructura
# ─────────────────────────────────────────────────────────────────────────────


class SingleInstanceLock:
    """Evita que dos instancias del watcher procesen la misma carpeta."""

    def __init__(self, path: Path):
        self.path = path
        self._handle = None

    def acquire(self) -> bool:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._handle = self.path.open("a+")
        try:
            if os.name == "nt":
                import msvcrt

                msvcrt.locking(self._handle.fileno(), msvcrt.LK_NBLCK, 1)
            else:
                import fcntl

                fcntl.flock(self._handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
            return True
        except OSError:
            self._handle.close()
            self._handle = None
            return False

    def release(self) -> None:
        if self._handle is None:
            return
        try:
            if os.name == "nt":
                import msvcrt

                self._handle.seek(0)
                msvcrt.locking(self._handle.fileno(), msvcrt.LK_UNLCK, 1)
            else:
                import fcntl

                fcntl.flock(self._handle, fcntl.LOCK_UN)
        except OSError:
            pass
        finally:
            self._handle.close()
            self._handle = None


class _PngEventHandler(FileSystemEventHandler):
    def __init__(self, service: "WatcherService"):
        super().__init__()
        self.service = service

    def on_created(self, event) -> None:  # type: ignore[no-untyped-def]
        if not event.is_directory:
            self._submit(event.src_path)

    def on_moved(self, event) -> None:  # type: ignore[no-untyped-def]
        if not event.is_directory:
            self._submit(event.dest_path)

    def _submit(self, path: str) -> None:
        if str(path).lower().endswith(".png"):
            self.service.submit(str(path))


# ─────────────────────────────────────────────────────────────────────────────
# Servicio
# ─────────────────────────────────────────────────────────────────────────────


class WatcherService:
    def __init__(self, cfg: Config, dry_run: bool = False, gui=None):
        self.cfg = cfg
        self.dry_run = dry_run
        self.gui = gui
        self.state = State(cfg.db_path)
        self.api = ApiClient(cfg)
        self.events: queue.Queue[str | None] = queue.Queue()
        self.counter = {"procesados": 0, "pendientes": 0, "rechazados": 0, "reintentos": 0}
        self._stop = threading.Event()
        self._threads: list[threading.Thread] = []

    # ── ciclo de vida ───────────────────────────────────────────────────────

    def start(self) -> None:
        for name, target in (("worker", self._worker_loop), ("retries", self._retry_loop)):
            thread = threading.Thread(target=target, name=name, daemon=True)
            thread.start()
            self._threads.append(thread)

    def stop(self) -> None:
        self._stop.set()
        self.events.put(None)
        for thread in self._threads:
            thread.join(timeout=5)

    def submit(self, path: str) -> None:
        self.events.put(path)

    # ── workers ─────────────────────────────────────────────────────────────

    def _worker_loop(self) -> None:
        while not self._stop.is_set():
            item = self.events.get()
            if item is None:
                break
            try:
                self.process_file(Path(item))
            except Exception:  # noqa: BLE001
                log.exception("Error inesperado procesando %s", item)

    def _retry_loop(self) -> None:
        while not self._stop.is_set():
            try:
                self._process_due_retries()
            except Exception:  # noqa: BLE001
                log.exception("Error en el loop de reintentos")
            self._stop.wait(5.0)

    def process_existing(self) -> None:
        paths = sorted(self.cfg.entrada.glob("*.png"))
        log.info("--once: %d archivo(s) encontrados en %s", len(paths), self.cfg.entrada)
        for path in paths:
            if self._stop.is_set():
                break
            try:
                self.process_file(path)
            except Exception:  # noqa: BLE001
                log.exception("Error procesando %s", path)
        try:
            self._process_due_retries()
        except Exception:  # noqa: BLE001
            log.exception("Error procesando reintentos pendientes")

    # ── procesamiento ───────────────────────────────────────────────────────

    def process_file(self, path: Path) -> None:
        if not path.exists():
            return

        log.info("Procesando: %s", path.name)

        if not self._wait_stable(path):
            if path.exists():
                self._to_pending(
                    path,
                    self._safe_file_key(path),
                    "el archivo no se estabilizó (copia incompleta o inaccesible)",
                )
            return

        try:
            file_hash = self._file_key(path)
        except OSError as exc:
            self._to_pending(path, "", f"no se pudo leer el archivo: {exc}")
            return

        if self.state.is_processed(file_hash):
            log.info("Ya procesado antes; se mueve a procesados: %s", path.name)
            self._move(path, self.cfg.procesados)
            return

        ok, reason = validate_png(path)
        if not ok:
            self._to_rejected(path, reason)
            return

        try:
            venta = parse_filename(path.name, self.cfg)
        except FilenameParseError as exc:
            self._handle_parse_error(path, file_hash, str(exc))
            return

        try:
            cliente = self._resolve_cliente(path, file_hash, venta.cliente)
        except ApiError as exc:
            self._handle_api_error(path, file_hash, "cliente", {"nombre": venta.cliente}, exc)
            return

        if cliente is False:
            return  # ignorado por el usuario
        if cliente is None:
            return  # ya derivado a pendientes

        self._register(path, file_hash, venta, cliente)
    def _resolve_cliente(self, path: Path, file_hash: str, nombre: str):
        """Devuelve el dict del cliente, False si se ignoró, o None si va a pendientes."""
        cliente = self.api.find_cliente(nombre)
        if cliente is not None:
            return cliente

        log.info("Cliente no encontrado: %r", nombre)
        if self.gui is None or not self.gui.available:
            self._to_pending(path, file_hash, f"cliente no encontrado: {nombre}")
            return None

        resolution = self.gui.request(
            {
                "kind": "cliente",
                "filename": path.name,
                "nombre": nombre,
                "clientes": self.api.list_clientes(),
                "sugerencias": self.api.suggest_clientes(nombre),
            }
        )
        if resolution is None:
            self._to_pending(path, file_hash, "el diálogo expiró sin respuesta")
            return None

        accion = resolution.get("accion")
        if accion == "ignorar":
            self._to_rejected(path, "ignorado por el usuario")
            return False
        if accion == "usar":
            return resolution.get("cliente")

        if accion == "crear":
            try:
                cliente = self.api.create_cliente(**resolution["datos"])
                log.info(
                    "Cliente creado: %s (id=%s)",
                    cliente.get("nombre"),
                    cliente.get("id"),
                )
                return cliente
            except ApiError as exc:
                self._handle_api_error(
                    path, file_hash, "cliente", {"datos": resolution["datos"]}, exc
                )
                return None

        self._to_pending(path, file_hash, "resolución de cliente inválida")
        return None

    def _handle_parse_error(self, path: Path, file_hash: str, reason: str) -> None:
        log.warning("Nombre fuera de convención (%s): %s", path.name, reason)

        if self.gui is None or not self.gui.available:
            self._to_pending(path, file_hash, f"nombre fuera de convención: {reason}")
            return

        resolution = self.gui.request(
            {
                "kind": "form",
                "filename": path.name,
                "nombre": None,
                "error": reason,
                "clientes": self.api.list_clientes(),
                "sugerencias": [],
            }
        )
        if resolution is None:
            self._to_pending(path, file_hash, "el formulario expiró sin respuesta")
            return

        accion = resolution.get("accion")
        if accion == "ignorar":
            self._to_rejected(path, "ignorado por el usuario")
            return
        if accion != "registrar":
            self._to_pending(path, file_hash, "formulario cancelado")
            return

        cliente = resolution.get("cliente")
        nuevo = resolution.get("nuevo_cliente")
        if nuevo:
            try:
                cliente = self.api.create_cliente(
                    nuevo["nombre"],
                    nuevo.get("numero"),
                    nuevo.get("descripcion"),
                )
                log.info("Cliente creado: %s (id=%s)", cliente.get("nombre"), cliente.get("id"))
            except ApiError as exc:
                self._handle_api_error(path, file_hash, "cliente", {"datos": nuevo}, exc)
                return

        if not cliente:
            self._to_pending(path, file_hash, "sin cliente seleccionado en el formulario")
            return

        data = resolution.get("venta") or {}
        venta = ParsedVenta(
            cliente=cliente.get("nombre", ""),
            diseno=data.get("diseno", ""),
            cantidad=data.get("cantidad"),
            metro_total=data.get("metro_total"),
            maquina=data.get("maquina"),
            pago=float(data.get("pago") or 0),
            estado=data.get("estado") or self.cfg.estado_default,
            fecha=data.get("fecha"),
        )
        self._register(path, file_hash, venta, cliente)

    def _register(self, path: Path, file_hash: str, venta: ParsedVenta, cliente: dict) -> None:
        payload: dict = {
            "diseno": venta.diseno,
            "cliente_id": cliente["id"],
            "pago": venta.pago,
            "estado": venta.estado,
            "nota": build_nota(path.name, file_hash),
        }
        if venta.cantidad:
            payload["cantidad"] = venta.cantidad
        if venta.metro_total is not None:
            payload["metro_total"] = venta.metro_total
        if venta.maquina:
            payload["maquina"] = venta.maquina
        if venta.fecha:
            payload["fecha"] = venta.fecha

        if self.dry_run:
            log.info(
                "[DRY-RUN] venta que se registraría → cliente=%s id=%s payload=%s",
                cliente.get("nombre"),
                cliente.get("id"),
                json.dumps(payload, ensure_ascii=False),
            )
            return

        try:
            created = self.api.create_venta(payload)
        except ApiError as exc:
            self._handle_api_error(
                path,
                file_hash,
                "venta",
                {"venta": payload, "cliente_nombre": cliente.get("nombre")},
                exc,
            )
            return

        venta_id = created.get("id") if isinstance(created, dict) else None
        log.info("Venta #%s registrada para %s (%s)", venta_id, cliente.get("nombre"), path.name)

        self.state.mark_processed(file_hash, path.name, venta_id)
        self.state.clear_retry(file_hash)

        if venta.estado == "Pagó":
            try:
                self.api.create_pago(cliente["id"], venta.pago, f"Pago venta #{venta_id}")
                log.info("Pago total registrado para la venta #%s", venta_id)
            except ApiError as exc:
                log.warning(
                    "La venta #%s quedó registrada pero el pago falló (%s). Se reintentará.",
                    venta_id,
                    exc,
                )
                self._schedule_retry(
                    file_hash,
                    path.name,
                    "pago",
                    {
                        "cliente_id": cliente["id"],
                        "pago": venta.pago,
                        "nota": f"Pago venta #{venta_id}",
                        "venta_id": venta_id,
                    },
                    exc,
                    1,
                )

        self._move(path, self.cfg.procesados)
        self.counter["procesados"] += 1

    # ── reintentos ──────────────────────────────────────────────────────────

    def _process_due_retries(self) -> None:
        for row in self.state.get_due_retries():
            if self._stop.is_set():
                break
            self._attempt_retry(row)

    def _attempt_retry(self, row) -> None:
        file_hash = row["hash"]
        tipo = row["tipo"]
        archivo = row["archivo"]
        payload = json.loads(row["payload"])
        path = self.cfg.entrada / archivo

        if tipo not in ("venta", "pago"):
            # Reintento genérico: volver a procesar el archivo desde cero.
            if not path.exists():
                self.state.clear_retry(file_hash)
                self.state.mark_pending(file_hash, archivo, "el archivo ya no está en entrada/")
                return
            if not self._stop.is_set():
                self.process_file(path)
            return

        if tipo == "pago":
            try:
                self.api.create_pago(payload["cliente_id"], payload["pago"], payload.get("nota"))
                log.info("Reintento de pago OK (%s)", archivo)
                self.state.clear_retry(file_hash)
                self.counter["reintentos"] += 1
            except ApiError as exc:
                self._reschedule_or_give_up(row, exc, path)
            return

        # tipo == "venta": si una respuesta anterior se perdió, evitar duplicar.
        nota = payload.get("nota")
        if nota:
            try:
                existing = self.api.find_venta_by_nota(nota)
            except ApiError:
                existing = None
            if existing is not None:
                log.info("La venta ya existía (nota=%s); se marca procesado", nota)
                self.state.mark_processed(file_hash, archivo, existing.get("id"))
                self.state.clear_retry(file_hash)
                if path.exists():
                    self._move(path, self.cfg.procesados)
                return

        try:
            created = self.api.create_venta(payload)
            venta_id = created.get("id") if isinstance(created, dict) else None
            log.info("Reintento de venta OK: #%s (%s)", venta_id, archivo)
            self.state.mark_processed(file_hash, archivo, venta_id)
            self.state.clear_retry(file_hash)
            self.counter["reintentos"] += 1
            if path.exists():
                self._move(path, self.cfg.procesados)
        except ApiError as exc:
            self._reschedule_or_give_up(row, exc, path)

    def _schedule_retry(
        self,
        file_hash: str,
        archivo: str,
        tipo: str,
        payload: dict,
        exc: Exception,
        intentos: int,
    ) -> None:
        delay = min(
            self.cfg.retry_base_seconds * (2 ** max(intentos - 1, 0)),
            self.cfg.retry_max_seconds,
        )
        next_ts = (datetime.now(timezone.utc) + timedelta(seconds=delay)).isoformat(
            timespec="seconds"
        )
        self.state.schedule_retry(file_hash, archivo, tipo, payload, str(exc), intentos, next_ts)

    def _reschedule_or_give_up(self, row, exc: ApiError, path: Path) -> None:
        file_hash = row["hash"]
        archivo = row["archivo"]
        intentos = row["intentos"] + 1

        if exc.unauthorized:
            log.critical(
                "API key rechazada (401). Revisa API_KEY en watcher/.env. Archivo: %s", archivo
            )
            self.state.clear_retry(file_hash)
            self.state.mark_pending(file_hash, archivo, "API key inválida (401)")
            if path.exists():
                self._move(path, self.cfg.pendientes)
            self.counter["pendientes"] += 1
            return

        if exc.retryable and intentos <= self.cfg.max_retries:
            self._schedule_retry(
                file_hash, archivo, row["tipo"], json.loads(row["payload"]), exc, intentos
            )
            log.warning(
                "Reintento %s/%s programado para %s (%s)",
                intentos,
                self.cfg.max_retries,
                archivo,
                exc,
            )
            return

        log.error("Se agotaron los reintentos para %s: %s", archivo, exc)
        self.state.clear_retry(file_hash)
        self.state.mark_pending(file_hash, archivo, f"error de API tras {intentos} intento(s): {exc}")
        if path.exists():
            self._move(path, self.cfg.pendientes)
        self.counter["pendientes"] += 1

    def _handle_api_error(
        self, path: Path, file_hash: str, tipo: str, payload: dict, exc: ApiError
    ) -> None:
        if exc.unauthorized:
            log.critical(
                "API key rechazada (401). Revisa API_KEY en watcher/.env. Archivo: %s", path.name
            )
            self._to_pending(path, file_hash, "API key inválida (401)")
            return

        if tipo == "pago":
            # La venta ya está registrada: no se descarta el archivo por el pago.
            if exc.retryable:
                self._schedule_retry(file_hash, path.name, "pago", payload, exc, 1)
                log.warning("Pago de %s falló; se reintentará (%s)", path.name, exc)
            else:
                log.error("Pago de %s falló de forma definitiva: %s", path.name, exc)
                self.state.mark_processed(file_hash, path.name, payload.get("venta_id"))
                self._move(path, self.cfg.procesados)
            return

        if exc.retryable:
            current = self.state.get_retry(file_hash)
            intentos = (current["intentos"] if current is not None else 0) + 1
            if intentos <= self.cfg.max_retries:
                self._schedule_retry(file_hash, path.name, tipo, payload, exc, intentos)
                delay = min(
                    self.cfg.retry_base_seconds * (2 ** (intentos - 1)),
                    self.cfg.retry_max_seconds,
                )
                log.warning(
                    "Error de API (%s). Reintento %s/%s en %.0fs para %s",
                    exc,
                    intentos,
                    self.cfg.max_retries,
                    delay,
                    path.name,
                )
                return
            self._to_pending(
                path, file_hash, f"error de API tras {intentos} intento(s): {exc}"
            )
            return

        self._to_rejected(path, f"error de API: {exc}")

    # ── utilidades ──────────────────────────────────────────────────────────

    def _wait_stable(self, path: Path) -> bool:
        deadline = time.monotonic() + self.cfg.stability_timeout
        last_size = -1
        stable = 0
        while time.monotonic() < deadline and not self._stop.is_set():
            try:
                size = path.stat().st_size
            except OSError:
                return False
            if size > 0 and size == last_size:
                stable += 1
            else:
                stable = 0
            last_size = size
            if stable >= self.cfg.stability_checks:
                return True
            time.sleep(self.cfg.stability_interval)
        return False

    @staticmethod
    def _file_key(path: Path) -> str:
        """Clave de idempotencia: nombre + tamaño + mtime.

        Un mismo archivo (eventos duplicados, reintentos tras reinicio) conserva
        la clave; una re-subida del mismo PNG (nuevo mtime) registra venta nueva.
        """
        stat = path.stat()
        raw = f"{path.name}|{stat.st_size}|{stat.st_mtime_ns}".encode("utf-8")
        return hashlib.sha256(raw).hexdigest()

    def _safe_file_key(self, path: Path) -> str:
        try:
            return self._file_key(path)
        except OSError:
            return ""

    @staticmethod
    def _unique_dest(folder: Path, filename: str) -> Path:
        dest = folder / filename
        if not dest.exists():
            return dest
        stem = Path(filename).stem
        suffix = Path(filename).suffix
        for index in range(1, 1000):
            candidate = folder / f"{stem}_{index}{suffix}"
            if not candidate.exists():
                return candidate
        raise RuntimeError(f"No se pudo encontrar un nombre libre en {folder}")

    def _move(self, path: Path, folder: Path) -> Path | None:
        if not path.exists():
            return None
        if self.dry_run:
            log.info("[DRY-RUN] se movería a %s/: %s", folder.name, path.name)
            return None
        dest = self._unique_dest(folder, path.name)
        try:
            shutil.move(str(path), str(dest))
        except OSError as exc:
            log.error("No se pudo mover %s a %s/: %s", path.name, folder.name, exc)
            return None
        log.info("Archivo movido a %s/: %s", folder.name, dest.name)
        return dest

    def _to_rejected(self, path: Path, reason: str) -> None:
        log.warning("RECHAZADO %s: %s", path.name, reason)
        dest = self._move(path, self.cfg.rechazados)
        if dest is not None:
            try:
                dest.with_suffix(dest.suffix + ".motivo.txt").write_text(
                    reason + "\n", encoding="utf-8"
                )
            except OSError:
                pass
        self.counter["rechazados"] += 1

    def _to_pending(self, path: Path, file_hash: str, motivo: str) -> None:
        log.warning("PENDIENTE %s: %s", path.name, motivo)
        if file_hash and not self.dry_run:
            self.state.mark_pending(file_hash, path.name, motivo)
        self._move(path, self.cfg.pendientes)
        self.counter["pendientes"] += 1


# ─────────────────────────────────────────────────────────────────────────────
# CLI
# ─────────────────────────────────────────────────────────────────────────────


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Watcher EDA: PNG nuevo en entrada/ → venta en Print System"
    )
    parser.add_argument(
        "--once", action="store_true", help="procesa los PNG existentes en entrada/ y sale"
    )
    parser.add_argument(
        "--dry-run", action="store_true", help="parsea y resuelve sin enviar nada a la API"
    )
    parser.add_argument(
        "--validate",
        metavar="NOMBRE.png",
        help="valida un nombre contra la convención y sale",
    )
    parser.add_argument(
        "--stats", action="store_true", help="muestra estadísticas del estado local y sale"
    )
    parser.add_argument("--no-gui", action="store_true", help="desactiva los diálogos Tkinter")
    return parser.parse_args(argv)


def setup_logging(cfg: Config) -> None:
    level = logging.INFO
    formatter = logging.Formatter(
        "%(asctime)s %(levelname)s [%(threadName)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    file_handler = RotatingFileHandler(
        cfg.logs / "watcher.log", maxBytes=2 * 1024 * 1024, backupCount=3, encoding="utf-8"
    )
    file_handler.setFormatter(formatter)

    root = logging.getLogger()
    root.setLevel(level)
    root.addHandler(file_handler)

    if sys.stderr is not None:
        console = logging.StreamHandler()
        console.setFormatter(formatter)
        root.addHandler(console)


def _emit(text: str, stream=None) -> None:
    """Escribe en consola; en el exe (windowed) muestra un diálogo."""
    if not getattr(sys, "frozen", False):
        target = stream if stream is not None else sys.stdout
        if target is not None:
            try:
                target.write(text if text.endswith("\n") else text + "\n")
                return
            except Exception:  # noqa: BLE001
                pass

    try:
        import tkinter as tk
        from tkinter import messagebox

        root = tk.Tk()
        root.withdraw()
        messagebox.showinfo("Print System Watcher", text)
        root.destroy()
    except Exception:  # noqa: BLE001
        try:
            import traceback

            with (BASE_DIR / "watcher-emit-error.log").open("a", encoding="utf-8") as fh:
                fh.write(f"--- {datetime.now(timezone.utc).isoformat()} ---\n")
                traceback.print_exc(file=fh)
        except Exception:  # noqa: BLE001
            pass


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)

    if args.validate:
        cfg = load_config(require_api_key=False)
        try:
            venta = parse_filename(args.validate, cfg)
        except FilenameParseError as exc:
            _emit(f"INVÁLIDO: {exc}", sys.stderr)
            return 1
        _emit("VÁLIDO:\n" + json.dumps(venta.to_dict(), ensure_ascii=False, indent=2))
        return 0

    try:
        cfg = load_config()
    except ConfigError as exc:
        _emit(f"Error de configuración: {exc}", sys.stderr)
        return 2

    if args.stats:
        _emit(json.dumps(State(cfg.db_path).stats(), ensure_ascii=False, indent=2))
        return 0

    cfg.ensure_folders()
    setup_logging(cfg)
    log.info(
        "Iniciando watcher (root=%s, api=%s, dry_run=%s)",
        cfg.watch_root,
        cfg.api_url,
        args.dry_run,
    )

    lock = SingleInstanceLock(cfg.lock_path)
    if not lock.acquire():
        log.error("Ya hay otra instancia del watcher en ejecución (%s). Saliendo.", cfg.lock_path)
        return 3

    try:
        gui = None
        if cfg.gui_enabled and not args.no_gui and not args.dry_run:
            from resolver_gui import ResolverGUI

            gui = ResolverGUI(cfg)
            gui.start()
            time.sleep(0.6)
            if not gui.available:
                log.warning("GUI no disponible; los casos dudosos irán a pendientes/")
                gui = None

        service = WatcherService(cfg, dry_run=args.dry_run, gui=gui)

        if args.once:
            service.process_existing()
            summary = json.dumps(service.counter, ensure_ascii=False)
            log.info("--once terminado: %s", summary)
            _emit(summary)
            return 0

        observer = Observer()
        observer.schedule(_PngEventHandler(service), str(cfg.entrada), recursive=False)
        observer.start()
        service.start()
        log.info("Vigilando %s (Ctrl+C para salir)", cfg.entrada)

        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            log.info("Detenido por el usuario")
        finally:
            service.stop()
            observer.stop()
            observer.join(timeout=5)
        return 0
    finally:
        lock.release()


if __name__ == "__main__":
    raise SystemExit(main())
