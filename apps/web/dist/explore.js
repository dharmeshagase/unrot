import { fetchChallengeCatalog } from "/challenge-api.js";

const ANALYTICS_PROMISE_KEY = "__unrotAnalyticsModulePromise";
const EXPLORE_ANALYTICS_FLAG = "__unrotExploreAnalyticsBound";

function loadAnalytics() {
  if (!globalThis[ANALYTICS_PROMISE_KEY]) {
    globalThis[ANALYTICS_PROMISE_KEY] = import("/analytics.js").catch(() => null);
  }
  return globalThis[ANALYTICS_PROMISE_KEY];
}

function withAnalytics(methodName, payload) {
  void loadAnalytics()
    .then((module) => {
      const method = module?.default?.[methodName];
      if (typeof method === "function") return method.call(module.default, payload);
      return undefined;
    })
    .catch(() => {});
}

function challengeSlugFromHref(href) {
  const value = String(href ?? "").trim();
  const match = value.match(/\/challenge\/([^/?#]+)/i);
  return match ? decodeURIComponent(match[1]) : "";
}

export async function refreshCatalog(documentRef = globalThis.document, fetcher = globalThis.fetch) {
  const items = await fetchChallengeCatalog(fetcher);
  if (!documentRef) return items;
  for (const item of items) {
    const card = documentRef.querySelector(`[data-challenge-card="${item.slug}"]`);
    if (!card) continue;
    const heading = card.querySelector("h3");
    const description = card.querySelector(".challenge-card-copy > p:not(.difficulty-tag)");
    if (heading) heading.textContent = item.name;
    if (description) description.textContent = item.description;
  }
  const status = documentRef.querySelector("[data-catalog-status]");
  if (status) status.textContent = "All 18 objects are ready.";
  if (!documentRef[EXPLORE_ANALYTICS_FLAG]) {
    documentRef[EXPLORE_ANALYTICS_FLAG] = true;
    documentRef.addEventListener("click", (event) => {
      const link = event.target?.closest?.("a[href]");
      const challengeId = challengeSlugFromHref(link?.getAttribute?.("href"));
      if (challengeId) withAnalytics("trackChallengeSelected", { challengeId });
    });
  }
  return items;
}

if (typeof document !== "undefined") refreshCatalog();
