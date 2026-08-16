import renderChallengeExperience from "/challenge-experience.js";
import renderObjectArt from "/object-art.js";
import {
  PROCESSING_MESSAGES,
  addReviewIdea,
  addTypedIdea,
  buildPreviewPayload,
  createChallengeState,
  createReviewDraft,
  editReviewIdea,
  mergeReviewIdeas,
  nextModalFocusIndex,
  startTypedChallenge,
  startVoiceChallenge,
  togglePause,
  validateReviewIdeas,
  deleteReviewIdea
} from "/challenge-machine.js";
import {
  activateTypedFallback,
  secondsLeftFromClock,
  submitTypedJourney
} from "/typed-journey.js";
import {
  createAttempt,
  fetchCapabilities,
  fetchChallengeDetail,
  fetchPreviewAnalysis,
  transcribeAudio
} from "/challenge-api.js";
import { createChallengeFinishTracker } from "/challenge-lifecycle.js";
import { clearDraft, readDraft, resolveSafeStorage, saveDraft, saveHistoryEntry } from "/local-history.js";

const SESSION_KEY = "unrot.anonymousSessionId";
const CHALLENGE_DURATION_SECONDS = 60;
const ANALYTICS_PROMISE_KEY = "__unrotAnalyticsModulePromise";

function isRecordingSupported(windowRef = globalThis.window) {
  return Boolean(windowRef?.MediaRecorder && globalThis.navigator?.mediaDevices?.getUserMedia);
}

function supportsLiveSpeech(windowRef = globalThis.window) {
  return Boolean(windowRef?.SpeechRecognition || windowRef?.webkitSpeechRecognition);
}

function now(clock = globalThis) {
  return clock?.Date?.now?.() ?? Date.now();
}

function createDraftKey(challengeSlug) {
  const token = globalThis.crypto?.randomUUID?.() ?? `draft-${Date.now()}`;
  return `${String(challengeSlug ?? "").trim() || "challenge"}-${token}`;
}

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

function getSessionId(storage) {
  const safeStorage = resolveSafeStorage(storage);
  const existing = safeStorage?.getItem?.(SESSION_KEY);
  if (existing) return existing;
  const generated = globalThis.crypto?.randomUUID?.() ?? `anon-${Date.now()}`;
  try {
    safeStorage?.setItem?.(SESSION_KEY, generated);
  } catch {}
  return generated;
}

function prefersReducedMotion(windowRef = globalThis.window) {
  try {
    return windowRef?.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
  } catch {
    return false;
  }
}

export function mountChallenge(documentRef = globalThis.document, storage, clock = globalThis) {
  const root = documentRef?.querySelector?.("[data-challenge-root]");
  if (!root) return () => {};
  const challengeSlug = String(root.getAttribute("data-challenge-slug") ?? "").trim();
  const safeStorage = resolveSafeStorage(storage);
  const anonymousSessionId = getSessionId(safeStorage);
  let challenge = null;
  let state = createChallengeState({ slug: challengeSlug });
  let timerId;
  let processingId;
  let dialogTrigger = null;
  let mediaStream = null;
  let mediaRecorder = null;
  let mediaChunks = [];
  let speechRecognition = null;
  let roundEndAtMs = null;
  let currentDraftKey = "";
  let unmounted = false;
  const finishTracker = createChallengeFinishTracker((payload) => withAnalytics("trackChallengeFinished", payload));

  const draft = readDraft(challengeSlug, safeStorage);
  if (draft?.reviewIdeas?.length) {
    currentDraftKey = String(draft.draftKey ?? "").trim() || createDraftKey(challengeSlug);
    state = {
      ...state,
      phase: "review",
      inputMode: "text",
      reviewIdeas: createReviewDraft(draft.reviewIdeas),
      draftValue: String(draft.draftValue ?? ""),
      networkNotice: "Draft restored after a connection hiccup."
    };
  }

  function ensureDraftKey() {
    if (!currentDraftKey) currentDraftKey = createDraftKey(challengeSlug);
    return currentDraftKey;
  }

  function clearTimer() {
    if (timerId !== undefined) clock.clearInterval(timerId);
    timerId = undefined;
    roundEndAtMs = null;
  }

  function clearProcessingRotation() {
    if (processingId !== undefined) clock.clearInterval(processingId);
    processingId = undefined;
  }

  function cleanupRecording() {
    try {
      mediaRecorder?.stop?.();
    } catch {}
    mediaRecorder = null;
    stopLiveSpeech();
    for (const track of mediaStream?.getTracks?.() ?? []) track.stop();
    mediaStream = null;
    mediaChunks = [];
  }

  function persistReviewDraft(message) {
    saveDraft(challengeSlug, {
      reviewIdeas: state.reviewIdeas,
      draftValue: state.draftValue,
      draftKey: ensureDraftKey()
    }, safeStorage);
    state = {
      ...state,
      phase: "review",
      networkNotice: message
    };
    render();
  }

  function render() {
    if (!challenge) return;
    root.innerHTML = renderChallengeExperience({
      challenge,
      state,
      renderObjectArt
    });
    bind();
  }

  function updateTimerText() {
    const timer = root.querySelector?.("[data-challenge-timer]");
    if (timer) {
      timer.textContent = String(Math.max(0, Number(state.secondsLeft ?? 0)));
      timer.setAttribute("aria-label", `${Math.max(0, Number(state.secondsLeft ?? 0))} seconds remaining`);
    }
  }

  function rotateProcessingMessages() {
    clearProcessingRotation();
    if (prefersReducedMotion()) return;
    processingId = clock.setInterval(() => {
      state = {
        ...state,
        processingMessage: PROCESSING_MESSAGES[(PROCESSING_MESSAGES.indexOf(state.processingMessage) + 1) % PROCESSING_MESSAGES.length]
      };
      const heading = root.querySelector?.("#processing-heading");
      if (heading) heading.textContent = state.processingMessage;
    }, 1400);
  }

  function syncSecondsLeft() {
    if (roundEndAtMs == null) return;
    state = {
      ...state,
      secondsLeft: secondsLeftFromClock({
        endAtMs: roundEndAtMs,
        nowMs: now(clock)
      })
    };
  }

  function startTimer({ onElapsed }) {
    clearTimer();
    roundEndAtMs = now(clock) + Math.max(0, Number(state.secondsLeft ?? CHALLENGE_DURATION_SECONDS)) * 1000;
    timerId = clock.setInterval(() => {
      if (state.phase !== "active" || state.isPaused) return;
      syncSecondsLeft();
      updateTimerText();
      if (state.secondsLeft <= 0) {
        clearTimer();
        onElapsed?.();
      }
    }, 1000);
  }

  function pauseActiveRound() {
    syncSecondsLeft();
    clearTimer();
    if (state.inputMode === "voice") {
      try {
        mediaRecorder?.pause?.();
      } catch {}
      stopLiveSpeech();
    }
    state = togglePause(state);
    render();
  }

  function resumeActiveRound() {
    state = togglePause(state);
    if (state.inputMode === "voice") {
      try {
        mediaRecorder?.resume?.();
      } catch {}
      startLiveSpeech();
    }
    render();
    startTimer({ onElapsed: () => finishActiveRound("timeout") });
  }

  function finishActiveRound(finishReason = "manual") {
    if (state.phase !== "active") return;
    if (state.inputMode === "voice") {
      finishVoiceRound(finishReason);
      return;
    }
    finishTracker.finishTyped({
      challengeId: challenge.slug,
      typedIdeas: state.typedIdeas
    });
    void beginTypedReviewFromTranscript(finishReason);
  }

  async function beginTypedReviewFromTranscript(finishReason = "manual") {
    clearTimer();
    clearProcessingRotation();
    state = {
      ...state,
      phase: "processing",
      finishReason,
      processingMessage: PROCESSING_MESSAGES[0]
    };
    render();
    rotateProcessingMessages();
    try {
      const preview = await fetchPreviewAnalysis(
        buildPreviewPayload(challenge.slug, state.transcript || state.typedIdeas.join("\n"))
      );
      clearProcessingRotation();
      state = {
        ...state,
        phase: "review",
        reviewIdeas: createReviewDraft(preview.ideas),
        networkNotice: ""
      };
      render();
    } catch {
      clearProcessingRotation();
      state = {
        ...state,
        phase: "review",
        reviewIdeas: createReviewDraft(
          state.typedIdeas.map((idea, index) => ({
            id: `idea-${index + 1}`,
            raw: idea,
            canonical: idea,
            category: "utility",
            valid: true,
            plausibility: 0.65,
            elaboration: 0.55
          }))
        ),
        networkNotice: "Preview could not load. Your draft is still here to edit and submit."
      };
      saveDraft(challengeSlug, {
        reviewIdeas: state.reviewIdeas,
        draftValue: state.draftValue,
        draftKey: ensureDraftKey()
      }, safeStorage);
      render();
    }
  }

  async function handleVoiceBlob(blob, finishReason = "manual") {
    state = {
      ...state,
      phase: "processing",
      finishReason,
      processingMessage: PROCESSING_MESSAGES[0]
    };
    render();
    rotateProcessingMessages();
    try {
      let audioBlob = blob;
      const transcript = await transcribeAudio(audioBlob);
      audioBlob = null;
      mediaChunks = [];
      const preview = await fetchPreviewAnalysis(buildPreviewPayload(challenge.slug, transcript.text));
      clearProcessingRotation();
      const reviewIdeas = createReviewDraft(preview.ideas);
      finishTracker.finishReviewed({
        challengeId: challenge.slug,
        reviewIdeas
      });
      state = {
        ...state,
        phase: "review",
        transcript: transcript.text,
        interimTranscript: "",
        reviewIdeas,
        networkNotice: ""
      };
      render();
    } catch {
      clearProcessingRotation();
      withAnalytics("trackTranscriptionFailed", { challengeId: challenge.slug });
      cleanupRecording();
      state = {
        ...activateTypedFallback({
          ...state,
          secondsLeft: Math.max(0, Number(state.secondsLeft ?? CHALLENGE_DURATION_SECONDS))
        }, "failed"),
        networkNotice: "Voice could not be processed. Keep going by typing below."
      };
      render();
      startTimer({ onElapsed: () => finishActiveRound("timeout") });
    } finally {
      mediaChunks = [];
    }
  }

  function finishVoiceRound(finishReason = "manual") {
    clearTimer();
    stopLiveSpeech();
    if (!mediaRecorder) {
      state = {
        ...activateTypedFallback({
          ...state,
          secondsLeft: Math.max(0, Number(state.secondsLeft ?? CHALLENGE_DURATION_SECONDS))
        }, "failed")
      };
      render();
      startTimer({ onElapsed: () => finishActiveRound("timeout") });
      return;
    }
    const localRecorder = mediaRecorder;
    localRecorder.onstop = async () => {
      const blob = new Blob(mediaChunks, { type: localRecorder.mimeType || "audio/webm" });
      cleanupRecording();
      await handleVoiceBlob(blob, finishReason);
    };
    try {
      localRecorder.stop();
    } catch {
      cleanupRecording();
      state = {
        ...activateTypedFallback({
          ...state,
          secondsLeft: Math.max(0, Number(state.secondsLeft ?? CHALLENGE_DURATION_SECONDS))
        }, "failed")
      };
      render();
      startTimer({ onElapsed: () => finishActiveRound("timeout") });
    }
  }

  function stopLiveSpeech() {
    if (!speechRecognition) return;
    try {
      speechRecognition.onresult = null;
      speechRecognition.onend = null;
      speechRecognition.onerror = null;
      speechRecognition.stop?.();
    } catch {}
    speechRecognition = null;
  }

  function startLiveSpeech() {
    if (!supportsLiveSpeech() || state.inputMode !== "voice" || state.phase !== "active" || state.isPaused) return;
    const SpeechRecognitionCtor = globalThis.window?.SpeechRecognition || globalThis.window?.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return;
    stopLiveSpeech();
    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let interimTranscript = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        interimTranscript += `${event.results[index][0]?.transcript ?? ""} `;
      }
      state = {
        ...state,
        interimTranscript: interimTranscript.trim(),
        liveStatus: interimTranscript.trim() ? "Listening for ideas…" : state.liveStatus
      };
      render();
    };
    recognition.onend = () => {
      if (speechRecognition !== recognition) return;
      speechRecognition = null;
      if (state.phase === "active" && state.inputMode === "voice" && !state.isPaused) {
        startLiveSpeech();
      }
    };
    recognition.onerror = () => {
      stopLiveSpeech();
    };
    speechRecognition = recognition;
    try {
      recognition.start();
    } catch {}
  }

  async function beginVoiceRound() {
    if (state.voiceAvailable !== true) {
      state = {
        ...activateTypedFallback(state, "unsupported"),
        voiceFallbackMessage: "Voice is unavailable in this configuration. Type your ideas instead."
      };
      render();
      startTimer({ onElapsed: () => finishActiveRound("timeout") });
      root.querySelector?.("#challenge-idea")?.focus?.();
      return;
    }
    if (!isRecordingSupported()) {
      withAnalytics("trackInputModeSelected", { challengeId: challengeSlug, mode: "voice" });
      withAnalytics("trackMicrophonePermissionResult", { challengeId: challengeSlug, result: "unsupported" });
      state = {
        ...activateTypedFallback(state, "unsupported")
      };
      render();
      startTimer({ onElapsed: () => finishActiveRound("timeout") });
      root.querySelector?.("#challenge-idea")?.focus?.();
      return;
    }
    try {
      withAnalytics("trackInputModeSelected", { challengeId: challengeSlug, mode: "voice" });
      mediaStream = await globalThis.navigator.mediaDevices.getUserMedia({ audio: true });
      withAnalytics("trackMicrophonePermissionResult", { challengeId: challengeSlug, result: "granted" });
      mediaRecorder = new globalThis.MediaRecorder(mediaStream, { mimeType: "audio/webm" });
      mediaChunks = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event?.data?.size) mediaChunks.push(event.data);
      };
      mediaRecorder.start();
      state = startVoiceChallenge(state);
      finishTracker.beginRound();
      withAnalytics("trackChallengeStarted", { challengeId: challengeSlug });
      render();
      startLiveSpeech();
      ensureDraftKey();
      startTimer({ onElapsed: () => finishActiveRound("timeout") });
    } catch (error) {
      const reason = error?.name === "NotAllowedError" ? "denied" : "failed";
      withAnalytics("trackMicrophonePermissionResult", { challengeId: challengeSlug, result: reason });
      cleanupRecording();
      state = {
        ...activateTypedFallback(state, reason)
      };
      render();
      startTimer({ onElapsed: () => finishActiveRound("timeout") });
      root.querySelector?.("#challenge-idea")?.focus?.();
    }
  }

  async function submitReview() {
    const validation = validateReviewIdeas(state.reviewIdeas);
    if (!validation.ok) {
      state = {
        ...state,
        networkNotice: validation.detail
      };
      render();
      return;
    }
    withAnalytics("trackIdeasReviewed", { challengeId: challenge.slug, count: state.reviewIdeas.length });
    state = {
      ...state,
      phase: "processing",
      processingMessage: PROCESSING_MESSAGES[0]
    };
    render();
    rotateProcessingMessages();
    try {
      const submission = await submitTypedJourney({
        challengeSlug: challenge.slug,
        inputMode: state.inputMode,
        secondsLeft: state.secondsLeft,
        anonymousSessionId,
        currentDraftKey: ensureDraftKey(),
        reviewIdeas: state.reviewIdeas,
        rerunPreview: fetchPreviewAnalysis,
        createAttempt,
        saveHistoryEntry: (entry) => saveHistoryEntry(entry, safeStorage)
      });
      clearProcessingRotation();
      if (submission.status !== "success") {
        persistReviewDraft("Draft saved locally while you reconnect.");
        return;
      }
      clearDraft(challengeSlug, safeStorage);
      cleanupRecording();
      globalThis.location.href = submission.redirectHref;
    } catch {
      clearProcessingRotation();
      persistReviewDraft("Draft saved locally while you reconnect.");
    }
  }

  function bindDialog() {
    root.querySelector?.("[data-open-timer-info]")?.addEventListener("click", (event) => {
      dialogTrigger = event.currentTarget;
      withAnalytics("trackTimerInfoOpened", { challengeId: challenge.slug });
      const dialog = root.querySelector?.("[data-timer-dialog]");
      dialog?.removeAttribute("hidden");
      dialog?.setAttribute("tabindex", "-1");
      dialog?.querySelector?.("[data-close-timer-info]")?.focus?.();
    });
    const closeDialog = () => {
      const dialog = root.querySelector?.("[data-timer-dialog]");
      dialog?.setAttribute("hidden", "hidden");
      dialogTrigger?.focus?.();
    };
    root.querySelector?.("[data-close-timer-info]")?.addEventListener("click", closeDialog);
    root.querySelector?.("[data-timer-dialog]")?.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeDialog();
        return;
      }
      if (event.key === "Tab") {
        const dialog = event.currentTarget;
        const focusable = Array.from(dialog.querySelectorAll?.("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])") ?? []);
        if (!focusable.length) return;
        const currentIndex = Math.max(0, focusable.indexOf(documentRef.activeElement));
        const nextIndex = nextModalFocusIndex(currentIndex, focusable.length, event.shiftKey);
        event.preventDefault();
        focusable[nextIndex]?.focus?.();
      }
    });
    root.querySelector?.("[data-timer-dialog]")?.addEventListener("click", (event) => {
      if (event.target === event.currentTarget) closeDialog();
    });
  }

  function bind() {
    bindDialog();
    root.querySelector?.("[data-start-typed]")?.addEventListener("click", () => {
      ensureDraftKey();
      withAnalytics("trackInputModeSelected", { challengeId: challengeSlug, mode: "text" });
      state = startTypedChallenge(state);
      finishTracker.beginRound();
      withAnalytics("trackChallengeStarted", { challengeId: challengeSlug });
      render();
      startTimer({ onElapsed: () => finishActiveRound("timeout") });
      root.querySelector?.("#challenge-idea")?.focus?.();
    });
    root.querySelector?.("[data-start-voice]")?.addEventListener("click", () => {
      void beginVoiceRound();
    });
    root.querySelector?.("[data-toggle-pause]")?.addEventListener("click", () => {
      if (state.isPaused) {
        resumeActiveRound();
        return;
      }
      pauseActiveRound();
    });
    root.querySelector?.("[data-finish-challenge]")?.addEventListener("click", () => {
      finishActiveRound("manual");
    });
    root.querySelector?.("[data-typed-idea-form]")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const input = root.querySelector?.("#challenge-idea");
      state = addTypedIdea(state, input?.value ?? "");
      withAnalytics("trackIdeaDetected", { challengeId: challenge.slug, count: state.typedIdeas.length });
      render();
      root.querySelector?.("#challenge-idea")?.focus?.();
    });
    root.querySelector?.("[data-review-add-form]")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const input = root.querySelector?.("#review-add-idea");
      state = {
        ...state,
        reviewIdeas: addReviewIdea(state.reviewIdeas, input?.value ?? ""),
        draftValue: ""
      };
      render();
      root.querySelector?.("#review-add-idea")?.focus?.();
    });
    root.querySelectorAll?.("[data-review-input]")?.forEach((input) => {
      input.addEventListener("change", (event) => {
        state = {
          ...state,
          reviewIdeas: editReviewIdea(state.reviewIdeas, event.currentTarget.getAttribute("data-review-input"), event.currentTarget.value)
        };
      });
    });
    root.querySelectorAll?.("[data-merge-review]")?.forEach((button) => {
      button.addEventListener("click", (event) => {
        const sourceId = event.currentTarget.getAttribute("data-merge-review");
        const currentIndex = state.reviewIdeas.findIndex((idea) => idea.id === sourceId);
        if (currentIndex > 0) {
          state = {
            ...state,
            reviewIdeas: mergeReviewIdeas(state.reviewIdeas, {
              targetId: state.reviewIdeas[currentIndex - 1].id,
              sourceId
            })
          };
          render();
        }
      });
    });
    root.querySelectorAll?.("[data-delete-review]")?.forEach((button) => {
      button.addEventListener("click", (event) => {
        state = {
          ...state,
          reviewIdeas: deleteReviewIdea(state.reviewIdeas, event.currentTarget.getAttribute("data-delete-review"))
        };
        render();
      });
    });
    root.querySelector?.("[data-submit-review]")?.addEventListener("click", () => {
      void submitReview();
    });
  }

  Promise.all([fetchChallengeDetail(challengeSlug), fetchCapabilities()])
    .then(([detail, capabilities]) => {
      if (unmounted) return;
      challenge = detail;
      state = {
        ...state,
        voiceAvailable: capabilities?.voice?.available === true,
        voiceProvider: String(capabilities?.voice?.provider ?? "local")
      };
      render();
    })
    .catch(() => {
      if (unmounted) return;
      challenge = {
        slug: challengeSlug || "spoon",
        name: "Spoon",
        description: "",
        difficulty: "easy",
        theme: "kitchen-drawer",
        artKey: challengeSlug || "spoon",
        prompt: "What else could this be?",
        targetCategoryBreadth: 5
      };
      render();
    });

  const cleanup = () => {
    unmounted = true;
    clearTimer();
    clearProcessingRotation();
    cleanupRecording();
  };

  globalThis.addEventListener?.("beforeunload", cleanup, { once: true });
  return cleanup;
}

if (typeof document !== "undefined") mountChallenge();
