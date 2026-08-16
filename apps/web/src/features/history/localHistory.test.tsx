import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

async function load(relativePath) {
  const source = await readFile(path.resolve(relativePath), "utf8");
  return import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
}

export async function run() {
  const history = await load("apps/web/src/features/history/localHistory.ts");

  const store = new Map();
  const storage = {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, value);
    },
    removeItem(key) {
      store.delete(key);
    }
  };

  const saved = history.saveHistoryEntry({
    attemptId: "attempt-1",
    receipt: "receipt-1",
    challengeSlug: "spoon",
    score: 76,
    completedAt: "2026-08-15T17:42:00+00:00",
    transcript: "should-not-store",
    ideas: ["should-not-store"]
  }, storage);
  assert.equal(saved, true);

  const entries = history.readHistoryEntries(storage);
  assert.deepEqual(entries, [
    {
      attemptId: "attempt-1",
      receipt: "receipt-1",
      challengeSlug: "spoon",
      score: 76,
      completedAt: "2026-08-15T17:42:00+00:00"
    }
  ]);
  assert.equal(JSON.stringify(entries).includes("should-not-store"), false);
  assert.deepEqual(history.findHistoryEntry("attempt-1", storage), entries[0]);
  assert.equal(history.removeHistoryEntry("attempt-1", storage), true);
  assert.equal(history.findHistoryEntry("attempt-1", storage), null);

  history.saveDraft("spoon", {
    reviewIdeas: [{ id: "idea-1", raw: "seed shovel" }],
    draftValue: "sun signal"
  }, storage);
  assert.deepEqual(history.readDraft("spoon", storage), {
    reviewIdeas: [{ id: "idea-1", raw: "seed shovel" }],
    draftValue: "sun signal"
  });
  history.clearDraft("spoon", storage);
  assert.equal(history.readDraft("spoon", storage), null);

  assert.equal(
    history.resolveSafeStorage({
      getItem() { throw new Error("blocked"); }
    }),
    null
  );

  assert.equal(
    history.pickNextChallenge(
      [
        { slug: "spoon", name: "Spoon" },
        { slug: "sock", name: "Sock" },
        { slug: "towel", name: "Towel" }
      ],
      {
        currentSlug: "spoon",
        historyEntries: [
          { attemptId: "attempt-1", receipt: "receipt-1", challengeSlug: "sock", score: 76, completedAt: "2026-08-15T17:42:00+00:00" }
        ]
      }
    )?.slug,
    "towel"
  );
}
