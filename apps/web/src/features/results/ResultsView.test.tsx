import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

async function load(relativePath) {
  const source = await readFile(path.resolve(relativePath), "utf8");
  return import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
}

const ATTEMPT = {
  attemptId: "attempt-1",
  challengeId: "spoon",
  inputMode: "text",
  durationSeconds: 53,
  createdAt: "2026-08-15T17:42:00+00:00",
  score: {
    total: 76,
    fluency: 20,
    flexibility: 19,
    originality: 27,
    plausibilityElaboration: 10,
    algorithmVersion: "1.0",
    comparisonBasis: "reference-set"
  },
  rarestIdea: "tiny puppet leg",
  categories: [
    { category: "gardening", count: 1 },
    { category: "communication", count: 1 }
  ],
  comparisonCopy: "Compared against our current reference set for this object."
};

const COMMUNITY = {
  comparisonBasis: "reference-set",
  sourceKind: "reference-examples",
  items: [
    {
      canonical: "seed marker",
      category: "gardening",
      examplePhrase: "seed marker",
      frequency: 0.12,
      sourceCount: 12,
      sourceKind: "reference-examples"
    }
  ]
};

export async function run() {
  const [results, objectArt, styles] = await Promise.all([
    load("apps/web/src/features/results/ResultsView.tsx"),
    load("apps/web/src/components/objects/ObjectArt.tsx"),
    readFile(path.resolve("apps/web/src/app/globals.css"), "utf8")
  ]);

  const html = results.default({
    challenge: {
      slug: "spoon",
      name: "Spoon",
      artKey: "spoon"
    },
    attempt: ATTEMPT,
    community: COMMUNITY,
    nextChallenge: {
      slug: "sock",
      name: "Sock"
    },
    renderObjectArt: objectArt.default
  });

  assert.match(html, /Your brain took 2 different paths\./i);
  assert.match(html, />Divergence Score</i);
  assert.match(html, /76\s*\/\s*100/i);
  assert.match(html, /76\s*\/\s*100/i);
  assert.match(html, /20\s*\/\s*25/i);
  assert.match(html, /27\s*\/\s*35/i);
  assert.match(html, /More distinct ideas gave this score room to grow\./i);
  assert.match(html, /You changed categories instead of circling one lane\./i);
  assert.match(html, /The rarer ideas in this set lifted the originality score\./i);
  assert.match(html, /The clearer and more workable the ideas felt, the more this rose\./i);
  assert.equal((html.match(/<details class="result-card"/g) ?? []).length, 4);
  assert.equal((html.match(/<summary>/g) ?? []).length, 4);
  assert.match(html, /data-score-dimension="fluency"/i);
  assert.match(html, /data-score-dimension="flexibility"/i);
  assert.match(html, /data-score-dimension="originality"/i);
  assert.match(html, /data-score-dimension="plausibility_elaboration"/i);
  assert.match(html, /tiny puppet leg/i);
  assert.match(html, /Estimated from our current reference set for this object\./i);
  assert.match(html, /Inspired by divergent-thinking research\. This is a creative exercise, not a medical or diagnostic assessment\./i);
  assert.match(html, /Ideas from the reference set/i);
  assert.doesNotMatch(html, /Other people/i);
  assert.match(html, /seed marker/i);
  assert.match(html, /Try another tiny object/i);
  assert.match(html, /href="\/challenge\/sock"/i);
  assert.match(html, /Delete this attempt/i);
  assert.match(html, /data-delete-attempt/i);

  const blended = results.default({
    challenge: { slug: "spoon", name: "Spoon", artKey: "spoon" },
    attempt: {
      ...ATTEMPT,
      score: { ...ATTEMPT.score, comparisonBasis: "blended" }
    },
    community: { comparisonBasis: "reference-set", items: [] },
    nextChallenge: { slug: "sock", name: "Sock" },
    renderObjectArt: objectArt.default
  });
  assert.match(blended, /Estimated from a blend of our reference set and early community answers\./i);
  assert.match(blended, /No reference examples are ready for this object yet\./i);

  const failed = results.default({
    challenge: { slug: "spoon", name: "Spoon", artKey: "spoon" },
    attempt: ATTEMPT,
    community: { comparisonBasis: "community", error: "offline", items: [] },
    nextChallenge: { slug: "sock", name: "Sock" },
    renderObjectArt: objectArt.default
  });
  assert.match(failed, /Reference examples will appear when they’re ready again\./i);
  assert.match(failed, /Estimated from our current reference set for this object\./i);

  const wideAttempt = {
    ...ATTEMPT,
    ideas: [
      { raw: "seed shovel", canonical: "seed shovel", category: "gardening" },
      { raw: "signal mirror", canonical: "signal mirror", category: "communication" },
      { raw: "toy boat", canonical: "toy boat", category: "play" },
      { raw: "cape clip", canonical: "cape clip", category: "clothing" },
      { raw: "music baton", canonical: "music baton", category: "music" }
    ],
    categories: [
      { category: "gardening", count: 1 },
      { category: "communication", count: 1 },
      { category: "play", count: 1 },
      { category: "clothing", count: 1 },
      { category: "music", count: 1 }
    ]
  };
  const wide = results.default({
    challenge: { slug: "spoon", name: "Spoon", artKey: "spoon" },
    attempt: wideAttempt,
    community: COMMUNITY,
    nextChallenge: { slug: "sock", name: "Sock" },
    renderObjectArt: objectArt.default
  });
  assert.equal((wide.match(/class="player-star"/g) ?? []).length, 5, "every category should render its own visible constellation card");
  assert.match(wide, /class="constellation-stars"/i);
  assert.equal((wide.match(/role="listitem"/g) ?? []).length, 5, "every category card should expose listitem semantics");
  assert.doesNotMatch(wide, /player-star-[123]/i, "constellation cards should not recycle three fixed position classes");
  assert.match(wide, /music baton/i);
  assert.match(styles, /\.constellation-stars\s*\{[\s\S]*grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(/i);
  assert.match(styles, /\.results-constellation\s+\.constellation\s*\{[\s\S]*min-height:\s*auto;[\s\S]*overflow:\s*visible;/i);
  assert.match(styles, /\.practice-root\s+\.constellation\s*\{[\s\S]*min-height:\s*560px;[\s\S]*overflow:\s*hidden;/i);
  assert.match(styles, /\.results-constellation\s+\.player-star\s*\{[^}]*min-height:\s*auto;[^}]*overflow:\s*visible;/i);
  assert.doesNotMatch(styles, /\.results-constellation\s+\.player-star\s*\{[^}]*min-height:\s*100%/i);
  assert.doesNotMatch(styles, /\.results-constellation\s+\.player-star-1\s*\{/i, "results should not use fixed three-slot star positioning");
  assert.match(styles, /\.practice-root\s+\.player-star\s*\{[^}]*position:\s*absolute;/i);
  assert.match(styles, /\.practice-root\s+\.player-star-1\s*\{/i);

  assert.doesNotMatch(html, /<main/i, "the results view should mount inside the page shell instead of creating nested main landmarks");
}
