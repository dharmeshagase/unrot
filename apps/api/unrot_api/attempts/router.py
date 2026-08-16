from __future__ import annotations

import json
from dataclasses import dataclass
from typing import BinaryIO

from unrot_api.attempts.service import (
    AttemptNotFoundError,
    AttemptValidationError,
    ChallengeReceiptMismatchError,
    IdempotencyConflictError,
    ReceiptMismatchError,
    get_attempt_service,
)
from unrot_api.attempts.repository import AttemptRepositoryError
from unrot_api.attempts.repository import AttemptRepositoryConfigurationError
from unrot_api.providers.contracts import ProviderConfigurationError
from unrot_api.challenges.service import ChallengeNotFoundError


@dataclass(frozen=True)
class RouteResult:
    status: str
    payload: dict[str, object]


MAX_JSON_BODY_BYTES = 64 * 1024


def handle_post_request(path: str, environ: dict) -> RouteResult | None:
    if path != "/v1/attempts":
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
        result = get_attempt_service().create_attempt(payload, environ.get("HTTP_IDEMPOTENCY_KEY"))
    except AttemptValidationError as error:
        status = "422 Unprocessable Entity" if error.is_bound_error else "400 Bad Request"
        return RouteResult(status=status, payload={"detail": str(error)})
    except ChallengeNotFoundError as error:
        return RouteResult(status="404 Not Found", payload={"detail": str(error)})
    except IdempotencyConflictError as error:
        return RouteResult(status="409 Conflict", payload={"detail": str(error)})
    except (AttemptRepositoryConfigurationError, ProviderConfigurationError, RuntimeError):
        return RouteResult(status="500 Internal Server Error", payload={"detail": "Attempt service is misconfigured"})
    except AttemptRepositoryError:
        return RouteResult(status="503 Service Unavailable", payload={"detail": "Attempt persistence failed"})

    return RouteResult(
        status="201 Created" if result.created else "200 OK",
        payload=result.attempt.to_api_dict(include_receipt=True),
    )


def handle_get_request(path: str, environ: dict) -> RouteResult | None:
    if not path.startswith("/v1/attempts/"):
        return None
    attempt_id = path.removeprefix("/v1/attempts/")
    try:
        attempt = get_attempt_service().get_attempt(attempt_id, environ.get("HTTP_X_ATTEMPT_RECEIPT"))
    except AttemptNotFoundError as error:
        return RouteResult(status="404 Not Found", payload={"detail": str(error)})
    except ReceiptMismatchError as error:
        return RouteResult(status="403 Forbidden", payload={"detail": str(error)})
    except (AttemptRepositoryConfigurationError, ProviderConfigurationError, RuntimeError):
        return RouteResult(status="500 Internal Server Error", payload={"detail": "Attempt service is misconfigured"})
    return RouteResult(status="200 OK", payload=attempt.to_api_dict(include_receipt=False))


def handle_delete_request(path: str, environ: dict) -> RouteResult | None:
    if not path.startswith("/v1/attempts/"):
        return None
    attempt_id = path.removeprefix("/v1/attempts/")
    try:
        get_attempt_service().delete_attempt(attempt_id, environ.get("HTTP_X_ATTEMPT_RECEIPT"))
    except AttemptNotFoundError as error:
        return RouteResult(status="404 Not Found", payload={"detail": str(error)})
    except ReceiptMismatchError as error:
        return RouteResult(status="403 Forbidden", payload={"detail": str(error)})
    except (AttemptRepositoryConfigurationError, ProviderConfigurationError, RuntimeError):
        return RouteResult(status="500 Internal Server Error", payload={"detail": "Attempt service is misconfigured"})
    return RouteResult(status="204 No Content", payload={})


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


def _read_bounded_body(environ: dict, limit: int) -> bytes | None:
    content_length = environ.get("CONTENT_LENGTH")
    try:
        length = max(int(str(content_length)), 0)
    except (TypeError, ValueError):
        length = None
    if length is not None and length > limit:
        return None
    stream = environ.get("wsgi.input")
    if not hasattr(stream, "read"):
        return b""
    body = _cast_binary_stream(stream).read(limit + 1 if length is None else min(length, limit + 1))
    return None if len(body) > limit else body


def _cast_binary_stream(stream: object) -> BinaryIO:
    return stream  # type: ignore[return-value]
