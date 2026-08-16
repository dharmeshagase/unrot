function trimIdea(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function normalizeInputMode(inputMode) {
  return inputMode === "voice" ? "voice" : "text";
}

function buildTranscript(reviewIdeas = []) {
  return reviewIdeas
    .map((idea) => trimIdea(idea?.raw ?? ""))
    .filter(Boolean)
    .join("\n");
}

function normalizeIdeas(ideas = []) {
  return ideas.map((idea) => ({
    raw: trimIdea(idea?.raw ?? ""),
    canonical: trimIdea(idea?.canonical ?? ""),
    category: trimIdea(idea?.category ?? ""),
    valid: idea?.valid !== false,
    plausibility: Number(idea?.plausibility ?? 0),
    elaboration: Number(idea?.elaboration ?? 0)
  })).filter((idea) => idea.raw);
}

function fallbackMessage(reason) {
  if (reason === "denied") {
    return "Microphone access was denied. You can keep going by typing your ideas instead.";
  }
  if (reason === "unsupported") {
    return "This browser can’t record audio here. Type your ideas instead.";
  }
  return "Recording did not work this time. Your typed path is ready below.";
}

export function secondsLeftFromClock({ endAtMs, nowMs }) {
  const remainingMs = Math.max(0, Number(endAtMs ?? 0) - Number(nowMs ?? 0));
  return Math.max(0, Math.ceil(remainingMs / 1000));
}

export function activateTypedFallback(state = {}, reason = "failed") {
  return {
    ...state,
    phase: "active",
    inputMode: "text",
    secondsLeft: Math.max(0, Number(state.secondsLeft ?? 60) || 0),
    voiceFallbackMessage: fallbackMessage(reason)
  };
}

export async function submitTypedJourney({
  challengeSlug,
  inputMode,
  secondsLeft,
  anonymousSessionId,
  currentDraftKey,
  reviewIdeas,
  rerunPreview,
  createAttempt,
  saveHistoryEntry
} = {}) {
  const transcript = buildTranscript(reviewIdeas);
  let previewWarning = "";
  let normalizedIdeas;
  try {
    const preview = await rerunPreview({
      challengeId: trimIdea(challengeSlug),
      transcript
    });
    normalizedIdeas = normalizeIdeas(preview?.ideas ?? []);
  } catch {
    normalizedIdeas = normalizeIdeas(reviewIdeas);
    previewWarning = "Preview unavailable; submitted reviewed text for server-side analysis.";
  }
  const payload = {
    challengeId: trimIdea(challengeSlug),
    inputMode: normalizeInputMode(inputMode),
    durationSeconds: Math.max(0, 60 - Math.max(0, Number(secondsLeft ?? 0) || 0)),
    anonymousSessionId: trimIdea(anonymousSessionId),
    ideas: normalizedIdeas
  };

  try {
    const attempt = await createAttempt(payload, currentDraftKey);
    const wroteHistory = saveHistoryEntry?.({
      attemptId: attempt.attemptId,
      receipt: attempt.receipt,
      challengeSlug: trimIdea(challengeSlug),
      score: attempt?.score?.total ?? 0,
      completedAt: attempt.createdAt
    }) === true;
    return {
      status: "success",
      attempt,
      idempotencyKey: currentDraftKey,
      normalizedIdeas,
      previewWarning,
      redirectHref: wroteHistory
        ? `/results/${attempt.attemptId}/`
        : `/results/${attempt.attemptId}/#receipt=${encodeURIComponent(String(attempt.receipt ?? ""))}`
    };
  } catch (error) {
    return {
      status: "retry",
      idempotencyKey: currentDraftKey,
      normalizedIdeas,
      previewWarning,
      error
    };
  }
}
