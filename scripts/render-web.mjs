import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadSourceModule } from "./source-loader.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(scriptDir, "..");

async function loadWebModules() {
  process.chdir(repoRoot);
  const source = (relativePath) => loadSourceModule(path.resolve(repoRoot, relativePath));
  const [
    layout,
    home,
    explore,
    practicePage,
    challengePage,
    resultsPage,
    aboutPage,
    privacyPage,
    wordmark,
    objectArt,
    challengeApi,
    challengeCard,
    practiceFlow,
    challengeExperience
  ] = await Promise.all([
    source("apps/web/src/app/layout.tsx"),
    source("apps/web/src/app/page.tsx"),
    source("apps/web/src/app/explore/page.tsx"),
    source("apps/web/src/app/practice/page.tsx"),
    source("apps/web/src/app/challenge/page.tsx"),
    source("apps/web/src/app/results/page.tsx"),
    source("apps/web/src/app/about/page.tsx"),
    source("apps/web/src/app/privacy/page.tsx"),
    source("apps/web/src/components/brand/UnrotWordmark.tsx"),
    source("apps/web/src/components/objects/ObjectArt.tsx"),
    source("apps/web/src/features/challenges/api.ts"),
    source("apps/web/src/features/challenges/ChallengeCard.tsx"),
    source("apps/web/src/features/practice/PracticeFlow.tsx"),
    source("apps/web/src/features/challenge/ChallengeExperience.tsx")
  ]);
  return {
    layout,
    home,
    explore,
    practicePage,
    challengePage,
    resultsPage,
    aboutPage,
    privacyPage,
    wordmark,
    objectArt,
    challengeApi,
    challengeCard,
    practiceFlow,
    challengeExperience
  };
}

export async function renderRouteDocument(pathname = "/") {
  const modules = await loadWebModules();
  const shared = {
    renderWordmark: modules.wordmark.default,
    renderObjectArt: modules.objectArt.default,
    renderChallengeCard: modules.challengeCard.default,
    catalog: modules.challengeApi.STATIC_CHALLENGES
  };
  let body;
  let title = "Unrot";
  if (pathname === "/explore") {
    body = modules.explore.default(shared);
    title = "Explore objects · Unrot";
  } else if (pathname === "/practice") {
    body = modules.practicePage.default({ ...shared, renderPracticeFlow: modules.practiceFlow.default });
    title = "15-second warm-up · Unrot";
  } else if (pathname === "/about") {
    body = modules.aboutPage.default({ renderWordmark: modules.wordmark.default });
    title = "About the science · Unrot";
  } else if (pathname === "/privacy") {
    body = modules.privacyPage.default({ renderWordmark: modules.wordmark.default });
    title = "Privacy · Unrot";
  } else if (pathname.startsWith("/challenge/")) {
    const slug = pathname.replace(/\/$/, "").split("/")[2];
    const challenge = modules.challengeApi.getStaticChallenge(slug);
    if (!challenge) throw new Error(`Unknown challenge route '${pathname}'`);
    body = modules.challengePage.default({
      challenge,
      renderWordmark: modules.wordmark.default,
      renderObjectArt: modules.objectArt.default,
      renderChallengeExperience: modules.challengeExperience.default
    });
    title = `${challenge.name} challenge · Unrot`;
  } else if (pathname.startsWith("/results/")) {
    const attemptId = pathname.replace(/\/$/, "").split("/")[2] ?? "";
    body = modules.resultsPage.default({
      attemptId,
      renderWordmark: modules.wordmark.default
    });
    title = "Your result · Unrot";
  } else if (pathname === "/results") {
    body = modules.resultsPage.default({
      attemptId: "",
      renderWordmark: modules.wordmark.default
    });
    title = "Your result · Unrot";
  } else {
    body = modules.home.default(shared);
  }
  const layoutModule = modules.layout;
  return layoutModule.default({
    children: body,
    pageTitle: title,
    stylesheetHref: "/globals.css"
  });
}

export function renderHomeDocument() {
  return renderRouteDocument("/");
}
