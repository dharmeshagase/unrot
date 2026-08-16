from __future__ import annotations

import unittest


class LocalIdeaAnalysisProviderTest(unittest.TestCase):
    def test_local_analysis_splits_deduplicates_and_categorizes_spoon_ideas(self) -> None:
        from unrot_api.providers.contracts import ObjectContext, Transcript
        from unrot_api.providers.local import LocalIdeaAnalysisProvider

        provider = LocalIdeaAnalysisProvider()

        analysis = provider.analyze(
            ObjectContext(slug="spoon", name="Spoon", description="A familiar utensil."),
            Transcript(
                text=" tiny shovel ; little shovel for plants.\nSunlight signal! Tiny shovel ",
                language="en",
            ),
        )

        self.assertEqual(
            [idea.canonical for idea in analysis.ideas],
            ["tiny gardening shovel", "sunlight signal"],
        )
        self.assertEqual([idea.raw for idea in analysis.ideas], [" tiny shovel ", "Sunlight signal"])
        self.assertEqual([idea.category for idea in analysis.ideas], ["gardening", "communication"])
        self.assertTrue(all(idea.valid for idea in analysis.ideas))

    def test_local_analysis_normalizes_whitespace_and_scores_within_bounds(self) -> None:
        from unrot_api.providers.contracts import ObjectContext, Transcript
        from unrot_api.providers.local import LocalIdeaAnalysisProvider

        provider = LocalIdeaAnalysisProvider()

        analysis = provider.analyze(
            ObjectContext(slug="sock", name="Sock"),
            Transcript(text=" emergency   puppet  \n\n  wrist warmer ", language=None),
        )

        self.assertEqual(
            [(idea.raw, idea.canonical, idea.category) for idea in analysis.ideas],
            [
                (" emergency   puppet  ", "emergency puppet", "play"),
                ("  wrist warmer ", "wrist warmer", "clothing"),
            ],
        )
        self.assertTrue(all(0.0 <= idea.plausibility <= 1.0 for idea in analysis.ideas))
        self.assertTrue(all(0.0 <= idea.elaboration <= 1.0 for idea in analysis.ideas))
        self.assertEqual(analysis.warnings, ())

    def test_local_analysis_preserves_raw_segment_text_while_deduplicating_normalized_aliases(self) -> None:
        from unrot_api.providers.contracts import ObjectContext, Transcript
        from unrot_api.providers.local import LocalIdeaAnalysisProvider

        provider = LocalIdeaAnalysisProvider()

        analysis = provider.analyze(
            ObjectContext(slug="spoon", name="Spoon"),
            Transcript(
                text="  Tiny   shovel ; little shovel for plants ; Sunlight   signal ",
                language="en",
            ),
        )

        self.assertEqual(
            [idea.raw for idea in analysis.ideas],
            ["  Tiny   shovel ", " Sunlight   signal "],
        )
        self.assertEqual(
            [idea.canonical for idea in analysis.ideas],
            ["tiny gardening shovel", "sunlight signal"],
        )

    def test_local_analysis_uses_cross_object_aliases_and_broad_categories(self) -> None:
        from unrot_api.providers.contracts import ObjectContext, Transcript
        from unrot_api.providers.local import LocalIdeaAnalysisProvider

        analysis = LocalIdeaAnalysisProvider().analyze(
            ObjectContext(slug="empty-bottle", name="Empty bottle"),
            Transcript(text="watering spike; desk organizer; emergency whistle; paint roller", language=None),
        )

        self.assertEqual(analysis.ideas[0].canonical, "drip irrigator")
        self.assertEqual(
            [idea.category for idea in analysis.ideas],
            ["gardening", "organization", "communication", "art"],
        )


class LocalTranscriptionProviderTest(unittest.TestCase):
    def test_local_transcription_provider_never_fabricates_recorded_speech(self) -> None:
        from unrot_api.providers.contracts import ProviderUnavailableError
        from unrot_api.providers.local import LocalTranscriptionProvider

        provider = LocalTranscriptionProvider()

        with self.assertRaisesRegex(ProviderUnavailableError, "Voice transcription is unavailable"):
            provider.transcribe(b"pretend-audio", "audio/webm")
