export const PRACTICE_EXAMPLES = Object.freeze([
  { answer: "A tiny shovel for planting seeds", category: "Gardening" },
  { answer: "A rhythm stick for a kitchen band", category: "Music" },
  { answer: "A mirror for sending a sunlight signal", category: "Communication" }
]);

function resolveStorage(storage) {
  if (storage !== undefined) return storage;
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

export function createPracticeState() {
  return { step: "ready" };
}

export function startPractice(state) {
  if (state?.step !== "ready") return state;
  return { step: "active", secondsLeft: 15, ideas: [] };
}

export function addPracticeIdea(state, rawIdea) {
  if (state?.step !== "active") return state;
  const idea = String(rawIdea ?? "").trim().replace(/\s+/g, " ");
  if (!idea) return state;
  const ideas = [...state.ideas, idea].slice(0, 3);
  return ideas.length >= 3 ? { step: "lesson", ideas } : { ...state, ideas };
}

export function tickPractice(state, elapsedSeconds = 1) {
  if (state?.step !== "active") return state;
  const secondsLeft = Math.max(0, state.secondsLeft - Math.max(0, elapsedSeconds));
  return secondsLeft === 0 ? { step: "lesson", ideas: [...state.ideas] } : { ...state, secondsLeft };
}

export function readPracticeComplete(storage) {
  const resolvedStorage = resolveStorage(storage);
  try {
    return resolvedStorage?.getItem("unrot.practiceComplete") === "true";
  } catch {
    return false;
  }
}

export function persistPracticeComplete(storage) {
  const resolvedStorage = resolveStorage(storage);
  if (!resolvedStorage?.setItem) return false;
  try {
    resolvedStorage?.setItem("unrot.practiceComplete", "true");
    return true;
  } catch {
    return false;
  }
}

export function categorizePracticeIdea(rawIdea = "") {
  const idea = String(rawIdea).toLowerCase();
  if (/(seed|plant|garden|soil|dig|shovel|trowel)/.test(idea)) return "Gardening";
  if (/(rhythm|music|band|drum|beat|song|percussion|stick)/.test(idea)) return "Music";
  if (/(signal|mirror|flash|sunlight|message|communication|beacon)/.test(idea)) return "Communication";
  if (/(costume|dress|cape|mask)/.test(idea)) return "Costume";
  if (/(game|toy|play|puzzle)/.test(idea)) return "Play";
  if (/(bird|mouse|tiny creature|mini|small animal)/.test(idea)) return "Tiny creature";
  return "Fresh path";
}

export function isIdeaSubmitKey(key) {
  return key === "Enter";
}

export function handleIdeaKeydown(event, submit) {
  if (!isIdeaSubmitKey(event?.key)) return false;
  event.preventDefault();
  submit(event);
  return true;
}
