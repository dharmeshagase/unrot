from __future__ import annotations

from typing import Protocol

from .models import AttemptRecord


class AttemptRepositoryError(RuntimeError):
    pass


class AttemptRepositoryConfigurationError(AttemptRepositoryError):
    pass


class AttemptPersistenceConflictError(AttemptRepositoryError):
    pass


class AttemptRepository(Protocol):
    def get_by_attempt_id(self, attempt_id: str) -> AttemptRecord | None:
        ...

    def get_by_receipt_hash(self, receipt_hash: str) -> AttemptRecord | None:
        ...

    def get_by_idempotency_key(self, idempotency_key: str) -> AttemptRecord | None:
        ...

    def save_if_absent(self, attempt: AttemptRecord) -> AttemptRecord:
        ...

    def delete(self, attempt_id: str) -> bool:
        ...

    def count_completed_for_challenge(self, challenge_id: str) -> int:
        ...

    def list_attempts_for_challenge(self, challenge_id: str) -> list[AttemptRecord]:
        ...
