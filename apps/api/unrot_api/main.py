from __future__ import annotations

import json
from pathlib import Path
from typing import Callable, Iterable
from wsgiref.simple_server import make_server

from unrot_api.config import load_root_environment

load_root_environment(Path(__file__).resolve().parents[3])

from unrot_api.analytics.router import handle_post_request as handle_analytics_post_request
from unrot_api.analysis.router import handle_post_request as handle_analysis_post_request
from unrot_api.attempts.router import (
    handle_delete_request as handle_attempt_delete_request,
    handle_get_request as handle_attempt_get_request,
    handle_post_request as handle_attempt_post_request,
)
from unrot_api.challenges.router import handle_get_request as handle_challenge_get_request
from unrot_api.providers.factory import provider_capabilities

WSGIApp = Callable[[dict, Callable[[str, list[tuple[str, str]]], None]], Iterable[bytes]]


def _json_response(
    start_response: Callable[[str, list[tuple[str, str]]], None],
    status: str,
    payload: dict[str, object],
) -> list[bytes]:
    if status.startswith("204 "):
        start_response(
            status,
            [
                ("Content-Type", "application/json"),
                ("Content-Length", "0"),
            ],
        )
        return []
    body = json.dumps(payload).encode("utf-8")
    start_response(
        status,
        [
            ("Content-Type", "application/json"),
            ("Content-Length", str(len(body))),
        ],
    )
    return [body]


def create_wsgi_app() -> WSGIApp:
    def application(environ: dict, start_response: Callable[[str, list[tuple[str, str]]], None]) -> list[bytes]:
        if environ.get("REQUEST_METHOD") == "GET":
            if environ.get("PATH_INFO") == "/health":
                return _json_response(start_response, "200 OK", {"status": "ok"})
            if environ.get("PATH_INFO") == "/v1":
                return _json_response(
                    start_response,
                    "200 OK",
                    {
                        "service": "unrot-api",
                        "routes": [
                            "/v1/challenges",
                            "/v1/challenges/{slug}",
                            "/v1/challenges/{slug}/community",
                            "/v1/capabilities",
                            "/v1/analyses/preview",
                            "/v1/events",
                            "/v1/transcriptions",
                            "/v1/attempts",
                            "/v1/attempts/{attemptId}",
                        ],
                    },
                )
            if environ.get("PATH_INFO") == "/v1/capabilities":
                return _json_response(start_response, "200 OK", provider_capabilities())

            result = handle_attempt_get_request(str(environ.get("PATH_INFO", "")), environ)
            if result is not None:
                return _json_response(start_response, result.status, result.payload)

            result = handle_challenge_get_request(
                str(environ.get("PATH_INFO", "")),
                str(environ.get("QUERY_STRING", "")),
                environ,
            )
            if result is not None:
                return _json_response(start_response, result.status, result.payload)

        if environ.get("REQUEST_METHOD") == "POST":
            result = handle_analytics_post_request(str(environ.get("PATH_INFO", "")), environ)
            if result is not None:
                return _json_response(start_response, result.status, result.payload)

            result = handle_attempt_post_request(str(environ.get("PATH_INFO", "")), environ)
            if result is not None:
                return _json_response(start_response, result.status, result.payload)

            result = handle_analysis_post_request(str(environ.get("PATH_INFO", "")), environ)
            if result is not None:
                return _json_response(start_response, result.status, result.payload)

        if environ.get("REQUEST_METHOD") == "DELETE":
            result = handle_attempt_delete_request(str(environ.get("PATH_INFO", "")), environ)
            if result is not None:
                return _json_response(start_response, result.status, result.payload)

        return _json_response(start_response, "404 Not Found", {"detail": "Not Found"})

    return application


app = create_wsgi_app()


def serve(host: str = "127.0.0.1", port: int = 8000) -> None:
    with make_server(host, port, app) as server:
        print(f"Unrot API listening on http://{host}:{port}")
        server.serve_forever()


if __name__ == "__main__":
    serve()
