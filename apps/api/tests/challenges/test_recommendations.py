import importlib
import unittest


class ChallengeRecommendationTest(unittest.TestCase):
    def test_first_recommendation_is_not_uncommon_and_excludes_recent(self) -> None:
        try:
            service = importlib.import_module("unrot_api.challenges.service")
        except ModuleNotFoundError as error:
            self.fail(f"Expected unrot_api.challenges.service to exist, but import failed: {error}")

        result = service.recommend_challenge({"spoon", "sock"}, first_full_challenge=True, seed=4)

        self.assertNotIn(result.slug, {"spoon", "sock"})
        self.assertIn(result.difficulty, {"easy", "medium"})

    def test_recommendation_falls_back_when_everything_is_recent(self) -> None:
        service = importlib.import_module("unrot_api.challenges.service")
        catalog = importlib.import_module("unrot_api.challenges.catalog")

        recent_ids = {item.slug for item in catalog.list_challenges()}
        result = service.recommend_challenge(recent_ids, first_full_challenge=False, seed=9)

        self.assertIn(result.slug, recent_ids)

    def test_first_full_recommendation_repeats_easy_before_using_uncommon(self) -> None:
        service = importlib.import_module("unrot_api.challenges.service")

        result = service.recommend_challenge(
            {
                "spoon",
                "empty-bottle",
                "cardboard-box",
                "sock",
                "paper-cup",
                "towel",
            },
            first_full_challenge=True,
            seed=2,
        )

        self.assertEqual(result.difficulty, "easy")

    def test_recommendation_is_deterministic_for_same_seed(self) -> None:
        service = importlib.import_module("unrot_api.challenges.service")

        first = service.recommend_challenge({"spoon"}, first_full_challenge=False, seed=7)
        second = service.recommend_challenge({"spoon"}, first_full_challenge=False, seed=7)

        self.assertEqual(first.slug, second.slug)

    def test_recommendation_is_deterministic_without_seed(self) -> None:
        service = importlib.import_module("unrot_api.challenges.service")

        first = service.recommend_challenge({"spoon", "sock"}, first_full_challenge=False)
        second = service.recommend_challenge({"sock", "spoon"}, first_full_challenge=False)

        self.assertEqual(first.slug, second.slug)
