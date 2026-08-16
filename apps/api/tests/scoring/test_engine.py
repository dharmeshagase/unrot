import importlib
import unittest

from unrot_api.analysis.models import Idea


class StaticRarityLookup:
    def __init__(self, values: dict[str, float], comparison_basis: str = "reference-set") -> None:
        self._values = values
        self.comparison_basis = comparison_basis

    def percentile(self, canonical: str) -> float:
        return self._values.get(canonical, 0.5)


def _idea(
    canonical: str,
    category: str,
    *,
    raw: str | None = None,
    valid: bool = True,
    plausibility: float = 0.8,
    elaboration: float = 0.6,
) -> Idea:
    return Idea(
        raw=raw or canonical,
        canonical=canonical,
        category=category,
        valid=valid,
        plausibility=plausibility,
        elaboration=elaboration,
    )


class ScoringEngineTest(unittest.TestCase):
    def test_empty_input_scores_zero(self) -> None:
        engine = importlib.import_module("unrot_api.scoring.engine")

        score = engine.score_attempt(
            ideas=[],
            target_breadth=5,
            rarity_lookup=StaticRarityLookup({}, comparison_basis="reference-set"),
        )

        self.assertEqual(score.total, 0)
        self.assertEqual(score.fluency, 0.0)
        self.assertEqual(score.flexibility, 0.0)
        self.assertEqual(score.originality, 0.0)
        self.assertEqual(score.plausibility_elaboration, 0.0)
        self.assertEqual(score.algorithm_version, "1.0")
        self.assertEqual(score.comparison_basis, "reference-set")

    def test_duplicates_only_count_once_across_components(self) -> None:
        engine = importlib.import_module("unrot_api.scoring.engine")

        score = engine.score_attempt(
            ideas=[
                _idea("seed marker", "gardening", plausibility=0.9, elaboration=0.5),
                _idea("seed marker", "gardening", raw="marker for seeds", plausibility=0.2, elaboration=0.1),
                _idea("sun signal", "communication", plausibility=0.7, elaboration=0.9),
            ],
            target_breadth=4,
            rarity_lookup=StaticRarityLookup({"seed marker": 0.2, "sun signal": 0.8}),
        )

        self.assertAlmostEqual(score.fluency, 5.0)
        self.assertAlmostEqual(score.originality, 17.5)
        self.assertAlmostEqual(score.plausibility_elaboration, 11.25)

    def test_balanced_categories_score_higher_than_token_categories(self) -> None:
        engine = importlib.import_module("unrot_api.scoring.engine")
        lookup = StaticRarityLookup({}, comparison_basis="reference-set")

        balanced = engine.score_attempt(
            ideas=[
                _idea("seed marker", "gardening"),
                _idea("drum stick", "music"),
                _idea("sun signal", "communication"),
                _idea("puppet arm", "play"),
                _idea("bookmark", "utility"),
                _idea("cape clasp", "clothing"),
            ],
            target_breadth=6,
            rarity_lookup=lookup,
        )
        token = engine.score_attempt(
            ideas=[
                _idea("garden row", "gardening"),
                _idea("plant scoop", "gardening"),
                _idea("soil tamper", "gardening"),
                _idea("sun signal", "communication"),
                _idea("puppet arm", "play"),
                _idea("cape clasp", "clothing"),
            ],
            target_breadth=6,
            rarity_lookup=lookup,
        )

        self.assertGreater(balanced.flexibility, token.flexibility)

    def test_score_is_capped_and_total_matches_rounded_component_sum(self) -> None:
        engine = importlib.import_module("unrot_api.scoring.engine")

        score = engine.score_attempt(
            ideas=[_idea(f"idea-{index}", f"cat-{index}", plausibility=1.0, elaboration=1.0) for index in range(20)],
            target_breadth=5,
            rarity_lookup=StaticRarityLookup({f"idea-{index}": 1.0 for index in range(20)}, comparison_basis="community"),
        )

        self.assertLessEqual(score.fluency, 25.0)
        self.assertLessEqual(score.flexibility, 25.0)
        self.assertLessEqual(score.originality, 35.0)
        self.assertLessEqual(score.plausibility_elaboration, 15.0)
        self.assertLessEqual(score.total, 100)
        self.assertEqual(
            score.total,
            round(score.fluency + score.flexibility + score.originality + score.plausibility_elaboration),
        )
        self.assertEqual(score.comparison_basis, "community")

    def test_comparison_basis_thresholds_switch_at_documented_counts(self) -> None:
        engine = importlib.import_module("unrot_api.scoring.engine")

        self.assertEqual(engine.comparison_basis_for_completion_count(0), "reference-set")
        self.assertEqual(engine.comparison_basis_for_completion_count(99), "reference-set")
        self.assertEqual(engine.comparison_basis_for_completion_count(100), "blended")
        self.assertEqual(engine.comparison_basis_for_completion_count(499), "blended")
        self.assertEqual(engine.comparison_basis_for_completion_count(500), "community")
