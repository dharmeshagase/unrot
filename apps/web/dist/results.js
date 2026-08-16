import renderResultsView from "/results-view.js";
import renderObjectArt from "/object-art.js";
import { bindResultsAnalytics } from "/results-interactions.js";
import { deleteAttempt, fetchAttemptResult, fetchChallengeCatalog, fetchChallengeDetail, fetchCommunityResults } from "/challenge-api.js";
import { findHistoryEntry, readHistoryEntries, pickNextChallenge, removeHistoryEntry } from "/local-history.js";
import { deleteAttemptAndForget, resolveAttemptId, takeReceiptFromFragment } from "/result-actions.js";

const ANALYTICS_PROMISE_KEY = "__unrotAnalyticsModulePromise";

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

function errorMarkup(message) {
  return `<section class="results-shell">
    <p class="eyebrow">Result unavailable</p>
    <h1>We couldn’t load this result</h1>
    <p>${message}</p>
    <div class="result-actions">
      <a class="button button-primary" href="/explore">Explore</a>
      <a class="button button-secondary" href="/">Home</a>
    </div>
  </section>`;
}

export function mountResults(documentRef = globalThis.document, storage) {
  const root = documentRef?.querySelector?.("[data-results-root]");
  if (!root) return () => {};
  const currentUrl = new URL(globalThis.location?.href ?? "http://127.0.0.1/results/");
  const fragmentReceipt = takeReceiptFromFragment(currentUrl, globalThis.history);
  const attemptId = resolveAttemptId(currentUrl, root.getAttribute("data-attempt-id"));
  const historyEntry = findHistoryEntry(attemptId, storage);
  const receipt = historyEntry?.receipt || fragmentReceipt;
  if (!attemptId || !receipt) {
    root.innerHTML = errorMarkup("This result needs the matching receipt from the same browser session.");
    return () => {};
  }

  fetchAttemptResult(attemptId, receipt)
    .then(async(attempt) => {
      const challengeSlug = String(historyEntry?.challengeSlug ?? attempt?.challengeId ?? "").trim();
      const [challenge, community, catalog] = await Promise.all([
        fetchChallengeDetail(challengeSlug),
        fetchCommunityResults(challengeSlug, receipt),
        fetchChallengeCatalog()
      ]);
      const nextChallenge = pickNextChallenge(catalog, {
        currentSlug: challengeSlug,
        historyEntries: readHistoryEntries(storage)
      }) || { slug: "spoon", name: "Spoon" };
      root.innerHTML = renderResultsView({
        attempt,
        challenge,
        community,
        nextChallenge,
        renderObjectArt
      });
      withAnalytics("trackScoreViewed", {
        challengeId: challengeSlug,
        score: attempt?.score?.total ?? 0
      });
      if (Array.isArray(community?.items) && community.items.length) {
        withAnalytics("trackCommunityAnswersViewed", {
          challengeId: challengeSlug,
          count: community.items.length
        });
      }
      bindResultsAnalytics(root, {
        challengeId: challengeSlug,
        trackScoreDimensionOpened(payload) {
          withAnalytics("trackScoreDimensionOpened", payload);
        },
        trackNextChallengeStarted(payload) {
          withAnalytics("trackNextChallengeStarted", payload);
        }
      });
      root.querySelector?.("[data-delete-attempt]")?.addEventListener("click", async(event) => {
        const button = event.currentTarget;
        const status = root.querySelector?.("[data-deletion-status]");
        if (globalThis.confirm?.("Delete this attempt and its saved result? This cannot be undone.") === false) return;
        button.disabled = true;
        if (status) status.textContent = "Deleting this attempt…";
        const outcome = await deleteAttemptAndForget({
          attemptId,
          receipt,
          deleteAttempt,
          removeHistoryEntry: (id) => removeHistoryEntry(id, storage)
        });
        if (status) status.textContent = outcome.detail;
        if (outcome.status === "deleted") {
          button.remove?.();
        } else {
          button.disabled = false;
        }
      });
    })
    .catch(() => {
      root.innerHTML = errorMarkup("Try loading the result again from a browser that completed the challenge.");
    });

  return () => {};
}

if (typeof document !== "undefined") mountResults();
