from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from math import isfinite

from unrot_api.challenges.catalog import get_catalog_detail

ALLOWED_EVENT_NAMES = frozenset(
    {
        "home_viewed",
        "challenge_selected",
        "timer_info_opened",
        "input_mode_selected",
        "microphone_permission_result",
        "challenge_started",
        "idea_detected",
        "challenge_finished",
        "transcription_failed",
        "ideas_reviewed",
        "score_viewed",
        "score_dimension_opened",
        "community_answers_viewed",
        "next_challenge_started",
    }
)

ALLOWED_EVENT_FIELDS = frozenset({"name", "anonymousSessionId", "challengeId", "value", "timestamp"})
SENSITIVE_FIELD_NAMES = frozenset(
    {
        "audio",
        "audioData",
        "canonical",
        "canonicalIdea",
        "email",
        "extra",
        "ideas",
        "raw",
        "rawIdea",
        "receipt",
        "text",
        "transcript",
        "apiKey",
        "openaiApiKey",
        "userAgent",
    }
)


class AnalyticsValidationError(ValueError):
    pass


@dataclass(frozen=True)
class AnalyticsEvent:
    name: str
    anonymous_session_id: str
    timestamp: str
    challenge_id: str | None = None
    value: float | int | None = None

    @classmethod
    def from_payload(cls, payload: object) -> "AnalyticsEvent":
        if not isinstance(payload, dict):
            raise AnalyticsValidationError("Request body must be a JSON object")

        for key in payload:
            if key in SENSITIVE_FIELD_NAMES:
                raise AnalyticsValidationError(f"Sensitive field '{key}' is not allowed")
            if key not in ALLOWED_EVENT_FIELDS:
                raise AnalyticsValidationError(f"Unknown field '{key}' is not allowed")

        name = payload.get("name")
        if not isinstance(name, str) or not name.strip():
            raise AnalyticsValidationError("Event name is required")
        normalized_name = name.strip()
        if normalized_name not in ALLOWED_EVENT_NAMES:
            raise AnalyticsValidationError(f"Unknown event '{normalized_name}'")

        anonymous_session_id = payload.get("anonymousSessionId")
        if not isinstance(anonymous_session_id, str) or not anonymous_session_id.strip():
            raise AnalyticsValidationError("anonymousSessionId must be a non-empty string")

        timestamp = payload.get("timestamp")
        if not isinstance(timestamp, str) or not timestamp.strip():
            raise AnalyticsValidationError("timestamp must be an ISO timestamp")
        normalized_timestamp = timestamp.strip()
        try:
            datetime.fromisoformat(normalized_timestamp.replace("Z", "+00:00"))
        except ValueError as error:
            raise AnalyticsValidationError("timestamp must be an ISO timestamp") from error

        challenge_id = payload.get("challengeId")
        normalized_challenge_id: str | None = None
        if challenge_id is not None:
            if not isinstance(challenge_id, str) or not challenge_id.strip():
                raise AnalyticsValidationError("challengeId must be a known challenge slug")
            normalized_challenge_id = challenge_id.strip()
            if get_catalog_detail(normalized_challenge_id) is None:
                raise AnalyticsValidationError(f"Unknown challenge '{normalized_challenge_id}'")

        value = payload.get("value")
        normalized_value: float | int | None = None
        if value is not None:
            if isinstance(value, bool) or not isinstance(value, (int, float)) or not isfinite(float(value)):
                raise AnalyticsValidationError("value must be a finite number")
            normalized_value = int(value) if isinstance(value, int) else float(value)

        return cls(
            name=normalized_name,
            anonymous_session_id=anonymous_session_id.strip(),
            timestamp=normalized_timestamp,
            challenge_id=normalized_challenge_id,
            value=normalized_value,
        )
