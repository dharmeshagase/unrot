# Unrot Task 3 Providers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add replaceable transcription and idea-analysis providers plus privacy-safe preview/transcription routes to the current WSGI API.

**Architecture:** Keep application-owned models and provider protocols separate from adapter details. Add a small provider factory driven by environment, deterministic local adapters for offline/demo use, injectable OpenAI HTTP adapters for request-construction tests, and WSGI POST handlers that validate inputs and translate failures to safe JSON.

**Tech Stack:** Python 3.11+, standard library dataclasses/protocols, `unittest`, existing WSGI app.

**Spec:** `work/sdd/unrot-mvp/task-3-brief.md`

## Global Constraints

- External packages cannot be installed.
- Use Python standard library and the current WSGI routing boundary.
- Do not create fake third-party packages.
- OpenAI-specific fields never escape provider adapters.
- Raw audio is held only in memory, never logged or persisted, and the byte reference is released after processing or failure.
- Voice is primary; typing remains complete.
- Support `openai` and `local` provider selection via environment.
- `POST /v1/transcriptions` accepts only `audio/webm`, `audio/wav`, `audio/mpeg`, `audio/mp4` and rejects payloads over 10 MB.
- `POST /v1/analyses/preview` accepts JSON `{challengeId, transcript}` and uses public challenge context.

---

### Task 1: Provider contracts and factory

**Files:**
- Create: `apps/api/unrot_api/providers/contracts.py`
- Create: `apps/api/unrot_api/providers/factory.py`
- Test: `apps/api/tests/providers/test_factory.py`

**Interfaces:**
- Consumes: environment variables `TRANSCRIPTION_PROVIDER`, `IDEA_ANALYSIS_PROVIDER`.
- Produces: `Transcript`, `ObjectContext`, `TranscriptionProvider`, `IdeaAnalysisProvider`, `ProviderConfigurationError`, `build_transcription_provider()`, `build_idea_analysis_provider()`.

- [ ] Write failing tests for local/openai selection and unknown-provider errors.
- [ ] Run the factory tests and confirm import/behavior failure.
- [ ] Implement the minimal contracts and factory logic.
- [ ] Re-run the factory tests and confirm green.

### Task 2: Analysis models and deterministic local analysis

**Files:**
- Create: `apps/api/unrot_api/analysis/models.py`
- Create: `apps/api/unrot_api/providers/local.py`
- Test: `apps/api/tests/providers/test_local_analysis.py`

**Interfaces:**
- Consumes: `ObjectContext`, `Transcript`.
- Produces: `Idea`, `IdeaAnalysis`, `LocalTranscriptionProvider`, `LocalIdeaAnalysisProvider`.

- [ ] Write failing tests for score bounds, split behavior, whitespace/case normalization, spoon alias deduplication, and category assignment.
- [ ] Run the local-analysis tests and confirm they fail for the expected missing behavior.
- [ ] Implement the minimal deterministic local providers and model validation.
- [ ] Re-run the local-analysis tests and confirm green.

### Task 3: OpenAI adapters with injectable transport

**Files:**
- Create: `apps/api/unrot_api/providers/openai_transcription.py`
- Create: `apps/api/unrot_api/providers/openai_analysis.py`
- Test: `apps/api/tests/providers/test_openai_adapters.py`

**Interfaces:**
- Consumes: `OPENAI_API_KEY`, application-owned contracts/models, injectable HTTP transport callable.
- Produces: `OpenAITranscriptionProvider`, `OpenAIIdeaAnalysisProvider`.

- [ ] Write failing tests for transcription request mapping, analysis request mapping, strict response-schema translation, and safe adapter errors.
- [ ] Run the OpenAI adapter tests and confirm they fail for missing adapters or schema mapping.
- [ ] Implement the minimal adapters and transport wrapper contracts.
- [ ] Re-run the adapter tests and confirm green.

### Task 4: WSGI POST routes and safe error handling

**Files:**
- Create: `apps/api/unrot_api/analysis/router.py`
- Modify: `apps/api/unrot_api/challenges/service.py`
- Modify: `apps/api/unrot_api/main.py`
- Test: `apps/api/tests/analysis/test_routes.py`

**Interfaces:**
- Consumes: challenge service, provider factory, WSGI environ/body stream.
- Produces: `POST /v1/transcriptions`, `POST /v1/analyses/preview`, route-safe 400/404/413/415/502 JSON.

- [ ] Write failing route tests for MIME/size/empty checks, preview validation, unknown challenge, provider failure, and privacy expectations around filesystem/log capture.
- [ ] Run the route tests and confirm they fail for missing POST handling or wrong validation.
- [ ] Implement the minimal WSGI POST parsing, provider calls, JSON responses, and public challenge-context lookup.
- [ ] Re-run the route tests and confirm green.

### Task 5: Full verification and reporting

**Files:**
- Create: `work/sdd/unrot-mvp/task-3-report.md`

**Interfaces:**
- Consumes: targeted and full API test runs.
- Produces: exact RED/GREEN evidence report with files touched, tests run, and remaining concerns.

- [ ] Run the full API suite once after targeted tests are green.
- [ ] Record exact command outcomes for each red/green cycle and final suite pass.
- [ ] Write the task report with concrete evidence and unresolved concerns.
