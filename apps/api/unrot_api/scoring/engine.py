from __future__ import annotations

import math
from collections import Counter
from typing import Protocol

from unrot_api.analysis.models import Idea

from .models import ComparisonBasis, ScoreBreakdown


class RarityLookup(Protocol):
    comparison_basis: ComparisonBasis

    def percentile(self, canonical: str) -> float:
        ...


def comparison_basis_for_completion_count(completion_count: int) -> ComparisonBasis:
    if completion_count >= 500:
        return "community"
    if completion_count >= 100:
        return "blended"
    return "reference-set"


def distinct_valid_ideas(ideas: list[Idea]) -> list[Idea]:
    distinct: list[Idea] = []
    seen: set[str] = set()
    for idea in ideas:
        if not idea.valid:
            continue
        key = idea.canonical.strip().lower()
        if not key or key in seen:
            continue
        seen.add(key)
        distinct.append(idea)
    return distinct


def score_attempt(ideas: list[Idea], target_breadth: int, rarity_lookup: RarityLookup) -> ScoreBreakdown:
    valid_distinct = distinct_valid_ideas(ideas)
    if not valid_distinct:
        return ScoreBreakdown.from_components(
            fluency=0.0,
            flexibility=0.0,
            originality=0.0,
            plausibility_elaboration=0.0,
            comparison_basis=rarity_lookup.comparison_basis,
        )

    fluency = 25.0 * min(1.0, len(valid_distinct) / 10.0)
    flexibility = 25.0 * _flexibility_score(valid_distinct, target_breadth)
    originality = 35.0 * _mean([_clamp_unit(rarity_lookup.percentile(idea.canonical)) for idea in valid_distinct])
    plausibility_elaboration = 15.0 * _mean(
        [(_clamp_unit(idea.plausibility) + _clamp_unit(idea.elaboration)) / 2.0 for idea in valid_distinct]
    )

    return ScoreBreakdown.from_components(
        fluency=fluency,
        flexibility=flexibility,
        originality=originality,
        plausibility_elaboration=plausibility_elaboration,
        comparison_basis=rarity_lookup.comparison_basis,
    )


def _flexibility_score(ideas: list[Idea], target_breadth: int) -> float:
    if target_breadth <= 0:
        return 0.0

    counts = Counter(idea.category.strip().lower() or "uncategorized" for idea in ideas)
    breadth_ratio = min(1.0, len(counts) / float(target_breadth))
    if len(counts) == 1:
        entropy_ratio = 0.0
    else:
        total = sum(counts.values())
        entropy = -sum((count / total) * math.log(count / total) for count in counts.values())
        entropy_ratio = entropy / math.log(len(counts))
    return max(0.0, min(1.0, breadth_ratio * (0.5 + 0.5 * entropy_ratio)))


def _mean(values: list[float]) -> float:
    if not values:
        return 0.0
    return sum(values) / len(values)


def _clamp_unit(value: float) -> float:
    return max(0.0, min(value, 1.0))
