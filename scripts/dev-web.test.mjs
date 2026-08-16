import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

async function load(relativePath) {
  const source = await readFile(path.resolve(relativePath), "utf8");
  return import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
}

export async function run() {
  const proxy = await load("scripts/dev-web-proxy.mjs");

  const request = proxy.buildProxyRequest({
    requestUrl: "/v1/challenges?recent=spoon",
    method: "POST",
    headers: {
      host: "127.0.0.1:3000",
      accept: "application/json",
      "content-type": "application/json",
      "x-attempt-receipt": "receipt-1",
      cookie: "blocked",
      origin: "http://evil.example"
    },
    body: Buffer.from('{"challengeId":"spoon"}')
  });

  assert.equal(String(request.url), "http://127.0.0.1:8000/v1/challenges?recent=spoon");
  assert.deepEqual(request.headers, {
    accept: "application/json",
    "content-type": "application/json",
    "x-attempt-receipt": "receipt-1"
  });
  assert.equal(request.body.toString("utf8"), '{"challengeId":"spoon"}');

  assert.throws(
    () => proxy.buildProxyRequest({
      requestUrl: "http://169.254.169.254/latest/meta-data",
      method: "GET",
      headers: {}
    }),
    /origin-form/i
  );
}
