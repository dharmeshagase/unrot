# Unrot MVP Product and Technical Blueprint

**Status:** Proposed for implementation  
**Date:** 2026-08-14  
**Working name:** Unrot

## 1. Product definition

Unrot is a mobile-first, 60-second divergent-thinking game inspired by Guilford's Alternate Uses Test. A player sees a familiar but overlooked object and speaks as many unusual uses for it as they can. Unrot turns those ideas into friendly, non-diagnostic feedback and a consumer-facing Divergence Score.

The product is a creative workout, not a measure of intelligence, mental health, or “brain rot.” The core promise is: **make something with your attention for one minute.**

### Audience

Internet-native people, initially ages 16–35, who want a playful alternative to passive scrolling. The visual and object language should also evoke childhood inventiveness without making the experience look designed only for children.

### MVP success criteria

- A new visitor can understand and start a challenge within 20 seconds.
- Voice is the obvious primary input; typing remains a complete fallback.
- A visitor can finish multiple challenges without an account.
- Results explain the score rather than presenting an unexplained number.
- Community answers remain hidden until the player finishes.
- Raw audio is discarded immediately after transcription.
- OpenAI can be replaced without changing product logic or stored data.

## 2. Product principles

1. **Low pressure, real momentum.** The timer creates focus, but the interface never treats fewer than ten ideas as failure.
2. **Creation before comparison.** No community ideas appear during the challenge.
3. **Explain the score.** Show what fluency, flexibility, originality, and plausibility mean in ordinary language.
4. **Earn precision.** Before sufficient community data exists, compare against a “reference set,” not fabricated player percentiles.
5. **No account wall.** Anonymous play is unlimited. Accounts exist only to retain history across devices and show progress.
6. **Curated prompts.** AI may assist challenge preparation but never publishes objects automatically.

## 3. Challenge library

Objects should feel like overlooked childhood treasures: seen often, rarely observed closely, concrete enough to recognize immediately, and broad enough to support at least eight conceptual categories.

The library deliberately mixes easy confidence-building objects with stranger prompts. Difficulty describes how quickly obvious uses tend to appear, not how intelligent a player is.

### Easy launch objects

1. Spoon
2. Empty bottle
3. Cardboard box
4. Sock
5. Paper cup
6. Towel

### Playful uncommon launch objects

1. Clothespin
2. Bottle cap
3. Chalk stub
4. Lost button
5. Marble
6. Popsicle stick
7. Pencil shaving
8. Empty cassette case
9. Bread-bag clip
10. Toy block
11. Crayon wrapper
12. Shoelace tip

The home carousel mixes three easy and three uncommon objects rather than presenting an intimidating wall of unusual prompts. All eighteen remain accessible through Explore; nothing is truly locked. The home recommendation excludes recently completed objects, alternates themes and difficulty, prefers well-calibrated objects, and adds bounded randomness. A first-time player receives an easy or medium recommendation after practice; later recommendations gradually introduce more uncommon objects.

### Challenge acceptance checklist

- Recognizable without specialist or regional knowledge
- Not primarily a weapon, drug, medical device, or hazardous material
- Supports at least eight plausible use categories
- Not so broad that nearly every answer is valid
- Has a human-reviewed reference set
- Has accessible text description and a distinct visual silhouette

## 4. Information architecture

```text
Home
├── First-visit 15-second practice
├── Start recommended challenge
├── Explore challenges
├── How it works
└── About the science / privacy

Challenge
├── Ready state
├── Active voice or text capture
├── Review parsed ideas
└── Submit

Results
├── Divergence Score
├── Four score dimensions
├── Rarest idea
├── Category map
├── Community answers
└── Try another object

Optional account (architecture only in MVP)
├── Sign in
├── History
└── Progress
```

## 5. Primary screen flow

1. **Home:** “Give your attention something to make.” The first visit leads with “Show me how” and explains that a 15-second practice comes before the full challenge. Returning visitors can start a recommended challenge or Explore.
2. **Practice ready:** A spoon fills the screen. Copy: “Quick warm-up: give this spoon three new jobs in 15 seconds.” Voice is primary; typing is available. Practice is explicitly unscored and can be skipped by returning visitors.
3. **Practice active:** A friendly 15-second timer and three empty idea positions create direction without failure language. The round finishes at time or when three ideas are captured. Fewer than three still advances.
4. **Practice lesson:** First celebrate the player's ideas. Then reveal three illustrative answers one at a time: “A tiny shovel for planting seeds” (gardening), “A rhythm stick for a kitchen band” (music), and “A mirror for sending a sunlight signal” (communication). Place the player's ideas into categories when possible.
5. **Category coaching:** Explain: “Creative range comes from changing direction. If your first ideas are all tools, try a game, a sound, a costume, a signal, or something for a tiny creature.” Show a small category constellation combining the player's categories and examples. Primary action: “Try the real thing.”
6. **Ready:** The selected object fills the screen. Copy: “Find as many unexpected uses for this as you can. Useful, silly, tiny, ambitious—all welcome.” Voice primary; typing secondary.
7. **Timer information:** Tapping the info icon opens: “Why 60 seconds? A little time pressure helps your brain move past the obvious. This isn’t a test you can fail. Don’t stress—say whatever arrives. You’ve got this.”
8. **Active challenge:** 60-second circular timer, live transcript, parsed idea chips, pause/finish control, and no community content.
9. **Review:** Player can edit, merge, delete, or add ideas so transcription errors do not affect the score.
10. **Processing:** Short, honest progress states: “Untangling your ideas,” “Finding the different directions,” and “Checking what surprised us.”
11. **Results:** Score first, followed by understandable evidence and then community comparison.
12. **Replay:** “Try another tiny object” recommends a not-recently-played challenge. Explore is always available.

### Exceptional paths

- Microphone denied: explain how to enable it and make “Type my ideas” immediately available.
- Unsupported speech capture: use server transcription when configured; otherwise type-only mode.
- Transcription failure: retain the in-browser recording only long enough to retry, then offer typing; discard it when leaving.
- AI analysis unavailable: run deterministic normalization and scoring, label the result as an estimate, and never block completion.
- Network lost: preserve the draft locally and allow retry.

## 6. UX copy

### Home

- Eyebrow: `A one-minute imagination workout`
- Headline: `Give your attention something to make.`
- Supporting copy: `Take one overlooked object. Invent uses it was never meant to have. No right answers. No account needed.`
- Primary action: `Wake up my brain`
- Secondary action: `Choose an object`

### Ready state

- Prompt: `What else could this be?`
- Guidance: `Aim for ten if that feels fun. One wonderfully strange idea still counts.`
- Primary action: `Start talking`
- Secondary action: `I'd rather type`
- Privacy note: `Your recording is transcribed, then discarded.`

### Practice

- Label: `15-second warm-up · not scored`
- Prompt: `Give this spoon three new jobs.`
- Guidance: `Say the first things that arrive. Obvious is a perfectly good place to start.`
- Completion heading: `That’s the move. Now try changing direction.`
- Category explanation: `Ideas become more divergent when they travel into different worlds.`
- Primary action: `Try the real thing`
- Returning-player skip: `Skip warm-up`

### Active state

- Empty transcript: `Your obvious ideas can go first. The strange ones usually arrive after.`
- Idea count: `{count} ideas found`
- Finish action: `I'm done thinking`

### Results

- Heading: `Your brain took {categoryCount} different paths.`
- Score label: `Divergence Score`
- Rarity fallback: `Rare in our current reference set`
- Community threshold copy: `Only {percentage}% of players shared a similar idea`
- Disclaimer: `Inspired by divergent-thinking research. This is a creative exercise, not a medical or diagnostic assessment.`

## 7. Visual direction

The interface is a **pocket cabinet of curiosities**: disciplined, tactile, and slightly mischievous rather than cartoonish.

### Tokens

- `Notebook`: #F7F4ED — page background
- `Ink`: #17223B — primary text
- `Play Blue`: #275DFF — primary action and focus
- `Tangerine`: #FF7139 — timer energy and rare-idea accent
- `Chalk`: #C9F0E4 — success and category fields
- `Pencil`: #FFD766 — supporting highlights

Typography takes inspiration from Instagram's August 2026 wordmark refresh: mostly clean, modern printed forms interrupted by a few lively cursive connections. Unrot applies this hybrid treatment **only** to the custom `Unrot` wordmark. It does not copy Instagram's proprietary lettering or use connected forms anywhere else. Every prompt, heading, timer, button, explanation, result, and interface label uses a highly legible humanist sans; tabular numerals handle the timer. Local/system fallbacks prevent font loading from blocking use.

The signature interaction is the **idea orbit**: each accepted idea becomes a small labeled mark orbiting the object. During results, marks regroup into category constellations. This makes divergent paths visible without a generic dashboard.

Desktop uses a centered two-column stage; mobile makes the challenge a thumb-friendly single column with a sticky input dock. Motion is concentrated in idea arrival and constellation regrouping, with a reduced-motion equivalent.

## 8. Scoring design

The Divergence Score is 0–100:

- **Fluency (25):** Distinct valid ideas. Ten earns the core maximum; the curve rewards early ideas while avoiding pressure to fill a quota.
- **Flexibility (25):** Breadth and balance across conceptual categories. Rephrasing one category repeatedly does not score like exploring several categories.
- **Originality (35):** Rarity of semantic idea clusters for the same object. Seed/reference rarity is used initially; genuine community frequency takes over after sufficient data.
- **Plausibility and elaboration (15):** Whether the proposed use could work under a reasonable interpretation and whether the response explains enough to understand it. Whimsy is not penalized merely for being unusual.

### Calculation

```text
validIdeas = normalize(deduplicate(split(transcript)))
fluency = 25 * min(1, distinctValidIdeas / 10)
flexibility = 25 * min(1, effectiveCategoryBreadth / targetBreadth)
originality = 35 * weightedMean(rarityPercentile per idea)
plausibility = 15 * weightedMean(plausibilityAndDetail per idea)
score = round(fluency + flexibility + originality + plausibility)
```

Category breadth uses a diversity measure so five categories represented evenly score better than one dominant category plus four token ideas. Scores store the algorithm version and component evidence for auditability.

### Rarity calibration

- Before 100 genuine completions for an object: use human-reviewed seed clusters and say “reference set.”
- At 100–499 completions: blend seed and community frequencies with declining seed weight.
- At 500+ completions: community frequency is primary; seeds remain a cold-start prior only.
- Never compare raw strings. Match canonical concepts initially, then embeddings when cluster volume requires semantic retrieval.

MongoDB Atlas Vector Search can be enabled later without moving data to a separate vector database. Embeddings and cluster identifiers remain optional fields.

## 9. Voice and AI pipeline

```text
Browser MediaRecorder
→ FastAPI transcription endpoint
→ TranscriptionProvider (OpenAI first)
→ temporary audio deleted
→ transcript returned
→ player review
→ IdeaAnalysisProvider (OpenAI first)
→ normalized structured ideas
→ deterministic ScoringEngine
→ MongoDB persistence and aggregate update
```

Provider contracts isolate vendors:

```python
class TranscriptionProvider(Protocol):
    async def transcribe(self, audio: bytes, mime_type: str) -> Transcript: ...

class IdeaAnalysisProvider(Protocol):
    async def analyze(self, object_context: ObjectContext, transcript: str) -> IdeaAnalysis: ...
```

The OpenAI provider returns application-owned schemas rather than leaking vendor responses. A local transcription stub and deterministic idea analyzer support tests, demos, and operation without credentials. Provider selection comes from environment configuration.

## 10. Architecture

```text
Next.js web app
├── Responsive UI and accessibility
├── MediaRecorder and typed input
├── Anonymous session ID
├── Local draft/history cache
└── Analytics client
          │ HTTPS
FastAPI service
├── Challenge service
├── Transcription provider port
├── Idea-analysis provider port
├── Versioned scoring engine
├── Result service
├── Aggregate/rarity service
└── Privacy-safe analytics endpoint
          │
MongoDB / MongoDB Atlas
├── challenges
├── attempts
├── idea_clusters
├── object_aggregates
└── users (reserved for optional accounts)
```

The MVP runs locally with Docker Compose or individually. MongoDB is the sole database. The browser never receives OpenAI credentials. FastAPI applies MIME/size limits, request timeouts, structured validation, rate limiting hooks, and correlation IDs.

## 11. Data model

### `challenges`

```json
{
  "_id": "clothespin",
  "name": "Clothespin",
  "prompt": "What else could this be?",
  "description": "A small spring clip used to hold fabric.",
  "theme": "forgotten-drawer",
  "difficulty": 2,
  "targetCategoryBreadth": 6,
  "artKey": "clothespin",
  "active": true,
  "referenceSetVersion": 1,
  "createdAt": "date",
  "updatedAt": "date"
}
```

### `attempts`

```json
{
  "_id": "uuid",
  "anonymousSessionId": "hashed-id",
  "userId": null,
  "challengeId": "clothespin",
  "inputMode": "voice",
  "durationSeconds": 53,
  "transcript": "string",
  "ideas": [{
    "raw": "tiny puppet legs",
    "canonical": "puppet legs",
    "category": "toys-and-performance",
    "clusterId": "cluster-id",
    "valid": true,
    "plausibility": 0.82,
    "elaboration": 0.55,
    "rarityPercentile": 0.91
  }],
  "score": {
    "total": 76,
    "fluency": 20,
    "flexibility": 19,
    "originality": 27,
    "plausibilityElaboration": 10,
    "algorithmVersion": "1.0"
  },
  "comparisonBasis": "reference-set",
  "createdAt": "date"
}
```

### `idea_clusters`

Stores challenge-specific canonical concepts, category, seed/community counts, example phrases, moderation state, optional embedding, and timestamps.

### `object_aggregates`

Stores completion count, per-component distributions, category frequencies, processing version, and last rebuild time. Aggregate updates are idempotent and can later move to a background worker.

## 12. API surface

- `GET /v1/challenges` — active challenge summaries and recent-exclusion support
- `GET /v1/challenges/{id}` — challenge details and readiness metadata; never exposes seed answers
- `POST /v1/transcriptions` — multipart audio to transcript; does not persist audio
- `POST /v1/analyses/preview` — split and normalize ideas for player review
- `POST /v1/attempts` — finalize reviewed ideas, score, persist, and return results
- `GET /v1/attempts/{id}` — retrieve an anonymous attempt using an unguessable receipt token
- `GET /v1/challenges/{id}/community` — community examples, available only with a completed-attempt receipt
- `POST /v1/events` — privacy-safe product analytics
- `GET /health` — readiness status without secrets

All write endpoints use Pydantic validation, idempotency keys, explicit error codes, and bounded payloads.

## 13. Analytics

Events contain anonymous session ID, challenge ID where relevant, timestamp, platform class, and experiment/version identifiers. They do not contain raw audio or full transcripts.

- `home_viewed`
- `challenge_recommended`
- `challenge_selected`
- `timer_info_opened`
- `input_mode_selected`
- `microphone_permission_result`
- `challenge_started`
- `idea_detected`
- `challenge_finished`
- `transcription_failed`
- `ideas_reviewed`
- `score_viewed`
- `score_dimension_opened`
- `community_answers_viewed`
- `next_challenge_started`
- `account_prompt_viewed`

Primary funnel: home viewed → challenge started → challenge finished → score viewed → next challenge started. Guardrail metrics include transcription correction rate, microphone-denial rate, scoring fallback rate, and abandonment during processing.

## 14. Privacy and safety

- Ask for microphone access only after a deliberate tap.
- Show the audio-retention statement before recording.
- Hold audio in memory or an ephemeral temporary file only; delete it immediately after transcription or failure.
- Do not place audio in MongoDB, logs, analytics, backups, or object storage.
- Store text ideas because they are necessary for history, scoring, and community rarity; explain this before submission.
- Hash anonymous session identifiers server-side.
- Do not collect demographic data in MVP.
- Exclude unsafe community examples from public display and add moderation hooks around submissions.
- Keep OpenAI keys server-side and redact provider payloads from logs.
- Provide a delete-this-attempt action using the attempt receipt.

## 15. MVP and V2 boundary

### MVP

- Eighteen curated objects across easy and uncommon difficulty, with human-reviewed seed data
- First-visit 15-second spoon practice, example reveal, and category coaching
- Unlimited anonymous play
- Voice recording with OpenAI transcription
- Typed fallback
- Review/edit step
- OpenAI structured analysis behind provider interfaces
- Deterministic, versioned scoring engine
- Reference-set and early community rarity
- Results and gated community answers
- Local anonymous history
- Responsive, accessible interface
- MongoDB persistence
- Provider stubs/fallbacks and automated tests
- Privacy, science, and methodology pages

### V2

- Optional accounts, cross-device history, and progress trends
- Embeddings and MongoDB Atlas Vector Search
- Mature community percentile calibration
- Background aggregate rebuilding
- Human moderation console
- AI-assisted but human-approved challenge authoring
- Multilingual transcription and localized reference sets
- Adaptive challenge recommendations
- Streaks only if research shows they encourage creation without guilt

### Explicitly out of scope

- Daily challenge
- Social sharing
- Medical or IQ claims
- Real-time multiplayer
- Public raw transcripts
- Automatic AI publishing of challenge objects
- Long-term raw-audio retention

## 16. Testing and acceptance

- Unit tests for timer behavior, recommendation rules, normalization fallback, deduplication, score components, rarity transitions, provider selection, and deletion.
- Unit and UI tests for first-visit practice, three-idea early completion, fewer-than-three advancement, returning-player skip, example reveal order, and category coaching.
- API integration tests for validation, unavailable providers, idempotent attempt creation, result receipts, and community-answer gating.
- UI tests for the primary typed flow and voice-error fallback.
- Responsive visual checks at 375×812, 768×1024, and 1440×900.
- Keyboard navigation, visible focus, semantic names, contrast, reduced motion, and screen-reader announcements for timer and idea arrival.
- Security checks confirm API keys never enter browser bundles and audio never reaches persistence or logs.

The MVP is complete when a fresh visitor can complete the practice lesson, play two different challenges, receive explainable scores, see community ideas only after each completion, and repeat the flow on mobile and desktop without creating an account.
