from __future__ import annotations

import importlib
import io
import json
import unittest
from urllib.parse import urlsplit
from wsgiref.util import setup_testing_defaults


class EventsRouteTest(unittest.TestCase):
    def _request(
        self,
        path: str,
        *,
        method: str,
        body: bytes = b"",
        content_type: str = "application/json",
    ) -> tuple[str, dict[str, object]]:
        main = importlib.import_module("unrot_api.main")
        app = getattr(main, "app", None)
        self.assertIsNotNone(app, "unrot_api.main must expose an app callable")
        parts = urlsplit(path)

        captured: dict[str, object] = {}

        def start_response(status: str, headers: list[tuple[str, str]]) -> None:
            captured["status"] = status
            captured["headers"] = headers

        environ = {
            "PATH_INFO": parts.path,
            "QUERY_STRING": parts.query,
            "REQUEST_METHOD": method,
            "CONTENT_TYPE": content_type,
            "CONTENT_LENGTH": str(len(body)),
            "wsgi.input": io.BytesIO(body),
        }
        setup_testing_defaults(environ)

        payload = b"".join(app(environ, start_response))
        self.assertIn("status", captured)
        return captured["status"], json.loads(payload.decode("utf-8"))

    def test_events_route_rejects_unknown_event_name(self) -> None:
        status, payload = self._request(
            "/v1/events",
            method="POST",
            body=json.dumps(
                {
                    "name": "profile_viewed",
                    "anonymousSessionId": "anon-123",
                    "timestamp": "2026-08-15T12:00:00Z",
                }
            ).encode("utf-8"),
        )

        self.assertEqual(status, "422 Unprocessable Entity")
        self.assertEqual(payload, {"detail": "Unknown event 'profile_viewed'"})

    def test_events_route_rejects_sensitive_fields(self) -> None:
        status, payload = self._request(
            "/v1/events",
            method="POST",
            body=json.dumps(
                {
                    "name": "idea_detected",
                    "anonymousSessionId": "anon-123",
                    "timestamp": "2026-08-15T12:00:00Z",
                    "transcript": "tiny shovel",
                }
            ).encode("utf-8"),
        )

        self.assertEqual(status, "422 Unprocessable Entity")
        self.assertEqual(payload, {"detail": "Sensitive field 'transcript' is not allowed"})

    def test_events_route_accepts_known_challenge_and_stores_only_hashed_session_id(self) -> None:
        from unrot_api.analytics.router import set_analytics_store
        from unrot_api.analytics.store import MemoryAnalyticsStore

        store = MemoryAnalyticsStore(capacity=8)
        previous = set_analytics_store(store)
        try:
            status, payload = self._request(
                "/v1/events",
                method="POST",
                body=json.dumps(
                    {
                        "name": "challenge_started",
                        "anonymousSessionId": "anon-123",
                        "challengeId": "spoon",
                        "timestamp": "2026-08-15T12:00:00Z",
                    }
                ).encode("utf-8"),
            )
        finally:
            set_analytics_store(previous)

        self.assertEqual(status, "202 Accepted")
        self.assertEqual(payload, {"accepted": True})
        events = store.snapshot()
        self.assertEqual(len(events), 1)
        self.assertEqual(events[0]["name"], "challenge_started")
        self.assertEqual(events[0]["challengeId"], "spoon")
        self.assertNotIn("anonymousSessionId", events[0])
        self.assertIn("anonymousSessionHash", events[0])
        self.assertNotEqual(events[0]["anonymousSessionHash"], "anon-123")

    def test_events_route_returns_safe_response_when_store_fails(self) -> None:
        from unrot_api.analytics.router import set_analytics_store

        class FailingStore:
            def record_event(self, event: object) -> None:
                raise RuntimeError("storage offline")

        previous = set_analytics_store(FailingStore())
        try:
            status, payload = self._request(
                "/v1/events",
                method="POST",
                body=json.dumps(
                    {
                        "name": "home_viewed",
                        "anonymousSessionId": "anon-123",
                        "timestamp": "2026-08-15T12:00:00Z",
                    }
                ).encode("utf-8"),
            )
        finally:
            set_analytics_store(previous)

        self.assertEqual(status, "202 Accepted")
        self.assertEqual(payload, {"accepted": False})


class MemoryAnalyticsStoreTest(unittest.TestCase):
    def test_memory_store_keeps_only_the_most_recent_events(self) -> None:
        from unrot_api.analytics.models import AnalyticsEvent
        from unrot_api.analytics.store import MemoryAnalyticsStore

        store = MemoryAnalyticsStore(capacity=2)

        store.record_event(
            AnalyticsEvent(
                name="home_viewed",
                anonymous_session_id="anon-1",
                timestamp="2026-08-15T12:00:00Z",
            )
        )
        store.record_event(
            AnalyticsEvent(
                name="challenge_selected",
                anonymous_session_id="anon-2",
                challenge_id="spoon",
                timestamp="2026-08-15T12:00:01Z",
            )
        )
        store.record_event(
            AnalyticsEvent(
                name="challenge_started",
                anonymous_session_id="anon-3",
                challenge_id="spoon",
                timestamp="2026-08-15T12:00:02Z",
            )
        )

        events = store.snapshot()
        self.assertEqual(len(events), 2)
        self.assertEqual([event["name"] for event in events], ["challenge_selected", "challenge_started"])
        self.assertTrue(all("anonymousSessionHash" in event for event in events))
        self.assertTrue(all("anonymousSessionId" not in event for event in events))
