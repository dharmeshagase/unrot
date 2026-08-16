import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { buildProxyRequest } from "./dev-web-proxy.mjs";
import { renderRouteDocument, repoRoot } from "./render-web.mjs";

const port = Number(process.env.PORT ?? 3000);
const cssPath = path.resolve(repoRoot, "apps/web/src/app/globals.css");
const browserModules = new Map([
  ["/home.js", "apps/web/src/app/homeClient.ts"],
  ["/explore.js", "apps/web/src/app/explore/exploreClient.ts"],
  ["/analytics.js", "apps/web/src/features/analytics/client.ts"],
  ["/challenge-lifecycle.js", "apps/web/src/features/analytics/challengeLifecycle.ts"],
  ["/results-interactions.js", "apps/web/src/features/analytics/resultsInteractions.ts"],
  ["/challenge-api.js", "apps/web/src/features/challenges/api.ts"],
  ["/practice.js", "apps/web/src/app/practice/practiceClient.ts"],
  ["/practice-machine.js", "apps/web/src/features/practice/practiceMachine.ts"],
  ["/practice-flow.js", "apps/web/src/features/practice/PracticeFlow.tsx"],
  ["/challenge-machine.js", "apps/web/src/features/challenge/challengeMachine.ts"],
  ["/challenge-experience.js", "apps/web/src/features/challenge/ChallengeExperience.tsx"],
  ["/results-view.js", "apps/web/src/features/results/ResultsView.tsx"],
  ["/local-history.js", "apps/web/src/features/history/localHistory.ts"],
  ["/typed-journey.js", "apps/web/src/features/challenge/typedJourney.ts"],
  ["/challenge.js", "apps/web/src/app/challenge/challengeClient.ts"],
  ["/results.js", "apps/web/src/app/results/resultsClient.ts"],
  ["/object-art.js", "apps/web/src/components/objects/ObjectArt.tsx"]
]);

async function readBody(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function proxyApi(request, response) {
  const body = request.method === "GET" || request.method === "HEAD" ? undefined : await readBody(request);
  let proxied;
  try {
    proxied = buildProxyRequest({
      requestUrl: request.url ?? "/",
      method: request.method ?? "GET",
      headers: request.headers,
      body
    });
  } catch {
    response.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ detail: "Proxy request must use an origin-form URL" }));
    return;
  }
  const upstream = await fetch(proxied.url, {
    method: proxied.method,
    headers: proxied.headers,
    body: proxied.body
  });
  response.writeHead(upstream.status, Object.fromEntries(upstream.headers.entries()));
  response.end(Buffer.from(await upstream.arrayBuffer()));
}

const server = createServer(async (request, response) => {
  const pathname = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`).pathname.replace(/\/$/, "") || "/";
  if (pathname.startsWith("/v1/")) {
    await proxyApi(request, response);
    return;
  }

  const isStaticRoute = [
    "/",
    "/index.html",
    "/explore",
    "/explore/index.html",
    "/practice",
    "/practice/index.html",
    "/about",
    "/about/index.html",
    "/privacy",
    "/privacy/index.html",
    "/results",
    "/results/index.html"
  ].includes(pathname);
  const isChallengeRoute = pathname.startsWith("/challenge/");
  const isResultsRoute = pathname.startsWith("/results/");

  if (isStaticRoute || isChallengeRoute || isResultsRoute) {
    const route = pathname.endsWith("/index.html")
      ? pathname.replace(/\/index\.html$/, "") || "/"
      : pathname;
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    response.end(await renderRouteDocument(route));
    return;
  }

  if (pathname === "/globals.css") {
    response.writeHead(200, { "Content-Type": "text/css; charset=utf-8" });
    response.end(await readFile(cssPath, "utf8"));
    return;
  }

  if (browserModules.has(pathname)) {
    response.writeHead(200, { "Content-Type": "text/javascript; charset=utf-8" });
    response.end(await readFile(path.resolve(repoRoot, browserModules.get(pathname)), "utf8"));
    return;
  }

  response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  response.end("Not Found");
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Unrot web foundation listening on http://127.0.0.1:${port}`);
});
