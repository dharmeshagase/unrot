from __future__ import annotations

import re
from dataclasses import dataclass


@dataclass(frozen=True)
class ReferenceIdea:
    canonical: str
    category: str
    example_phrase: str
    seed_count: int
    aliases: tuple[str, ...] = ()
    private: bool = False


def _idea(canonical: str, category: str, example_phrase: str, seed_count: int, alias_one: str, alias_two: str, *, private: bool = False) -> ReferenceIdea:
    return ReferenceIdea(canonical, category, example_phrase, seed_count, (alias_one, alias_two), private)


_REFERENCE_SETS: dict[str, tuple[ReferenceIdea, ...]] = {
    "spoon": (
        _idea("tiny gardening shovel", "gardening", "A tiny shovel for planting seeds", 18, "tiny shovel", "little shovel for plants"),
        _idea("sunlight signal mirror", "communication", "A mirror for sending a sunlight signal", 12, "signal mirror", "mirror signal"),
        _idea("kitchen band rhythm stick", "music", "A rhythm stick for a kitchen band", 8, "kitchen drumstick", "rhythm spoon"),
        _idea("puppet oar", "play", "An oar for a toy boat puppet show", 5, "toy boat oar", "puppet boat paddle"),
        _idea("miniature shoehorn", "clothing", "A shoehorn for a doll's boot", 4, "doll shoehorn", "tiny shoe horn"),
        _idea("tiny private spoon catapult", "play", "A spoon catapult from the practice set", 1, "spoon launcher", "tiny catapult", private=True),
    ),
    "empty-bottle": (
        _idea("drip irrigator", "gardening", "A slow drip irrigator for a balcony plant", 11, "watering spike", "slow plant waterer"),
        _idea("storm shaker", "music", "A rain shaker for classroom sounds", 7, "rain shaker", "bottle maraca"),
        _idea("message capsule", "communication", "A sealed capsule for a rolled note", 6, "note bottle", "message container"),
        _idea("desk organizer", "organization", "A holder for pens and small tools", 9, "pen holder", "pencil organizer"),
        _idea("paint roller", "art", "A rolling texture tool for paint", 4, "bottle paint roller", "texture roller"),
    ),
    "cardboard-box": (
        _idea("shadow theater", "play", "A shadow theater for paper actors", 13, "shadow stage", "puppet theater"),
        _idea("mailroom maze", "play", "A maze for marbles and tiny mail", 6, "cardboard maze", "marble maze"),
        _idea("drawer divider", "organization", "Dividers for a crowded drawer", 10, "storage divider", "drawer organizer"),
        _idea("seedling shelter", "gardening", "A wind shelter for young seedlings", 5, "plant shelter", "seedling windbreak"),
        _idea("tabletop easel", "art", "A small easel for a paper painting", 4, "cardboard easel", "picture stand"),
    ),
    "sock": (
        _idea("dust mitt", "cleaning", "A dust mitt for shelf corners", 14, "dust glove", "cleaning mitt"),
        _idea("beanbag puppet", "play", "A beanbag puppet with button eyes", 9, "sock puppet", "soft puppet"),
        _idea("wrist warmer", "clothing", "A warm sleeve for a cold wrist", 8, "hand warmer", "wrist sleeve"),
        _idea("seed pouch", "gardening", "A labeled pouch for saving seeds", 4, "seed bag", "garden seed pouch"),
        _idea("door draft stopper", "utility", "A small stopper for a drafty door", 6, "draft blocker", "door gap stopper"),
    ),
    "paper-cup": (
        _idea("seed starter", "gardening", "A tiny starter pot for seeds", 12, "seedling cup", "plant starter"),
        _idea("telephone amplifier", "communication", "A paper-cup whisper amplifier", 8, "cup phone", "whisper phone"),
        _idea("paint mixing cup", "art", "A disposable cup for mixing paint colors", 7, "paint cup", "color mixing cup"),
        _idea("stacking target", "play", "A target tower for a tossing game", 5, "cup target", "stacking game"),
        _idea("small parts sorter", "organization", "A sorter for beads and screws", 6, "bead sorter", "parts cup"),
    ),
    "towel": (
        _idea("picnic sail", "play", "A sail for a pretend picnic raft", 11, "pretend sail", "toy raft sail"),
        _idea("sound blanket", "utility", "A makeshift sound blanket for echoes", 5, "echo blanket", "sound dampener"),
        _idea("plant frost wrap", "gardening", "A soft wrap protecting plants from frost", 8, "frost blanket", "plant cover"),
        _idea("exercise strap", "wellness", "A stretching strap for gentle exercise", 7, "stretching strap", "workout towel strap"),
        _idea("costume cape", "clothing", "A quick cape for dress-up", 9, "towel cape", "superhero cape"),
    ),
    "clothespin": (
        _idea("bookmark clamp", "organization", "A clamp bookmark for a recipe page", 8, "page clip", "recipe bookmark"),
        _idea("cape clasp", "clothing", "A cape clasp for a tiny costume", 4, "costume clasp", "cape clip"),
        _idea("seed packet closer", "gardening", "A closer for an opened seed packet", 6, "seed bag clip", "garden packet clip"),
        _idea("miniature catapult", "play", "A tiny launcher for paper balls", 5, "paper ball launcher", "clothespin catapult"),
        _idea("paintbrush rest", "art", "A rest keeping a wet brush off the table", 7, "brush holder", "paint brush stand"),
    ),
    "bottle-cap": (
        _idea("toy shield", "play", "A toy shield for a tabletop knight", 7, "mini shield", "knight shield"),
        _idea("paint stamp", "art", "A paint stamp for dotted borders", 6, "dot stamp", "cap stamp"),
        _idea("seed counter", "gardening", "A tray for counting small seeds", 4, "seed tray", "tiny seed dish"),
        _idea("cable label", "organization", "A bright label tied to a cable", 8, "cord tag", "wire label"),
        _idea("finger cymbal", "music", "A tiny cymbal for rhythm play", 5, "mini cymbal", "cap percussion"),
    ),
    "chalk-stub": (
        _idea("trail marker", "navigation", "A tiny trail marker on a hike", 8, "path marker", "route chalk"),
        _idea("color key", "communication", "A coded color key for a game", 5, "chalk code", "color signal"),
        _idea("plant label", "gardening", "A weather-safe mark on a garden stake", 6, "garden label", "seedling marker"),
        _idea("fabric pattern tracer", "art", "A temporary tracer for a sewing pattern", 4, "pattern chalk", "fabric tracer"),
        _idea("grip powder", "wellness", "A little grip powder for exercise", 3, "hand grip chalk", "exercise chalk"),
    ),
    "lost-button": (
        _idea("mini compass dial", "navigation", "A pretend compass dial for play", 6, "compass face", "tiny compass"),
        _idea("coin-sized game piece", "play", "A game piece for a handmade board", 5, "board token", "game counter"),
        _idea("mosaic dot", "art", "A bright round piece in a mixed-media mosaic", 7, "mosaic piece", "collage dot"),
        _idea("cord marker", "organization", "A marker identifying one charging cable", 8, "cable button tag", "wire marker"),
        _idea("seed spacing guide", "gardening", "A guide for spacing tiny seeds", 3, "seed spacer", "planting guide"),
    ),
    "marble": (
        _idea("planet model", "science", "A planet model for a desk solar system", 9, "mini planet", "solar system marble"),
        _idea("focus stone", "wellness", "A focus stone for breathing exercises", 4, "calm stone", "breathing marble"),
        _idea("paint mixer", "art", "A rolling mixer inside a paint jar", 6, "paint mixing ball", "color mixer"),
        _idea("plant watering indicator", "gardening", "A marker showing the soil was watered", 3, "watering marker", "plant moisture marker"),
        _idea("maze runner", "play", "The moving piece in a hand-built maze", 8, "maze ball", "game marble"),
    ),
    "popsicle-stick": (
        _idea("plant label", "gardening", "A plant label for seedlings", 10, "seedling marker", "garden stick label"),
        _idea("bridge beam", "building", "A bridge beam for a toy city", 7, "toy bridge plank", "model beam"),
        _idea("rhythm clapper", "music", "A pair of sticks for tapping rhythms", 6, "music clapper", "rhythm sticks"),
        _idea("page flag", "organization", "A reusable marker for a notebook page", 5, "book marker", "page marker"),
        _idea("miniature sign", "communication", "A signpost for a model village", 4, "tiny signpost", "model sign"),
    ),
    "pencil-shaving": (
        _idea("paper flower", "art", "A curled flower for a collage", 6, "shaving blossom", "collage flower"),
        _idea("fairy ribbon", "play", "A ribbon for a fairy costume", 3, "tiny costume ribbon", "fairy streamer"),
        _idea("seed nest", "gardening", "A light nest around a large seed", 4, "seed cushion", "planting nest"),
        _idea("scent diffuser", "wellness", "A tiny carrier for a drop of scent", 2, "aroma curl", "scent holder"),
        _idea("miniature roof tile", "building", "A curled roof tile for a model house", 3, "model roof curl", "tiny roof tile"),
    ),
    "empty-cassette-case": (
        _idea("photo frame", "display", "A standing photo frame for a desk", 8, "picture stand", "desk photo frame"),
        _idea("specimen window", "science", "A specimen window for flat leaves", 4, "leaf viewer", "specimen frame"),
        _idea("seed packet file", "gardening", "A dry file for one seed packet", 6, "seed case", "garden packet holder"),
        _idea("miniature greenhouse", "play", "A clear greenhouse for a model garden", 3, "toy greenhouse", "tiny glasshouse"),
        _idea("travel paint palette", "art", "A closable palette for a few paint colors", 5, "pocket palette", "paint case"),
    ),
    "bread-bag-clip": (
        _idea("cord label", "organization", "A label tag for charging cords", 10, "cable tag", "wire label"),
        _idea("tiny scraper", "tool", "A tiny scraper for sticker residue", 4, "sticker scraper", "small scraping tool"),
        _idea("seed depth gauge", "gardening", "A small gauge for shallow planting depth", 3, "planting gauge", "seed ruler"),
        _idea("paint comb", "art", "A notched comb for texture in wet paint", 5, "texture comb", "paint rake"),
        _idea("game spinner pointer", "play", "A pointer for a homemade game spinner", 4, "spinner arrow", "board game pointer"),
    ),
    "toy-block": (
        _idea("stamp handle", "art", "A handle for a homemade stamp", 7, "printing handle", "block stamp grip"),
        _idea("bridge footing", "building", "A bridge footing in a block city", 5, "bridge base", "model foundation"),
        _idea("seed row spacer", "gardening", "A spacer for even seed rows", 4, "garden spacer", "plant row guide"),
        _idea("desk cable weight", "organization", "A small weight keeping a cable in place", 6, "cord weight", "cable stop"),
        _idea("rhythm knock block", "music", "A wooden percussion block", 5, "music block", "percussion block"),
    ),
    "crayon-wrapper": (
        _idea("secret note ribbon", "communication", "A curled ribbon hiding a secret note", 5, "message ribbon", "hidden note strip"),
        _idea("paper flame", "art", "A paper flame in a collage campfire", 4, "collage fire", "crayon paper flame"),
        _idea("seed packet label", "gardening", "A colorful label for a saved seed packet", 3, "seed label", "garden packet tag"),
        _idea("tiny party streamer", "play", "A streamer for a miniature celebration", 4, "mini streamer", "toy party ribbon"),
        _idea("color sorting band", "organization", "A band identifying a group of pencils", 5, "pencil color tag", "sorting wrapper"),
    ),
    "shoelace-tip": (
        _idea("tiny pointer", "communication", "A tiny pointer for a model classroom", 6, "model pointer", "mini teaching stick"),
        _idea("mini drill bit", "tool", "A mini drill bit in pretend play", 3, "toy drill bit", "tiny boring tool"),
        _idea("seed hole dibber", "gardening", "A dibber for making very small seed holes", 4, "seed dibber", "planting poker"),
        _idea("bead spacer", "art", "A narrow spacer in handmade jewelry", 5, "jewelry spacer", "necklace divider"),
        _idea("game antenna", "play", "An antenna for a tiny cardboard robot", 4, "robot antenna", "toy aerial"),
    ),
}


def _normalize(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip().lower()


def canonicalize_reference_idea(challenge_id: str, text: str) -> str | None:
    normalized = _normalize(text)
    for idea in _REFERENCE_SETS.get(challenge_id, ()):
        if normalized == _normalize(idea.canonical) or normalized in {_normalize(alias) for alias in idea.aliases}:
            return idea.canonical
    return None


def list_reference_ideas(challenge_id: str, *, include_private: bool = False) -> tuple[ReferenceIdea, ...]:
    ideas = _REFERENCE_SETS.get(challenge_id, ())
    if include_private:
        return ideas
    return tuple(idea for idea in ideas if not idea.private)
