export default function AboutPage({ renderWordmark } = {}) {
  return `<header class="site-header">
    ${renderWordmark({ compact: true })}
    <nav aria-label="Main navigation"><a class="quiet-link" href="/">Home</a><a class="quiet-link" href="/privacy">Privacy</a></nav>
  </header>
  <main id="main-content" class="static-page">
    <p class="eyebrow">About the exercise</p>
    <h1>About the science behind Unrot</h1>
    <p>Unrot is inspired by J. P. Guilford’s Alternate Uses Test, a classic divergent-thinking prompt that asks people to imagine many new uses for an ordinary object.</p>
    <p>Divergent thinking is about range, not perfection. The score breaks the round into four plain-language dimensions: fluency, flexibility, originality, and plausibility and elaboration.</p>
    <ul class="science-list">
      <li><strong>Fluency</strong> tracks how many distinct ideas you found.</li>
      <li><strong>Flexibility</strong> tracks how many conceptual directions you changed into.</li>
      <li><strong>Originality</strong> tracks how rare each idea is for the same object.</li>
      <li><strong>Plausibility and elaboration</strong> track whether the idea is understandable and workable enough to picture.</li>
    </ul>
    <p class="result-disclaimer">Inspired by divergent-thinking research. This is a creative exercise, not a medical or diagnostic assessment.</p>
  </main>`;
}
