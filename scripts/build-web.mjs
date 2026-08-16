import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { renderRouteDocument, repoRoot } from "./render-web.mjs";
import { loadSourceModule } from "./source-loader.mjs";

const outputDir = path.resolve(repoRoot, "apps/web/dist");
const cssPath = path.resolve(repoRoot, "apps/web/src/app/globals.css");

await mkdir(outputDir, { recursive: true });
await mkdir(path.resolve(outputDir, "explore"), { recursive: true });
await mkdir(path.resolve(outputDir, "practice"), { recursive: true });
await mkdir(path.resolve(outputDir, "about"), { recursive: true });
await mkdir(path.resolve(outputDir, "privacy"), { recursive: true });
await mkdir(path.resolve(outputDir, "challenge"), { recursive: true });
await mkdir(path.resolve(outputDir, "results"), { recursive: true });
await mkdir(path.resolve(outputDir, "results", "example-attempt"), { recursive: true });
await writeFile(path.resolve(outputDir, "index.html"), await renderRouteDocument("/"), "utf8");
await writeFile(path.resolve(outputDir, "explore/index.html"), await renderRouteDocument("/explore"), "utf8");
await writeFile(path.resolve(outputDir, "practice/index.html"), await renderRouteDocument("/practice"), "utf8");
await writeFile(path.resolve(outputDir, "about/index.html"), await renderRouteDocument("/about"), "utf8");
await writeFile(path.resolve(outputDir, "privacy/index.html"), await renderRouteDocument("/privacy"), "utf8");
await writeFile(path.resolve(outputDir, "results/index.html"), await renderRouteDocument("/results"), "utf8");
await writeFile(path.resolve(outputDir, "results/example-attempt/index.html"), await renderRouteDocument("/results/example-attempt"), "utf8");
await writeFile(path.resolve(outputDir, "globals.css"), await readFile(cssPath, "utf8"), "utf8");

const challengeApiModule = await loadSourceModule(path.resolve(repoRoot, "apps/web/src/features/challenges/api.ts"));
for (const challenge of challengeApiModule.STATIC_CHALLENGE_DETAILS) {
  const routeDir = path.resolve(outputDir, "challenge", challenge.slug);
  await mkdir(routeDir, { recursive: true });
  await writeFile(path.resolve(routeDir, "index.html"), await renderRouteDocument(`/challenge/${challenge.slug}`), "utf8");
}

const browserModules = [
  ["apps/web/src/app/homeClient.ts", "home.js"],
  ["apps/web/src/app/explore/exploreClient.ts", "explore.js"],
  ["apps/web/src/features/analytics/client.ts", "analytics.js"],
  ["apps/web/src/features/analytics/challengeLifecycle.ts", "challenge-lifecycle.js"],
  ["apps/web/src/features/analytics/resultsInteractions.ts", "results-interactions.js"],
  ["apps/web/src/features/challenges/api.ts", "challenge-api.js"],
  ["apps/web/src/app/practice/practiceClient.ts", "practice.js"],
  ["apps/web/src/features/practice/practiceMachine.ts", "practice-machine.js"],
  ["apps/web/src/features/practice/PracticeFlow.tsx", "practice-flow.js"],
  ["apps/web/src/components/objects/ObjectArt.tsx", "object-art.js"],
  ["apps/web/src/features/challenge/challengeMachine.ts", "challenge-machine.js"],
  ["apps/web/src/features/challenge/ChallengeExperience.tsx", "challenge-experience.js"],
  ["apps/web/src/features/results/ResultsView.tsx", "results-view.js"],
  ["apps/web/src/features/results/resultActions.ts", "result-actions.js"],
  ["apps/web/src/features/history/localHistory.ts", "local-history.js"],
  ["apps/web/src/features/challenge/typedJourney.ts", "typed-journey.js"],
  ["apps/web/src/app/challenge/challengeClient.ts", "challenge.js"],
  ["apps/web/src/app/results/resultsClient.ts", "results.js"]
];

for (const [source, destination] of browserModules) {
  await copyFile(path.resolve(repoRoot, source), path.resolve(outputDir, destination));
}

console.log(`Built web output in ${outputDir}`);
