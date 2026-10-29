"""Parser de la convención estricta de nombres PNG y validación de extensión.

Convención:
    DISEÑO - CLIENTE - CANTIDAD - METRAJE - PAGO - MAQUINA.png

Ejemplos:
    polo navidad - karen - deyna - 2polos - 150cm - 80 soles - DTF.png
"""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass
from pathlib import Path

from config import Config

_CANTIDAD_RE = re.compile(r"^\d+(?:[.,]\d+)?\s*[a-zA-ZñÑáéíóúÁÉÍÓÚ.]*$")
_METROS_RE = re.compile(r"^(\d+(?:[.,]\d+)?)\s*(cm|mts?|mrt|tm|m)?$", re.IGNORECASE)
_MONTO_RE = re.compile(
    r"^(?:S\s*)?(\d+(?:[.,]\d{1,2})?)\s*(?:sol(?:es)?)?$", re.IGNORECASE
)


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
    adelanto: float | None = None
    metodo_pago: str = "Yape"

    def to_dict(self) -> dict:
        return {
            "cliente": self.cliente,
            "diseno": self.diseno,
            "cantidad": self.cantidad,
            "metro_total": self.metro_total,
            "maquina": self.maquina,
            "pago": self.pago,
            "estado": self.estado,
            "metodo_pago": self.metodo_pago,
            "fecha": self.fecha,
            "adelanto": self.adelanto,
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
    # Separa desde la derecha cantidad, metraje, pago y máquina. Todo lo que
    # sigue al primer separador del prefijo es el cliente; admite nombres como
    # "karen - deyna".
    parts = stem.rsplit(cfg.separator, 4)
    if len(parts) != 5 or cfg.separator not in parts[0]:
        fields = cfg.separator.join(
            ("DISEÑO", "CLIENTE", "CANTIDAD", "METRAJE", "PAGO", "MAQUINA")
        )
        raise FilenameParseError(
            f"se espera el formato {fields}"
        )

    diseno, cliente = parts[0].split(cfg.separator, 1)
    diseno = diseno.strip()
    cliente = cliente.strip()
    cantidad_raw, metros_raw, monto_raw, maquina_raw = (
        part.strip() for part in parts[1:]
    )

    if any(
        not field
        for field in (diseno, cliente, cantidad_raw, metros_raw, monto_raw, maquina_raw)
    ):
        raise FilenameParseError("hay un campo vacío; revisa los separadores")

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
        estado="Debe",
        fecha=None,
    )


_WINDOWS_INVALID_FILENAME_CHARS = re.compile(r'[<>:"/\\|?*]')


def build_canonical_filename(venta: ParsedVenta, cfg: Config) -> str:
    """Construye el nombre estándar con los valores confirmados por el usuario."""
    if not venta.diseno or not venta.cliente or not venta.cantidad:
        raise FilenameParseError("diseño, cliente y cantidad son obligatorios para renombrar")
    if venta.metro_total is None or venta.pago <= 0 or not venta.maquina:
        raise FilenameParseError("metraje, pago y máquina son obligatorios para renombrar")
    if cfg.separator in venta.diseno or cfg.separator in venta.maquina:
        raise FilenameParseError(
            f"diseño y máquina no pueden contener el separador {cfg.separator!r}"
        )

    def safe_part(value: str) -> str:
        return _WINDOWS_INVALID_FILENAME_CHARS.sub("_", value).strip().rstrip(" .")

    fields = [
        safe_part(venta.diseno),
        safe_part(venta.cliente),
        safe_part(venta.cantidad),
        f"{venta.metro_total:g}m",
        f"{venta.pago:g} soles",
        safe_part(venta.maquina),
    ]
    if any(not value for value in fields):
        raise FilenameParseError("uno de los campos queda vacío al formar el nombre estándar")

    return cfg.separator.join(fields) + ".png"


def validate_png_extension(path: Path) -> tuple[bool, str]:
    """Valida que sea un archivo con sufijo .png; no inspecciona el contenido."""
    if not path.is_file():
        return False, "la ruta no es un archivo"
    if path.suffix.lower() != ".png":
        return False, "la extensión debe ser .png"
    return True, ""


def build_nota(filename: str, file_hash: str) -> str:
    """Nota de trazabilidad: nombre original + hash corto (para idempotencia)."""
    return f"{filename} [{file_hash[:8]}]"
