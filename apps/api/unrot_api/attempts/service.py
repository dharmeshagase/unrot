from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import uuid
from collections import Counter
from dataclasses import dataclass
from datetime import datetime, timezone
from threading import RLock

from unrot_api.analysis.models import Idea
from unrot_api.providers.contracts import ProviderConfigurationError, Transcript
from unrot_api.providers.factory import build_idea_analysis_provider
from unrot_api.providers.local import LocalIdeaAnalysisProvider
from unrot_api.attempts.memory_repository import InMemoryAttemptRepository
from unrot_api.attempts.models import AttemptRecord, AttemptResult, CategoryCount, CommunityItem
from unrot_api.attempts.mongo_repository import MongoAttemptRepository
from unrot_api.attempts.repository import (
    AttemptPersistenceConflictError,
    AttemptRepository,
    AttemptRepositoryConfigurationError,
    AttemptRepositoryError,
)
from unrot_api.challenges.service import ChallengeNotFoundError, get_challenge, get_object_context
from unrot_api.scoring.engine import comparison_basis_for_completion_count, distinct_valid_ideas, score_attempt
from unrot_api.scoring.models import ComparisonBasis
from unrot_api.seeds.reference_sets import list_reference_ideas


class AttemptValidationError(ValueError):
    def __init__(self, message: str, *, is_bound_error: bool = False) -> None:
        super().__init__(message)
        self.is_bound_error = is_bound_error


class AttemptNotFoundError(LookupError):
    pass


class ReceiptMismatchError(PermissionError):
    pass


class ChallengeReceiptMismatchError(PermissionError):
    pass


class IdempotencyConflictError(ValueError):
    pass


@dataclass(frozen=True)
class AttemptCreationResult:
    attempt: AttemptResult
    created: bool


class AttemptService:
    def __init__(self, repository: AttemptRepository, *, receipt_secret: str) -> None:
        normalized_secret = receipt_secret.strip()
        if not normalized_secret:
            raise RuntimeError("ATTEMPT_RECEIPT_SECRET is required")
        self._repository = repository
        self._receipt_secret = normalized_secret
        self._lock = RLock()

    def create_attempt(self, payload: object, idempotency_key: str | None) -> AttemptCreationResult:
        normalized_key = (idempotency_key or "").strip()
        if not normalized_key:
            raise AttemptValidationError("Idempotency-Key header is required")
        if len(normalized_key) > 128:
            raise AttemptValidationError("Idempotency-Key must not exceed 128 characters", is_bound_error=True)

        request = _validate_attempt_payload(payload)
        payload_hash = _hash_json_payload(payload)

        with self._lock:
            challenge = get_challenge(request["challengeId"])
            normalized_ideas, analysis_warnings = _normalize_attempt_ideas(challenge.slug, request["rawIdeas"])
            existing = self._repository.get_by_idempotency_key(normalized_key)
            if existing is not None:
                if existing.payload_hash != payload_hash:
                    raise IdempotencyConflictError("Idempotency-Key already belongs to a different attempt")
                receipt = self._build_receipt(existing.attempt_id, existing.idempotency_key)
                return AttemptCreationResult(attempt=_result_from_record(existing, receipt=receipt), created=False)

            completion_count = self._repository.count_completed_for_challenge(challenge.slug) + 1
            lookup = _ChallengeRarityLookup(
                challenge_id=challenge.slug,
                comparison_basis=comparison_basis_for_completion_count(completion_count),
                attempts=self._repository.list_attempts_for_challenge(challenge.slug),
            )
            score = score_attempt(normalized_ideas, challenge.target_category_breadth, lookup)
            categories = _category_counts(normalized_ideas)
            rarest_idea = _rarest_idea(normalized_ideas, lookup)
            comparison_copy = _comparison_copy(score.comparison_basis)
            attempt_id = str(uuid.uuid4())
            receipt = self._build_receipt(attempt_id, normalized_key)
            record = AttemptRecord(
                attempt_id=attempt_id,
                challenge_id=challenge.slug,
                input_mode=request["inputMode"],
                duration_seconds=request["durationSeconds"],
                anonymous_session_hash=_sha256(request["anonymousSessionId"]),
                ideas=tuple(normalized_ideas),
                score=score,
                receipt_hash=_sha256(receipt),
                idempotency_key=normalized_key,
                payload_hash=payload_hash,
                comparison_copy=comparison_copy,
                rarest_idea=rarest_idea,
                categories=tuple(categories),
                analysis_warnings=analysis_warnings,
                created_at=datetime.now(timezone.utc),
            )
            saved = self._repository.save_if_absent(record)
            if saved.payload_hash != payload_hash:
                raise IdempotencyConflictError("Idempotency-Key already belongs to a different attempt")
            saved_receipt = self._build_receipt(saved.attempt_id, saved.idempotency_key)
            return AttemptCreationResult(
                attempt=_result_from_record(saved, receipt=saved_receipt),
                created=saved.attempt_id == record.attempt_id,
            )

    def get_attempt(self, attempt_id: str, receipt: str | None) -> AttemptResult:
        record = self._require_attempt_match(attempt_id, receipt)
        return _result_from_record(record)

    def delete_attempt(self, attempt_id: str, receipt: str | None) -> None:
        record = self._require_attempt_match(attempt_id, receipt)
        deleted = self._repository.delete(record.attempt_id)
        if not deleted:
            raise AttemptNotFoundError("Attempt not found")

    def get_community_results(self, challenge_id: str, receipt: str | None) -> dict[str, object]:
        normalized_receipt = (receipt or "").strip()
        if not normalized_receipt:
            raise ChallengeReceiptMismatchError("A matching completed-attempt receipt is required")
        challenge = get_challenge(challenge_id)
        record = self._repository.get_by_receipt_hash(_sha256(normalized_receipt))
        if record is None:
            raise ChallengeReceiptMismatchError("A matching completed-attempt receipt is required")
        if record.challenge_id != challenge.slug:
            raise ChallengeReceiptMismatchError("Receipt does not match this challenge")

        comparison_basis = comparison_basis_for_completion_count(self._repository.count_completed_for_challenge(challenge.slug))
        items, categories = _community_view(challenge.slug)
        return {
            "challengeId": challenge.slug,
            "comparisonBasis": comparison_basis,
            "sourceKind": "reference-examples",
            "items": [item.to_api_dict() for item in items],
            "categories": [category.to_api_dict() for category in categories],
        }

    def _require_attempt_match(self, attempt_id: str, receipt: str | None) -> AttemptRecord:
        normalized_id = attempt_id.strip()
        if not normalized_id:
            raise AttemptNotFoundError("Attempt not found")
        normalized_receipt = (receipt or "").strip()
        if not normalized_receipt:
            raise ReceiptMismatchError("Receipt does not match this attempt")
        record = self._repository.get_by_attempt_id(normalized_id)
        if record is None:
            raise AttemptNotFoundError("Attempt not found")
        if not hmac.compare_digest(record.receipt_hash, _sha256(normalized_receipt)):
            raise ReceiptMismatchError("Receipt does not match this attempt")
        return record

    def _build_receipt(self, attempt_id: str, idempotency_key: str) -> str:
        digest = hmac.new(
            self._receipt_secret.encode("utf-8"),
            f"{attempt_id}:{idempotency_key}".encode("utf-8"),
            hashlib.sha256,
        ).digest()
        return base64.urlsafe_b64encode(digest).decode("ascii").rstrip("=")


class _ChallengeRarityLookup:
    def __init__(self, challenge_id: str, comparison_basis: ComparisonBasis, attempts: list[AttemptRecord]) -> None:
        self.comparison_basis = comparison_basis
        self._counts: Counter[str] = Counter()
        for reference in list_reference_ideas(challenge_id, include_private=True):
            self._counts[reference.canonical.lower()] += reference.seed_count
        if comparison_basis in {"blended", "community"}:
            for attempt in attempts:
                for idea in distinct_valid_ideas(list(attempt.ideas)):
                    self._counts[idea.canonical.lower()] += 1
        self._total = sum(self._counts.values())

    def percentile(self, canonical: str) -> float:
        key = canonical.strip().lower()
        if self._total <= 0:
            return 0.5
        count = self._counts.get(key)
        if count is None:
            return 0.7
        return max(0.0, min(1.0, 1.0 - (count / self._total)))


def _validate_attempt_payload(payload: object) -> dict[str, object]:
    if not isinstance(payload, dict):
        raise AttemptValidationError("Request body must be a JSON object")

    challenge_id = payload.get("challengeId")
    if not isinstance(challenge_id, str) or not challenge_id.strip():
        raise AttemptValidationError("challengeId must be a non-empty string")

    input_mode = payload.get("inputMode")
    if input_mode not in {"voice", "text"}:
        raise AttemptValidationError("inputMode must be 'voice' or 'text'")

    duration_seconds = payload.get("durationSeconds")
    if not isinstance(duration_seconds, int) or isinstance(duration_seconds, bool) or duration_seconds < 0:
        raise AttemptValidationError("durationSeconds must be a non-negative integer")

    anonymous_session_id = payload.get("anonymousSessionId")
    if not isinstance(anonymous_session_id, str) or not anonymous_session_id.strip():
        raise AttemptValidationError("anonymousSessionId must be a non-empty string")
    if len(anonymous_session_id.strip()) > 128:
        raise AttemptValidationError("anonymousSessionId must not exceed 128 characters", is_bound_error=True)

    raw_ideas = payload.get("ideas")
    if not isinstance(raw_ideas, list):
        raise AttemptValidationError("ideas must be a list")
    if len(raw_ideas) > 20:
        raise AttemptValidationError("ideas must contain no more than 20 items", is_bound_error=True)

    idea_texts: list[str] = []
    for raw_idea in raw_ideas:
        if not isinstance(raw_idea, dict):
            raise AttemptValidationError("ideas must contain objects")
        try:
            idea_text = _require_non_empty_str(raw_idea.get("raw"), "ideas[].raw")
            if len(idea_text) > 500:
                raise AttemptValidationError("ideas[].raw must not exceed 500 characters", is_bound_error=True)
            idea_texts.append(idea_text)
        except AttemptValidationError:
            raise
        except ValueError as error:
            raise AttemptValidationError(str(error)) from error
    if not idea_texts:
        raise AttemptValidationError("ideas must contain at least one raw idea")

    return {
        "challengeId": challenge_id.strip(),
        "inputMode": input_mode,
        "durationSeconds": duration_seconds,
        "anonymousSessionId": anonymous_session_id.strip(),
        "rawIdeas": idea_texts,
    }


def _require_non_empty_str(value: object, field_name: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{field_name} must be a non-empty string")
    return value.strip()


def _hash_json_payload(payload: object) -> str:
    return _sha256(json.dumps(payload, sort_keys=True, separators=(",", ":")))


def _sha256(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _category_counts(ideas: list[Idea]) -> list[CategoryCount]:
    counts = Counter(idea.category for idea in distinct_valid_ideas(ideas))
    return [CategoryCount(category=category, count=count) for category, count in sorted(counts.items())]


def _rarest_idea(ideas: list[Idea], lookup: _ChallengeRarityLookup) -> str | None:
    valid_distinct = distinct_valid_ideas(ideas)
    if not valid_distinct:
        return None
    return max(valid_distinct, key=lambda idea: lookup.percentile(idea.canonical)).canonical


def _comparison_copy(comparison_basis: ComparisonBasis) -> str:
    if comparison_basis == "community":
        return "Compared against completed community answers for this object."
    if comparison_basis == "blended":
        return "Estimated from a blend of our reference set and early community answers."
    return "Estimated from our current reference set for this object."


def _normalize_attempt_ideas(challenge_id: str, raw_ideas: list[str]) -> tuple[list[Idea], tuple[str, ...]]:
    transcript_text = "\n".join(idea.strip() for idea in raw_ideas if idea.strip())
    if not transcript_text:
        return [], ()
    try:
        analysis = build_idea_analysis_provider().analyze(
            get_object_context(challenge_id),
            Transcript(text=transcript_text, language=None),
        )
    except ProviderConfigurationError as error:
        raise ProviderConfigurationError("Idea analysis provider is misconfigured") from error
    except Exception:
        analysis = LocalIdeaAnalysisProvider().analyze(
            get_object_context(challenge_id),
            Transcript(text=transcript_text, language=None),
        )
        analysis = type(analysis)(
            ideas=analysis.ideas,
            warnings=(*analysis.warnings, "Primary analysis failed; using a deterministic local estimate."),
        )
    return [idea for idea in analysis.ideas if idea.valid and idea.raw.strip()], analysis.warnings


def _result_from_record(record: AttemptRecord, *, receipt: str | None = None) -> AttemptResult:
    return AttemptResult(
        attempt_id=record.attempt_id,
        challenge_id=record.challenge_id,
        input_mode=record.input_mode,
        duration_seconds=record.duration_seconds,
        score=record.score,
        ideas=record.ideas,
        rarest_idea=record.rarest_idea,
        categories=record.categories,
        comparison_copy=record.comparison_copy,
        analysis_warnings=record.analysis_warnings,
        created_at=record.created_at,
        receipt=receipt,
    )


def _community_view(challenge_id: str) -> tuple[list[CommunityItem], list[CategoryCount]]:
    by_canonical: dict[str, dict[str, object]] = {}
    category_counts: Counter[str] = Counter()

    for reference in list_reference_ideas(challenge_id, include_private=False):
        bucket = by_canonical.setdefault(
            reference.canonical,
            {
                "canonical": reference.canonical,
                "category": reference.category,
                "example_phrase": reference.example_phrase,
                "count": 0,
            },
        )
        bucket["count"] = int(bucket["count"]) + reference.seed_count
        category_counts[reference.category] += reference.seed_count

    total = sum(int(bucket["count"]) for bucket in by_canonical.values()) or 1
    items = [
        CommunityItem(
            canonical=str(bucket["canonical"]),
            category=str(bucket["category"]),
            example_phrase=str(bucket["example_phrase"]),
            frequency=round(int(bucket["count"]) / total, 4),
            source_count=int(bucket["count"]),
            source_kind="reference-examples",
        )
        for bucket in sorted(by_canonical.values(), key=lambda item: (-int(item["count"]), str(item["canonical"])))
    ]
    categories = [CategoryCount(category=category, count=count) for category, count in sorted(category_counts.items())]
    return items, categories


_attempt_service: AttemptService | None = None


def get_attempt_service() -> AttemptService:
    global _attempt_service
    if _attempt_service is None:
        repository_name = os.getenv("ATTEMPT_REPOSITORY", "memory").strip().lower()
        receipt_secret = os.getenv("ATTEMPT_RECEIPT_SECRET", "")
        if repository_name == "mongo":
            uri = os.getenv("MONGODB_URI", "").strip()
            database = os.getenv("MONGODB_DATABASE", "").strip() or "unrot"
            if not uri:
                raise RuntimeError("MONGODB_URI is required when ATTEMPT_REPOSITORY=mongo")
            repository: AttemptRepository = MongoAttemptRepository(uri, database)
        elif repository_name == "memory":
            repository = InMemoryAttemptRepository()
        else:
            raise AttemptRepositoryConfigurationError(f"Unknown attempt repository '{repository_name}'")
        _attempt_service = AttemptService(repository, receipt_secret=receipt_secret)
    return _attempt_service


def reset_attempt_service() -> None:
    global _attempt_service
    _attempt_service = None
