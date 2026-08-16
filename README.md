# Unrot MVP

Unrot is a one-minute divergent-thinking exercise with typed input, optional configured voice capture, review-before-submit, result scoring, reference examples, privacy notes, and privacy-safe analytics.

## Local prerequisites

- Python 3.11+
- `pnpm`
- PowerShell
- Optional for Mongo persistence: MongoDB 8 and `pymongo`

## Quick start

1. Copy the local environment template:

   ```powershell
   Copy-Item .env.example .env
   ```

2. Generate your own receipt secret if you do not want to keep the safe demo placeholder:

   ```powershell
   python -c "import secrets; print(secrets.token_urlsafe(32))"
   ```

   Put the generated value into `ATTEMPT_RECEIPT_SECRET` in `.env`.

3. Start the API from the repository root. It loads the root `.env` automatically, while any environment variables already set in the terminal take precedence:

   ```powershell
   $env:PYTHONPATH = (Resolve-Path 'apps/api').Path
   python -m unrot_api.main
   ```

   API health: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)

4. Start the web app from the repository root in a second terminal:

   ```powershell
   pnpm run dev:web
   ```

   Web app: [http://127.0.0.1:3000](http://127.0.0.1:3000)

The web dev server proxies same-origin `/v1/*` calls to the API on port `8000`, so local browser flows work without extra CORS setup.

## Safe local demo setup

The checked-in `.env.example` is intentionally safe:

- `TRANSCRIPTION_PROVIDER=local`
- `IDEA_ANALYSIS_PROVIDER=local`
- `ATTEMPT_REPOSITORY=memory`
- `OPENAI_API_KEY=` is blank
- `ATTEMPT_RECEIPT_SECRET` uses a non-production placeholder

That setup is enough for the full typed flow without OpenAI or MongoDB. Local transcription is intentionally unavailable: the app makes typing primary and never invents a transcript for recorded audio. Local idea analysis remains available for scoring.

## OpenAI setup

Set:

```env
OPENAI_API_KEY=your_key_here
```

Then choose either or both OpenAI-backed providers independently:

```env
TRANSCRIPTION_PROVIDER=openai
IDEA_ANALYSIS_PROVIDER=openai
```

Mixed mode is supported. Examples:

- Local transcription + OpenAI analysis:

  ```env
  TRANSCRIPTION_PROVIDER=local
  IDEA_ANALYSIS_PROVIDER=openai
  ```

- OpenAI transcription + local analysis:

  ```env
  TRANSCRIPTION_PROVIDER=openai
  IDEA_ANALYSIS_PROVIDER=local
  ```

The app reads `/v1/capabilities` before presenting input choices. With OpenAI transcription configured, voice is primary; otherwise the UI labels voice unavailable and starts with typing.

## Adding another provider adapter

To add a third provider without changing app-owned request or response schemas:

1. Implement `TranscriptionProvider` or `IdeaAnalysisProvider` from `apps/api/unrot_api/providers/contracts.py` in a new adapter module.
2. Add the provider name to the corresponding factory branch in `apps/api/unrot_api/providers/factory.py`.
3. Update `provider_capabilities()` if the adapter changes voice availability.
4. Add adapter contract tests with a fake transport, plus factory and failure-mapping tests. Keep provider-specific payloads inside the adapter.

## MongoDB / PyMongo persistence

Default attempt persistence is in-memory. To enable Mongo-backed attempts:

1. Install PyMongo once:

   ```powershell
   python -m pip install pymongo
   ```

2. Start MongoDB:

   ```powershell
   docker compose up -d mongo
   ```

3. Set:

   ```env
   ATTEMPT_REPOSITORY=mongo
   MONGODB_URI=mongodb://localhost:27017
   MONGODB_DATABASE=unrot
   ```

Analytics stays in its bounded in-memory demo store either way.

## Result route hosting notes

Static result pages need one of these deployment patterns:

- Preferred rewrite: rewrite `/results/*` to `/results/index.html`
- Secure static fallback: `/results/?attempt={attemptId}#receipt={receipt}` (or keep the attempt id in `/results/{attemptId}/` and use the same `#receipt={receipt}` fragment)

The results client reads the receipt from the fragment and immediately scrubs it with `history.replaceState` before loading the result. URL fragments are not sent to the server, written to server access logs, or forwarded in the `Referer` header.

The local dev server supports `/results/{attemptId}/` directly.

## Commands

Web dev:

```powershell
pnpm run dev:web
```

Focused API analytics tests:

```powershell
$env:PYTHONPATH = (Resolve-Path 'apps/api').Path
python -m unittest apps.api.tests.analytics.test_routes -v
```

Focused web checks:

```powershell
pnpm run test:web
```

Basic API route smoke:

```powershell
$env:PYTHONPATH = (Resolve-Path 'apps/api').Path
python -m unittest apps.api.tests.test_health apps.api.tests.test_discovery -v
```

Web build:

```powershell
pnpm run build:web
```

## Privacy and methodology references

- [docs/privacy.md](docs/privacy.md)
- [docs/methodology.md](docs/methodology.md)

## Explicit QA checklist

The delivery checks above are intentionally focused. Full hands-on QA is still required.

- Desktop typed flow: home -> challenge -> review -> result
- Desktop voice flow with OpenAI transcription configured: permission grant, live capture, review, result
- Desktop voice fallback: denied microphone, unsupported browser, failed processing
- Mobile typed flow: home, challenge, sticky input, review, result
- Mobile voice flow with OpenAI transcription configured: permission prompt, recording, review, result
- Result reload from the same browser session using stored receipt/history
- Static result fallback route with the attempt id in the path or query and the receipt in a scrubbed fragment
- Explore page challenge selection from both difficulty groups
- Privacy page and About page content render correctly
- Local provider mode presents typing as primary and works with no `OPENAI_API_KEY`
- Mixed provider modes work when only one provider is set to `openai`
