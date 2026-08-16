# Unrot methodology

Unrot is loosely framed around Guilford-style divergent-thinking prompts: take one ordinary object, produce multiple alternate uses, then look at the range and rarity of those ideas. It is a creative exercise, not a clinical instrument.

## Algorithm version

- Current scoring algorithm version: `1.0`

## Score components

The total score is capped at 100 and is composed of four clamped parts:

1. Fluency, up to 25 points
   Formula: `25 * min(1, distinct_valid_ideas / 10)`

2. Flexibility, up to 25 points
   Formula: `25 * flexibility_score`

   Where `flexibility_score` is:

   - `min(1, category_count / target_category_breadth)`
   - multiplied by an entropy term that rewards distribution across categories rather than piling every idea into one lane

3. Originality, up to 35 points
   Formula: `35 * mean(rarity_percentile_per_idea)`

   Rarity is estimated from a challenge-specific lookup. During cold start, unseen ideas receive a moderate `0.70` estimate rather than a near-ceiling score.

4. Plausibility + elaboration, up to 15 points
   Formula: `15 * mean((plausibility + elaboration) / 2)`

The rounded total is then clamped between `0` and `100`.

## Distinct idea handling

- Only valid ideas are scored.
- Ideas are deduplicated by normalized canonical text before scoring.
- Empty canonical forms do not count.

## Comparison bases and thresholds

Originality uses a challenge-specific rarity lookup with three comparison modes:

- `reference-set` for fewer than 100 completed attempts on a challenge
- `blended` starting at 100 completed attempts
- `community` starting at 500 completed attempts

Reference ideas come from human-readable, challenge-specific concept clusters with aliases across all 18 objects. Private seed items are excluded from user-facing views.

## Seed and community behavior

- The seed/reference set gives each object a starter rarity baseline before enough live attempts exist.
- Once completions pass the thresholds above, completed community attempts start contributing to rarity.
- Community examples shown to users are gated and drawn from the moderated/public seed-and-community view rather than exposing every stored phrase directly.

## Limitations

- This is a prompt-based estimate of divergent thinking, not a full creativity assessment.
- Results depend on the object prompt, provider behavior, and transcription quality.
- Local and OpenAI-backed analysis can produce slightly different categorization and plausibility judgments.
- The originality baseline is challenge-specific, not a population norm.
- A short one-minute round rewards fast breadth more than long-form refinement.

## Non-diagnostic statement

Unrot should not be used to diagnose cognitive, educational, psychiatric, or neurological conditions. It is a playful creativity exercise inspired by divergent-thinking research.
