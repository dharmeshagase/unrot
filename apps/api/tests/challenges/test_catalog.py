import importlib
import io
import json
import unittest
from urllib.parse import urlsplit
from wsgiref.util import setup_testing_defaults


class ChallengeCatalogTest(unittest.TestCase):
    def test_catalog_has_expected_public_summaries(self) -> None:
        try:
            catalog = importlib.import_module("unrot_api.challenges.catalog")
        except ModuleNotFoundError as error:
            self.fail(f"Expected unrot_api.challenges.catalog to exist, but import failed: {error}")

        items = catalog.list_challenges()

        self.assertEqual(len(items), 18)
        self.assertEqual(
            [item.slug for item in items if item.difficulty == "easy"],
            [
                "spoon",
                "empty-bottle",
                "cardboard-box",
                "sock",
                "paper-cup",
                "towel",
            ],
        )
        self.assertEqual(
            [item.slug for item in items if item.difficulty == "uncommon"],
            [
                "clothespin",
                "bottle-cap",
                "chalk-stub",
                "lost-button",
                "marble",
                "popsicle-stick",
                "pencil-shaving",
                "empty-cassette-case",
                "bread-bag-clip",
                "toy-block",
                "crayon-wrapper",
                "shoelace-tip",
            ],
        )
        self.assertTrue(all(item.art_key for item in items))
        self.assertTrue(all(item.theme for item in items))
        for item in items:
            self.assertTrue(
                catalog.get_art_svg(item.art_key).lstrip().startswith("<svg"),
                f"Expected inline SVG art for {item.art_key}",
            )

    def test_challenge_detail_omits_seed_answers_and_cluster_frequencies(self) -> None:
        try:
            service = importlib.import_module("unrot_api.challenges.service")
        except ModuleNotFoundError as error:
            self.fail(f"Expected unrot_api.challenges.service to exist, but import failed: {error}")

        detail = service.get_challenge("spoon")

        payload = detail.to_dict()
        self.assertEqual(payload["slug"], "spoon")
        self.assertIn("prompt", payload)
        self.assertIn("target_category_breadth", payload)
        self.assertNotIn("seed_answers", payload)
        self.assertNotIn("cluster_frequencies", payload)
        self.assertNotIn("reference_answers", payload)


class ChallengeRouteTest(unittest.TestCase):
    def _request(self, path: str) -> tuple[str, dict[str, str]]:
        main = importlib.import_module("unrot_api.main")
        app = getattr(main, "app", None)
        self.assertIsNotNone(app, "unrot_api.main must expose an app callable")
        parts = urlsplit(path)

        captured: dict[str, object] = {}

        def start_response(status: str, headers: list[tuple[str, str]]) -> None:
            captured["status"] = status
            captured["headers"] = headers

        environ = {
            "PATH_INFO": parts.path,
            "QUERY_STRING": parts.query,
            "REQUEST_METHOD": "GET",
            "wsgi.input": io.BytesIO(b""),
        }
        setup_testing_defaults(environ)

        body = b"".join(app(environ, start_response))
        self.assertIn("status", captured)

        return captured["status"], json.loads(body.decode("utf-8"))

    def test_list_route_returns_public_summaries(self) -> None:
        status, payload = self._request("/v1/challenges")

        self.assertEqual(status, "200 OK")
        self.assertEqual(len(payload["items"]), 18)
        self.assertEqual(payload["items"][0]["slug"], "spoon")
        self.assertNotIn("prompt", payload["items"][0])
        self.assertIsNone(payload["recommended"])

    def test_list_route_can_include_recommendation_metadata(self) -> None:
        status, payload = self._request(
            "/v1/challenges?recent=spoon,sock&first_full_challenge=true&seed=4"
        )

        self.assertEqual(status, "200 OK")
        self.assertIsNotNone(payload["recommended"])
        self.assertNotIn(payload["recommended"]["slug"], {"spoon", "sock"})
        self.assertIn(payload["recommended"]["difficulty"], {"easy", "medium"})

    def test_detail_route_returns_clear_404_for_unknown_slug(self) -> None:
        status, payload = self._request("/v1/challenges/not-a-real-object")

        self.assertEqual(status, "404 Not Found")
        self.assertEqual(payload, {"detail": "Challenge 'not-a-real-object' not found"})

    def test_list_route_rejects_invalid_seed_with_clear_400(self) -> None:
        status, payload = self._request("/v1/challenges?seed=not-a-number")

        self.assertEqual(status, "400 Bad Request")
        self.assertEqual(payload, {"detail": "Invalid seed 'not-a-number'"})
