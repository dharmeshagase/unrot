export default function ResultsPage({ attemptId = "", renderWordmark } = {}) {
  return `<header class="site-header">
    ${renderWordmark({ compact: true })}
    <nav aria-label="Main navigation"><a class="quiet-link" href="/explore">Explore</a><a class="quiet-link" href="/about">About</a></nav>
  </header>
  <main id="main-content" class="results-shell-page">
    <section class="results-shell" data-results-root data-attempt-id="${attemptId}">
      <p class="eyebrow">Loading result</p>
      <h1>Loading your result</h1>
      <p>Your score, category map, idea clusters, and community answers are on the way.</p>
    </section>
  </main>
  <script type="module" src="/results.js"></script>`;
}
