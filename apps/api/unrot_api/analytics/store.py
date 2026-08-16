from __future__ import annotations

import hashlib
from collections import deque
from typing import Protocol

from .models import AnalyticsEvent


class AnalyticsStore(Protocol):
    def record_event(self, event: AnalyticsEvent) -> None:
        ...


class MemoryAnalyticsStore:
    def __init__(self, *, capacity: int = 256) -> None:
        self._events: deque[dict[str, object]] = deque(maxlen=max(1, int(capacity)))

    def record_event(self, event: AnalyticsEvent) -> None:
        payload: dict[str, object] = {
            "name": event.name,
            "anonymousSessionHash": hashlib.sha256(event.anonymous_session_id.encode("utf-8")).hexdigest(),
            "timestamp": event.timestamp,
        }
        if event.challenge_id is not None:
            payload["challengeId"] = event.challenge_id
        if event.value is not None:
            payload["value"] = event.value
        self._events.append(payload)

    def snapshot(self) -> list[dict[str, object]]:
        return [dict(item) for item in self._events]
