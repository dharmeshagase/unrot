from __future__ import annotations

import re

from unrot_api.analysis.models import Idea, IdeaAnalysis
from unrot_api.providers.contracts import ObjectContext, ProviderUnavailableError, Transcript
from unrot_api.seeds.reference_sets import canonicalize_reference_idea

_SEGMENT_PATTERN = re.compile(r"(?:[;\n]+|[.!?]+(?:\s+|$))")
_WHITESPACE_PATTERN = re.compile(r"\s+")

_CATEGORY_KEYWORDS = (
    ("gardening", ("garden", "plant", "seed", "shovel", "irrigat", "watering", "soil", "sprout")),
    ("communication", ("signal", "message", "flag", "beacon", "whistle", "code", "pointer")),
    ("organization", ("organizer", "label", "sort", "holder", "storage", "divider", "cord")),
    ("art", ("paint", "stamp", "collage", "flower", "sculpt", "pattern", "mosaic", "ink")),
    ("music", ("music", "rhythm", "drum", "shaker", "instrument", "chime")),
    ("play", ("puppet", "toy", "game", "doll", "pretend", "fairy", "miniature")),
    ("clothing", ("wear", "warmer", "scarf", "sleeve", "clasp", "costume", "jewelry")),
    ("building", ("bridge", "beam", "brick", "roof", "tower", "structure", "footing")),
    ("science", ("specimen", "planet", "experiment", "magnif", "model", "lens")),
    ("wellness", ("focus", "breath", "massage", "comfort", "calm", "exercise")),
    ("navigation", ("compass", "trail", "direction", "map", "marker")),
    ("display", ("display", "frame", "stand", "window", "easel")),
    ("tool", ("scraper", "drill", "wedge", "scoop", "tamper", "tool", "funnel")),
    ("safety", ("splint", "guard", "shield", "reflector", "emergency", "alarm")),
    ("cleaning", ("dust", "wipe", "scrub", "sponge", "clean", "polish")),
)


class LocalTranscriptionProvider:
    def transcribe(self, audio: bytes, mime_type: str) -> Transcript:
        del audio
        del mime_type
        raise ProviderUnavailableError("Voice transcription is unavailable in local mode")


class LocalIdeaAnalysisProvider:
    def analyze(self, object_context: ObjectContext, transcript: Transcript) -> IdeaAnalysis:
        warnings: list[str] = []
        seen_canonical: set[str] = set()
        ideas: list[Idea] = []
        segments = _split_segments(transcript.text)

        for segment in segments:
            normalized_segment = _normalize_raw(segment)
            canonical = _canonicalize(object_context, normalized_segment)
            canonical_key = canonical.lower()
            if canonical_key in seen_canonical:
                continue
            seen_canonical.add(canonical_key)
            ideas.append(
                Idea(
                    raw=segment,
                    canonical=canonical,
                    category=_categorize(canonical),
                    valid=True,
                    plausibility=_plausibility_score(canonical),
                    elaboration=_elaboration_score(canonical),
                )
            )

        if len(ideas) < len(segments):
            warnings.append("Removed duplicate ideas during normalization")

        return IdeaAnalysis(ideas=ideas, warnings=tuple(warnings))


def _split_segments(text: str) -> list[str]:
    parts = _SEGMENT_PATTERN.split(text)
    return [segment for segment in parts if _normalize_raw(segment)]


def _normalize_raw(text: str) -> str:
    return _WHITESPACE_PATTERN.sub(" ", text).strip(" \t\r\n")


def _canonicalize(object_context: ObjectContext, text: str) -> str:
    normalized_lower = text.lower()
    return canonicalize_reference_idea(object_context.slug, normalized_lower) or normalized_lower


def _categorize(text: str) -> str:
    lowered = text.lower()
    for category, keywords in _CATEGORY_KEYWORDS:
        if any(keyword in lowered for keyword in keywords):
            return category
    return "utility"


def _plausibility_score(text: str) -> float:
    word_count = len(text.split())
    return min(1.0, 0.55 + 0.1 * min(word_count, 4))


def _elaboration_score(text: str) -> float:
    word_count = len(text.split())
    return min(1.0, 0.4 + 0.15 * max(word_count - 1, 0))
