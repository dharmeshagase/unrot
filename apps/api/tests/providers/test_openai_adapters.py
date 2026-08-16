from __future__ import annotations

import json
import unittest
from unittest.mock import patch


class OpenAITranscriptionProviderTest(unittest.TestCase):
    def test_transcription_adapter_builds_audio_request_and_maps_response(self) -> None:
        from unrot_api.providers.openai_transcription import (
            HTTPResponse,
            OpenAITranscriptionProvider,
        )

        requests: list[object] = []

        def transport(request: object) -> HTTPResponse:
            requests.append(request)
            return HTTPResponse(
                status_code=200,
                body=json.dumps({"text": "plant marker", "language": "en"}).encode("utf-8"),
                headers={"Content-Type": "application/json"},
            )

        provider = OpenAITranscriptionProvider(api_key="test-key", transport=transport)

        transcript = provider.transcribe(b"audio-bytes", "audio/webm")

        self.assertEqual(transcript.text, "plant marker")
        self.assertEqual(transcript.language, "en")
        self.assertEqual(len(requests), 1)
        request = requests[0]
        self.assertEqual(request.method, "POST")
        self.assertEqual(request.url, "https://api.openai.com/v1/audio/transcriptions")
        self.assertEqual(request.headers["Authorization"], "Bearer test-key")
        self.assertIn("multipart/form-data", request.headers["Content-Type"])
        self.assertIn(b'name="model"', request.body)
        self.assertIn(b'gpt-4o-mini-transcribe', request.body)
        self.assertIn(b'audio-bytes', request.body)

    def test_default_http_transport_has_a_30_second_timeout(self) -> None:
        from unrot_api.providers.contracts import HTTPRequest
        from unrot_api.providers.openai_transcription import _default_transport

        class Response:
            status = 200
            headers = {}

            def __enter__(self):
                return self

            def __exit__(self, *_: object) -> None:
                return None

            def read(self) -> bytes:
                return b'{"text":"ok"}'

        with patch("unrot_api.providers.openai_transcription.request.urlopen", return_value=Response()) as urlopen:
            _default_transport(HTTPRequest("POST", "https://example.test", {}, b"audio"))

        self.assertEqual(urlopen.call_args.kwargs["timeout"], 30)


class OpenAIIdeaAnalysisProviderTest(unittest.TestCase):
    def test_analysis_adapter_requests_strict_json_and_maps_ideas(self) -> None:
        from unrot_api.providers.contracts import ObjectContext, Transcript
        from unrot_api.providers.openai_analysis import (
            HTTPResponse,
            OpenAIIdeaAnalysisProvider,
        )

        requests: list[object] = []

        def transport(request: object) -> HTTPResponse:
            requests.append(request)
            return HTTPResponse(
                status_code=200,
                body=json.dumps(
                    {
                        "choices": [
                            {
                                "message": {
                                    "content": json.dumps(
                                        {
                                            "ideas": [
                                                {
                                                    "raw": "tiny shovel",
                                                    "canonical": "tiny gardening shovel",
                                                    "category": "gardening",
                                                    "valid": True,
                                                    "plausibility": 0.8,
                                                    "elaboration": 0.7,
                                                }
                                            ],
                                            "warnings": ["deduplicated alias"],
                                        }
                                    )
                                }
                            }
                        ]
                    }
                ).encode("utf-8"),
                headers={"Content-Type": "application/json"},
            )

        provider = OpenAIIdeaAnalysisProvider(api_key="test-key", transport=transport)

        analysis = provider.analyze(
            ObjectContext(slug="spoon", name="Spoon", description="A familiar utensil."),
            Transcript(text="tiny shovel", language="en"),
        )

        self.assertEqual([idea.canonical for idea in analysis.ideas], ["tiny gardening shovel"])
        self.assertEqual(analysis.warnings, ("deduplicated alias",))
        self.assertEqual(len(requests), 1)
        request = requests[0]
        self.assertEqual(request.method, "POST")
        self.assertEqual(request.url, "https://api.openai.com/v1/chat/completions")
        self.assertEqual(request.headers["Authorization"], "Bearer test-key")
        payload = json.loads(request.body.decode("utf-8"))
        self.assertEqual(payload["response_format"]["type"], "json_schema")
        self.assertTrue(payload["response_format"]["json_schema"]["strict"])
        self.assertIn("tiny shovel", payload["messages"][1]["content"])

    def test_analysis_adapter_rejects_invalid_provider_payload(self) -> None:
        from unrot_api.providers.contracts import ObjectContext, Transcript
        from unrot_api.providers.openai_analysis import (
            HTTPResponse,
            OpenAIIdeaAnalysisProvider,
            ProviderResponseError,
        )

        def transport(_: object) -> HTTPResponse:
            return HTTPResponse(
                status_code=200,
                body=json.dumps(
                    {
                        "choices": [
                            {
                                "message": {
                                    "content": json.dumps(
                                        {
                                            "ideas": [
                                                {
                                                    "raw": "tiny shovel",
                                                    "canonical": "tiny gardening shovel",
                                                    "category": "gardening",
                                                    "valid": True,
                                                    "plausibility": 1.2,
                                                    "elaboration": 0.7,
                                                }
                                            ]
                                        }
                                    )
                                }
                            }
                        ]
                    }
                ).encode("utf-8"),
                headers={"Content-Type": "application/json"},
            )

        provider = OpenAIIdeaAnalysisProvider(api_key="test-key", transport=transport)

        with self.assertRaisesRegex(ProviderResponseError, "Invalid analysis response"):
            provider.analyze(
                ObjectContext(slug="spoon", name="Spoon"),
                Transcript(text="tiny shovel", language="en"),
            )

    def test_analysis_adapter_rejects_wrong_field_types_and_warning_shape(self) -> None:
        from unrot_api.providers.contracts import ObjectContext, Transcript
        from unrot_api.providers.openai_analysis import (
            HTTPResponse,
            OpenAIIdeaAnalysisProvider,
            ProviderResponseError,
        )

        def transport(_: object) -> HTTPResponse:
            return HTTPResponse(
                status_code=200,
                body=json.dumps(
                    {
                        "choices": [
                            {
                                "message": {
                                    "content": json.dumps(
                                        {
                                            "ideas": [
                                                {
                                                    "raw": 7,
                                                    "canonical": "tiny gardening shovel",
                                                    "category": "gardening",
                                                    "valid": "true",
                                                    "plausibility": 0.8,
                                                    "elaboration": 0.7,
                                                }
                                            ],
                                            "warnings": "deduplicated alias",
                                        }
                                    )
                                }
                            }
                        ]
                    }
                ).encode("utf-8"),
                headers={"Content-Type": "application/json"},
            )

        provider = OpenAIIdeaAnalysisProvider(api_key="test-key", transport=transport)

        with self.assertRaisesRegex(ProviderResponseError, "Invalid analysis response"):
            provider.analyze(
                ObjectContext(slug="spoon", name="Spoon"),
                Transcript(text="tiny shovel", language="en"),
            )

    def test_default_http_transport_has_a_30_second_timeout(self) -> None:
        from unrot_api.providers.contracts import HTTPRequest
        from unrot_api.providers.openai_analysis import _default_transport

        class Response:
            status = 200
            headers = {}

            def __enter__(self):
                return self

            def __exit__(self, *_: object) -> None:
                return None

            def read(self) -> bytes:
                return b'{}'

        with patch("unrot_api.providers.openai_analysis.request.urlopen", return_value=Response()) as urlopen:
            _default_transport(HTTPRequest("POST", "https://example.test", {}, b"{}"))

        self.assertEqual(urlopen.call_args.kwargs["timeout"], 30)
