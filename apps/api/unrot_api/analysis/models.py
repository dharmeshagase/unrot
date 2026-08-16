from __future__ import annotations

from dataclasses import dataclass, field


def _validate_score(name: str, value: float) -> None:
    if not 0.0 <= value <= 1.0:
        raise ValueError(f"{name} must be between 0 and 1")


@dataclass(frozen=True)
class Idea:
    raw: str
    canonical: str
    category: str
    valid: bool
    plausibility: float
    elaboration: float

    def __post_init__(self) -> None:
        _validate_score("plausibility", self.plausibility)
        _validate_score("elaboration", self.elaboration)

    def to_dict(self) -> dict[str, object]:
        return {
            "raw": self.raw,
            "canonical": self.canonical,
            "category": self.category,
            "valid": self.valid,
            "plausibility": self.plausibility,
            "elaboration": self.elaboration,
        }


@dataclass(frozen=True)
class IdeaAnalysis:
    ideas: list[Idea]
    warnings: tuple[str, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        object.__setattr__(self, "warnings", tuple(self.warnings))

    def to_dict(self) -> dict[str, object]:
        return {
            "ideas": [idea.to_dict() for idea in self.ideas],
            "warnings": list(self.warnings),
        }
