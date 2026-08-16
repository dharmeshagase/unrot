function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function comparisonCopy(basis) {
  if (basis === "community") {
    return "Compared against completed community answers for this object.";
  }
  if (basis === "blended") {
    return "Estimated from a blend of our reference set and early community answers.";
  }
  return "Estimated from our current reference set for this object.";
}

function componentCards(score) {
  return [
    {
      id: "fluency",
      label: "Fluency",
      value: score.fluency,
      maximum: 25,
      explanation: "More distinct ideas gave this score room to grow."
    },
    {
      id: "flexibility",
      label: "Flexibility",
      value: score.flexibility,
      maximum: 25,
      explanation: "You changed categories instead of circling one lane."
    },
    {
      id: "originality",
      label: "Originality",
      value: score.originality,
      maximum: 35,
      explanation: "The rarer ideas in this set lifted the originality score."
    },
    {
      id: "plausibility_elaboration",
      label: "Plausibility + elaboration",
      value: score.plausibilityElaboration,
      maximum: 15,
      explanation: "The clearer and more workable the ideas felt, the more this rose."
    }
  ]
    .map((component) => `<details class="result-card" data-score-dimension="${escapeHtml(component.id)}">
      <summary>
        <p class="eyebrow">${escapeHtml(component.label)}</p>
        <h3>${escapeHtml(component.value)} / ${escapeHtml(component.maximum)}</h3>
      </summary>
      <p>${escapeHtml(component.explanation)}</p>
    </details>`)
    .join("");
}

function constellation(categories = [], renderObjectArt, challenge) {
  const ideaMarkup = categories.map((category) => {
    const ideas = Array.isArray(category.ideas) ? category.ideas.filter(Boolean) : [];
    return `<article class="player-star" role="listitem">
        <span class="player-star-dot" aria-hidden="true"></span>
        <p>${escapeHtml(category.count)} idea${category.count === 1 ? "" : "s"}</p>
        <strong>${escapeHtml(category.category)}</strong>
        ${ideas.length ? `<ul class="star-idea-list">${ideas.map((idea) => `<li>${escapeHtml(idea)}</li>`).join("")}</ul>` : ""}
      </article>`;
  }).join("");
  return `<section class="results-constellation" aria-labelledby="constellation-heading">
    <div class="constellation">
      <div class="constellation-object">${renderObjectArt({ artKey: challenge.artKey, name: challenge.name, decorative: true })}</div>
      <div class="constellation-stars" role="list" aria-label="Idea categories and example ideas">
        ${ideaMarkup}
      </div>
    </div>
    <div class="coaching-note">
      <h2 id="constellation-heading">Your idea constellation</h2>
      <p>Each cluster shows one direction your thinking took around this object.</p>
    </div>
  </section>`;
}

function communityBlock(community = {}) {
  const isCommunity = community.sourceKind === "community";
  const heading = isCommunity ? "Ideas from the community" : "Ideas from the reference set";
  const noun = isCommunity ? "Community ideas" : "Reference examples";
  if (community.error) {
    return `<section class="community-panel" aria-labelledby="community-heading">
      <h2 id="community-heading">${heading}</h2>
      <p>${noun} will appear when they’re ready again.</p>
    </section>`;
  }
  const items = Array.isArray(community.items) ? community.items : [];
  if (!items.length) {
    return `<section class="community-panel" aria-labelledby="community-heading">
      <h2 id="community-heading">${heading}</h2>
      <p>No ${isCommunity ? "moderated community ideas" : "reference examples"} are ready for this object yet.</p>
    </section>`;
  }
  return `<section class="community-panel" aria-labelledby="community-heading">
    <h2 id="community-heading">${heading}</h2>
    <ul class="community-list">${items.map((item) => `<li>
      <strong>${escapeHtml(item.examplePhrase)}</strong>
      <span>${escapeHtml(item.category)}</span>
    </li>`).join("")}</ul>
  </section>`;
}

export default function ResultsView({
  challenge,
  attempt,
  community,
  nextChallenge,
  renderObjectArt
} = {}) {
  const comparisonBasis = attempt?.score?.comparisonBasis ?? "reference-set";
  const categoryIdeas = new Map();
  for (const idea of Array.isArray(attempt?.ideas) ? attempt.ideas : []) {
    const key = String(idea?.category ?? "").trim();
    if (!key) continue;
    if (!categoryIdeas.has(key)) categoryIdeas.set(key, []);
    categoryIdeas.get(key).push(String(idea?.canonical ?? idea?.raw ?? "").trim());
  }
  const categories = (Array.isArray(attempt?.categories) ? attempt.categories : []).map((category, index) => ({
    ...category,
    index,
    ideas: (categoryIdeas.get(String(category?.category ?? "").trim()) ?? []).slice(0, 3)
  }));
  const categoryCount = categories.length;
  return `<div class="results-page">
    <section class="results-hero" aria-labelledby="results-heading">
      <div class="hero-copy">
        <p class="eyebrow">Creative result</p>
        <h1 id="results-heading">Your brain took ${escapeHtml(categoryCount)} different paths.</h1>
        <div class="score-badge"><span>Divergence Score</span><strong>${escapeHtml(attempt?.score?.total ?? 0)} / 100</strong></div>
        <p class="comparison-copy">${escapeHtml(comparisonCopy(comparisonBasis))}</p>
        <p class="result-disclaimer">Inspired by divergent-thinking research. This is a creative exercise, not a medical or diagnostic assessment.</p>
      </div>
      <div class="challenge-stage results-object-stage">
        <div class="challenge-object">${renderObjectArt({ artKey: challenge.artKey, name: challenge.name })}</div>
        <p class="challenge-object-label">${escapeHtml(challenge.name)}</p>
      </div>
    </section>
    <section class="results-grid" aria-label="Score details">${componentCards(attempt.score)}</section>
    <section class="rarest-idea-panel" aria-labelledby="rarest-heading">
      <p class="eyebrow">Rarest idea</p>
      <h2 id="rarest-heading">${escapeHtml(attempt.rarestIdea || "Still taking shape")}</h2>
    </section>
    ${constellation(categories, renderObjectArt, challenge)}
    ${communityBlock(community)}
    <section class="result-actions">
      <a class="button button-primary" href="/challenge/${escapeHtml(nextChallenge.slug)}">Try another tiny object</a>
      <a class="button button-secondary" href="/explore">Explore</a>
      <button class="button button-secondary" type="button" data-delete-attempt>Delete this attempt</button>
    </section>
    <p class="deletion-status" role="status" aria-live="polite" data-deletion-status></p>
  </div>`;
}
