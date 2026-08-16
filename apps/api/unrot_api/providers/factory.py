from __future__ import annotations

import os

from unrot_api.providers.contracts import ProviderConfigurationError
from unrot_api.providers.local import LocalIdeaAnalysisProvider, LocalTranscriptionProvider
from unrot_api.providers.openai_analysis import OpenAIIdeaAnalysisProvider
from unrot_api.providers.openai_transcription import OpenAITranscriptionProvider


def build_transcription_provider() -> object:
    provider_name = os.getenv("TRANSCRIPTION_PROVIDER", "local").strip().lower()
    if provider_name == "local":
        return LocalTranscriptionProvider()
    if provider_name == "openai":
        return OpenAITranscriptionProvider(api_key=os.getenv("OPENAI_API_KEY", ""))
    raise ProviderConfigurationError(f"Unknown transcription provider '{provider_name}'")


def build_idea_analysis_provider() -> object:
    provider_name = os.getenv("IDEA_ANALYSIS_PROVIDER", "local").strip().lower()
    if provider_name == "local":
        return LocalIdeaAnalysisProvider()
    if provider_name == "openai":
        return OpenAIIdeaAnalysisProvider(api_key=os.getenv("OPENAI_API_KEY", ""))
    raise ProviderConfigurationError(f"Unknown idea analysis provider '{provider_name}'")


def provider_capabilities() -> dict[str, object]:
    transcription_name = os.getenv("TRANSCRIPTION_PROVIDER", "local").strip().lower()
    voice_available = transcription_name == "openai" and bool(os.getenv("OPENAI_API_KEY", "").strip())
    return {
        "voice": {
            "available": voice_available,
            "provider": transcription_name or "local",
        },
        "ideaAnalysis": {
            "provider": os.getenv("IDEA_ANALYSIS_PROVIDER", "local").strip().lower() or "local",
        },
    }
