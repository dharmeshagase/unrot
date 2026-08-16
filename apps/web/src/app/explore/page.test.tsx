import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

async function load(relativePath) {
  const source = await readFile(path.resolve(relativePath), "utf8");
  return import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
}

export async function run() {
  const [page, wordmark, objectArt, challengeApi, challengeCard] = await Promise.all([
    load("apps/web/src/app/explore/page.tsx"),
    load("apps/web/src/components/brand/UnrotWordmark.tsx"),
    load("apps/web/src/components/objects/ObjectArt.tsx"),
    load("apps/web/src/features/challenges/api.ts"),
    load("apps/web/src/features/challenges/ChallengeCard.tsx")
  ]);
  const styles = await readFile(path.resolve("apps/web/src/app/globals.css"), "utf8");

  const html = page.default({
    renderWordmark: wordmark.default,
    renderObjectArt: objectArt.default,
    renderChallengeCard: challengeCard.default,
    catalog: challengeApi.STATIC_CHALLENGES
  });

  assert.match(html, /Browse the curiosity cabinet/i);
  assert.match(html, /Easy starts/i);
  assert.match(html, /Stranger little things/i);
  assert.equal(challengeApi.STATIC_CHALLENGES.length, 18);
  assert.equal((html.match(/data-challenge-card=/g) ?? []).length, 18);
  assert.equal((html.match(/>Start<\/a>/g) ?? []).length, 18);
  assert.equal((html.match(/class="object-art/g) ?? []).length, 18);
  assert.equal((html.match(/wordmark-hybrid/g) ?? []).length, 1);
  assert.match(styles, /\.card-start\s*{[^}]*min-height:\s*44px/i);
  assert.match(styles, /\.card-start\s*{[^}]*min-width:\s*44px/i, "Explore Start links should keep a full 44x44 tap target");
  for (const item of challengeApi.STATIC_CHALLENGES) {
    assert.ok(html.includes(`>${item.name}<`), `Explore should show ${item.name}`);
    assert.ok(item.description.length > 15);
    assert.ok(["easy", "uncommon"].includes(item.difficulty));
    assert.equal("answers" in item, false, "fallback catalog must not expose reference answers");
  }

  const fallback = await challengeApi.fetchChallengeCatalog(async () => {
    throw new Error("offline");
  });
  assert.equal(fallback.length, 18);
  assert.notEqual(fallback, challengeApi.STATIC_CHALLENGES, "callers receive an isolated fallback array");

  const apiItems = challengeApi.STATIC_CHALLENGES.map(({ artKey, ...item }) => ({
    ...item,
    art_key: artKey
  }));
  apiItems[0] = { ...apiItems[0], description: "Live API spoon description." };
  const live = await challengeApi.fetchChallengeCatalog(async () => ({
    ok: true,
    json: async () => ({ items: apiItems, recommended: null })
  }));
  assert.equal(live.length, 18);
  assert.equal(live[0].description, "Live API spoon description.", "the running API should replace fallback content");
  assert.equal(live[0].artKey, "spoon");
}
