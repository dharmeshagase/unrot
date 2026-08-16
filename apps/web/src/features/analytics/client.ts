const SESSION_KEY = "unrot.analyticsSessionId";

function configuredApiBase(windowRef = globalThis.window) {
  const value = windowRef?.UNROT_API_BASE ?? windowRef?.__UNROT_API_BASE__;
  return typeof value === "string" && value.trim() ? value.trim().replace(/\/$/, "") : "";
}

function apiUrl(pathname, windowRef = globalThis.window) {
  const base = configuredApiBase(windowRef);
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${base}${path}`;
}

function resolveStorage(storage) {
  if (storage !== undefined) return storage;
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

function normalizeChallengeId(challengeId) {
  const value = String(challengeId ?? "").trim();
  return value || undefined;
}

function normalizeCount(value) {
  const count = Number(value);
  return Number.isFinite(count) ? Math.max(0, Math.round(count)) : undefined;
}

function normalizeModeValue(mode) {
  return mode === "voice" ? 1 : 0;
}

function normalizePermissionValue(result) {
  if (result === "granted") return 1;
  if (result === "denied") return 0;
  if (result === "unsupported") return -2;
  return -1;
}

function normalizeScoreDimensionValue(dimension) {
  if (dimension === "fluency") return 1;
  if (dimension === "flexibility") return 2;
  if (dimension === "originality") return 3;
  if (dimension === "plausibility_elaboration") return 4;
  return undefined;
}

export function createAnalyticsClient({
  storage = undefined,
  fetcher = globalThis.fetch,
  cryptoRef = globalThis.crypto,
  clock = Date,
  windowRef = globalThis.window
} = {}) {
  let memorySessionId = "";

  function getSessionId() {
    if (memorySessionId) return memorySessionId;
    const safeStorage = resolveStorage(storage);
    try {
      const existing = safeStorage?.getItem?.(SESSION_KEY);
      if (existing) {
        memorySessionId = String(existing);
        return memorySessionId;
      }
    } catch {}
    memorySessionId = cryptoRef?.randomUUID?.() ?? `analytics-${clock.now?.() ?? Date.now()}`;
    try {
      safeStorage?.setItem?.(SESSION_KEY, memorySessionId);
    } catch {}
    return memorySessionId;
  }

  async function send(name, { challengeId, value } = {}) {
    if (typeof fetcher !== "function") return;
    const payload = {
      name,
      anonymousSessionId: getSessionId(),
      timestamp: new Date(clock.now?.() ?? Date.now()).toISOString()
    };
    const normalizedChallengeId = normalizeChallengeId(challengeId);
    if (normalizedChallengeId) payload.challengeId = normalizedChallengeId;
    if (typeof value === "number" && Number.isFinite(value)) payload.value = value;
    try {
      await fetcher(apiUrl("/v1/events", windowRef), {
        method: "POST",
        keepalive: true,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
    } catch {}
  }

  return {
    trackHomeViewed() {
      return send("home_viewed");
    },
    trackChallengeSelected({ challengeId } = {}) {
      return send("challenge_selected", { challengeId });
    },
    trackTimerInfoOpened({ challengeId } = {}) {
      return send("timer_info_opened", { challengeId });
    },
    trackInputModeSelected({ challengeId, mode } = {}) {
      return send("input_mode_selected", {
        challengeId,
        value: normalizeModeValue(mode)
      });
    },
    trackMicrophonePermissionResult({ challengeId, result } = {}) {
      return send("microphone_permission_result", {
        challengeId,
        value: normalizePermissionValue(result)
      });
    },
    trackChallengeStarted({ challengeId } = {}) {
      return send("challenge_started", { challengeId });
    },
    trackIdeaDetected({ challengeId, count } = {}) {
      return send("idea_detected", {
        challengeId,
        value: normalizeCount(count)
      });
    },
    trackChallengeFinished({ challengeId, count } = {}) {
      return send("challenge_finished", {
        challengeId,
        value: normalizeCount(count)
      });
    },
    trackTranscriptionFailed({ challengeId } = {}) {
      return send("transcription_failed", { challengeId });
    },
    trackIdeasReviewed({ challengeId, count } = {}) {
      return send("ideas_reviewed", {
        challengeId,
        value: normalizeCount(count)
      });
    },
    trackScoreViewed({ challengeId, score } = {}) {
      return send("score_viewed", {
        challengeId,
        value: normalizeCount(score)
      });
    },
    trackScoreDimensionOpened({ challengeId, dimension } = {}) {
      return send("score_dimension_opened", {
        challengeId,
        value: normalizeScoreDimensionValue(dimension)
      });
    },
    trackCommunityAnswersViewed({ challengeId, count } = {}) {
      return send("community_answers_viewed", {
        challengeId,
        value: normalizeCount(count)
      });
    },
    trackNextChallengeStarted({ challengeId } = {}) {
      return send("next_challenge_started", { challengeId });
    }
  };
}

const analytics = createAnalyticsClient();

export default analytics;
