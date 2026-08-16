function challengeSlugFromHref(href) {
  const value = String(href ?? "").trim();
  const match = value.match(/\/challenge\/([^/?#]+)/i);
  return match ? decodeURIComponent(match[1]) : "";
}

export const SCORE_DIMENSION_IDS = Object.freeze([
  "fluency",
  "flexibility",
  "originality",
  "plausibility_elaboration"
]);

export function normalizeScoreDimension(dimension) {
  const value = String(dimension ?? "").trim().toLowerCase();
  return SCORE_DIMENSION_IDS.includes(value) ? value : "";
}

export function bindResultsAnalytics(
  root,
  {
    challengeId = "",
    trackScoreDimensionOpened = () => {},
    trackNextChallengeStarted = () => {}
  } = {}
) {
  const cleanups = [];
  for (const detail of root?.querySelectorAll?.("[data-score-dimension]") ?? []) {
    const onToggle = () => {
      if (detail.open !== true) return;
      const dimension = normalizeScoreDimension(detail.getAttribute?.("data-score-dimension"));
      if (!dimension) return;
      trackScoreDimensionOpened({
        challengeId: String(challengeId ?? "").trim(),
        dimension
      });
    };
    detail.addEventListener?.("toggle", onToggle);
    cleanups.push(() => detail.removeEventListener?.("toggle", onToggle));
  }

  const nextLink = root?.querySelector?.(".result-actions .button-primary");
  if (nextLink) {
    const onClick = (event) => {
      const challengeIdFromLink = challengeSlugFromHref(event.currentTarget?.getAttribute?.("href"));
      if (challengeIdFromLink) trackNextChallengeStarted({ challengeId: challengeIdFromLink });
    };
    nextLink.addEventListener?.("click", onClick);
    cleanups.push(() => nextLink.removeEventListener?.("click", onClick));
  }

  return () => {
    for (const cleanup of cleanups) cleanup();
  };
}
