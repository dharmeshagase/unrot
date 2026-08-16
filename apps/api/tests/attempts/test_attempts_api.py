from __future__ import annotations

import importlib
import io
import json
import os
import unittest
from unittest.mock import patch
from urllib.parse import urlsplit
from wsgiref.util import setup_testing_defaults


VALID_ATTEMPT = {
    "challengeId": "spoon",
    "inputMode": "voice",
    "durationSeconds": 53,
    "anonymousSessionId": "anon-123",
    "ideas": [
        {
            "raw": "tiny shovel",
            "canonical": "tiny gardening shovel",
            "category": "gardening",
            "valid": True,
            "plausibility": 0.8,
            "elaboration": 0.7,
        },
        {
            "raw": "sun signal",
            "canonical": "sunlight signal mirror",
            "category": "communication",
            "valid": True,
            "plausibility": 0.9,
            "elaboration": 0.6,
        },
    ],
}


class AttemptRoutesTest(unittest.TestCase):
    def setUp(self) -> None:
        self._previous_secret = os.environ.get("ATTEMPT_RECEIPT_SECRET")
        self._previous_analysis_provider = os.environ.get("IDEA_ANALYSIS_PROVIDER")
        os.environ["ATTEMPT_RECEIPT_SECRET"] = "receipt-secret"
        os.environ["IDEA_ANALYSIS_PROVIDER"] = "local"
        service = importlib.import_module("unrot_api.attempts.service")
        service.reset_attempt_service()

    def tearDown(self) -> None:
        if self._previous_secret is None:
            os.environ.pop("ATTEMPT_RECEIPT_SECRET", None)
        else:
            os.environ["ATTEMPT_RECEIPT_SECRET"] = self._previous_secret
        if self._previous_analysis_provider is None:
            os.environ.pop("IDEA_ANALYSIS_PROVIDER", None)
        else:
            os.environ["IDEA_ANALYSIS_PROVIDER"] = self._previous_analysis_provider

    def _request(
        self,
        path: str,
        *,
        method: str,
        body: bytes = b"",
        headers: dict[str, str] | None = None,
    ) -> tuple[str, dict[str, object], bytes, list[tuple[str, str]]]:
        main = importlib.import_module("unrot_api.main")
        app = getattr(main, "app", None)
        self.assertIsNotNone(app, "unrot_api.main must expose an app callable")
        parts = urlsplit(path)

        captured: dict[str, object] = {}

        def start_response(status: str, response_headers: list[tuple[str, str]]) -> None:
            captured["status"] = status
            captured["headers"] = response_headers

        environ = {
            "PATH_INFO": parts.path,
            "QUERY_STRING": parts.query,
            "REQUEST_METHOD": method,
            "CONTENT_TYPE": "application/json",
            "CONTENT_LENGTH": str(len(body)),
            "wsgi.input": io.BytesIO(body),
        }
        for key, value in (headers or {}).items():
            environ[f"HTTP_{key.upper().replace('-', '_')}"] = value
        setup_testing_defaults(environ)

        payload = b"".join(app(environ, start_response))
        self.assertIn("status", captured)
        decoded = {} if not payload else json.loads(payload.decode("utf-8"))
        return captured["status"], decoded, payload, captured["headers"]

    def test_attempt_creation_requires_idempotency_key(self) -> None:
        status, payload, _, _ = self._request(
            "/v1/attempts",
            method="POST",
            body=json.dumps(VALID_ATTEMPT).encode("utf-8"),
        )

        self.assertEqual(status, "400 Bad Request")
        self.assertEqual(payload, {"detail": "Idempotency-Key header is required"})

    def test_attempt_creation_validates_fields(self) -> None:
        invalid_payload = {
            "challengeId": "spoon",
            "inputMode": "tap",
            "durationSeconds": -1,
            "anonymousSessionId": 7,
            "ideas": "not-a-list",
        }

        status, payload, _, _ = self._request(
            "/v1/attempts",
            method="POST",
            body=json.dumps(invalid_payload).encode("utf-8"),
            headers={"Idempotency-Key": "attempt-1"},
        )

        self.assertEqual(status, "400 Bad Request")
        self.assertEqual(payload["detail"], "inputMode must be 'voice' or 'text'")

    def test_attempt_creation_enforces_body_and_field_bounds(self) -> None:
        cases = [
            ({**VALID_ATTEMPT, "ideas": [{"raw": f"idea {i}"} for i in range(21)]}, "attempt-many", "20"),
            ({**VALID_ATTEMPT, "ideas": [{"raw": "x" * 501}]}, "attempt-long-idea", "500"),
            ({**VALID_ATTEMPT, "anonymousSessionId": "s" * 129}, "attempt-long-session", "128"),
        ]
        for attempt, key, expected in cases:
            with self.subTest(key=key):
                status, payload, _, _ = self._request(
                    "/v1/attempts",
                    method="POST",
                    body=json.dumps(attempt).encode("utf-8"),
                    headers={"Idempotency-Key": key},
                )
                self.assertEqual(status, "422 Unprocessable Entity")
                self.assertIn(expected, str(payload["detail"]))

        status, payload, _, _ = self._request(
            "/v1/attempts",
            method="POST",
            body=json.dumps(VALID_ATTEMPT).encode("utf-8"),
            headers={"Idempotency-Key": "k" * 129},
        )
        self.assertEqual(status, "422 Unprocessable Entity")
        self.assertIn("128", str(payload["detail"]))

        status, payload, _, _ = self._request(
            "/v1/attempts",
            method="POST",
            body=b"{" + (b"x" * (64 * 1024)) + b"}",
            headers={"Idempotency-Key": "attempt-oversize"},
        )
        self.assertEqual(status, "413 Payload Too Large")

    def test_attempt_creation_is_idempotent_and_receipt_can_read_and_delete(self) -> None:
        first_status, first_payload, _, _ = self._request(
            "/v1/attempts",
            method="POST",
            body=json.dumps(VALID_ATTEMPT).encode("utf-8"),
            headers={"Idempotency-Key": "attempt-1"},
        )
        second_status, second_payload, _, _ = self._request(
            "/v1/attempts",
            method="POST",
            body=json.dumps(VALID_ATTEMPT).encode("utf-8"),
            headers={"Idempotency-Key": "attempt-1"},
        )

        self.assertEqual(first_status, "201 Created")
        self.assertEqual(second_status, "200 OK")
        self.assertEqual(first_payload["attemptId"], second_payload["attemptId"])
        self.assertEqual(first_payload["receipt"], second_payload["receipt"])
        self.assertEqual(first_payload["score"]["algorithmVersion"], "1.0")
        self.assertIn("comparisonCopy", first_payload)
        self.assertIn("estimate", str(first_payload["comparisonCopy"]).lower())

        attempt_id = str(first_payload["attemptId"])
        receipt = str(first_payload["receipt"])

        read_status, read_payload, _, _ = self._request(
            f"/v1/attempts/{attempt_id}",
            method="GET",
            headers={"X-Attempt-Receipt": receipt},
        )
        self.assertEqual(read_status, "200 OK")
        self.assertEqual(read_payload["attemptId"], attempt_id)
        self.assertNotIn("receipt", read_payload)

        delete_status, delete_payload, delete_body, delete_headers = self._request(
            f"/v1/attempts/{attempt_id}",
            method="DELETE",
            headers={"X-Attempt-Receipt": receipt},
        )
        self.assertEqual(delete_status, "204 No Content")
        self.assertEqual(delete_payload, {})
        self.assertEqual(delete_body, b"")
        self.assertIn(("Content-Length", "0"), delete_headers)

        missing_status, missing_payload, _, _ = self._request(
            f"/v1/attempts/{attempt_id}",
            method="GET",
            headers={"X-Attempt-Receipt": receipt},
        )
        self.assertEqual(missing_status, "404 Not Found")
        self.assertEqual(missing_payload, {"detail": "Attempt not found"})

    def test_attempt_creation_reanalyzes_raw_ideas_instead_of_trusting_client_metadata(self) -> None:
        manipulated_payload = {
            **VALID_ATTEMPT,
            "ideas": [
                {
                    "raw": "tiny shovel",
                    "canonical": "fabricated canonical",
                    "category": "fabricated",
                    "valid": True,
                    "plausibility": 0.0,
                    "elaboration": 0.0,
                }
            ],
        }

        status, payload, _, _ = self._request(
            "/v1/attempts",
            method="POST",
            body=json.dumps(manipulated_payload).encode("utf-8"),
            headers={"Idempotency-Key": "attempt-renormalize"},
        )

        self.assertEqual(status, "201 Created")
        self.assertEqual(payload["rarestIdea"], "tiny gardening shovel")
        self.assertEqual(payload["categories"], [{"category": "gardening", "count": 1}])
        self.assertGreater(payload["score"]["plausibilityElaboration"], 0)

    def test_attempt_receipt_mismatch_is_rejected(self) -> None:
        create_status, create_payload, _, _ = self._request(
            "/v1/attempts",
            method="POST",
            body=json.dumps(VALID_ATTEMPT).encode("utf-8"),
            headers={"Idempotency-Key": "attempt-2"},
        )
        self.assertEqual(create_status, "201 Created")

        status, payload, _, _ = self._request(
            f"/v1/attempts/{create_payload['attemptId']}",
            method="GET",
            headers={"X-Attempt-Receipt": "wrong-receipt"},
        )

        self.assertEqual(status, "403 Forbidden")
        self.assertEqual(payload, {"detail": "Receipt does not match this attempt"})

    def test_community_results_require_matching_completed_receipt(self) -> None:
        blocked_status, blocked_payload, _, _ = self._request("/v1/challenges/spoon/community", method="GET")
        self.assertEqual(blocked_status, "403 Forbidden")
        self.assertEqual(blocked_payload, {"detail": "A matching completed-attempt receipt is required"})

        created_status, created_payload, _, _ = self._request(
            "/v1/attempts",
            method="POST",
            body=json.dumps(VALID_ATTEMPT).encode("utf-8"),
            headers={"Idempotency-Key": "attempt-3"},
        )
        self.assertEqual(created_status, "201 Created")

        mismatch_status, mismatch_payload, _, _ = self._request(
            "/v1/challenges/sock/community",
            method="GET",
            headers={"X-Attempt-Receipt": str(created_payload["receipt"])},
        )
        self.assertEqual(mismatch_status, "403 Forbidden")
        self.assertEqual(mismatch_payload, {"detail": "Receipt does not match this challenge"})

        allowed_status, allowed_payload, _, _ = self._request(
            "/v1/challenges/spoon/community",
            method="GET",
            headers={"X-Attempt-Receipt": str(created_payload["receipt"])},
        )
        self.assertEqual(allowed_status, "200 OK")
        self.assertEqual(allowed_payload["comparisonBasis"], "reference-set")
        self.assertGreaterEqual(len(allowed_payload["items"]), 1)
        self.assertNotIn("anonymousSessionId", json.dumps(allowed_payload))
        self.assertNotIn("receiptHash", json.dumps(allowed_payload))
        self.assertNotIn("tiny private spoon catapult", json.dumps(allowed_payload))

    def test_community_results_only_return_moderated_public_examples(self) -> None:
        attempt_with_private_idea = {
            **VALID_ATTEMPT,
            "ideas": [
                {
                    "raw": "rocket saddle",
                    "canonical": "rocket saddle",
                    "category": "play",
                    "valid": True,
                    "plausibility": 0.8,
                    "elaboration": 0.6,
                }
            ],
        }

        created_status, created_payload, _, _ = self._request(
            "/v1/attempts",
            method="POST",
            body=json.dumps(attempt_with_private_idea).encode("utf-8"),
            headers={"Idempotency-Key": "attempt-private-community"},
        )
        self.assertEqual(created_status, "201 Created")

        allowed_status, allowed_payload, _, _ = self._request(
            "/v1/challenges/spoon/community",
            method="GET",
            headers={"X-Attempt-Receipt": str(created_payload["receipt"])},
        )

        self.assertEqual(allowed_status, "200 OK")
        rendered = json.dumps(allowed_payload)
        self.assertIn("tiny gardening shovel", rendered)
        self.assertNotIn("rocket saddle", rendered, "player attempt ideas must stay private until moderated")
        self.assertNotIn("tiny private spoon catapult", rendered, "private reference ideas must stay hidden")
        self.assertEqual(allowed_payload["sourceKind"], "reference-examples")
        self.assertTrue(all(item["sourceKind"] == "reference-examples" for item in allowed_payload["items"]))

    def test_attempt_creation_falls_back_to_local_analysis_when_primary_fails(self) -> None:
        class FailingProvider:
            def analyze(self, object_context: object, transcript: object) -> object:
                raise RuntimeError("provider unavailable")

        with patch("unrot_api.attempts.service.build_idea_analysis_provider", return_value=FailingProvider()):
            status, payload, _, _ = self._request(
                "/v1/attempts",
                method="POST",
                body=json.dumps(VALID_ATTEMPT).encode("utf-8"),
                headers={"Idempotency-Key": "attempt-fallback"},
            )

        self.assertEqual(status, "201 Created")
        self.assertIn("local estimate", " ".join(payload["analysisWarnings"]).lower())
        self.assertIn("estimate", str(payload["comparisonCopy"]).lower())

    def test_unknown_repository_provider_is_a_configuration_error(self) -> None:
        service = importlib.import_module("unrot_api.attempts.service")
        service.reset_attempt_service()

    def test_attempt_router_maps_missing_service_configuration_safely(self) -> None:
        service = importlib.import_module("unrot_api.attempts.service")
        service.reset_attempt_service()
        with patch.dict(os.environ, {"ATTEMPT_RECEIPT_SECRET": "", "ATTEMPT_REPOSITORY": "memory"}, clear=False):
            status, payload, _, _ = self._request(
                "/v1/attempts/unknown",
                method="GET",
                headers={"X-Attempt-Receipt": "receipt"},
            )
        service.reset_attempt_service()

        self.assertEqual(status, "500 Internal Server Error")
        self.assertEqual(payload, {"detail": "Attempt service is misconfigured"})
        with patch.dict(os.environ, {"ATTEMPT_REPOSITORY": "typo", "ATTEMPT_RECEIPT_SECRET": "secret"}, clear=False):
            with self.assertRaisesRegex(service.AttemptRepositoryConfigurationError, "Unknown attempt repository 'typo'"):
                service.get_attempt_service()
        service.reset_attempt_service()

    def test_mongo_repository_fails_cleanly_when_pymongo_is_unavailable(self) -> None:
        module = importlib.import_module("unrot_api.attempts.mongo_repository")

        with self.assertRaisesRegex(RuntimeError, "PyMongo is required to use MongoAttemptRepository"):
            module.MongoAttemptRepository("mongodb://localhost:27017", "unrot")


class AttemptServiceBehaviorTest(unittest.TestCase):
    def setUp(self) -> None:
        self.service_module = importlib.import_module("unrot_api.attempts.service")
        self.repository_module = importlib.import_module("unrot_api.attempts.memory_repository")

    def test_fresh_service_replays_same_attempt_and_receipt_from_same_repository(self) -> None:
        repository = self.repository_module.InMemoryAttemptRepository()
        first_service = self.service_module.AttemptService(repository, receipt_secret="receipt-secret")

        first_result = first_service.create_attempt(VALID_ATTEMPT, "attempt-4")

        second_service = self.service_module.AttemptService(repository, receipt_secret="receipt-secret")
        second_result = second_service.create_attempt(VALID_ATTEMPT, "attempt-4")

        self.assertTrue(first_result.created)
        self.assertFalse(second_result.created)
        self.assertEqual(first_result.attempt.attempt_id, second_result.attempt.attempt_id)
        self.assertEqual(first_result.attempt.receipt, second_result.attempt.receipt)

    def test_atomic_save_if_absent_returns_existing_attempt_after_insert_race(self) -> None:
        repository = self.repository_module.InMemoryAttemptRepository()
        first_service = self.service_module.AttemptService(repository, receipt_secret="receipt-secret")
        winner = first_service.create_attempt(VALID_ATTEMPT, "attempt-5")

        second_service = self.service_module.AttemptService(repository, receipt_secret="receipt-secret")
        replay = second_service.create_attempt(VALID_ATTEMPT, "attempt-5")

        self.assertEqual(winner.attempt.attempt_id, replay.attempt.attempt_id)
        self.assertEqual(winner.attempt.receipt, replay.attempt.receipt)

    def test_receipt_secret_is_required(self) -> None:
        repository = self.repository_module.InMemoryAttemptRepository()

        with self.assertRaisesRegex(RuntimeError, "ATTEMPT_RECEIPT_SECRET is required"):
            self.service_module.AttemptService(repository, receipt_secret="")

    def test_unmatched_idea_rarity_is_a_moderate_cold_start_estimate(self) -> None:
        lookup = self.service_module._ChallengeRarityLookup("spoon", "reference-set", [])
        self.assertLessEqual(lookup.percentile("never seen before"), 0.75)
