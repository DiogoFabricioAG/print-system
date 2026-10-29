import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock

from parser import ParsedVenta
from watcher import WatcherService


class PaymentMethodTests(unittest.TestCase):
    def test_desktop_sends_selected_method(self):
        for method in ("Yape", "Efectivo"):
            with self.subTest(method=method):
                service = object.__new__(WatcherService)
                service.cfg = SimpleNamespace(separator=" - ")
                service.dry_run = False
                service.api = MagicMock()
                service.api.create_venta.return_value = {"id": 1}
                service.state = MagicMock()
                service.counter = {"procesados": 0}
                service._move_processed = MagicMock()
                sale = ParsedVenta("Cliente", "Diseno", "1uni", 1, "DTF", 10, "Debe", None, metodo_pago=method)
                service._register(Path("local.png"), "test-key", sale, {"id": 1, "nombre": "Cliente"})
                self.assertEqual(service.api.create_venta.call_args.args[0]["metodo_pago"], method)

    def test_new_desktop_sale_defaults_to_yape(self):
        sale = ParsedVenta("Cliente", "Diseno", None, 1, "DTF", 10, "Debe", None)
        self.assertEqual(sale.to_dict()["metodo_pago"], "Yape")


if __name__ == "__main__":
    unittest.main()
