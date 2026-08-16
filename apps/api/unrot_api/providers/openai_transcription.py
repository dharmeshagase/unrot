from __future__ import annotations

import json
import mimetypes
import uuid
from urllib import error, request

from unrot_api.providers.contracts import (
    HTTPRequest,
    HTTPResponse,
    HTTPTransport,
    ProviderConfigurationError,
    ProviderInvocationError,
    ProviderResponseError,
    Transcript,
)

TRANSCRIPTION_URL = "https://api.openai.com/v1/audio/transcriptions"


class OpenAITranscriptionProvider:
    def __init__(
        self,
        *,
        api_key: str,
        transport: HTTPTransport | None = None,
        model: str = "gpt-4o-mini-transcribe",
    ) -> None:
        if not api_key:
            raise ProviderConfigurationError("OPENAI_API_KEY is required for OpenAI transcription")
        self._api_key = api_key
        self._transport = transport or _default_transport
        self._model = model

    def transcribe(self, audio: bytes, mime_type: str) -> Transcript:
        boundary = f"codex-{uuid.uuid4().hex}"
        body = _encode_multipart(
            boundary,
            fields={"model": self._model},
            file_field_name="file",
            filename=_filename_for_mime_type(mime_type),
            content_type=mime_type,
            file_bytes=audio,
        )
        response = self._transport(
            HTTPRequest(
                method="POST",
                url=TRANSCRIPTION_URL,
                headers={
                    "Authorization": f"Bearer {self._api_key}",
                    "Content-Type": f"multipart/form-data; boundary={boundary}",
                },
                body=body,
            )
        )
        if response.status_code >= 400:
            raise ProviderInvocationError("OpenAI transcription request failed")

        try:
            payload = json.loads(response.body.decode("utf-8"))
            text = payload["text"]
            language = payload.get("language")
        except (KeyError, TypeError, ValueError) as error:
            raise ProviderResponseError("Invalid transcription response") from error

        if not isinstance(text, str) or not text.strip():
            raise ProviderResponseError("Invalid transcription response")
        if language is not None and not isinstance(language, str):
            raise ProviderResponseError("Invalid transcription response")
        return Transcript(text=text, language=language)


def _filename_for_mime_type(mime_type: str) -> str:
    extension = mimetypes.guess_extension(mime_type) or ".bin"
    return f"audio{extension}"


def _encode_multipart(
    boundary: str,
    *,
    fields: dict[str, str],
    file_field_name: str,
    filename: str,
    content_type: str,
    file_bytes: bytes,
) -> bytes:
    lines: list[bytes] = []
    for name, value in fields.items():
        lines.extend(
            [
                f"--{boundary}".encode("utf-8"),
                f'Content-Disposition: form-data; name="{name}"'.encode("utf-8"),
                b"",
                value.encode("utf-8"),
            ]
        )
    lines.extend(
        [
            f"--{boundary}".encode("utf-8"),
            (
                f'Content-Disposition: form-data; name="{file_field_name}"; filename="{filename}"'
            ).encode("utf-8"),
            f"Content-Type: {content_type}".encode("utf-8"),
            b"",
            file_bytes,
            f"--{boundary}--".encode("utf-8"),
            b"",
        ]
    )
    return b"\r\n".join(lines)


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
        raise ProviderInvocationError("OpenAI transcription request failed") from exc


__all__ = [
    "HTTPResponse",
    "OpenAITranscriptionProvider",
    "ProviderConfigurationError",
    "ProviderInvocationError",
    "ProviderResponseError",
]
