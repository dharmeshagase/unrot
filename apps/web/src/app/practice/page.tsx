export default function PracticePage({ renderWordmark, renderObjectArt, renderPracticeFlow } = {}) {
  return `<header class="site-header practice-header">
    ${renderWordmark({ compact: true })}
    <a class="quiet-link" href="/">Close</a>
  </header>
  <main id="main-content" class="practice-page">
    <div class="practice-object" aria-hidden="true">${renderObjectArt({ artKey: "spoon", name: "Spoon", decorative: true })}<span class="practice-object-label">spoon</span></div>
    <div class="practice-root" data-practice-root>${renderPracticeFlow({ state: { step: "ready" } })}</div>
  </main>
  <script type="module" src="/practice.js"></script>`;
}
