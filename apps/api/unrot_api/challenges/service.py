from __future__ import annotations

import hashlib
import random

from .catalog import get_catalog_detail, list_challenges
from .models import ChallengeDetail, ChallengeSummary
from unrot_api.providers.contracts import ObjectContext


class ChallengeNotFoundError(LookupError):
    def __init__(self, slug: str) -> None:
        super().__init__(f"Challenge '{slug}' not found")
        self.slug = slug


def get_challenge(slug: str) -> ChallengeDetail:
    detail = get_catalog_detail(slug)
    if detail is None:
        raise ChallengeNotFoundError(slug)
    return detail


def get_object_context(slug: str) -> ObjectContext:
    detail = get_challenge(slug)
    return ObjectContext(slug=detail.slug, name=detail.name, description=detail.description)


def recommend_challenge(
    recent_ids: set[str], first_full_challenge: bool, seed: int | None = None
) -> ChallengeSummary:
    catalog = list_challenges()
    if first_full_challenge:
        first_round_catalog = [item for item in catalog if item.difficulty != "uncommon"]
        eligible = [item for item in first_round_catalog if item.slug not in recent_ids]
        selection_pool = eligible or first_round_catalog
    else:
        eligible = [item for item in catalog if item.slug not in recent_ids]
        selection_pool = eligible or catalog

    resolved_seed = seed if seed is not None else _stable_seed(recent_ids, first_full_challenge)
    return random.Random(resolved_seed).choice(selection_pool)


def _stable_seed(recent_ids: set[str], first_full_challenge: bool) -> int:
    payload = "|".join(
        [
            "first-full" if first_full_challenge else "standard",
            ",".join(sorted(recent_ids)),
        ]
    )
    digest = hashlib.sha256(payload.encode("utf-8")).digest()
    return int.from_bytes(digest[:8], byteorder="big", signed=False)
