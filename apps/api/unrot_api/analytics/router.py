from __future__ import annotations

import json
from dataclasses import dataclass
from typing import BinaryIO

from .models import AnalyticsEvent, AnalyticsValidationError
from .store import AnalyticsStore, MemoryAnalyticsStore


@dataclass(frozen=True)
class RouteResult:
    status: str
    payload: dict[str, object]


_analytics_store: AnalyticsStore = MemoryAnalyticsStore()
MAX_JSON_BODY_BYTES = 64 * 1024


def get_analytics_store() -> AnalyticsStore:
    return _analytics_store


def set_analytics_store(store: AnalyticsStore) -> AnalyticsStore:
    global _analytics_store
    previous = _analytics_store
    _analytics_store = store
    return previous


def handle_post_request(path: str, environ: dict) -> RouteResult | None:
    if path != "/v1/events":
        return None

    body = _read_bounded_body(environ, MAX_JSON_BODY_BYTES)
    if body is None:
        return RouteResult(
            status="413 Payload Too Large",
            payload={"detail": f"JSON body exceeds {MAX_JSON_BODY_BYTES} bytes"},
        )
    try:
        payload = json.loads(body.decode("utf-8")) if body else {}
    except (UnicodeDecodeError, ValueError):
        return RouteResult(status="400 Bad Request", payload={"detail": "Request body must be valid JSON"})

    try:
        event = AnalyticsEvent.from_payload(payload)
    except AnalyticsValidationError as error:
        return RouteResult(status="422 Unprocessable Entity", payload={"detail": str(error)})

    try:
        get_analytics_store().record_event(event)
    except Exception:
        return RouteResult(status="202 Accepted", payload={"accepted": False})

    return RouteResult(status="202 Accepted", payload={"accepted": True})


def _read_body(environ: dict) -> bytes:
    stream = environ.get("wsgi.input")
    if not hasattr(stream, "read"):
        return b""
    content_length = environ.get("CONTENT_LENGTH")
    try:
        length = max(int(str(content_length)), 0)
    except (TypeError, ValueError):
        length = 0
    return _cast_binary_stream(stream).read(length)


def _cast_binary_stream(stream: object) -> BinaryIO:
    return stream  # type: ignore[return-value]


def _read_bounded_body(environ: dict, limit: int) -> bytes | None:
    stream = environ.get("wsgi.input")
    if not hasattr(stream, "read"):
        return b""
    try:
        length = max(int(str(environ.get("CONTENT_LENGTH"))), 0)
    except (TypeError, ValueError):
        length = None
    if length is not None and length > limit:
        return None
    body = _cast_binary_stream(stream).read(limit + 1 if length is None else min(length, limit + 1))
    return None if len(body) > limit else body
