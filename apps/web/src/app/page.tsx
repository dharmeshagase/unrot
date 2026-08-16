export function getHomeActions(practiceComplete) {
  return practiceComplete
    ? [
        { label: "Wake up my brain", href: "/challenge/spoon", kind: "primary" },
        { label: "Choose an object", href: "/explore", kind: "secondary" }
      ]
    : [{ label: "Show me how", href: "/practice", kind: "primary" }];
}

function renderActions(actions) {
  return actions.map((action) => `<a class="button button-${action.kind}" href="${action.href}">${action.label}</a>`).join("");
}

export default function HomePage({ renderWordmark, renderObjectArt, renderChallengeCard, catalog = [] } = {}) {
  const easy = catalog.filter((item) => item.difficulty === "easy").slice(0, 3);
  const uncommon = catalog.filter((item) => item.difficulty === "uncommon").slice(0, 3);
  const renderShelf = (items) => items.map((challenge) => renderChallengeCard({ challenge, renderObjectArt, home: true })).join("");

  return `<header class="site-header">
    ${renderWordmark({ compact: true })}
    <nav aria-label="Main navigation"><a class="quiet-link" href="/about">About</a></nav>
  </header>
  <main id="main-content">
    <section class="home-hero" aria-labelledby="home-heading">
      <div class="hero-copy">
        <p class="eyebrow">A one-minute imagination workout</p>
        <h1 id="home-heading">Give your attention something to make.</h1>
        <p class="supporting-copy">Take one overlooked object. Invent uses it was never meant to have. No right answers. No account needed.</p>
        <div class="action-row" data-home-actions>${renderActions(getHomeActions(false))}</div>
        <p class="first-visit-note" data-first-visit-note>A 15-second spoon warm-up shows you the trick. It is not scored.</p>
      </div>
      <div class="object-stage home-object-stage" aria-label="A spoon surrounded by possible ideas">
        <p class="stage-label">Today’s overlooked thing</p>
        <div class="orbit orbit-one" aria-hidden="true"><span>signal</span></div>
        <div class="orbit orbit-two" aria-hidden="true"><span>tiny tool</span></div>
        <div class="orbit orbit-three" aria-hidden="true"><span>music</span></div>
        <div class="featured-object">${renderObjectArt({ artKey: "spoon", name: "Spoon" })}</div>
        <p class="object-caption"><strong>Spoon</strong><span>One object. Many directions.</span></p>
      </div>
    </section>
    <section class="cabinet-section" aria-labelledby="cabinet-heading">
      <div class="section-intro"><p class="eyebrow">Pick up something small</p><h2 id="cabinet-heading">Six doors into the cabinet</h2><a class="quiet-link" href="/explore">See all 18 objects <span aria-hidden="true">→</span></a></div>
      <div class="home-shelves">
        <section aria-labelledby="easy-heading"><h3 id="easy-heading" class="shelf-heading"><span>Easy starts</span><small>Familiar shapes, quick first ideas</small></h3><div class="challenge-grid home-grid">${renderShelf(easy)}</div></section>
        <section aria-labelledby="strange-heading"><h3 id="strange-heading" class="shelf-heading"><span>Stranger little things</span><small>For when your brain wants a side door</small></h3><div class="challenge-grid home-grid">${renderShelf(uncommon)}</div></section>
      </div>
    </section>
  </main>
  <footer class="site-footer"><p>Look closely. Change direction. Make something.</p></footer>
  <script type="module" src="/home.js"></script>`;
}
