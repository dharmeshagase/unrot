import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

async function load(relativePath) {
  const source = await readFile(path.resolve(relativePath), "utf8");
  return import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
}

export async function run() {
  const [page, wordmark, objectArt, challengeApi, challengeCard, homeClient] = await Promise.all([
    load("apps/web/src/app/page.tsx"),
    load("apps/web/src/components/brand/UnrotWordmark.tsx"),
    load("apps/web/src/components/objects/ObjectArt.tsx"),
    load("apps/web/src/features/challenges/api.ts"),
    load("apps/web/src/features/challenges/ChallengeCard.tsx"),
    load("apps/web/src/app/homeClient.ts")
  ]);

  const html = page.default({
    renderWordmark: wordmark.default,
    renderObjectArt: objectArt.default,
    renderChallengeCard: challengeCard.default,
    catalog: challengeApi.STATIC_CHALLENGES
  });

  assert.match(html, /<header[\s\S]*Unrot[\s\S]*About[\s\S]*<\/header>/i);
  assert.match(html, /A one-minute imagination workout/i);
  assert.match(html, /<h1[^>]*>\s*Give your attention something to make\.\s*<\/h1>/i);
  assert.match(
    html,
    /Take one overlooked object\. Invent uses it was never meant to have\. No right answers\. No account needed\./
  );
  assert.match(html, />Show me how</i, "a first visit should lead into practice");
  assert.match(html, /Easy starts/i);
  assert.match(html, /Stranger little things/i);
  assert.equal((html.match(/data-home-challenge=/g) ?? []).length, 6);
  assert.equal(
    (html.match(/wordmark-hybrid/g) ?? []).length,
    1,
    "the hybrid treatment belongs only to the wordmark"
  );

  assert.deepEqual(page.getHomeActions(false), [
    { label: "Show me how", href: "/practice", kind: "primary" }
  ]);
  assert.deepEqual(page.getHomeActions(true), [
    { label: "Wake up my brain", href: "/challenge/spoon", kind: "primary" },
    { label: "Choose an object", href: "/explore", kind: "secondary" }
  ]);

  assert.equal(homeClient.readPracticeComplete({ getItem: () => "true" }), true);
  assert.equal(homeClient.readPracticeComplete({ getItem: () => null }), false);
  assert.equal(
    homeClient.readPracticeComplete({ getItem: () => { throw new Error("blocked"); } }),
    false,
    "blocked storage should safely retain first-visit behavior"
  );

  const localStorageDescriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  try {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      get() { throw new Error("property access blocked"); }
    });
    assert.equal(
      homeClient.readPracticeComplete(),
      false,
      "a throwing localStorage property getter must be caught inside the helper"
    );
  } finally {
    if (localStorageDescriptor) Object.defineProperty(globalThis, "localStorage", localStorageDescriptor);
    else delete globalThis.localStorage;
  }
}
