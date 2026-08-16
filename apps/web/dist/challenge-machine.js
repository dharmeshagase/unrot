export const TIMER_INFO_COPY =
  "Why 60 seconds? A little time pressure helps your brain move past the obvious. This isn’t a test you can fail. Don’t stress—say whatever arrives. You’ve got this.";

export const PROCESSING_MESSAGES = Object.freeze([
  "Untangling your ideas",
  "Finding the different directions",
  "Checking what surprised us"
]);

function trimIdea(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function nextIdeaId(existingIdeas) {
  const seen = new Set(existingIdeas.map((idea) => String(idea.id)));
  let index = existingIdeas.length + 1;
  while (seen.has(`idea-${index}`)) index += 1;
  return `idea-${index}`;
}

function defaultScore(text, baseline, multiplier) {
  const words = trimIdea(text).split(/\s+/).filter(Boolean).length;
  return Math.min(1, Number((baseline + Math.max(words - 1, 0) * multiplier).toFixed(2)));
}

function cloneReviewIdea(idea, index) {
  const normalizedRaw = trimIdea(idea?.raw ?? "");
  const normalizedCanonical = trimIdea(idea?.canonical ?? normalizedRaw).toLowerCase();
  return {
    id: trimIdea(idea?.id ?? `idea-${index + 1}`) || `idea-${index + 1}`,
    raw: normalizedRaw,
    canonical: normalizedCanonical,
    category: trimIdea(idea?.category ?? "utility").toLowerCase() || "utility",
    valid: idea?.valid !== false,
    plausibility: typeof idea?.plausibility === "number" ? idea.plausibility : defaultScore(normalizedRaw, 0.55, 0.1),
    elaboration: typeof idea?.elaboration === "number" ? idea.elaboration : defaultScore(normalizedRaw, 0.4, 0.15)
  };
}

export function createChallengeState({ slug = "" } = {}) {
  return {
    challengeSlug: slug,
    phase: "ready",
    inputMode: "voice",
    secondsLeft: 60,
    isPaused: false,
    typedIdeas: [],
    transcript: "",
    interimTranscript: "",
    reviewIdeas: [],
    draftValue: "",
    liveStatus: "",
    voiceFallbackMessage: "",
    finishReason: "manual",
    processingIndex: 0,
    networkNotice: "",
    voiceAvailable: false,
    voiceProvider: "local"
  };
}

export function nextModalFocusIndex(currentIndex, itemCount, shiftKey = false) {
  const count = Math.max(0, Number(itemCount) || 0);
  if (!count) return -1;
  const current = Math.max(0, Math.min(Number(currentIndex) || 0, count - 1));
  return shiftKey ? (current - 1 + count) % count : (current + 1) % count;
}

export function startTypedChallenge(state) {
  return {
    ...state,
    phase: "active",
    inputMode: "text",
    secondsLeft: 60,
    isPaused: false,
    interimTranscript: "",
    liveStatus: "Type one idea at a time. Press Enter or use Add idea."
  };
}

export function startVoiceChallenge(state) {
  return {
    ...state,
    phase: "active",
    inputMode: "voice",
    secondsLeft: 60,
    isPaused: false,
    interimTranscript: "",
    voiceFallbackMessage: "",
    liveStatus: "Listening for ideas…"
  };
}

export function addTypedIdea(state, value) {
  if (state?.phase !== "active") return state;
  const idea = trimIdea(value);
  if (!idea) return state;
  const typedIdeas = [...(state.typedIdeas ?? []), idea];
  return {
    ...state,
    typedIdeas,
    transcript: typedIdeas.join("\n"),
    interimTranscript: "",
    liveStatus: `${typedIdeas.length} ${typedIdeas.length === 1 ? "idea" : "ideas"} found`
  };
}

export function togglePause(state) {
  if (state?.phase !== "active") return state;
  return {
    ...state,
    isPaused: !state.isPaused
  };
}

export function createReviewDraft(ideas = []) {
  return ideas
    .map((idea, index) => cloneReviewIdea(idea, index))
    .filter((idea) => idea.raw && idea.valid);
}

export function tickChallenge(state, seconds = 1) {
  if (state?.phase !== "active" || state.isPaused) return state;
  const remaining = Math.max(0, Number(state.secondsLeft ?? 0) - Math.max(1, Number(seconds) || 1));
  if (remaining > 0) {
    return {
      ...state,
      secondsLeft: remaining
    };
  }
  return {
    ...state,
    phase: "review",
    secondsLeft: 0,
    finishReason: "timeout",
    reviewIdeas: createReviewDraft(
      (state.typedIdeas ?? []).map((idea, index) => ({
        id: `idea-${index + 1}`,
        raw: idea,
        canonical: idea,
        category: "utility",
        valid: true,
        plausibility: defaultScore(idea, 0.55, 0.1),
        elaboration: defaultScore(idea, 0.4, 0.15)
      }))
    ),
    liveStatus: "Time is up. Review your ideas before you submit."
  };
}

export function editReviewIdea(reviewIdeas, ideaId, value) {
  return (reviewIdeas ?? []).map((idea, index) => {
    if (idea.id !== ideaId) return cloneReviewIdea(idea, index);
    const raw = trimIdea(value);
    return cloneReviewIdea(
      {
        ...idea,
        raw,
        canonical: raw.toLowerCase()
      },
      index
    );
  });
}

export function mergeReviewIdeas(reviewIdeas, { targetId, sourceId } = {}) {
  const items = (reviewIdeas ?? []).map((idea, index) => cloneReviewIdea(idea, index));
  const target = items.find((idea) => idea.id === targetId);
  const source = items.find((idea) => idea.id === sourceId);
  if (!target || !source || target.id === source.id) return items;
  const mergedText = `${trimIdea(target.raw)} / ${trimIdea(source.raw)}`.replace(/\s+\/\s+/g, " / ");
  return items
    .filter((idea) => idea.id !== source.id)
    .map((idea, index) => {
      if (idea.id !== target.id) return cloneReviewIdea(idea, index);
      return cloneReviewIdea(
        {
          ...idea,
          raw: mergedText,
          canonical: mergedText.toLowerCase(),
          plausibility: Math.max(target.plausibility, source.plausibility),
          elaboration: Math.max(target.elaboration, source.elaboration)
        },
        index
      );
    });
}

export function deleteReviewIdea(reviewIdeas, ideaId) {
  return (reviewIdeas ?? [])
    .filter((idea) => idea.id !== ideaId)
    .map((idea, index) => cloneReviewIdea(idea, index));
}

export function addReviewIdea(reviewIdeas, value) {
  const raw = trimIdea(value);
  if (!raw) return (reviewIdeas ?? []).map((idea, index) => cloneReviewIdea(idea, index));
  const items = (reviewIdeas ?? []).map((idea, index) => cloneReviewIdea(idea, index));
  return [
    ...items,
    cloneReviewIdea(
      {
        id: nextIdeaId(items),
        raw,
        canonical: raw.toLowerCase(),
        category: "utility",
        valid: true
      },
      items.length
    )
  ];
}

export function validateReviewIdeas(reviewIdeas) {
  const normalized = (reviewIdeas ?? []).map((idea, index) => cloneReviewIdea(idea, index)).filter((idea) => idea.raw);
  if (!normalized.length) {
    return { ok: false, detail: "Add at least one idea before you submit." };
  }
  return { ok: true, detail: "" };
}

export function buildPreviewPayload(challengeId, transcript) {
  return {
    challengeId: trimIdea(challengeId),
    transcript: String(transcript ?? "")
  };
}

export function buildAttemptPayload({
  challengeId,
  inputMode,
  durationSeconds,
  anonymousSessionId,
  reviewIdeas
} = {}) {
  return {
    challengeId: trimIdea(challengeId),
    inputMode: inputMode === "voice" ? "voice" : "text",
    durationSeconds: Number.isFinite(durationSeconds) ? Number(durationSeconds) : 0,
    anonymousSessionId: trimIdea(anonymousSessionId),
    ideas: (reviewIdeas ?? []).map((idea, index) => {
      const normalized = cloneReviewIdea(idea, index);
      return {
        raw: normalized.raw,
        canonical: normalized.canonical,
        category: normalized.category,
        valid: normalized.valid,
        plausibility: normalized.plausibility,
        elaboration: normalized.elaboration
      };
    })
  };
}

export function resolveVoiceFallback(reason) {
  if (reason === "denied") {
    return "Microphone access was denied. You can keep going by typing your ideas instead.";
  }
  if (reason === "unsupported") {
    return "This browser can’t record audio here. Type your ideas instead.";
  }
  return "Recording did not work this time. Your typed path is ready below.";
}
