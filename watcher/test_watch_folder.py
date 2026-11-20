"""Un PNG en RIP abre la revisión, sin filtros de origen ni carpetas extra."""

import os
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from config import Config, load_config
from watcher import WatcherService, _PngEventHandler


class WatchFolderTests(unittest.TestCase):
    def test_legacy_settings_do_not_add_folders_or_filter_downloads(self):
        with patch("config._load_env_file"), patch.dict(os.environ, {
            "WATCH_ROOT": "data", "WATCH_FOLDER": "RIP", "API_KEY": "local-test-only",
            "ADDITIONAL_WATCH_FOLDERS": "Descargas;Otra",
            "BLOCK_WEB_DOWNLOADS": "true",
        }, clear=True):
            cfg = load_config()
        self.assertEqual(cfg.entrada, Path("RIP"))
        self.assertFalse(hasattr(cfg, "additional_watch_folders"))
        self.assertFalse(hasattr(cfg, "block_web_downloads"))

    def test_default_folder_is_rip(self):
        cfg = Config(watch_root=Path("data"), api_url="http://localhost/api", api_key="local")
        self.assertEqual(cfg.entrada, Path("data/RIP"))

    def test_only_png_create_and_rename_events_are_queued(self):
        service = MagicMock()
        handler = _PngEventHandler(service)
        for name in ("local.png", "chrome.PNG", "export.PnG"):
            handler.on_created(SimpleNamespace(is_directory=False, src_path=name))
        handler.on_moved(SimpleNamespace(is_directory=False, dest_path="final.png"))
        handler.on_created(SimpleNamespace(is_directory=True, src_path="folder.png"))
        for name in ("image.jpg", "design.cdr", "download.png.crdownload", "export.tmp"):
            handler.on_created(SimpleNamespace(is_directory=False, src_path=name))
        self.assertEqual([call.args[0] for call in service.submit.call_args_list],
                         ["local.png", "chrome.PNG", "export.PnG", "final.png"])

    def test_existing_files_are_only_read_from_rip(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            rip, downloads = root / "RIP", root / "Descargas"
            rip.mkdir()
            downloads.mkdir()
            (rip / "local.png").write_bytes(b"local")
            (rip / "other.PNG").write_bytes(b"other")
            (rip / "ignored.jpg").write_bytes(b"jpg")
            outside = downloads / "outside.png"
            outside.write_bytes(b"outside")
            service = object.__new__(WatcherService)
            service.cfg = Config(root, "http://localhost/api", "local", watch_folder=rip)
            service._stop = MagicMock()
            service._stop.is_set.return_value = False
            service.process_file = MagicMock()
            service._process_due_retries = MagicMock()
            service.process_existing()
            self.assertEqual({call.args[0] for call in service.process_file.call_args_list},
                             {rip / "local.png", rip / "other.PNG"})
            self.assertEqual(outside.read_bytes(), b"outside")

    def test_png_with_any_filename_opens_review_regardless_of_origin(self):
        for name, internet in (("corel.png", False), ("chrome.PNG", True)):
            with self.subTest(filename=name), tempfile.TemporaryDirectory() as directory:
                root = Path(directory)
                cfg = Config(root / "data", "http://127.0.0.1:1/api", "local-test-only",
                             watch_folder=root / "RIP", stability_checks=1,
                             stability_interval=0.001, stability_timeout=1)
                cfg.ensure_folders()
                path = cfg.entrada / name
                path.write_bytes(b"PNG fixture")
                if internet and os.name == "nt":
                    with open(f"{path}:Zone.Identifier", "w", encoding="utf-8") as stream:
                        stream.write("[ZoneTransfer]\nZoneId=3\nHostUrl=https://example.com/file.png\n")
                gui = MagicMock(available=True)
                gui.request.return_value = {"accion": "cancelar"}
                with patch("watcher.State") as state_type:
                    state_type.return_value.is_processed.return_value = False
                    service = WatcherService(cfg, gui=gui)
                service.api = MagicMock()
                service.api.list_clientes.return_value = []
                service._to_pending = MagicMock()
                service.process_file(path)
                gui.request.assert_called_once()
                self.assertEqual(gui.request.call_args.args[0]["kind"], "review")
                self.assertEqual(gui.request.call_args.args[0]["file_path"], str(path))
                service.api.create_venta.assert_not_called()
                service.api.create_pago.assert_not_called()

    def test_non_png_does_not_open_review_or_call_api(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "export.cdr"
            path.write_bytes(b"local")
            service = object.__new__(WatcherService)
            service.gui = MagicMock()
            service.api = MagicMock()
            service.process_file(path)
            service.gui.request.assert_not_called()
            service.api.list_clientes.assert_not_called()


if __name__ == "__main__":
    unittest.main()
