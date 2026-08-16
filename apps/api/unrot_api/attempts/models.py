from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Literal

from unrot_api.analysis.models import Idea
from unrot_api.scoring.models import ScoreBreakdown

InputMode = Literal["voice", "text"]


@dataclass(frozen=True)
class CategoryCount:
    category: str
    count: int

    def to_api_dict(self) -> dict[str, object]:
        return {"category": self.category, "count": self.count}


@dataclass(frozen=True)
class AttemptRecord:
    attempt_id: str
    challenge_id: str
    input_mode: InputMode
    duration_seconds: int
    anonymous_session_hash: str
    ideas: tuple[Idea, ...]
    score: ScoreBreakdown
    receipt_hash: str
    idempotency_key: str
    payload_hash: str
    comparison_copy: str
    rarest_idea: str | None
    categories: tuple[CategoryCount, ...]
    analysis_warnings: tuple[str, ...]
    created_at: datetime


@dataclass(frozen=True)
class AttemptResult:
    attempt_id: str
    challenge_id: str
    input_mode: InputMode
    duration_seconds: int
    score: ScoreBreakdown
    rarest_idea: str | None
    ideas: tuple[Idea, ...] = field(default_factory=tuple)
    categories: tuple[CategoryCount, ...] = field(default_factory=tuple)
    comparison_copy: str = ""
    analysis_warnings: tuple[str, ...] = field(default_factory=tuple)
    created_at: datetime | None = None
    receipt: str | None = None

    def to_api_dict(self, *, include_receipt: bool) -> dict[str, object]:
        payload: dict[str, object] = {
            "attemptId": self.attempt_id,
            "challengeId": self.challenge_id,
            "inputMode": self.input_mode,
            "durationSeconds": self.duration_seconds,
            "score": self.score.to_api_dict(),
            "ideas": [idea.to_dict() for idea in self.ideas],
            "rarestIdea": self.rarest_idea,
            "categories": [category.to_api_dict() for category in self.categories],
            "comparisonCopy": self.comparison_copy,
            "analysisWarnings": list(self.analysis_warnings),
        }
        if self.created_at is not None:
            payload["createdAt"] = self.created_at.isoformat()
        if include_receipt and self.receipt is not None:
            payload["receipt"] = self.receipt
        return payload


@dataclass(frozen=True)
class CommunityItem:
    canonical: str
    category: str
    example_phrase: str
    frequency: float
    source_count: int
    source_kind: Literal["reference-examples", "community"] = "reference-examples"

    def to_api_dict(self) -> dict[str, object]:
        return {
            "canonical": self.canonical,
            "category": self.category,
            "examplePhrase": self.example_phrase,
            "frequency": self.frequency,
            "sourceCount": self.source_count,
            "sourceKind": self.source_kind,
        }
