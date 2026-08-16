import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

async function load(relativePath) {
  const source = await readFile(path.resolve(relativePath), "utf8");
  return import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
}

export async function run() {
  const lifecycle = await load("apps/web/src/features/analytics/challengeLifecycle.ts");

  const calls = [];
  const tracker = lifecycle.createChallengeFinishTracker((payload) => calls.push(payload));

  tracker.beginRound();
  assert.deepEqual(calls, [], "voice completion should not emit before preview/review ideas exist");
  tracker.finishReviewed({
    challengeId: "spoon",
    reviewIdeas: [
      { raw: "tiny shovel", valid: true },
      { raw: "sun signal", valid: true }
    ]
  });
  tracker.finishReviewed({
    challengeId: "spoon",
    reviewIdeas: [
      { raw: "tiny shovel", valid: true },
      { raw: "sun signal", valid: true },
      { raw: "duplicate late call", valid: true }
    ]
  });

  assert.deepEqual(calls, [
    { challengeId: "spoon", count: 2 }
  ], "voice completion should emit exactly once with the reviewed idea count");

  tracker.beginRound();
  tracker.finishTyped({
    challengeId: "sock",
    typedIdeas: ["dust mitt", "beanbag puppet", "draft"]
  });

  assert.deepEqual(calls[1], { challengeId: "sock", count: 3 });
}
