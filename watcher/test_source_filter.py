"""Protege el registro de ventas frente a descargas web en la carpeta vigilada."""

import io
import os
import tempfile
import threading
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from source_filter import is_internet_download
from watcher import WatcherService


class SourceFilterTests(unittest.TestCase):
    def test_windows_internet_zone_is_blocked(self):
        with patch("builtins.open", return_value=io.StringIO("[ZoneTransfer]\nZoneId=3\nHostUrl=https://example.com/a.png\n")):
            self.assertTrue(is_internet_download(Path("download.png")))

    def test_local_export_without_zone_is_allowed(self):
        with patch("builtins.open", side_effect=FileNotFoundError):
            self.assertFalse(is_internet_download(Path("corel.png")))

    @unittest.skipUnless(os.name == "nt", "Zone.Identifier requiere Windows")
    def test_real_windows_alternate_stream(self):
        with tempfile.TemporaryDirectory(dir=Path(__file__).resolve().parent) as directory:
            file = Path(directory) / "download.png"
            file.write_bytes(b"png")
            self.assertFalse(is_internet_download(file))
            with open(f"{file}:Zone.Identifier", "w", encoding="utf-8") as stream:
                stream.write("[ZoneTransfer]\nZoneId=3\nHostUrl=https://example.com/a.png\n")
            self.assertTrue(is_internet_download(file))

    def test_web_download_is_stopped_before_registration(self):
        service = object.__new__(WatcherService)
        service.cfg = SimpleNamespace(block_web_downloads=True)
        service._stop = threading.Event()
        service._wait_stable = lambda _path: True
        service._file_key = lambda _path: self.fail("No debe calcular clave ni llamar a la API")
        with patch.object(Path, "exists", return_value=True), patch("watcher.is_internet_download", return_value=True):
            service.process_file(Path("download.png"))

    def test_web_download_from_additional_folder_is_not_moved(self):
        service = object.__new__(WatcherService)
        service.cfg = SimpleNamespace(block_web_downloads=True, entrada=Path("entrada"))
        service._wait_stable = lambda _path: True
        with patch.object(Path, "is_file", return_value=True), patch("watcher.is_internet_download", return_value=True), patch("watcher.shutil.move", side_effect=AssertionError("No se debe mover")):
            self.assertIsNone(service._stage_external_file(Path("Descargas/download.png")))


if __name__ == "__main__":
    unittest.main()
