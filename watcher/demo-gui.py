#!/usr/bin/env python3
"""Demostración de los diálogos Tkinter del watcher (sin registrar ventas).

Carga los clientes REALES desde la API (solo lectura, usando watcher/.env) y
muestra, uno tras otro:
  1. "Cliente no encontrado" (sugerencias + buscador sobre todos los clientes)
  2. "Nombre fuera de convención" (formulario completo)

Si no hay API key o no hay conexión, usa 4 clientes de ejemplo.

Uso:
    cd watcher
    .\\.venv\\Scripts\\python demo-gui.py
"""

from __future__ import annotations

import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from config import Config, load_config
from resolver_gui import ResolverGUI

EJEMPLO_NOMBRE = "SR PABLO"

CLIENTES_FALLBACK = [
    {"id": 1, "nombre": "karen - deyna", "numero": 101},
    {"id": 2, "nombre": "jhonatan", "numero": None},
    {"id": 3, "nombre": "sr pablo", "numero": 55},
    {"id": 4, "nombre": "impresiones del sur", "numero": None},
]


def cargar_clientes(
    cfg: Config,
) -> tuple[list[dict], list[tuple[dict, float]], bool]:
    """Devuelve (clientes, sugerencias, son_reales)."""
    try:
        if not cfg.api_key:
            return CLIENTES_FALLBACK, [], False

        from api_client import ApiClient

        api = ApiClient(cfg)
        clientes = api.list_clientes()
        if not clientes:
            return CLIENTES_FALLBACK, [], False

        sugerencias = api.suggest_clientes(EJEMPLO_NOMBRE)
        return clientes, sugerencias, True
    except Exception as exc:  # noqa: BLE001
        print(f"(No se pudo cargar la API: {exc}; usando datos de ejemplo)")
        return CLIENTES_FALLBACK, [], False


def main() -> int:
    cfg = load_config(require_api_key=False)
    clientes, sugerencias, son_reales = cargar_clientes(cfg)

    gui = ResolverGUI(cfg)
    gui.start()
    time.sleep(1.0)

    if not gui.available:
        print("No se pudo iniciar Tkinter (necesitas una sesión interactiva de Windows).")
        return 1

    if son_reales:
        print(f"Clientes reales cargados desde la API: {len(clientes)}")
    else:
        print("Usando 4 clientes de ejemplo (sin API).")

    print()
    print("== Dialogo 1/2: 'Cliente no encontrado' ==")
    print("   Arriba: sugerencias (★ con %). Abajo: todos los clientes.")
    print("   Usa el campo 'Buscar' para filtrar. Enter = confirmar, Esc = cerrar.")
    r1 = gui.request(
        {
            "kind": "cliente",
            "filename": f"{EJEMPLO_NOMBRE}__logo circular__10uni__1.5mts__DTF__S50.png",
            "nombre": EJEMPLO_NOMBRE,
            "clientes": clientes,
            "sugerencias": sugerencias,
        }
    )
    print("   respuesta:", r1)
    print()

    print("== Dialogo 2/2: 'Nombre fuera de convencion' (formulario completo) ==")
    r2 = gui.request(
        {
            "kind": "form",
            "filename": "prueba sin formato.png",
            "error": (
                "se esperaban 6 campos "
                "(CLIENTE__DISENO__CANTIDAD__METROS__MAQUINA__MONTO); se encontraron 1"
            ),
            "clientes": clientes,
            "sugerencias": [],
        }
    )
    print("   respuesta:", r2)
    print()
    print("Demo terminada. No se envio nada a la API ni se movio ningun archivo.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
