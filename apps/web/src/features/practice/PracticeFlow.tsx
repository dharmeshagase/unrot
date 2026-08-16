const EXAMPLES = [
  { answer: "A tiny shovel for planting seeds", category: "Gardening" },
  { answer: "A rhythm stick for a kitchen band", category: "Music" },
  { answer: "A mirror for sending a sunlight signal", category: "Communication" }
];

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttribute(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;");
}

function ideaPositions(ideas = []) {
  return [0, 1, 2].map((index) => {
    const idea = ideas[index];
    return `<li class="idea-position${idea ? " idea-filled" : ""}">
      <span class="idea-number" aria-hidden="true">${index + 1}</span>
      <span>${idea ? escapeHtml(idea) : `Idea ${index + 1} waits here`}</span>
    </li>`;
  }).join("");
}

function ideaForm({ enabled, ideas = [] }) {
  return `<form class="idea-form" data-idea-form autocomplete="off">
    <label for="practice-idea">Type an idea</label>
    <div class="idea-input-row">
      <input id="practice-idea" name="idea" type="text" maxlength="120" placeholder="A bookmark for a giant…" ${enabled ? "" : "disabled"} aria-describedby="idea-help" />
      <button class="button button-primary idea-add" type="submit" ${enabled ? "" : "disabled"}>Add idea</button>
    </div>
    <p id="idea-help" class="input-help">Press Enter or tap Add idea. ${3 - ideas.length} ${3 - ideas.length === 1 ? "space" : "spaces"} left.</p>
  </form>`;
}

function ideaDock(content) {
  return `<div class="idea-form-dock">${content}</div>`;
}

function playerStars(ideas = [], categorizeIdea = () => "Fresh path") {
  return ideas.map((idea, index) => {
    const category = categorizeIdea(idea) || "Fresh path";
    return `<article class="player-star player-star-${index + 1}" data-player-star="${escapeAttribute(category)}">
      <span class="player-star-dot" aria-hidden="true"></span>
      <p>${escapeHtml(idea)}</p>
      <strong>${escapeHtml(category)}</strong>
    </article>`;
  }).join("");
}

function readyView(showSkip = false) {
  return `<section class="practice-copy" aria-labelledby="practice-heading">
    <p class="eyebrow">15-second warm-up · not scored</p>
    <h1 id="practice-heading">Give this spoon three new jobs.</h1>
    <p class="practice-guidance">Type the first things that arrive. Obvious is a perfectly good place to start.</p>
    <button class="button button-primary" type="button" data-start-practice><span class="sr-only">Start warm-up. </span>Start typing</button>
    <p class="voice-note">This warm-up works completely by typing.</p>
    ${showSkip ? '<a class="quiet-link skip-link" href="/challenge/spoon" data-skip-practice>Skip warm-up</a>' : ""}
  </section>
  <section class="practice-panel" aria-label="Three idea positions">
    <div class="timer-shell timer-idle"><output class="timer" aria-label="15 seconds when started">15</output><span>seconds</span></div>
    <ol class="idea-positions">${ideaPositions()}</ol>
    ${ideaDock(ideaForm({ enabled: false }))}
  </section>`;
}

function activeView(state) {
  return `<section class="practice-copy" aria-labelledby="practice-heading">
    <p class="eyebrow">15-second warm-up · not scored</p>
    <h1 id="practice-heading">Give this spoon three new jobs.</h1>
    <p class="practice-guidance">Keep moving. Every direction counts.</p>
    <p class="sr-only" role="status">Warm-up started. Add up to three typed ideas.</p>
  </section>
  <section class="practice-panel" aria-label="Active warm-up">
    <div class="timer-shell"><output class="timer" data-practice-timer aria-label="${state.secondsLeft} seconds remaining">${state.secondsLeft}</output><span>seconds</span></div>
    <ol class="idea-positions" data-idea-list>${ideaPositions(state.ideas)}</ol>
    ${ideaDock(ideaForm({ enabled: true, ideas: state.ideas }))}
  </section>`;
}

function lessonView(state, categorizeIdea = () => "Fresh path", renderObjectArt = () => "") {
  const userIdeas = state.ideas.length
    ? `<section class="your-ideas"><p class="lesson-kicker">Your ${state.ideas.length === 3 ? "three" : state.ideas.length} ${state.ideas.length === 1 ? "idea" : "ideas"}</p><ul>${state.ideas.map((idea) => `<li>${escapeHtml(idea)}</li>`).join("")}</ul></section>`
    : `<section class="your-ideas"><p class="lesson-kicker">Your turn still counted</p><p>You showed up and gave the object your attention. That is the move.</p></section>`;
  return `<section class="lesson-view" aria-labelledby="lesson-heading">
    <div class="lesson-copy">
      <p class="eyebrow">Warm-up complete</p>
      <p class="sr-only" role="status">Warm-up complete. Your ideas are ready to explore by category.</p>
      <h1 id="lesson-heading" tabindex="-1">That’s the move. Now try changing direction.</h1>
      <p class="practice-guidance">Ideas become more divergent when they travel into different worlds.</p>
      ${userIdeas}
    </div>
    <div class="constellation" aria-label="Three example ideas in different categories">
      <div class="constellation-object" aria-hidden="true">${renderObjectArt({ artKey: "spoon", name: "Spoon", decorative: true })}</div>
      ${playerStars(state.ideas, categorizeIdea)}
      ${EXAMPLES.map((example, index) => `<article class="example-star example-star-${index + 1}" style="--reveal-order:${index + 1}"><span class="star-dot" aria-hidden="true"></span><p>${example.answer}</p><strong>${example.category}</strong></article>`).join("")}
    </div>
    <div class="coaching-note"><h2>Change worlds, not just words.</h2><p>Creative range comes from changing direction. If your first ideas are all tools, try a game, a sound, a costume, a signal, or something for a tiny creature.</p></div>
    <a class="button button-primary lesson-cta" href="/challenge/spoon">Try the real thing</a>
  </section>`;
}

export default function PracticeFlow({ state = { step: "ready" }, showSkip = false, categorizeIdea, renderObjectArt } = {}) {
  if (state.step === "lesson") return lessonView(state, categorizeIdea, renderObjectArt);
  if (state.step === "active") return activeView(state);
  return readyView(showSkip);
}
