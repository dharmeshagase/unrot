from __future__ import annotations

from .models import ChallengeDetail, ChallengeSummary

_PROMPT = "What else could this be?"
_SVG_TEMPLATE = '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">{body}</svg>'

_ART_LIBRARY = {
    "spoon": _SVG_TEMPLATE.format(body='<ellipse cx="24" cy="18" rx="12" ry="10"/><rect x="28" y="24" width="8" height="28" rx="4"/>'),
    "empty-bottle": _SVG_TEMPLATE.format(body='<rect x="26" y="8" width="12" height="8" rx="2"/><rect x="20" y="16" width="24" height="34" rx="8"/>'),
    "cardboard-box": _SVG_TEMPLATE.format(body='<path d="M10 20 32 10l22 10-22 10z"/><path d="M10 20v24l22 10 22-10V20"/><path d="M32 30v24"/>'),
    "sock": _SVG_TEMPLATE.format(body='<path d="M22 10h14v20c0 7 6 10 12 10v10H18V36h8c4 0 6-2 6-6V10z"/>'),
    "paper-cup": _SVG_TEMPLATE.format(body='<path d="M18 14h28l-4 36H22z"/><path d="M16 14h32"/>'),
    "towel": _SVG_TEMPLATE.format(body='<rect x="14" y="16" width="36" height="32" rx="4"/><path d="M20 24h24M20 32h24M20 40h18"/>'),
    "clothespin": _SVG_TEMPLATE.format(body='<path d="M20 14c8 0 8 36 0 36"/><path d="M34 14c8 0 8 36 0 36"/><circle cx="32" cy="32" r="5"/>'),
    "bottle-cap": _SVG_TEMPLATE.format(body='<path d="M20 18h24v28H20z"/><path d="M20 18l-4 6v16l4 6M44 18l4 6v16l-4 6"/>'),
    "chalk-stub": _SVG_TEMPLATE.format(body='<path d="M18 38 42 18l8 8-24 20H18z"/>'),
    "lost-button": _SVG_TEMPLATE.format(body='<circle cx="32" cy="32" r="18"/><circle cx="26" cy="26" r="2.5"/><circle cx="38" cy="26" r="2.5"/><circle cx="26" cy="38" r="2.5"/><circle cx="38" cy="38" r="2.5"/>'),
    "marble": _SVG_TEMPLATE.format(body='<circle cx="32" cy="32" r="18"/><path d="M22 38c5-10 14-14 20-12"/>'),
    "popsicle-stick": _SVG_TEMPLATE.format(body='<rect x="22" y="8" width="20" height="48" rx="10"/>'),
    "pencil-shaving": _SVG_TEMPLATE.format(body='<path d="M16 36c8-18 24-22 32-8-10 18-24 18-32 8z"/><circle cx="40" cy="28" r="4"/>'),
    "empty-cassette-case": _SVG_TEMPLATE.format(body='<rect x="14" y="12" width="36" height="40" rx="3"/><rect x="22" y="20" width="20" height="24" rx="2"/><path d="M22 44h20"/>'),
    "bread-bag-clip": _SVG_TEMPLATE.format(body='<path d="M18 20h28v10H34v4h12v10H18z"/>'),
    "toy-block": _SVG_TEMPLATE.format(body='<rect x="14" y="18" width="36" height="28" rx="3"/><rect x="22" y="10" width="8" height="8" rx="2"/><rect x="34" y="10" width="8" height="8" rx="2"/>'),
    "crayon-wrapper": _SVG_TEMPLATE.format(body='<path d="M18 40 30 18h16L34 46H18z"/><path d="M28 22h12M24 30h12M22 38h10"/>'),
    "shoelace-tip": _SVG_TEMPLATE.format(body='<path d="M16 40c12 0 20-16 32-16"/><rect x="42" y="18" width="10" height="12" rx="2"/>'),
}

_CATALOG: tuple[ChallengeDetail, ...] = (
    ChallengeDetail(
        slug="spoon",
        name="Spoon",
        description="A familiar utensil with a rounded bowl and a short handle.",
        difficulty="easy",
        theme="kitchen-drawer",
        art_key="spoon",
        prompt=_PROMPT,
        target_category_breadth=5,
    ),
    ChallengeDetail(
        slug="empty-bottle",
        name="Empty bottle",
        description="A hollow bottle with no liquid left inside.",
        difficulty="easy",
        theme="recycling-bin",
        art_key="empty-bottle",
        prompt=_PROMPT,
        target_category_breadth=5,
    ),
    ChallengeDetail(
        slug="cardboard-box",
        name="Cardboard box",
        description="A plain corrugated box that once carried something else.",
        difficulty="easy",
        theme="delivery-day",
        art_key="cardboard-box",
        prompt=_PROMPT,
        target_category_breadth=6,
    ),
    ChallengeDetail(
        slug="sock",
        name="Sock",
        description="A soft single sock, easy to picture and easy to twist into roles.",
        difficulty="easy",
        theme="laundry-pile",
        art_key="sock",
        prompt=_PROMPT,
        target_category_breadth=5,
    ),
    ChallengeDetail(
        slug="paper-cup",
        name="Paper cup",
        description="A lightweight disposable cup from a cafe or party table.",
        difficulty="easy",
        theme="break-room",
        art_key="paper-cup",
        prompt=_PROMPT,
        target_category_breadth=5,
    ),
    ChallengeDetail(
        slug="towel",
        name="Towel",
        description="A folded towel with lots of surface area and flexible shapes.",
        difficulty="easy",
        theme="bathroom-shelf",
        art_key="towel",
        prompt=_PROMPT,
        target_category_breadth=6,
    ),
    ChallengeDetail(
        slug="clothespin",
        name="Clothespin",
        description="A small spring clip used to hold fabric in place.",
        difficulty="uncommon",
        theme="forgotten-drawer",
        art_key="clothespin",
        prompt=_PROMPT,
        target_category_breadth=6,
    ),
    ChallengeDetail(
        slug="bottle-cap",
        name="Bottle cap",
        description="A tiny ridged cap that usually disappears after opening a drink.",
        difficulty="uncommon",
        theme="picnic-leftovers",
        art_key="bottle-cap",
        prompt=_PROMPT,
        target_category_breadth=6,
    ),
    ChallengeDetail(
        slug="chalk-stub",
        name="Chalk stub",
        description="A worn-down chalk nub with only a little length left.",
        difficulty="uncommon",
        theme="sidewalk-doodles",
        art_key="chalk-stub",
        prompt=_PROMPT,
        target_category_breadth=6,
    ),
    ChallengeDetail(
        slug="lost-button",
        name="Lost button",
        description="A single spare button with no shirt or coat attached.",
        difficulty="uncommon",
        theme="sewing-kit",
        art_key="lost-button",
        prompt=_PROMPT,
        target_category_breadth=6,
    ),
    ChallengeDetail(
        slug="marble",
        name="Marble",
        description="A small glass marble that catches light and invites scale shifts.",
        difficulty="uncommon",
        theme="toy-box",
        art_key="marble",
        prompt=_PROMPT,
        target_category_breadth=6,
    ),
    ChallengeDetail(
        slug="popsicle-stick",
        name="Popsicle stick",
        description="A flat wooden stick with rounded ends from a frozen treat.",
        difficulty="uncommon",
        theme="summer-odds",
        art_key="popsicle-stick",
        prompt=_PROMPT,
        target_category_breadth=6,
    ),
    ChallengeDetail(
        slug="pencil-shaving",
        name="Pencil shaving",
        description="A curled shaving peeled from a freshly sharpened pencil.",
        difficulty="uncommon",
        theme="desk-scraps",
        art_key="pencil-shaving",
        prompt=_PROMPT,
        target_category_breadth=7,
    ),
    ChallengeDetail(
        slug="empty-cassette-case",
        name="Empty cassette case",
        description="A clear plastic cassette case with the tape long gone.",
        difficulty="uncommon",
        theme="nostalgia-shelf",
        art_key="empty-cassette-case",
        prompt=_PROMPT,
        target_category_breadth=7,
    ),
    ChallengeDetail(
        slug="bread-bag-clip",
        name="Bread-bag clip",
        description="A tiny plastic clip that keeps a loaf bag closed.",
        difficulty="uncommon",
        theme="pantry-corner",
        art_key="bread-bag-clip",
        prompt=_PROMPT,
        target_category_breadth=7,
    ),
    ChallengeDetail(
        slug="toy-block",
        name="Toy block",
        description="A simple block from a child’s building set.",
        difficulty="uncommon",
        theme="playroom-floor",
        art_key="toy-block",
        prompt=_PROMPT,
        target_category_breadth=6,
    ),
    ChallengeDetail(
        slug="crayon-wrapper",
        name="Crayon wrapper",
        description="A peeled paper wrapper that used to hug a wax crayon.",
        difficulty="uncommon",
        theme="art-bin",
        art_key="crayon-wrapper",
        prompt=_PROMPT,
        target_category_breadth=7,
    ),
    ChallengeDetail(
        slug="shoelace-tip",
        name="Shoelace tip",
        description="The small plastic end piece from a shoelace.",
        difficulty="uncommon",
        theme="coat-closet",
        art_key="shoelace-tip",
        prompt=_PROMPT,
        target_category_breadth=7,
    ),
)

_CHALLENGES_BY_SLUG = {challenge.slug: challenge for challenge in _CATALOG}


def list_challenges() -> list[ChallengeSummary]:
    return [
        ChallengeSummary(
            slug=challenge.slug,
            name=challenge.name,
            description=challenge.description,
            difficulty=challenge.difficulty,
            theme=challenge.theme,
            art_key=challenge.art_key,
        )
        for challenge in _CATALOG
    ]


def get_catalog_detail(slug: str) -> ChallengeDetail | None:
    return _CHALLENGES_BY_SLUG.get(slug)


def get_art_svg(art_key: str) -> str:
    return _ART_LIBRARY[art_key]
