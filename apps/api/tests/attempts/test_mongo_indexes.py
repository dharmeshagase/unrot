from __future__ import annotations

import sys
import types
import unittest
from unittest.mock import patch


class MongoIndexTest(unittest.TestCase):
    def test_attempt_id_has_a_unique_index(self) -> None:
        calls: list[tuple[object, dict[str, object]]] = []

        class Collection:
            def create_index(self, key: object, **kwargs: object) -> None:
                calls.append((key, kwargs))

        class Database:
            def __getitem__(self, _: str) -> Collection:
                return Collection()

        class Client:
            def __init__(self, _: str) -> None:
                pass

            def __getitem__(self, _: str) -> Database:
                return Database()

        pymongo = types.ModuleType("pymongo")
        pymongo.ASCENDING = 1
        pymongo.MongoClient = Client
        with patch.dict(sys.modules, {"pymongo": pymongo}):
            from unrot_api.attempts.mongo_repository import MongoAttemptRepository

            MongoAttemptRepository("mongodb://example", "unrot")

        self.assertIn(("attemptId", {"unique": True}), calls)
