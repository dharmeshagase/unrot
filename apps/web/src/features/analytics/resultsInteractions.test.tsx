import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

async function load(relativePath) {
  const source = await readFile(path.resolve(relativePath), "utf8");
  return import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
}

function createEventTarget(attributes = {}) {
  const handlers = new Map();
  return {
    open: false,
    getAttribute(name) {
      return attributes[name] ?? null;
    },
    addEventListener(name, handler) {
      handlers.set(name, handler);
    },
    removeEventListener(name) {
      handlers.delete(name);
    },
    dispatch(name, event = {}) {
      handlers.get(name)?.({ currentTarget: this, ...event });
    }
  };
}

export async function run() {
  const interactions = await load("apps/web/src/features/analytics/resultsInteractions.ts");

  const opened = [];
  const next = [];
  const dimension = createEventTarget({ "data-score-dimension": "fluency" });
  const nextLink = createEventTarget({ href: "/challenge/sock" });
  const cleanup = interactions.bindResultsAnalytics(
    {
      querySelectorAll(selector) {
        return selector === "[data-score-dimension]" ? [dimension] : [];
      },
      querySelector(selector) {
        return selector === ".result-actions .button-primary" ? nextLink : null;
      }
    },
    {
      challengeId: "spoon",
      trackScoreDimensionOpened(payload) {
        opened.push(payload);
      },
      trackNextChallengeStarted(payload) {
        next.push(payload);
      }
    }
  );

  dimension.dispatch("toggle");
  dimension.open = true;
  dimension.dispatch("toggle");
  dimension.dispatch("toggle");
  nextLink.dispatch("click");
  cleanup();
  dimension.dispatch("toggle");

  assert.deepEqual(opened, [
    { challengeId: "spoon", dimension: "fluency" },
    { challengeId: "spoon", dimension: "fluency" }
  ], "dimension analytics should emit only when a disclosure opens");
  assert.deepEqual(next, [
    { challengeId: "sock" }
  ]);
}
