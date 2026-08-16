from __future__ import annotations

import importlib
import io
import json
import tempfile
import unittest
from contextlib import redirect_stderr, redirect_stdout
from unittest.mock import patch
from urllib.parse import urlsplit
from wsgiref.util import setup_testing_defaults


class PostRouteTest(unittest.TestCase):
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

    def test_transcriptions_route_rejects_unsupported_media_type(self) -> None:
        status, payload = self._request(
            "/v1/transcriptions",
            method="POST",
            body=b"not-audio",
            content_type="text/plain",
        )

        self.assertEqual(status, "415 Unsupported Media Type")
        self.assertEqual(payload, {"detail": "Unsupported media type 'text/plain'"})

    def test_transcriptions_route_rejects_empty_input(self) -> None:
        status, payload = self._request(
            "/v1/transcriptions",
            method="POST",
            body=b"",
            content_type="audio/webm",
        )

        self.assertEqual(status, "400 Bad Request")
        self.assertEqual(payload, {"detail": "Audio body is required"})

    def test_transcriptions_route_rejects_oversized_input(self) -> None:
        status, payload = self._request(
            "/v1/transcriptions",
            method="POST",
            body=b"x" * (10 * 1024 * 1024 + 1),
            content_type="audio/webm",
        )

        self.assertEqual(status, "413 Payload Too Large")
        self.assertEqual(payload, {"detail": "Audio body exceeds 10485760 bytes"})

    def test_transcriptions_route_returns_application_json_without_persisting_audio(self) -> None:
        from unrot_api.providers.contracts import Transcript

        class StubTranscriptionProvider:
            def transcribe(self, audio: bytes, mime_type: str) -> Transcript:
                self.audio = audio
                self.mime_type = mime_type
                return Transcript(text="garden marker", language="en")

        provider = StubTranscriptionProvider()
        stdout_capture = io.StringIO()
        stderr_capture = io.StringIO()

        with tempfile.TemporaryDirectory() as temp_dir:
            with patch("unrot_api.analysis.router.build_transcription_provider", return_value=provider):
                with redirect_stdout(stdout_capture), redirect_stderr(stderr_capture):
                    status, payload = self._request(
                        "/v1/transcriptions",
                        method="POST",
                        body=b"temporary-audio",
                        content_type="audio/webm",
                    )

            self.assertEqual(status, "200 OK")
            self.assertEqual(payload, {"text": "garden marker", "language": "en"})
            self.assertEqual(provider.audio, b"temporary-audio")
            self.assertEqual(provider.mime_type, "audio/webm")
            self.assertEqual(list(__import__("pathlib").Path(temp_dir).iterdir()), [])

        self.assertNotIn("temporary-audio", stdout_capture.getvalue())
        self.assertNotIn("temporary-audio", stderr_capture.getvalue())

    def test_transcriptions_route_returns_safe_502_on_provider_failure(self) -> None:
        class FailingTranscriptionProvider:
            def transcribe(self, audio: bytes, mime_type: str) -> object:
                raise RuntimeError(f"Provider exploded while processing {audio!r} as {mime_type}")

        with patch(
            "unrot_api.analysis.router.build_transcription_provider",
            return_value=FailingTranscriptionProvider(),
        ):
            status, payload = self._request(
                "/v1/transcriptions",
                method="POST",
                body=b"temporary-audio",
                content_type="audio/webm",
            )

        self.assertEqual(status, "502 Bad Gateway")
        self.assertEqual(payload, {"detail": "Transcription provider failed"})

    def test_transcriptions_route_returns_clear_error_on_provider_configuration_failure(self) -> None:
        from unrot_api.providers.contracts import ProviderConfigurationError

        with patch(
            "unrot_api.analysis.router.build_transcription_provider",
            side_effect=ProviderConfigurationError("OPENAI_API_KEY missing"),
        ):
            status, payload = self._request(
                "/v1/transcriptions",
                method="POST",
                body=b"temporary-audio",
                content_type="audio/webm",
            )

        self.assertEqual(status, "500 Internal Server Error")
        self.assertEqual(payload, {"detail": "Transcription provider is misconfigured"})

    def test_local_transcription_route_reports_voice_unavailable(self) -> None:
        from unrot_api.providers.contracts import ProviderUnavailableError

        class UnavailableProvider:
            def transcribe(self, audio: bytes, mime_type: str) -> object:
                raise ProviderUnavailableError("Voice transcription is unavailable in local mode")

        with patch(
            "unrot_api.analysis.router.build_transcription_provider",
            return_value=UnavailableProvider(),
        ):
            status, payload = self._request(
                "/v1/transcriptions",
                method="POST",
                body=b"temporary-audio",
                content_type="audio/webm",
            )

        self.assertEqual(status, "503 Service Unavailable")
        self.assertEqual(payload, {"detail": "Voice transcription is unavailable in this configuration"})

    def test_preview_route_requires_transcript_and_challenge_id(self) -> None:
        status, payload = self._request(
            "/v1/analyses/preview",
            method="POST",
            body=json.dumps({"challengeId": "", "transcript": ""}).encode("utf-8"),
        )

        self.assertEqual(status, "400 Bad Request")
        self.assertEqual(
            payload,
            {"detail": "challengeId and transcript are required"},
        )

    def test_preview_route_rejects_wrong_field_types(self) -> None:
        status, payload = self._request(
            "/v1/analyses/preview",
            method="POST",
            body=json.dumps({"challengeId": 7, "transcript": ["tiny shovel"]}).encode("utf-8"),
        )

        self.assertEqual(status, "400 Bad Request")
        self.assertEqual(
            payload,
            {"detail": "challengeId and transcript must be non-empty strings"},
        )

    def test_preview_route_returns_404_for_unknown_challenge(self) -> None:
        status, payload = self._request(
            "/v1/analyses/preview",
            method="POST",
            body=json.dumps(
                {"challengeId": "not-a-real-object", "transcript": "tiny shovel"}
            ).encode("utf-8"),
        )

        self.assertEqual(status, "404 Not Found")
        self.assertEqual(payload, {"detail": "Challenge 'not-a-real-object' not found"})

    def test_preview_route_returns_normalized_ideas(self) -> None:
        from unrot_api.analysis.models import Idea, IdeaAnalysis

        class StubAnalysisProvider:
            def analyze(self, object_context: object, transcript: object) -> IdeaAnalysis:
                self.object_context = object_context
                self.transcript = transcript
                return IdeaAnalysis(
                    ideas=[
                        Idea(
                            raw="tiny shovel",
                            canonical="tiny gardening shovel",
                            category="gardening",
                            valid=True,
                            plausibility=0.8,
                            elaboration=0.7,
                        )
                    ],
                    warnings=("deduplicated alias",),
                )

        provider = StubAnalysisProvider()

        with patch("unrot_api.analysis.router.build_idea_analysis_provider", return_value=provider):
            status, payload = self._request(
                "/v1/analyses/preview",
                method="POST",
                body=json.dumps({"challengeId": "spoon", "transcript": "tiny shovel"}).encode(
                    "utf-8"
                ),
            )

        self.assertEqual(status, "200 OK")
        self.assertEqual(payload["warnings"], ["deduplicated alias"])
        self.assertEqual(payload["ideas"][0]["canonical"], "tiny gardening shovel")
        self.assertEqual(provider.object_context.slug, "spoon")
        self.assertEqual(provider.transcript.text, "tiny shovel")

    def test_preview_route_falls_back_to_local_analysis_on_provider_failure(self) -> None:
        class FailingAnalysisProvider:
            def analyze(self, object_context: object, transcript: object) -> object:
                raise RuntimeError("provider leaked internals")

        with patch(
            "unrot_api.analysis.router.build_idea_analysis_provider",
            return_value=FailingAnalysisProvider(),
        ):
            status, payload = self._request(
                "/v1/analyses/preview",
                method="POST",
                body=json.dumps({"challengeId": "spoon", "transcript": "tiny shovel"}).encode(
                    "utf-8"
                ),
            )

        self.assertEqual(status, "200 OK")
        self.assertEqual(payload["ideas"][0]["canonical"], "tiny gardening shovel")
        self.assertIn("local estimate", " ".join(payload["warnings"]).lower())

    def test_preview_route_returns_clear_error_on_provider_configuration_failure(self) -> None:
        from unrot_api.providers.contracts import ProviderConfigurationError

        with patch(
            "unrot_api.analysis.router.build_idea_analysis_provider",
            side_effect=ProviderConfigurationError("OPENAI_API_KEY missing"),
        ):
            status, payload = self._request(
                "/v1/analyses/preview",
                method="POST",
                body=json.dumps({"challengeId": "spoon", "transcript": "tiny shovel"}).encode(
                    "utf-8"
                ),
            )

        self.assertEqual(status, "500 Internal Server Error")
        self.assertEqual(payload, {"detail": "Idea analysis provider is misconfigured"})

    def test_preview_route_caps_json_body_and_transcript_length(self) -> None:
        status, payload = self._request(
            "/v1/analyses/preview",
            method="POST",
            body=b"{" + (b"x" * (64 * 1024)) + b"}",
        )
        self.assertEqual(status, "413 Payload Too Large")
        self.assertIn("65536", str(payload["detail"]))

        status, payload = self._request(
            "/v1/analyses/preview",
            method="POST",
            body=json.dumps({"challengeId": "spoon", "transcript": "x" * 10_001}).encode("utf-8"),
        )
        self.assertEqual(status, "422 Unprocessable Entity")
        self.assertIn("10000", str(payload["detail"]))
