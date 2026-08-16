import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

async function load(relativePath) {
  const source = await readFile(path.resolve(relativePath), "utf8");
  return import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
}

function createMemoryStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    }
  };
}

export async function run() {
  const analytics = await load("apps/web/src/features/analytics/client.ts");

  const calls = [];
  const storage = createMemoryStorage();
  const client = analytics.createAnalyticsClient({
    storage,
    fetcher: async(url, options) => {
      calls.push({ url, options });
      return { ok: true, json: async() => ({ accepted: true }) };
    },
    cryptoRef: { randomUUID: () => "session-123" },
    clock: { now: () => 1_786_752_000_000 },
    windowRef: { UNROT_API_BASE: "https://example.test" }
  });

  await client.trackChallengeSelected({
    challengeId: "spoon",
    transcript: "should never leave the browser",
    value: 99,
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://example.test/v1/events");
  assert.equal(calls[0].options.keepalive, true);
  assert.equal(calls[0].options.method, "POST");
  assert.equal(calls[0].options.headers["Content-Type"], "application/json");

  const payload = JSON.parse(calls[0].options.body);
  assert.deepEqual(payload, {
    name: "challenge_selected",
    anonymousSessionId: "session-123",
    challengeId: "spoon",
    timestamp: "2026-08-15T00:00:00.000Z"
  });
  assert.equal(storage.getItem("unrot.analyticsSessionId"), "session-123");

  await client.trackScoreDimensionOpened({
    challengeId: "spoon",
    dimension: "flexibility",
    explanation: "must not be sent"
  });

  const dimensionPayload = JSON.parse(calls[1].options.body);
  assert.deepEqual(dimensionPayload, {
    name: "score_dimension_opened",
    anonymousSessionId: "session-123",
    challengeId: "spoon",
    value: 2,
    timestamp: "2026-08-15T00:00:00.000Z"
  });

  const blockedStorage = {
    getItem() {
      throw new Error("storage blocked");
    },
    setItem() {
      throw new Error("storage blocked");
    }
  };

  const resilientClient = analytics.createAnalyticsClient({
    storage: blockedStorage,
    fetcher: async() => {
      throw new Error("offline");
    },
    cryptoRef: { randomUUID: () => "session-fallback" },
    clock: { now: () => 1_786_752_001_000 }
  });

  await assert.doesNotReject(async() => {
    await resilientClient.trackIdeaDetected({ challengeId: "spoon", count: 3, rawIdea: "secret" });
    await resilientClient.trackHomeViewed();
  });
}
