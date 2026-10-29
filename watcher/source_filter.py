"""Lee la marca de procedencia que Windows añade a descargas de Internet."""

from __future__ import annotations

import re
from pathlib import Path


_ZONE_ID = re.compile(r"^\s*ZoneId\s*=\s*(\d+)\s*$", re.IGNORECASE | re.MULTILINE)


def is_internet_download(path: Path) -> bool:
    """Devuelve True si Zone.Identifier indica zona Internet o Sitios restringidos.

    La marca describe la procedencia web, no el navegador que guardó el archivo.
    Si no existe la marca, la función no atribuye el archivo a Internet.
    """
    try:
        with open(f"{path}:Zone.Identifier", "r", encoding="utf-8-sig", errors="replace") as stream:
            metadata = stream.read(4096)
    except (FileNotFoundError, OSError):
        return False

    match = _ZONE_ID.search(metadata)
    return match is not None and int(match.group(1)) >= 3
