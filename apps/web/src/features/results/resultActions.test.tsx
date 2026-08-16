import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

async function load(relativePath) {
  const source = await readFile(path.resolve(relativePath), "utf8");
  return import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
}

export async function run() {
  const [actions, api] = await Promise.all([
    load("apps/web/src/features/results/resultActions.ts"),
    load("apps/web/src/features/challenges/api.ts")
  ]);

  assert.equal(actions.resolveAttemptId({ pathname: "/results/attempt-from-path/", search: "" }, ""), "attempt-from-path");
  assert.equal(actions.resolveAttemptId({ pathname: "/results/", search: "?attempt=attempt-from-query" }, ""), "attempt-from-query");

  const scrubCalls = [];
  const fragmentReceipt = actions.takeReceiptFromFragment(
    {
      pathname: "/results/attempt-from-path/",
      search: "?attempt=attempt-from-query",
      hash: "#receipt=receipt-from-fragment"
    },
    {
      state: { preserved: true },
      replaceState(...args) { scrubCalls.push(args); }
    }
  );
  assert.equal(fragmentReceipt, "receipt-from-fragment");
  assert.deepEqual(scrubCalls, [[{ preserved: true }, "", "/results/attempt-from-path/?attempt=attempt-from-query"]]);
  assert.doesNotMatch(scrubCalls[0][2], /receipt=/i, "the fragment must be scrubbed before result loading continues");

  const calls = [];
  const result = await actions.deleteAttemptAndForget({
    attemptId: "attempt-1",
    receipt: "receipt-1",
    deleteAttempt: async(...args) => calls.push(["delete", ...args]),
    removeHistoryEntry: (...args) => { calls.push(["history", ...args]); return true; }
  });
  assert.deepEqual(calls, [
    ["delete", "attempt-1", "receipt-1"],
    ["history", "attempt-1"]
  ]);
  assert.equal(result.status, "deleted");

  let request;
  await api.deleteAttempt("attempt-1", "receipt-1", async(url, options) => {
    request = { url, options };
    return { ok: true, status: 204 };
  });
  assert.equal(request.url, "/v1/attempts/attempt-1");
  assert.equal(request.options.method, "DELETE");
  assert.equal(request.options.headers["X-Attempt-Receipt"], "receipt-1");

  const capabilities = await api.fetchCapabilities(async() => ({
    ok: true,
    json: async() => ({ voice: { available: false, provider: "local" } })
  }));
  assert.deepEqual(capabilities.voice, { available: false, provider: "local" });
}
