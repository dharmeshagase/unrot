import importlib
import io
import json
import unittest
from wsgiref.util import setup_testing_defaults


class HealthTest(unittest.TestCase):
    def test_health_returns_ok(self) -> None:
        try:
            main = importlib.import_module("unrot_api.main")
        except ModuleNotFoundError as error:
            self.fail(f"Expected unrot_api.main to exist, but import failed: {error}")

        app = getattr(main, "app", None)
        self.assertIsNotNone(app, "unrot_api.main must expose an app callable")

        captured: dict[str, object] = {}

        def start_response(status: str, headers: list[tuple[str, str]]) -> None:
            captured["status"] = status
            captured["headers"] = headers

        environ = {
            "PATH_INFO": "/health",
            "REQUEST_METHOD": "GET",
            "wsgi.input": io.BytesIO(b""),
        }
        setup_testing_defaults(environ)

        body = b"".join(app(environ, start_response))

        self.assertEqual(captured["status"], "200 OK")
        self.assertEqual(json.loads(body.decode("utf-8")), {"status": "ok"})
