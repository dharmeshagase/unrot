from __future__ import annotations

import unittest
from os import environ
from unittest.mock import patch


class ProviderFactoryTest(unittest.TestCase):
    def test_factory_builds_local_providers(self) -> None:
        from unrot_api.providers.factory import (
            build_idea_analysis_provider,
            build_transcription_provider,
        )
        from unrot_api.providers.local import LocalIdeaAnalysisProvider, LocalTranscriptionProvider

        with patch.dict(
            environ,
            {
                "TRANSCRIPTION_PROVIDER": "local",
                "IDEA_ANALYSIS_PROVIDER": "local",
            },
            clear=False,
        ):
            self.assertIsInstance(build_transcription_provider(), LocalTranscriptionProvider)
            self.assertIsInstance(build_idea_analysis_provider(), LocalIdeaAnalysisProvider)

    def test_factory_builds_openai_providers(self) -> None:
        from unrot_api.providers.factory import (
            build_idea_analysis_provider,
            build_transcription_provider,
        )
        from unrot_api.providers.openai_analysis import OpenAIIdeaAnalysisProvider
        from unrot_api.providers.openai_transcription import OpenAITranscriptionProvider

        with patch.dict(
            environ,
            {
                "OPENAI_API_KEY": "test-key",
                "TRANSCRIPTION_PROVIDER": "openai",
                "IDEA_ANALYSIS_PROVIDER": "openai",
            },
            clear=False,
        ):
            self.assertIsInstance(build_transcription_provider(), OpenAITranscriptionProvider)
            self.assertIsInstance(build_idea_analysis_provider(), OpenAIIdeaAnalysisProvider)

    def test_factory_rejects_unknown_provider_names(self) -> None:
        from unrot_api.providers.factory import ProviderConfigurationError, build_transcription_provider

        with patch.dict(
            environ,
            {
                "TRANSCRIPTION_PROVIDER": "not-real",
            },
            clear=False,
        ):
            with self.assertRaisesRegex(
                ProviderConfigurationError,
                "Unknown transcription provider 'not-real'",
            ):
                build_transcription_provider()

