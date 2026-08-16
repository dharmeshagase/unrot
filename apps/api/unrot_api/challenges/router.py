from __future__ import annotations

from dataclasses import dataclass
from typing import Callable
from urllib.parse import parse_qs

from unrot_api.attempts.service import ChallengeReceiptMismatchError, get_attempt_service
from unrot_api.attempts.repository import AttemptRepositoryConfigurationError

from .catalog import list_challenges
from .service import ChallengeNotFoundError, get_challenge, recommend_challenge


@dataclass(frozen=True)
class RouteResult:
    status: str
    payload: dict[str, object]


class QueryValidationError(ValueError):
    pass


def handle_get_request(path: str, query_string: str, environ: dict | None = None) -> RouteResult | None:
    if path == "/v1/challenges":
        try:
            payload = _list_payload(query_string)
        except QueryValidationError as error:
            return RouteResult(status="400 Bad Request", payload={"detail": str(error)})
        return RouteResult(status="200 OK", payload=payload)

    if path.startswith("/v1/challenges/") and path.endswith("/community"):
        slug = path.removeprefix("/v1/challenges/").removesuffix("/community").strip("/")
        if not slug:
            return RouteResult(status="404 Not Found", payload={"detail": "Not Found"})
        try:
            payload = get_attempt_service().get_community_results(
                slug,
                None if environ is None else str(environ.get("HTTP_X_ATTEMPT_RECEIPT", "")),
            )
        except ChallengeReceiptMismatchError as error:
            return RouteResult(status="403 Forbidden", payload={"detail": str(error)})
        except ChallengeNotFoundError as error:
            return RouteResult(status="404 Not Found", payload={"detail": str(error)})
        except (AttemptRepositoryConfigurationError, RuntimeError):
            return RouteResult(status="500 Internal Server Error", payload={"detail": "Attempt service is misconfigured"})
        return RouteResult(status="200 OK", payload=payload)

    if path.startswith("/v1/challenges/"):
        slug = path.removeprefix("/v1/challenges/")
        if not slug:
            return RouteResult(status="404 Not Found", payload={"detail": "Not Found"})
        try:
            detail = get_challenge(slug)
        except ChallengeNotFoundError as error:
            return RouteResult(status="404 Not Found", payload={"detail": str(error)})
        return RouteResult(status="200 OK", payload=detail.to_dict())

    return None


def _list_payload(query_string: str) -> dict[str, object]:
    query = parse_qs(query_string, keep_blank_values=False)
    recent_ids = _parse_recent_ids(query.get("recent", []))
    first_full_challenge = _parse_bool(query.get("first_full_challenge", ["false"])[0])
    seed = _parse_seed(query.get("seed", [None])[0])

    recommended = None
    if recent_ids or first_full_challenge or seed is not None:
        recommended = recommend_challenge(
            recent_ids=recent_ids,
            first_full_challenge=first_full_challenge,
            seed=seed,
        ).to_dict()

    return {
        "items": [item.to_dict() for item in list_challenges()],
        "recommended": recommended,
    }


def _parse_recent_ids(values: list[str]) -> set[str]:
    recent_ids: set[str] = set()
    for value in values:
        for item in value.split(","):
            if item:
                recent_ids.add(item.strip())
    return recent_ids


def _parse_bool(value: str) -> bool:
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _parse_seed(value: str | None) -> int | None:
    if value is None:
        return None
    stripped = value.strip()
    if not stripped:
        return None
    try:
        return int(stripped)
    except ValueError as error:
        raise QueryValidationError(f"Invalid seed '{stripped}'") from error
