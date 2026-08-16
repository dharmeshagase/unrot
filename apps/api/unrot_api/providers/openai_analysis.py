from __future__ import annotations

import json
from urllib import error, request

from unrot_api.analysis.models import Idea, IdeaAnalysis
from unrot_api.providers.contracts import (
    HTTPRequest,
    HTTPResponse,
    HTTPTransport,
    ObjectContext,
    ProviderConfigurationError,
    ProviderInvocationError,
    ProviderResponseError,
    Transcript,
)

ANALYSIS_URL = "https://api.openai.com/v1/chat/completions"


class OpenAIIdeaAnalysisProvider:
    def __init__(
        self,
        *,
        api_key: str,
        transport: HTTPTransport | None = None,
        model: str = "gpt-4.1-mini",
    ) -> None:
        if not api_key:
            raise ProviderConfigurationError("OPENAI_API_KEY is required for OpenAI idea analysis")
        self._api_key = api_key
        self._transport = transport or _default_transport
        self._model = model

    def analyze(self, object_context: ObjectContext, transcript: Transcript) -> IdeaAnalysis:
        payload = {
            "model": self._model,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "Return strict JSON matching the provided schema. "
                        "Keep categories understandable and preserve each idea's raw text."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Object: {object_context.name} ({object_context.slug})\n"
                        f"Description: {object_context.description}\n"
                        f"Transcript: {transcript.text}"
                    ),
                },
            ],
            "response_format": {
                "type": "json_schema",
                "json_schema": {
                    "name": "idea_analysis",
                    "strict": True,
                    "schema": {
                        "type": "object",
                        "additionalProperties": False,
                        "properties": {
                            "ideas": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "additionalProperties": False,
                                    "properties": {
                                        "raw": {"type": "string"},
                                        "canonical": {"type": "string"},
                                        "category": {"type": "string"},
                                        "valid": {"type": "boolean"},
                                        "plausibility": {"type": "number", "minimum": 0, "maximum": 1},
                                        "elaboration": {"type": "number", "minimum": 0, "maximum": 1},
                                    },
                                    "required": [
                                        "raw",
                                        "canonical",
                                        "category",
                                        "valid",
                                        "plausibility",
                                        "elaboration",
                                    ],
                                },
                            },
                            "warnings": {
                                "type": "array",
                                "items": {"type": "string"},
                            },
                        },
                        "required": ["ideas", "warnings"],
                    },
                },
            },
        }
        response = self._transport(
            HTTPRequest(
                method="POST",
                url=ANALYSIS_URL,
                headers={
                    "Authorization": f"Bearer {self._api_key}",
                    "Content-Type": "application/json",
                },
                body=json.dumps(payload).encode("utf-8"),
            )
        )
        if response.status_code >= 400:
            raise ProviderInvocationError("OpenAI analysis request failed")

        try:
            outer_payload = json.loads(response.body.decode("utf-8"))
            content = outer_payload["choices"][0]["message"]["content"]
            inner_payload = json.loads(content)
            ideas = _parse_ideas(inner_payload["ideas"])
            warnings = _parse_warnings(inner_payload["warnings"])
        except (KeyError, IndexError, TypeError, ValueError) as error:
            raise ProviderResponseError("Invalid analysis response") from error
        except Exception as error:
            raise ProviderResponseError("Invalid analysis response") from error

        return IdeaAnalysis(ideas=ideas, warnings=warnings)


def _parse_ideas(raw_ideas: object) -> list[Idea]:
    if not isinstance(raw_ideas, list):
        raise ProviderResponseError("Invalid analysis response")

    ideas: list[Idea] = []
    for item in raw_ideas:
        if not isinstance(item, dict):
            raise ProviderResponseError("Invalid analysis response")

        raw = item.get("raw")
        canonical = item.get("canonical")
        category = item.get("category")
        valid = item.get("valid")
        plausibility = item.get("plausibility")
        elaboration = item.get("elaboration")

        if not isinstance(raw, str):
            raise ProviderResponseError("Invalid analysis response")
        if not isinstance(canonical, str):
            raise ProviderResponseError("Invalid analysis response")
        if not isinstance(category, str):
            raise ProviderResponseError("Invalid analysis response")
        if type(valid) is not bool:
            raise ProviderResponseError("Invalid analysis response")
        if not isinstance(plausibility, (int, float)) or isinstance(plausibility, bool):
            raise ProviderResponseError("Invalid analysis response")
        if not isinstance(elaboration, (int, float)) or isinstance(elaboration, bool):
            raise ProviderResponseError("Invalid analysis response")

        ideas.append(
            Idea(
                raw=raw,
                canonical=canonical,
                category=category,
                valid=valid,
                plausibility=float(plausibility),
                elaboration=float(elaboration),
            )
        )

    return ideas


def _parse_warnings(raw_warnings: object) -> tuple[str, ...]:
    if not isinstance(raw_warnings, list):
        raise ProviderResponseError("Invalid analysis response")
    warnings: list[str] = []
    for warning in raw_warnings:
        if not isinstance(warning, str):
            raise ProviderResponseError("Invalid analysis response")
        warnings.append(warning)
    return tuple(warnings)


def _default_transport(http_request: HTTPRequest) -> HTTPResponse:
    raw_request = request.Request(
        http_request.url,
        data=http_request.body,
        method=http_request.method,
        headers=http_request.headers,
    )
    try:
        with request.urlopen(raw_request, timeout=30) as response:
            return HTTPResponse(
                status_code=response.status,
                body=response.read(),
                headers=dict(response.headers.items()),
            )
    except error.HTTPError as exc:
        return HTTPResponse(status_code=exc.code, body=exc.read(), headers=dict(exc.headers.items()))
    except error.URLError as exc:
        raise ProviderInvocationError("OpenAI analysis request failed") from exc


__all__ = [
    "HTTPResponse",
    "OpenAIIdeaAnalysisProvider",
    "ProviderConfigurationError",
    "ProviderInvocationError",
    "ProviderResponseError",
]
