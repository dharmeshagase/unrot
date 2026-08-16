function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export default function ChallengeCard({ challenge, renderObjectArt, home = false } = {}) {
  const art = renderObjectArt({ artKey: challenge.artKey, name: challenge.name });
  const difficulty = challenge.difficulty === "easy" ? "Easy start" : "Stranger little thing";
  return `<article class="challenge-card" data-challenge-card="${escapeHtml(challenge.slug)}"${home ? ` data-home-challenge="${escapeHtml(challenge.slug)}"` : ""}>
    <div class="challenge-art-field">${art}<span class="cabinet-pin" aria-hidden="true"></span></div>
    <div class="challenge-card-copy">
      <p class="difficulty-tag">${difficulty}</p>
      <h3>${escapeHtml(challenge.name)}</h3>
      <p>${escapeHtml(challenge.description)}</p>
      <a class="card-start" href="/challenge/${escapeHtml(challenge.slug)}" aria-label="Start ${escapeHtml(challenge.name)} challenge">Start</a>
    </div>
  </article>`;
}
