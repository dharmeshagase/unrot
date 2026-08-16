import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadSourceModule } from "./source-loader.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
process.chdir(path.resolve(scriptDir, ".."));

const testPaths = [
  "apps/web/src/app/page.test.tsx",
  "apps/web/src/app/explore/page.test.tsx",
  "apps/web/src/features/practice/PracticeFlow.test.tsx",
  "apps/web/src/features/challenge/challengeMachine.test.tsx",
  "apps/web/src/features/challenge/ChallengeExperience.test.tsx",
  "apps/web/src/features/challenge/typedJourney.test.tsx",
  "apps/web/src/features/analytics/client.test.tsx",
  "apps/web/src/features/analytics/challengeLifecycle.test.tsx",
  "apps/web/src/features/analytics/resultsInteractions.test.tsx",
  "apps/web/src/features/results/ResultsView.test.tsx",
  "apps/web/src/features/results/resultActions.test.tsx",
  "apps/web/src/features/history/localHistory.test.tsx",
  "apps/web/src/app/static-pages.test.tsx",
  "scripts/dev-web.test.mjs"
];

for (const relativePath of testPaths) {
  try {
    const testModule = await loadSourceModule(path.resolve(relativePath));
    await testModule.run();
    console.log(`PASS ${relativePath}`);
  } catch (error) {
    console.error(`FAIL ${relativePath}`);
    console.error(error?.stack ?? error);
    process.exitCode = 1;
  }
}
