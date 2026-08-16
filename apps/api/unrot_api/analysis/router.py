from __future__ import annotations

import json
from dataclasses import dataclass
from typing import BinaryIO

from unrot_api.challenges.service import ChallengeNotFoundError, get_object_context
from unrot_api.providers.contracts import ProviderConfigurationError, ProviderUnavailableError, Transcript
from unrot_api.providers.factory import build_idea_analysis_provider, build_transcription_provider
from unrot_api.providers.local import LocalIdeaAnalysisProvider

MAX_AUDIO_BYTES = 10 * 1024 * 1024
MAX_JSON_BODY_BYTES = 64 * 1024
MAX_TRANSCRIPT_CHARS = 10_000
SUPPORTED_AUDIO_MIME_TYPES = {
    "audio/webm",
    "audio/wav",
    "audio/mpeg",
    "audio/mp4",
}


@dataclass(frozen=True)
class RouteResult:
    status: str
    payload: dict[str, object]


def handle_post_request(path: str, environ: dict) -> RouteResult | None:
    if path == "/v1/transcriptions":
        return _handle_transcription_request(environ)
    if path == "/v1/analyses/preview":
        return _handle_preview_request(environ)
    return None


def _handle_transcription_request(environ: dict) -> RouteResult:
    mime_type = str(environ.get("CONTENT_TYPE", "")).split(";", 1)[0].strip().lower()
    if mime_type not in SUPPORTED_AUDIO_MIME_TYPES:
        return RouteResult(
            status="415 Unsupported Media Type",
            payload={"detail": f"Unsupported media type '{mime_type or 'unknown'}'"},
        )

    body = _read_bounded_body(environ, MAX_AUDIO_BYTES)
    if body is None:
        return RouteResult(
            status="413 Payload Too Large",
            payload={"detail": f"Audio body exceeds {MAX_AUDIO_BYTES} bytes"},
        )
    if not body:
        return RouteResult(status="400 Bad Request", payload={"detail": "Audio body is required"})

    try:
        transcript = build_transcription_provider().transcribe(body, mime_type)
    except ProviderUnavailableError:
        return RouteResult(
            status="503 Service Unavailable",
            payload={"detail": "Voice transcription is unavailable in this configuration"},
        )
    except ProviderConfigurationError:
        return RouteResult(
            status="500 Internal Server Error",
            payload={"detail": "Transcription provider is misconfigured"},
        )
    except Exception:
        return RouteResult(status="502 Bad Gateway", payload={"detail": "Transcription provider failed"})
    finally:
        body = b""

    return RouteResult(status="200 OK", payload=transcript.to_dict())


def _handle_preview_request(environ: dict) -> RouteResult:
    body = _read_bounded_body(environ, MAX_JSON_BODY_BYTES)
    if body is None:
        return RouteResult(
            status="413 Payload Too Large",
            payload={"detail": f"JSON body exceeds {MAX_JSON_BODY_BYTES} bytes"},
        )
    try:
        payload = json.loads(body.decode("utf-8"))
    except (UnicodeDecodeError, ValueError):
        return RouteResult(status="400 Bad Request", payload={"detail": "Request body must be valid JSON"})

    if not isinstance(payload, dict):
        return RouteResult(status="400 Bad Request", payload={"detail": "Request body must be a JSON object"})

    challenge_id = payload.get("challengeId")
    transcript_text = payload.get("transcript")
    if challenge_id in (None, "") or transcript_text in (None, ""):
        return RouteResult(
            status="400 Bad Request",
            payload={"detail": "challengeId and transcript are required"},
        )
    if not isinstance(challenge_id, str) or not isinstance(transcript_text, str):
        return RouteResult(
            status="400 Bad Request",
            payload={"detail": "challengeId and transcript must be non-empty strings"},
        )
    challenge_id = challenge_id.strip()
    transcript_text = transcript_text.strip()
    if not challenge_id or not transcript_text:
        return RouteResult(
            status="400 Bad Request",
            payload={"detail": "challengeId and transcript are required"},
        )
    if len(transcript_text) > MAX_TRANSCRIPT_CHARS:
        return RouteResult(
            status="422 Unprocessable Entity",
            payload={"detail": f"transcript must not exceed {MAX_TRANSCRIPT_CHARS} characters"},
        )

    try:
        object_context = get_object_context(challenge_id)
    except ChallengeNotFoundError as error:
        return RouteResult(status="404 Not Found", payload={"detail": str(error)})

    try:
        analysis = build_idea_analysis_provider().analyze(
            object_context,
            Transcript(text=transcript_text, language=None),
        )
    except ProviderConfigurationError:
        return RouteResult(
            status="500 Internal Server Error",
            payload={"detail": "Idea analysis provider is misconfigured"},
        )
    except Exception:
        analysis = LocalIdeaAnalysisProvider().analyze(
            object_context,
            Transcript(text=transcript_text, language=None),
        )
        analysis = type(analysis)(
            ideas=analysis.ideas,
            warnings=(*analysis.warnings, "Primary analysis failed; using a deterministic local estimate."),
        )

    return RouteResult(status="200 OK", payload=analysis.to_dict())


def _read_bounded_body(environ: dict, limit: int) -> bytes | None:
    content_length = _parse_content_length(environ.get("CONTENT_LENGTH"))
    if content_length is not None and content_length > limit:
        return None

    stream = environ.get("wsgi.input")
    if not hasattr(stream, "read"):
        return b""

    body = cast_binary_stream(stream).read(limit + 1)
    if len(body) > limit:
        return None
    return body


def _read_body(environ: dict) -> bytes:
    stream = environ.get("wsgi.input")
    if not hasattr(stream, "read"):
        return b""
    content_length = _parse_content_length(environ.get("CONTENT_LENGTH"))
    if content_length is None:
        return cast_binary_stream(stream).read()
    return cast_binary_stream(stream).read(max(content_length, 0))


def _parse_content_length(value: object) -> int | None:
    if value in (None, ""):
        return None
    try:
        return max(int(str(value)), 0)
    except ValueError:
        return None


def cast_binary_stream(stream: object) -> BinaryIO:
    return stream  # type: ignore[return-value]
