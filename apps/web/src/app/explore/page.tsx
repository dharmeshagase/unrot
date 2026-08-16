function renderGroup({ id, title, note, items, renderChallengeCard, renderObjectArt }) {
  return `<section class="explore-group" data-filter-group="${id}" aria-labelledby="${id}-heading">
    <div class="shelf-heading shelf-heading-wide"><h2 id="${id}-heading">${title}</h2><p>${note}</p><span>${items.length} objects</span></div>
    <div class="challenge-grid explore-grid">${items.map((challenge) => renderChallengeCard({ challenge, renderObjectArt })).join("")}</div>
  </section>`;
}

export default function ExplorePage({ renderWordmark, renderObjectArt, renderChallengeCard, catalog = [] } = {}) {
  const easy = catalog.filter((item) => item.difficulty === "easy");
  const uncommon = catalog.filter((item) => item.difficulty === "uncommon");
  return `<header class="site-header">
    ${renderWordmark({ compact: true })}
    <nav aria-label="Main navigation"><a class="quiet-link" href="/">Home</a><a class="quiet-link" href="/about">About</a></nav>
  </header>
  <main id="main-content" class="explore-page">
    <section class="explore-intro" aria-labelledby="explore-heading">
      <p class="eyebrow">18 overlooked objects</p>
      <h1 id="explore-heading">Browse the curiosity cabinet.</h1>
      <p>Start somewhere familiar or choose the odd little thing that makes you pause. Nothing is locked.</p>
      <div class="filter-links" role="group" aria-label="Jump to a difficulty">
        <a class="filter-chip" href="#easy-starts">Easy starts</a>
        <a class="filter-chip" href="#stranger-things">Stranger little things</a>
      </div>
    </section>
    <div class="catalog-status" role="status" aria-live="polite" data-catalog-status>Showing the full offline catalog.</div>
    ${renderGroup({ id: "easy-starts", title: "Easy starts", note: "Familiar enough to get moving before you overthink it.", items: easy, renderChallengeCard, renderObjectArt })}
    ${renderGroup({ id: "stranger-things", title: "Stranger little things", note: "Pocket-sized prompts for more surprising directions.", items: uncommon, renderChallengeCard, renderObjectArt })}
  </main>
  <footer class="site-footer"><a class="quiet-link" href="/">Back home</a></footer>
  <script type="module" src="/explore.js"></script>`;
}
