function resolveStorage(storage) {
  if (storage !== undefined) return storage;
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

const ANALYTICS_PROMISE_KEY = "__unrotAnalyticsModulePromise";
const HOME_ANALYTICS_FLAG = "__unrotHomeAnalyticsBound";

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

export function readPracticeComplete(storage) {
  const resolvedStorage = resolveStorage(storage);
  try {
    return resolvedStorage?.getItem("unrot.practiceComplete") === "true";
  } catch {
    return false;
  }
}

export function updateHomeActions(documentRef = globalThis.document, storage) {
  const resolvedStorage = resolveStorage(storage);
  if (!documentRef || !readPracticeComplete(resolvedStorage)) return false;
  const actions = documentRef.querySelector("[data-home-actions]");
  if (!actions) return false;
  actions.innerHTML = `<a class="button button-primary" href="/challenge/spoon">Wake up my brain</a><a class="button button-secondary" href="/explore">Choose an object</a>`;
  const explainer = documentRef.querySelector("[data-first-visit-note]");
  if (explainer) explainer.hidden = true;
  return true;
}

export function mountHome(documentRef = globalThis.document, storage) {
  updateHomeActions(documentRef, storage);
  withAnalytics("trackHomeViewed");
  if (!documentRef || documentRef[HOME_ANALYTICS_FLAG]) return false;
  documentRef[HOME_ANALYTICS_FLAG] = true;
  documentRef.addEventListener("click", (event) => {
    const link = event.target?.closest?.("a[href]");
    const challengeId = challengeSlugFromHref(link?.getAttribute?.("href"));
    if (challengeId) withAnalytics("trackChallengeSelected", { challengeId });
  });
  return true;
}

if (typeof document !== "undefined") mountHome();
