const TIMER_INFO_COPY =
  "Why 60 seconds? A little time pressure helps your brain move past the obvious. This isn’t a test you can fail. Don’t stress—say whatever arrives. You’ve got this.";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttribute(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;");
}

function challengeIntro(challenge, renderObjectArt) {
  return `<div class="challenge-stage">
    <div class="challenge-object">${renderObjectArt({ artKey: challenge.artKey, name: challenge.name })}</div>
    <p class="challenge-object-label">${escapeHtml(challenge.name)}</p>
  </div>`;
}

function infoDialog() {
  return `<div class="challenge-info-shell">
    <button class="timer-info-button" type="button" aria-label="Why 60 seconds?" data-open-timer-info>Why 60 seconds?</button>
    <div class="timer-info-dialog" role="dialog" aria-modal="true" aria-labelledby="timer-info-title" hidden data-timer-dialog>
      <div class="timer-info-card">
        <h2 id="timer-info-title">Why 60 seconds?</h2>
        <p>${TIMER_INFO_COPY}</p>
        <button class="button button-secondary timer-info-close" type="button" data-close-timer-info>Close</button>
      </div>
    </div>
  </div>`;
}

function readyView(challenge, state, renderObjectArt) {
  const voiceAvailable = state?.voiceAvailable === true;
  const actions = voiceAvailable
    ? `<button class="button button-voice" type="button" data-start-voice>Start talking</button>
      <button class="button button-secondary" type="button" data-start-typed>I’d rather type</button>`
    : `<button class="button button-primary" type="button" data-start-typed>Start typing</button>`;
  return `<section class="challenge-copy" aria-labelledby="challenge-heading">
    <p class="eyebrow">One-minute challenge</p>
    <h1 id="challenge-heading">${escapeHtml(challenge.prompt)}</h1>
    <p class="challenge-guidance">Find as many unexpected uses for this as you can. Useful, silly, tiny, ambitious—all welcome.</p>
    <div class="action-row">
      ${actions}
    </div>
    <p class="voice-note">${voiceAvailable
      ? "Your recording is transcribed, then discarded."
      : "Voice is unavailable in this local demo. Typing is the full experience."}</p>
    ${infoDialog()}
  </section>
  ${challengeIntro(challenge, renderObjectArt)}`;
}

function ideaChipList(ideas = []) {
  if (!ideas.length) {
    return `<p class="challenge-placeholder">Your obvious ideas can go first. The strange ones usually arrive after.</p>`;
  }
  return `<ul class="idea-chip-list">${ideas.map((idea) => `<li class="idea-chip">${escapeHtml(idea)}</li>`).join("")}</ul>`;
}

function activeView(challenge, state, renderObjectArt) {
  const typedMode = state.inputMode === "text";
  const transcriptCopy = state.interimTranscript || state.transcript || "Transcript arrives here as you build ideas.";
  const liveIdeas = typedMode ? state.typedIdeas : (state.interimTranscript ? [state.interimTranscript] : state.typedIdeas);
  return `<section class="challenge-copy challenge-active" aria-labelledby="challenge-heading">
    <p class="eyebrow">${typedMode ? "Typed path" : "Voice path"}</p>
    <h1 id="challenge-heading">${escapeHtml(challenge.prompt)}</h1>
    <div class="challenge-timer-row">
      <output class="challenge-timer" aria-label="${escapeAttribute(state.secondsLeft)} seconds remaining" data-challenge-timer>${escapeHtml(state.secondsLeft)}</output>
      <span>seconds</span>
      ${infoDialog()}
    </div>
    <div class="challenge-controls">
      <button class="button button-secondary" type="button" data-toggle-pause>${state.isPaused ? "Resume" : "Pause"}</button>
      <button class="button button-primary" type="button" data-finish-challenge>I’m done thinking</button>
    </div>
    ${state.voiceFallbackMessage ? `<p class="voice-fallback">${escapeHtml(state.voiceFallbackMessage)}</p>` : ""}
    <p class="challenge-status" role="status">${escapeHtml(state.liveStatus || "Keep changing direction.")}</p>
    <div class="challenge-transcript-panel">
      <h2>Transcript</h2>
      <p class="challenge-transcript">${escapeHtml(transcriptCopy)}</p>
    </div>
    <div class="challenge-ideas-panel">
      <h2>${typedMode ? "Idea chips" : "Live idea chips"}</h2>
      ${ideaChipList(liveIdeas)}
    </div>
    <form class="idea-dock" data-typed-idea-form autocomplete="off">
      <label for="challenge-idea">Type one idea at a time</label>
      <div class="idea-input-row">
        <input id="challenge-idea" name="idea" type="text" maxlength="140" placeholder="A tiny stage for ants…" />
        <button class="button button-primary idea-add" type="submit">Add idea</button>
      </div>
    </form>
  </section>
  ${challengeIntro(challenge, renderObjectArt)}`;
}

function reviewIdeaRows(reviewIdeas = []) {
  return reviewIdeas.map((idea, index) => `<li class="review-idea" data-review-id="${escapeAttribute(idea.id)}">
    <label class="sr-only" for="review-idea-${index}">Idea ${index + 1}</label>
    <input id="review-idea-${index}" class="review-input" type="text" value="${escapeAttribute(idea.raw)}" data-review-input="${escapeAttribute(idea.id)}" />
    <p class="review-meta"><strong>${escapeHtml(idea.category)}</strong><span>plausibility ${escapeHtml(idea.plausibility)}</span></p>
    <div class="review-actions">
      ${index > 0 ? `<button class="button button-secondary review-action" type="button" data-merge-review="${escapeAttribute(idea.id)}">Merge with the one above</button>` : ""}
      <button class="button button-secondary review-action" type="button" data-delete-review="${escapeAttribute(idea.id)}">Delete</button>
    </div>
  </li>`).join("");
}

function reviewView(challenge, state, renderObjectArt) {
  return `<section class="challenge-copy challenge-review" aria-labelledby="review-heading">
    <p class="eyebrow">Review before scoring</p>
    <h1 id="review-heading">Review your ideas</h1>
    <p class="challenge-guidance">Edit, merge, delete, or add ideas so transcription hiccups do not count against you.</p>
    <p class="retention-notice">Your submitted text ideas are retained for scoring and rarity comparison. You can delete the attempt from its result page.</p>
    ${state.networkNotice ? `<p class="network-notice">${escapeHtml(state.networkNotice)}</p>` : ""}
    <ol class="review-idea-list">${reviewIdeaRows(state.reviewIdeas)}</ol>
    <form class="review-add-form" data-review-add-form autocomplete="off">
      <label for="review-add-idea">Add another idea</label>
      <div class="idea-input-row">
        <input id="review-add-idea" name="draft" type="text" maxlength="140" value="${escapeAttribute(state.draftValue ?? "")}" />
        <button class="button button-secondary idea-add" type="submit">Add another idea</button>
      </div>
    </form>
    <button class="button button-primary" type="button" data-submit-review>Submit for my result</button>
  </section>
  ${challengeIntro(challenge, renderObjectArt)}`;
}

function processingView(challenge, state, renderObjectArt) {
  return `<section class="challenge-copy challenge-processing" aria-labelledby="processing-heading">
    <p class="eyebrow">Scoring your round</p>
    <h1 id="processing-heading">${escapeHtml(state.processingMessage || "Untangling your ideas")}</h1>
    <p class="challenge-guidance">We’re turning your reviewed ideas into clear categories and rarity cues.</p>
  </section>
  ${challengeIntro(challenge, renderObjectArt)}`;
}

export default function ChallengeExperience({ challenge, state = { phase: "ready" }, renderObjectArt } = {}) {
  if (state.phase === "active") return activeView(challenge, state, renderObjectArt);
  if (state.phase === "review") return reviewView(challenge, state, renderObjectArt);
  if (state.phase === "processing") return processingView(challenge, state, renderObjectArt);
  return readyView(challenge, state, renderObjectArt);
}

export { TIMER_INFO_COPY };
