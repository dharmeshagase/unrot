from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING, Callable, Mapping, Protocol

if TYPE_CHECKING:
    from unrot_api.analysis.models import IdeaAnalysis


@dataclass(frozen=True)
class Transcript:
    text: str
    language: str | None

    def to_dict(self) -> dict[str, str | None]:
        return {"text": self.text, "language": self.language}


@dataclass(frozen=True)
class ObjectContext:
    slug: str
    name: str
    description: str = ""


class TranscriptionProvider(Protocol):
    def transcribe(self, audio: bytes, mime_type: str) -> Transcript:
        ...


class IdeaAnalysisProvider(Protocol):
    def analyze(self, object_context: ObjectContext, transcript: Transcript) -> IdeaAnalysis:
        ...


class ProviderConfigurationError(RuntimeError):
    pass


class ProviderUnavailableError(RuntimeError):
    pass


class ProviderInvocationError(RuntimeError):
    pass


class ProviderResponseError(RuntimeError):
    pass


@dataclass(frozen=True)
class HTTPRequest:
    method: str
    url: str
    headers: dict[str, str]
    body: bytes


@dataclass(frozen=True)
class HTTPResponse:
    status_code: int
    body: bytes
    headers: Mapping[str, str]


HTTPTransport = Callable[[HTTPRequest], HTTPResponse]
