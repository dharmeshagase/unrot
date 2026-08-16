from __future__ import annotations

import unittest


class ReferenceSetBreadthTest(unittest.TestCase):
    def test_every_challenge_has_human_alias_clusters_and_category_breadth(self) -> None:
        from unrot_api.challenges.catalog import list_challenges
        from unrot_api.seeds.reference_sets import list_reference_ideas

        for challenge in list_challenges():
            with self.subTest(challenge=challenge.slug):
                references = list_reference_ideas(challenge.slug)
                self.assertGreaterEqual(len(references), 5)
                self.assertGreaterEqual(len({item.category for item in references}), 4)
                self.assertTrue(all(len(item.aliases) >= 2 for item in references))

