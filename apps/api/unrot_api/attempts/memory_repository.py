from __future__ import annotations

from threading import RLock

from .models import AttemptRecord
from .repository import AttemptRepository


class InMemoryAttemptRepository(AttemptRepository):
    def __init__(self) -> None:
        self._lock = RLock()
        self._attempts: dict[str, AttemptRecord] = {}
        self._receipt_index: dict[str, str] = {}
        self._idempotency_index: dict[str, str] = {}

    def get_by_attempt_id(self, attempt_id: str) -> AttemptRecord | None:
        with self._lock:
            return self._attempts.get(attempt_id)

    def get_by_receipt_hash(self, receipt_hash: str) -> AttemptRecord | None:
        with self._lock:
            attempt_id = self._receipt_index.get(receipt_hash)
            if attempt_id is None:
                return None
            return self._attempts.get(attempt_id)

    def get_by_idempotency_key(self, idempotency_key: str) -> AttemptRecord | None:
        with self._lock:
            attempt_id = self._idempotency_index.get(idempotency_key)
            if attempt_id is None:
                return None
            return self._attempts.get(attempt_id)

    def save_if_absent(self, attempt: AttemptRecord) -> AttemptRecord:
        with self._lock:
            existing_attempt_id = self._idempotency_index.get(attempt.idempotency_key)
            if existing_attempt_id is not None:
                existing = self._attempts.get(existing_attempt_id)
                if existing is not None:
                    return existing
            self._attempts[attempt.attempt_id] = attempt
            self._receipt_index[attempt.receipt_hash] = attempt.attempt_id
            self._idempotency_index[attempt.idempotency_key] = attempt.attempt_id
            return attempt

    def delete(self, attempt_id: str) -> bool:
        with self._lock:
            attempt = self._attempts.pop(attempt_id, None)
            if attempt is None:
                return False
            self._receipt_index.pop(attempt.receipt_hash, None)
            self._idempotency_index.pop(attempt.idempotency_key, None)
            return True

    def count_completed_for_challenge(self, challenge_id: str) -> int:
        with self._lock:
            return sum(1 for attempt in self._attempts.values() if attempt.challenge_id == challenge_id)

    def list_attempts_for_challenge(self, challenge_id: str) -> list[AttemptRecord]:
        with self._lock:
            return [attempt for attempt in self._attempts.values() if attempt.challenge_id == challenge_id]
