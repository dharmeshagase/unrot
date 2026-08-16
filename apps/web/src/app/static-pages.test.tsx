import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

async function load(relativePath) {
  const source = await readFile(path.resolve(relativePath), "utf8");
  return import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
}

const SPOON = {
  slug: "spoon",
  name: "Spoon",
  description: "A familiar utensil with a rounded bowl and a short handle.",
  difficulty: "easy",
  theme: "kitchen-drawer",
  artKey: "spoon",
  prompt: "What else could this be?",
  targetCategoryBreadth: 5
};

export async function run() {
  const [challengePage, resultsPage, aboutPage, privacyPage, wordmark, objectArt, challengeExperience] = await Promise.all([
    load("apps/web/src/app/challenge/page.tsx"),
    load("apps/web/src/app/results/page.tsx"),
    load("apps/web/src/app/about/page.tsx"),
    load("apps/web/src/app/privacy/page.tsx"),
    load("apps/web/src/components/brand/UnrotWordmark.tsx"),
    load("apps/web/src/components/objects/ObjectArt.tsx"),
    load("apps/web/src/features/challenge/ChallengeExperience.tsx")
  ]);

  const challengeHtml = challengePage.default({
    challenge: SPOON,
    renderWordmark: wordmark.default,
    renderObjectArt: objectArt.default,
    renderChallengeExperience: challengeExperience.default
  });
  assert.match(challengeHtml, /data-challenge-root/i);
  assert.match(challengeHtml, /data-challenge-slug="spoon"/i);
  assert.match(challengeHtml, /script type="module" src="\/challenge.js"/i);
  assert.equal((challengeHtml.match(/wordmark-hybrid/g) ?? []).length, 1);

  const resultsHtml = resultsPage.default({
    attemptId: "attempt-1",
    renderWordmark: wordmark.default
  });
  assert.equal((resultsHtml.match(/id="main-content"/g) ?? []).length, 1, "results shell should expose a single main-content landmark");
  assert.match(resultsHtml, /data-results-root/i);
  assert.match(resultsHtml, /data-attempt-id="attempt-1"/i);
  assert.match(resultsHtml, /Loading your result/i);
  assert.match(resultsHtml, /script type="module" src="\/results.js"/i);

  const aboutHtml = aboutPage.default({ renderWordmark: wordmark.default });
  assert.match(aboutHtml, /Guilford/i);
  assert.match(aboutHtml, /Alternate Uses Test/i);
  assert.match(aboutHtml, /fluency/i);
  assert.match(aboutHtml, /flexibility/i);
  assert.match(aboutHtml, /originality/i);
  assert.match(aboutHtml, /plausibility and elaboration/i);
  assert.match(aboutHtml, /not a medical or diagnostic assessment/i);

  const privacyHtml = privacyPage.default({ renderWordmark: wordmark.default });
  assert.match(privacyHtml, /Voice capture is available only when a transcription provider is configured/i);
  assert.match(privacyHtml, /audio is sent for transcription and then discarded/i);
  assert.match(privacyHtml, /We keep your submitted text ideas so we can score the round and calculate rarity\./i);
  assert.match(privacyHtml, /anonymous session id/i);
  assert.match(privacyHtml, /When OpenAI providers are configured, transcription and idea analysis are processed server-side through OpenAI\./i);
  assert.match(privacyHtml, /When voice is unavailable, typing is the primary input/i);
  assert.match(privacyHtml, /Delete this attempt/i);
}
