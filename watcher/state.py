"""Estado persistente del watcher (SQLite): procesados, reintentos y pendientes."""

from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

_SCHEMA = """
CREATE TABLE IF NOT EXISTS procesados (
    hash TEXT PRIMARY KEY,
    archivo TEXT NOT NULL,
    venta_id INTEGER,
    procesado_el TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reintentos (
    hash TEXT PRIMARY KEY,
    archivo TEXT NOT NULL,
    tipo TEXT NOT NULL,
    payload TEXT NOT NULL,
    error TEXT,
    intentos INTEGER NOT NULL DEFAULT 0,
    proximo_intento TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pendientes (
    hash TEXT PRIMARY KEY,
    archivo TEXT NOT NULL,
    motivo TEXT,
    creado_el TEXT NOT NULL
);
"""


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


class State:
    def __init__(self, db_path: Path):
        self.db_path = db_path
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        with self._connect() as conn:
            conn.executescript(_SCHEMA)

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path, timeout=15)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode = WAL")
        return conn

    # ── procesados ──────────────────────────────────────────────────────────

    def is_processed(self, file_hash: str) -> bool:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT 1 FROM procesados WHERE hash = ?", (file_hash,)
            ).fetchone()
        return row is not None

    def mark_processed(self, file_hash: str, archivo: str, venta_id: int | None) -> None:
        with self._connect() as conn:
            conn.execute(
                "INSERT OR REPLACE INTO procesados (hash, archivo, venta_id, procesado_el) "
                "VALUES (?, ?, ?, ?)",
                (file_hash, archivo, venta_id, utc_now()),
            )
            conn.execute("DELETE FROM pendientes WHERE hash = ?", (file_hash,))

    # ── reintentos ──────────────────────────────────────────────────────────

    def schedule_retry(
        self,
        file_hash: str,
        archivo: str,
        tipo: str,
        payload: dict,
        error: str,
        intentos: int,
        proximo_intento: str,
    ) -> None:
        with self._connect() as conn:
            conn.execute(
                "INSERT OR REPLACE INTO reintentos "
                "(hash, archivo, tipo, payload, error, intentos, proximo_intento) "
                "VALUES (?, ?, ?, ?, ?, ?, ?)",
                (
                    file_hash,
                    archivo,
                    tipo,
                    json.dumps(payload, ensure_ascii=False),
                    error,
                    intentos,
                    proximo_intento,
                ),
            )

    def get_due_retries(self, now_iso: str | None = None) -> list[sqlite3.Row]:
        now_iso = now_iso or utc_now()
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT * FROM reintentos WHERE proximo_intento <= ? "
                "ORDER BY proximo_intento ASC",
                (now_iso,),
            ).fetchall()
        return list(rows)

    def get_retry(self, file_hash: str) -> sqlite3.Row | None:
        with self._connect() as conn:
            return conn.execute(
                "SELECT * FROM reintentos WHERE hash = ?", (file_hash,)
            ).fetchone()

    def clear_retry(self, file_hash: str) -> None:
        with self._connect() as conn:
            conn.execute("DELETE FROM reintentos WHERE hash = ?", (file_hash,))

    # ── pendientes ──────────────────────────────────────────────────────────

    def mark_pending(self, file_hash: str, archivo: str, motivo: str) -> None:
        with self._connect() as conn:
            conn.execute(
                "INSERT OR REPLACE INTO pendientes (hash, archivo, motivo, creado_el) "
                "VALUES (?, ?, ?, ?)",
                (file_hash, archivo, motivo, utc_now()),
            )

    # ── stats ───────────────────────────────────────────────────────────────

    def stats(self) -> dict:
        with self._connect() as conn:
            processed = conn.execute("SELECT COUNT(*) AS n FROM procesados").fetchone()["n"]
            retries = conn.execute("SELECT COUNT(*) AS n FROM reintentos").fetchone()["n"]
            pending = conn.execute("SELECT COUNT(*) AS n FROM pendientes").fetchone()["n"]
            last = conn.execute(
                "SELECT archivo, venta_id, procesado_el FROM procesados "
                "ORDER BY procesado_el DESC LIMIT 5"
            ).fetchall()
        return {
            "procesados": processed,
            "reintentos": retries,
            "pendientes": pending,
            "ultimos": [dict(row) for row in last],
            "db": str(self.db_path),
        }
