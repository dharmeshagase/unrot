import renderPracticeFlow from "/practice-flow.js";
import renderObjectArt from "/object-art.js";
import { addPracticeIdea, categorizePracticeIdea, createPracticeState, handleIdeaKeydown, persistPracticeComplete, readPracticeComplete, startPractice, tickPractice } from "/practice-machine.js";

function resolveStorage(storage) {
  if (storage !== undefined) return storage;
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

function prefersReducedMotion(windowRef = globalThis.window) {
  try {
    return windowRef?.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
  } catch {
    return false;
  }
}

export function mountPractice(documentRef = globalThis.document, storage, clock = globalThis) {
  const root = documentRef?.querySelector("[data-practice-root]");
  if (!root) return () => {};
  const resolvedStorage = resolveStorage(storage);
  let showSkip = readPracticeComplete(resolvedStorage);
  let state = createPracticeState();
  let timerId;

  const stopTimer = () => {
    if (timerId !== undefined) clock.clearInterval(timerId);
    timerId = undefined;
  };

  const render = () => {
    root.innerHTML = renderPracticeFlow({
      state,
      showSkip,
      categorizeIdea: categorizePracticeIdea,
      renderObjectArt
    });
    bind();
    if (state.step === "lesson") {
      stopTimer();
      persistPracticeComplete(resolvedStorage);
      showSkip = true;
      const lessonHeading = root.querySelector("#lesson-heading");
      lessonHeading?.focus?.();
      if (lessonHeading?.scrollIntoView) {
        lessonHeading.scrollIntoView({
          block: "start",
          behavior: prefersReducedMotion() ? "auto" : "smooth"
        });
      }
    }
  };

  const submitIdea = (event) => {
    event.preventDefault();
    const input = root.querySelector("#practice-idea");
    state = addPracticeIdea(state, input?.value ?? "");
    render();
    if (state.step === "active") root.querySelector("#practice-idea")?.focus?.();
  };

  const begin = () => {
    state = startPractice(state);
    render();
    root.querySelector("#practice-idea")?.focus?.();
    timerId = clock.setInterval(() => {
      state = tickPractice(state);
      if (state.step === "lesson") {
        render();
        return;
      }
      const timer = root.querySelector("[data-practice-timer]");
      if (timer) {
        timer.textContent = String(state.secondsLeft);
        timer.setAttribute("aria-label", `${state.secondsLeft} seconds remaining`);
      }
    }, 1000);
  };

  function bind() {
    root.querySelector("[data-start-practice]")?.addEventListener("click", begin, { once: true });
    root.querySelector("[data-idea-form]")?.addEventListener("submit", submitIdea);
    root.querySelector("#practice-idea")?.addEventListener("keydown", (event) => handleIdeaKeydown(event, submitIdea));
  }

  render();
  return stopTimer;
}

if (typeof document !== "undefined") mountPractice();
