from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

ComparisonBasis = Literal["reference-set", "blended", "community"]


def _clamp(value: float, maximum: float) -> float:
    return round(max(0.0, min(value, maximum)), 2)


@dataclass(frozen=True)
class ScoreBreakdown:
    total: int
    fluency: float
    flexibility: float
    originality: float
    plausibility_elaboration: float
    algorithm_version: str = "1.0"
    comparison_basis: ComparisonBasis = "reference-set"

    @classmethod
    def from_components(
        cls,
        *,
        fluency: float,
        flexibility: float,
        originality: float,
        plausibility_elaboration: float,
        comparison_basis: ComparisonBasis,
    ) -> "ScoreBreakdown":
        clamped_fluency = _clamp(fluency, 25.0)
        clamped_flexibility = _clamp(flexibility, 25.0)
        clamped_originality = _clamp(originality, 35.0)
        clamped_plausibility = _clamp(plausibility_elaboration, 15.0)
        total = round(clamped_fluency + clamped_flexibility + clamped_originality + clamped_plausibility)
        return cls(
            total=max(0, min(total, 100)),
            fluency=clamped_fluency,
            flexibility=clamped_flexibility,
            originality=clamped_originality,
            plausibility_elaboration=clamped_plausibility,
            comparison_basis=comparison_basis,
        )

    def to_api_dict(self) -> dict[str, object]:
        return {
            "total": self.total,
            "fluency": self.fluency,
            "flexibility": self.flexibility,
            "originality": self.originality,
            "plausibilityElaboration": self.plausibility_elaboration,
            "algorithmVersion": self.algorithm_version,
            "comparisonBasis": self.comparison_basis,
        }
