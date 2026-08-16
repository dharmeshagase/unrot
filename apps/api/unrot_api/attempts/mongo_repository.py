from __future__ import annotations

from dataclasses import asdict
from datetime import datetime

from unrot_api.analysis.models import Idea
from unrot_api.attempts.models import AttemptRecord, CategoryCount
from unrot_api.attempts.repository import AttemptPersistenceConflictError, AttemptRepository
from unrot_api.scoring.models import ScoreBreakdown


class MongoAttemptRepository(AttemptRepository):
    def __init__(self, uri: str, database_name: str, collection_name: str = "attempts") -> None:
        try:
            from pymongo import ASCENDING, MongoClient
        except ModuleNotFoundError as error:
            raise RuntimeError(
                "PyMongo is required to use MongoAttemptRepository. Install pymongo or switch to the memory repository."
            ) from error

        self._asc = ASCENDING
        self._client = MongoClient(uri)
        self._collection = self._client[database_name][collection_name]
        self._collection.create_index([("challengeId", self._asc), ("createdAt", self._asc)])
        self._collection.create_index([("anonymousSessionHash", self._asc), ("createdAt", self._asc)])
        self._collection.create_index("receiptHash", unique=True)
        self._collection.create_index("idempotencyKey", unique=True)
        self._collection.create_index("attemptId", unique=True)

    def get_by_attempt_id(self, attempt_id: str) -> AttemptRecord | None:
        document = self._collection.find_one({"attemptId": attempt_id})
        return _record_from_document(document)

    def get_by_receipt_hash(self, receipt_hash: str) -> AttemptRecord | None:
        document = self._collection.find_one({"receiptHash": receipt_hash})
        return _record_from_document(document)

    def get_by_idempotency_key(self, idempotency_key: str) -> AttemptRecord | None:
        document = self._collection.find_one({"idempotencyKey": idempotency_key})
        return _record_from_document(document)

    def save_if_absent(self, attempt: AttemptRecord) -> AttemptRecord:
        document = _record_to_document(attempt)
        try:
            result = self._collection.update_one(
                {"idempotencyKey": attempt.idempotency_key},
                {"$setOnInsert": document},
                upsert=True,
            )
        except Exception as error:
            duplicate_key_error = getattr(__import__("pymongo.errors", fromlist=["DuplicateKeyError"]), "DuplicateKeyError")
            if isinstance(error, duplicate_key_error):
                existing = self.get_by_idempotency_key(attempt.idempotency_key)
                if existing is not None:
                    return existing
                raise AttemptPersistenceConflictError("Attempt insert raced and winner could not be reloaded") from error
            raise
        if getattr(result, "upserted_id", None) is not None:
            return attempt
        existing = self.get_by_idempotency_key(attempt.idempotency_key)
        if existing is None:
            raise AttemptPersistenceConflictError("Attempt insert completed without a retrievable winner")
        return existing

    def delete(self, attempt_id: str) -> bool:
        return self._collection.delete_one({"attemptId": attempt_id}).deleted_count > 0

    def count_completed_for_challenge(self, challenge_id: str) -> int:
        return int(self._collection.count_documents({"challengeId": challenge_id}))

    def list_attempts_for_challenge(self, challenge_id: str) -> list[AttemptRecord]:
        return [_record_from_document(document) for document in self._collection.find({"challengeId": challenge_id})]


def _record_to_document(attempt: AttemptRecord) -> dict[str, object]:
    return {
        "attemptId": attempt.attempt_id,
        "challengeId": attempt.challenge_id,
        "inputMode": attempt.input_mode,
        "durationSeconds": attempt.duration_seconds,
        "anonymousSessionHash": attempt.anonymous_session_hash,
        "ideas": [idea.to_dict() for idea in attempt.ideas],
        "score": {
            "total": attempt.score.total,
            "fluency": attempt.score.fluency,
            "flexibility": attempt.score.flexibility,
            "originality": attempt.score.originality,
            "plausibilityElaboration": attempt.score.plausibility_elaboration,
            "algorithmVersion": attempt.score.algorithm_version,
            "comparisonBasis": attempt.score.comparison_basis,
        },
        "receiptHash": attempt.receipt_hash,
        "idempotencyKey": attempt.idempotency_key,
        "payloadHash": attempt.payload_hash,
        "comparisonCopy": attempt.comparison_copy,
        "rarestIdea": attempt.rarest_idea,
        "categories": [asdict(category) for category in attempt.categories],
        "analysisWarnings": list(attempt.analysis_warnings),
        "createdAt": attempt.created_at,
    }


def _record_from_document(document: dict[str, object] | None) -> AttemptRecord | None:
    if document is None:
        return None
    score_payload = dict(document["score"])
    return AttemptRecord(
        attempt_id=str(document["attemptId"]),
        challenge_id=str(document["challengeId"]),
        input_mode=str(document["inputMode"]),
        duration_seconds=int(document["durationSeconds"]),
        anonymous_session_hash=str(document["anonymousSessionHash"]),
        ideas=tuple(
            Idea(
                raw=str(idea["raw"]),
                canonical=str(idea["canonical"]),
                category=str(idea["category"]),
                valid=bool(idea["valid"]),
                plausibility=float(idea["plausibility"]),
                elaboration=float(idea["elaboration"]),
            )
            for idea in document["ideas"]
        ),
        score=ScoreBreakdown(
            total=int(score_payload["total"]),
            fluency=float(score_payload["fluency"]),
            flexibility=float(score_payload["flexibility"]),
            originality=float(score_payload["originality"]),
            plausibility_elaboration=float(score_payload["plausibilityElaboration"]),
            algorithm_version=str(score_payload["algorithmVersion"]),
            comparison_basis=str(score_payload["comparisonBasis"]),
        ),
        receipt_hash=str(document["receiptHash"]),
        idempotency_key=str(document["idempotencyKey"]),
        payload_hash=str(document["payloadHash"]),
        comparison_copy=str(document["comparisonCopy"]),
        rarest_idea=str(document["rarestIdea"]) if document.get("rarestIdea") is not None else None,
        categories=tuple(
            CategoryCount(category=str(category["category"]), count=int(category["count"]))
            for category in document["categories"]
        ),
        analysis_warnings=tuple(str(warning) for warning in document.get("analysisWarnings", [])),
        created_at=document["createdAt"] if isinstance(document["createdAt"], datetime) else datetime.fromisoformat(str(document["createdAt"])),
    )
