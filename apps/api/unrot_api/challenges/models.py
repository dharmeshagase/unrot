from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

Difficulty = Literal["easy", "medium", "uncommon"]


@dataclass(frozen=True)
class ChallengeSummary:
    slug: str
    name: str
    description: str
    difficulty: Difficulty
    theme: str
    art_key: str

    def to_dict(self) -> dict[str, str]:
        return {
            "slug": self.slug,
            "name": self.name,
            "description": self.description,
            "difficulty": self.difficulty,
            "theme": self.theme,
            "art_key": self.art_key,
        }


@dataclass(frozen=True)
class ChallengeDetail(ChallengeSummary):
    prompt: str
    target_category_breadth: int

    def to_dict(self) -> dict[str, str | int]:
        payload = super().to_dict()
        payload["prompt"] = self.prompt
        payload["target_category_breadth"] = self.target_category_breadth
        return payload
