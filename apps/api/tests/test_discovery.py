from __future__ import annotations

import importlib
import io
import json
import unittest
from os import environ
from unittest.mock import patch
from urllib.parse import urlsplit
from wsgiref.util import setup_testing_defaults


class ApiDiscoveryTest(unittest.TestCase):
    def _get(self, path: str) -> tuple[str, dict[str, object]]:
        main = importlib.import_module("unrot_api.main")
        captured: dict[str, object] = {}

        def start_response(status: str, response_headers: list[tuple[str, str]]) -> None:
            captured["status"] = status

        parts = urlsplit(path)
        environ_data = {
            "PATH_INFO": parts.path,
            "QUERY_STRING": parts.query,
            "REQUEST_METHOD": "GET",
            "CONTENT_LENGTH": "0",
            "wsgi.input": io.BytesIO(b""),
        }
        setup_testing_defaults(environ_data)
        body = b"".join(main.app(environ_data, start_response))
        return str(captured["status"]), json.loads(body.decode("utf-8"))

    def test_root_v1_discovery_lists_attempt_routes(self) -> None:
        main = importlib.import_module("unrot_api.main")
        app = getattr(main, "app", None)
        self.assertIsNotNone(app, "unrot_api.main must expose an app callable")
        parts = urlsplit("/v1")
        captured: dict[str, object] = {}

        def start_response(status: str, response_headers: list[tuple[str, str]]) -> None:
            captured["status"] = status
            captured["headers"] = response_headers

        environ = {
            "PATH_INFO": parts.path,
            "QUERY_STRING": parts.query,
            "REQUEST_METHOD": "GET",
            "CONTENT_TYPE": "application/json",
            "CONTENT_LENGTH": "0",
            "wsgi.input": io.BytesIO(b""),
        }
        setup_testing_defaults(environ)

        payload = b"".join(app(environ, start_response))
        self.assertEqual(captured["status"], "200 OK")
        body = json.loads(payload.decode("utf-8"))
        self.assertEqual(body["service"], "unrot-api")
        self.assertIn("/v1/attempts", body["routes"])
        self.assertIn("/v1/attempts/{attemptId}", body["routes"])
        self.assertIn("/v1/challenges/{slug}/community", body["routes"])
        self.assertIn("/v1/capabilities", body["routes"])

    def test_capabilities_expose_voice_availability_without_secrets(self) -> None:
        with patch.dict(
            environ,
            {"TRANSCRIPTION_PROVIDER": "local", "OPENAI_API_KEY": "never-return-this"},
            clear=False,
        ):
            status, payload = self._get("/v1/capabilities")

        self.assertEqual(status, "200 OK")
        self.assertEqual(payload["voice"], {"available": False, "provider": "local"})
        self.assertNotIn("never-return-this", json.dumps(payload))

        with patch.dict(
            environ,
            {"TRANSCRIPTION_PROVIDER": "openai", "OPENAI_API_KEY": "configured"},
            clear=False,
        ):
            _, openai_payload = self._get("/v1/capabilities")
        self.assertEqual(openai_payload["voice"], {"available": True, "provider": "openai"})
