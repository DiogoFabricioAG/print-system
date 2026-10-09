"""Cliente HTTP para la API de Print System (header X-API-Key)."""

from __future__ import annotations

import threading
import time
from difflib import SequenceMatcher

import requests

from config import Config
from parser import normalize_text


class ApiError(Exception):
    def __init__(self, message: str, status: int | None = None):
        super().__init__(message)
        self.status = status

    @property
    def retryable(self) -> bool:
        return self.status is None or self.status >= 500 or self.status in (408, 429)

    @property
    def unauthorized(self) -> bool:
        return self.status == 401


class ApiClient:
    def __init__(self, cfg: Config):
        self.cfg = cfg
        self.session = requests.Session()
        self.session.headers.update(
            {
                "X-API-Key": cfg.api_key,
                "Content-Type": "application/json",
                "User-Agent": "print-system-watcher/1.0",
            }
        )
        self._clientes: list[dict] | None = None
        self._clientes_ts = 0.0
        self._lock = threading.Lock()

    # ── infraestructura ─────────────────────────────────────────────────────

    def _request(self, method: str, path: str, **kwargs) -> object:
        url = f"{self.cfg.api_url}{path}"
        try:
            response = self.session.request(method, url, timeout=(5, 20), **kwargs)
        except requests.RequestException as exc:
            raise ApiError(f"error de red: {exc}") from exc

        try:
            body = response.json()
        except ValueError as exc:
            raise ApiError(
                f"respuesta no JSON (HTTP {response.status_code})", response.status_code
            ) from exc

        if response.status_code >= 400 or not body.get("success"):
            raise ApiError(
                body.get("error") or f"HTTP {response.status_code}",
                response.status_code,
            )

        return body.get("data")

    # ── clientes ────────────────────────────────────────────────────────────

    def list_clientes(self, force: bool = False) -> list[dict]:
        with self._lock:
            fresh = (
                self._clientes is not None
                and (time.monotonic() - self._clientes_ts) < self.cfg.client_cache_ttl
            )
            if fresh and not force:
                return self._clientes
        data = self._request("GET", "/clientes")
        with self._lock:
            self._clientes = data or []
            self._clientes_ts = time.monotonic()
            return self._clientes

    def invalidate_clientes(self) -> None:
        with self._lock:
            self._clientes = None
            self._clientes_ts = 0.0

    def find_cliente(self, nombre: str) -> dict | None:
        target = normalize_text(nombre)
        for cliente in self.list_clientes():
            if normalize_text(cliente.get("nombre", "")) == target:
                return cliente
        return None

    def suggest_clientes(self, nombre: str, limit: int | None = None) -> list[tuple[dict, float]]:
        target = normalize_text(nombre)
        limit = limit or self.cfg.fuzzy_limit
        scored: list[tuple[dict, float]] = []
        for cliente in self.list_clientes():
            ratio = SequenceMatcher(
                None, target, normalize_text(cliente.get("nombre", ""))
            ).ratio()
            if ratio >= 0.35:
                scored.append((cliente, ratio))
        scored.sort(key=lambda item: item[1], reverse=True)
        return scored[:limit]

    def create_cliente(
        self,
        nombre: str,
        numero: int | None = None,
        descripcion: str | None = None,
    ) -> dict:
        payload: dict = {"nombre": nombre}
        if numero:
            payload["numero"] = numero
        if descripcion:
            payload["descripcion"] = descripcion
        created = self._request("POST", "/clientes", json=payload)
        self.invalidate_clientes()
        return created

    # ── ventas / pagos ──────────────────────────────────────────────────────

    def create_venta(self, payload: dict) -> dict:
        return self._request("POST", "/ventas", json=payload)

    def create_pago(self, cliente_id: int, pago: float, nota: str | None = None) -> dict:
        body: dict = {"cliente_id": cliente_id, "pago": pago}
        if nota:
            body["nota"] = nota
        return self._request("POST", "/pagos", json=body)

    def find_venta_by_nota(self, nota: str) -> dict | None:
        ventas = self._request("GET", "/ventas") or []
        for venta in ventas:
            if venta.get("nota") == nota:
                return venta
        return None
