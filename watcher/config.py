"""Configuración del watcher EDA (carga .env + valores por defecto)."""

from __future__ import annotations

import os
import sys
from dataclasses import dataclass, field
from pathlib import Path

if getattr(sys, "frozen", False):
    # Ejecutable PyInstaller: el .env vive junto al .exe
    BASE_DIR = Path(sys.executable).resolve().parent
else:
    BASE_DIR = Path(__file__).resolve().parent

DEFAULT_MAQUINA_ALIASES = {
    "dtf": "DTF",
    "impresion": "impresion",
    "plotter": "plotter",
    "sublimado": "sublimado",
    "sublimacion": "sublimado",
    "vinil": "vinil",
    "uv": "UV",
}

ESTADOS_VALIDOS = ("Debe", "Pagó", "Crédito")


class ConfigError(Exception):
    """Error de configuración (falta API key, valores inválidos, etc.)."""


def _load_env_file() -> None:
    env_path = BASE_DIR / ".env"
    if not env_path.exists():
        return

    try:
        from dotenv import load_dotenv
    except ImportError:
        for raw_line in env_path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))
        return

    load_dotenv(env_path)


def _env_bool(name: str, default: bool) -> bool:
    raw = os.environ.get(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "si", "sí", "yes", "on"}


def _env_float(name: str, default: float) -> float:
    raw = os.environ.get(name)
    if raw is None or not raw.strip():
        return default
    try:
        return float(raw)
    except ValueError as exc:
        raise ConfigError(f"{name} debe ser numérico (valor: {raw!r})") from exc


def _env_int(name: str, default: int) -> int:
    raw = os.environ.get(name)
    if raw is None or not raw.strip():
        return default
    try:
        return int(raw)
    except ValueError as exc:
        raise ConfigError(f"{name} debe ser entero (valor: {raw!r})") from exc


@dataclass
class Config:
    watch_root: Path
    api_url: str
    api_key: str
    watch_folder: Path | None = None
    additional_watch_folders: list[Path] = field(default_factory=list)
    block_web_downloads: bool = True
    separator: str = " - "
    gui_enabled: bool = True
    max_retries: int = 5
    retry_base_seconds: float = 5.0
    retry_max_seconds: float = 300.0
    heartbeat_interval_seconds: int = 30
    stability_checks: int = 2
    stability_interval: float = 0.5
    stability_timeout: float = 30.0
    client_cache_ttl: float = 60.0
    fuzzy_limit: int = 5
    maquina_aliases: dict[str, str] = field(default_factory=dict)

    @property
    def entrada(self) -> Path:
        """Carpeta monitoreada: WATCH_FOLDER o <WATCH_ROOT>/entrada por defecto."""
        return self.watch_folder or (self.watch_root / "entrada")

    @property
    def procesados(self) -> Path:
        return self.watch_root / "procesados"

    @property
    def rechazados(self) -> Path:
        return self.watch_root / "rechazados"

    @property
    def pendientes(self) -> Path:
        return self.watch_root / "pendientes"

    @property
    def logs(self) -> Path:
        return self.watch_root / "logs"

    @property
    def db_path(self) -> Path:
        return self.watch_root / "state.db"

    @property
    def lock_path(self) -> Path:
        return self.watch_root / "watcher.lock"

    @property
    def heartbeat_path(self) -> Path:
        return self.logs / "watcher.heartbeat"

    @property
    def update_request_path(self) -> Path:
        return self.logs / "watcher.update-request"

    def ensure_folders(self) -> None:
        for folder in (
            self.watch_root,
            self.entrada,
            self.procesados,
            self.rechazados,
            self.pendientes,
            self.logs,
        ):
            folder.mkdir(parents=True, exist_ok=True)


def load_config(require_api_key: bool = True) -> Config:
    _load_env_file()

    api_key = os.environ.get("API_KEY", "").strip()
    if require_api_key and not api_key:
        raise ConfigError(
            "Falta API_KEY. Copia watcher/.env.example a watcher/.env y pega la API key "
            "generada con `npm run api-key` (en functions/)."
        )

    aliases = dict(DEFAULT_MAQUINA_ALIASES)
    extra = (os.environ.get("MAQUINA_ALIASES") or "").strip()
    if extra:
        for pair in extra.split(","):
            if "=" in pair:
                key, value = pair.split("=", 1)
                aliases[key.strip().lower()] = value.strip()

    watch_folder_raw = (os.environ.get("WATCH_FOLDER") or "").strip()
    additional_folders_raw = os.environ.get("ADDITIONAL_WATCH_FOLDERS", "")
    additional_folders = [
        Path(folder.strip().strip('"').strip("'"))
        for folder in additional_folders_raw.split(";")
        if folder.strip().strip('"').strip("'")
    ]

    separator = os.environ.get("SEPARATOR") or " - "
    if any(char in separator for char in '<>:"/\\|?*'):
        raise ConfigError(f"SEPARATOR contiene caracteres inválidos para nombres de archivo: {separator!r}")

    heartbeat_interval = _env_int("HEARTBEAT_INTERVAL_SECONDS", 30)
    if heartbeat_interval < 5:
        raise ConfigError("HEARTBEAT_INTERVAL_SECONDS debe ser 5 o más")

    return Config(
        watch_root=Path(os.environ.get("WATCH_ROOT", r"C:\PrintSystem\ventas")),
        api_url=os.environ.get(
            "API_URL", "https://functions.diogofabricio17.workers.dev/api"
        ).rstrip("/"),
        api_key=api_key,
        watch_folder=Path(watch_folder_raw) if watch_folder_raw else None,
        additional_watch_folders=additional_folders,
        block_web_downloads=_env_bool("BLOCK_WEB_DOWNLOADS", True),
        separator=separator,
        gui_enabled=_env_bool("GUI_ENABLED", True),
        max_retries=_env_int("MAX_RETRIES", 5),
        retry_base_seconds=_env_float("RETRY_BASE_SECONDS", 5.0),
        retry_max_seconds=_env_float("RETRY_MAX_SECONDS", 300.0),
        heartbeat_interval_seconds=heartbeat_interval,
        stability_checks=_env_int("STABILITY_CHECKS", 2),
        stability_interval=_env_float("STABILITY_INTERVAL", 0.5),
        stability_timeout=_env_float("STABILITY_TIMEOUT", 30.0),
        client_cache_ttl=_env_float("CLIENT_CACHE_TTL", 60.0),
        fuzzy_limit=_env_int("FUZZY_LIMIT", 5),
        maquina_aliases=aliases,
    )
