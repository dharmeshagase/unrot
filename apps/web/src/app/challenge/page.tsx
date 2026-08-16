export default function ChallengePage({
  challenge,
  renderWordmark,
  renderObjectArt,
  renderChallengeExperience
} = {}) {
  return `<header class="site-header">
    ${renderWordmark({ compact: true })}
    <nav aria-label="Main navigation"><a class="quiet-link" href="/explore">Explore</a><a class="quiet-link" href="/privacy">Privacy</a></nav>
  </header>
  <main id="main-content" class="challenge-page">
    <div data-challenge-root data-challenge-slug="${challenge.slug}">${renderChallengeExperience({
      challenge,
      state: { phase: "ready" },
      renderObjectArt
    })}</div>
  </main>
  <script type="module" src="/challenge.js"></script>`;
}
