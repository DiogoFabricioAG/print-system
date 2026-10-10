"""Parser de la convención estricta de nombres PNG y validación de archivos.

Convención:
    [YYYY-MM-DD__]CLIENTE__DISEÑO__CANTIDAD__METROS__MAQUINA__MONTO[__ESTADO].png

Ejemplos:
    SR PABLO__logo circular__10uni__1.5mts__DTF__S50.png
    2026-10-08__JHONATAN__polo navidad__2polos__150cm__impresion__S120__Pagó.png
"""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

from config import Config

PNG_MAGIC = b"\x89PNG\r\n\x1a\n"

_DATE_RE = re.compile(r"^(\d{4})-(\d{2})-(\d{2})$")
_CANTIDAD_RE = re.compile(r"^\d+(?:[.,]\d+)?\s*[a-zA-ZñÑáéíóúÁÉÍÓÚ.]*$")
_METROS_RE = re.compile(r"^(\d+(?:[.,]\d+)?)\s*(cm|mts?|mrt|tm|m)?$", re.IGNORECASE)
_MONTO_RE = re.compile(r"^[sS]?\s*(\d+(?:[.,]\d{1,2})?)$")

_ESTADO_MAP = {
    "debe": "Debe",
    "credito": "Crédito",
    "creditos": "Crédito",
    "pago": "Pagó",
    "pagado": "Pagó",
}


class FilenameParseError(Exception):
    """El nombre del archivo no cumple la convención."""


def strip_accents(text: str) -> str:
    return "".join(
        char
        for char in unicodedata.normalize("NFD", text)
        if unicodedata.category(char) != "Mn"
    )


def normalize_text(text: str) -> str:
    """Minúsculas, sin tildes y espacios colapsados (para comparar clientes)."""
    return re.sub(r"\s+", " ", strip_accents(text or "")).strip().lower()


def _parse_decimal(raw: str) -> float:
    return float(raw.replace(",", "."))


@dataclass
class ParsedVenta:
    cliente: str
    diseno: str
    cantidad: str | None
    metro_total: float | None
    maquina: str | None
    pago: float
    estado: str
    fecha: str | None

    def to_dict(self) -> dict:
        return {
            "cliente": self.cliente,
            "diseno": self.diseno,
            "cantidad": self.cantidad,
            "metro_total": self.metro_total,
            "maquina": self.maquina,
            "pago": self.pago,
            "estado": self.estado,
            "fecha": self.fecha,
        }


def parse_metros(token: str) -> float | None:
    match = _METROS_RE.match(token.strip())
    if not match:
        return None
    value = _parse_decimal(match.group(1))
    unit = (match.group(2) or "m").lower()
    if unit == "cm":
        value /= 100
    return round(value, 4)


def parse_monto(token: str) -> float | None:
    match = _MONTO_RE.match(token.strip())
    if not match:
        return None
    return _parse_decimal(match.group(1))


def parse_filename(filename: str, cfg: Config) -> ParsedVenta:
    stem = Path(filename).stem
    tokens = [token.strip() for token in stem.split(cfg.separator)]

    if any(token == "" for token in tokens):
        raise FilenameParseError(
            f"contiene un campo vacío (revisa los separadores '{cfg.separator}')"
        )

    fecha: str | None = None
    if tokens and _DATE_RE.match(tokens[0]):
        try:
            datetime.strptime(tokens[0], "%Y-%m-%d")
        except ValueError as exc:
            raise FilenameParseError(f"fecha inválida: {tokens[0]}") from exc
        fecha = tokens[0]
        tokens = tokens[1:]

    if len(tokens) == 6:
        estado = cfg.estado_default
    elif len(tokens) == 7:
        estado = _ESTADO_MAP.get(normalize_text(tokens[6]))
        if estado is None:
            raise FilenameParseError(
                f"estado inválido: {tokens[6]!r} (usar: Debe, Crédito o Pagó)"
            )
    else:
        fields = cfg.separator.join(
            ("CLIENTE", "DISEÑO", "CANTIDAD", "METROS", "MAQUINA", "MONTO")
        )
        raise FilenameParseError(
            f"se esperaban 6 campos ({fields}) y opcionalmente estado; "
            f"se encontraron {len(tokens)}"
        )

    cliente = tokens[0]
    diseno = tokens[1]
    cantidad_raw = tokens[2]
    metros_raw = tokens[3]
    maquina_raw = tokens[4]
    monto_raw = tokens[5]

    if not cliente or not diseno:
        raise FilenameParseError("cliente y diseño no pueden estar vacíos")

    if not _CANTIDAD_RE.match(cantidad_raw):
        raise FilenameParseError(f"cantidad inválida: {cantidad_raw!r} (ej: 10uni, 2polos, 10)")

    metro_total = parse_metros(metros_raw)
    if metro_total is None:
        raise FilenameParseError(f"metros inválidos: {metros_raw!r} (ej: 1.5mts, 150cm)")

    pago = parse_monto(monto_raw)
    if pago is None or pago <= 0:
        raise FilenameParseError(f"monto inválido: {monto_raw!r} (ej: S50, 50, 50.50)")

    maquina = cfg.maquina_aliases.get(normalize_text(maquina_raw), maquina_raw)

    return ParsedVenta(
        cliente=cliente,
        diseno=diseno,
        cantidad=cantidad_raw,
        metro_total=metro_total,
        maquina=maquina,
        pago=pago,
        estado=estado,
        fecha=fecha,
    )


def validate_png(path: Path) -> tuple[bool, str]:
    try:
        size = path.stat().st_size
    except OSError as exc:
        return False, f"no se pudo leer el archivo: {exc}"

    if size == 0:
        return False, "el archivo está vacío"

    try:
        with path.open("rb") as handle:
            header = handle.read(len(PNG_MAGIC))
    except OSError as exc:
        return False, f"no se pudo abrir el archivo: {exc}"

    if header != PNG_MAGIC:
        return False, "no es un PNG válido (firma incorrecta)"

    return True, ""


def build_nota(filename: str, file_hash: str) -> str:
    """Nota de trazabilidad: nombre original + hash corto (para idempotencia)."""
    return f"{filename} [{file_hash[:8]}]"
