import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

async function load(relativePath) {
  const source = await readFile(path.resolve(relativePath), "utf8");
  return import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
}

export async function run() {
  const runtime = await load("apps/web/src/features/challenge/typedJourney.ts");

  assert.equal(runtime.secondsLeftFromClock({ endAtMs: 61_000, nowMs: 1_000 }), 60);
  assert.equal(runtime.secondsLeftFromClock({ endAtMs: 61_000, nowMs: 39_400 }), 22);
  assert.equal(runtime.secondsLeftFromClock({ endAtMs: 61_000, nowMs: 61_500 }), 0);

  assert.deepEqual(
    runtime.activateTypedFallback({
      phase: "active",
      inputMode: "voice",
      secondsLeft: 23,
      typedIdeas: [],
      transcript: ""
    }, "failed"),
    {
      phase: "active",
      inputMode: "text",
      secondsLeft: 23,
      typedIdeas: [],
      transcript: "",
      voiceFallbackMessage: "Recording did not work this time. Your typed path is ready below."
    }
  );

  const requestLog = [];
  const savedHistory = [];
  const firstAttempt = {
    attemptId: "attempt-1",
    receipt: "receipt-1",
    createdAt: "2026-08-15T18:15:00+00:00",
    score: { total: 74 }
  };

  const firstSubmit = await runtime.submitTypedJourney({
    challengeSlug: "spoon",
    inputMode: "text",
    secondsLeft: 19,
    anonymousSessionId: "anon-123",
    currentDraftKey: "draft-key-1",
    reviewIdeas: [
      {
        raw: "tiny shovel",
        canonical: "fake canonical",
        category: "fake category",
        valid: true,
        plausibility: 0,
        elaboration: 0
      }
    ],
    rerunPreview: async(payload) => {
      requestLog.push(["preview", payload]);
      return {
        ideas: [
          {
            raw: "tiny shovel",
            canonical: "tiny gardening shovel",
            category: "gardening",
            valid: true,
            plausibility: 0.8,
            elaboration: 0.7
          }
        ]
      };
    },
    createAttempt: async(payload, key) => {
      requestLog.push(["attempt", payload, key]);
      return firstAttempt;
    },
    saveHistoryEntry: (entry) => {
      savedHistory.push(entry);
      return false;
    }
  });

  assert.deepEqual(requestLog[0], ["preview", { challengeId: "spoon", transcript: "tiny shovel" }]);
  assert.deepEqual(requestLog[1], ["attempt", {
    challengeId: "spoon",
    inputMode: "text",
    durationSeconds: 41,
    anonymousSessionId: "anon-123",
    ideas: [
      {
        raw: "tiny shovel",
        canonical: "tiny gardening shovel",
        category: "gardening",
        valid: true,
        plausibility: 0.8,
        elaboration: 0.7
      }
    ]
  }, "draft-key-1"]);
  assert.deepEqual(savedHistory, [{
    attemptId: "attempt-1",
    receipt: "receipt-1",
    challengeSlug: "spoon",
    score: 74,
    completedAt: "2026-08-15T18:15:00+00:00"
  }]);
  assert.equal(firstSubmit.redirectHref, "/results/attempt-1/#receipt=receipt-1");
  assert.doesNotMatch(firstSubmit.redirectHref, /\?[^#]*receipt=/i, "receipt bearer credentials must never enter the query string");
  assert.equal(firstSubmit.idempotencyKey, "draft-key-1");

  let retryAttemptKeys = [];
  const failedSubmit = await runtime.submitTypedJourney({
    challengeSlug: "spoon",
    inputMode: "text",
    secondsLeft: 19,
    anonymousSessionId: "anon-123",
    currentDraftKey: "draft-key-1",
    reviewIdeas: [{ raw: "tiny shovel" }],
    rerunPreview: async() => ({
      ideas: [
        {
          raw: "tiny shovel",
          canonical: "tiny gardening shovel",
          category: "gardening",
          valid: true,
          plausibility: 0.8,
          elaboration: 0.7
        }
      ]
    }),
    createAttempt: async(payload, key) => {
      retryAttemptKeys.push(key);
      throw new Error(`attempt failed for ${payload.challengeId}`);
    },
    saveHistoryEntry: () => true
  });
  assert.equal(failedSubmit.status, "retry");
  assert.deepEqual(retryAttemptKeys, ["draft-key-1"]);
  assert.equal(failedSubmit.idempotencyKey, "draft-key-1");

  let fallbackPayload;
  const previewFailed = await runtime.submitTypedJourney({
    challengeSlug: "spoon",
    inputMode: "text",
    secondsLeft: 10,
    anonymousSessionId: "anon-123",
    currentDraftKey: "draft-key-raw",
    reviewIdeas: [{ raw: "reviewed raw idea", canonical: "stale", category: "utility" }],
    rerunPreview: async() => { throw new Error("preview offline"); },
    createAttempt: async(payload) => {
      fallbackPayload = payload;
      return firstAttempt;
    },
    saveHistoryEntry: () => true
  });
  assert.equal(previewFailed.status, "success");
  assert.equal(fallbackPayload.ideas[0].raw, "reviewed raw idea");
  assert.equal(previewFailed.previewWarning, "Preview unavailable; submitted reviewed text for server-side analysis.");
}
