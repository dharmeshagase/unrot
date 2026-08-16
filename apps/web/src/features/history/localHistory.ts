const HISTORY_KEY = "unrot.history";
const DRAFT_PREFIX = "unrot.reviewDraft.";

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function normalizeHistoryEntry(entry) {
  if (!entry || typeof entry !== "object") return null;
  const attemptId = String(entry.attemptId ?? "").trim();
  const receipt = String(entry.receipt ?? "").trim();
  const challengeSlug = String(entry.challengeSlug ?? "").trim();
  const score = Number(entry.score);
  const completedAt = String(entry.completedAt ?? "").trim();
  if (!attemptId || !receipt || !challengeSlug || !Number.isFinite(score) || !completedAt) return null;
  return {
    attemptId,
    receipt,
    challengeSlug,
    score,
    completedAt
  };
}

export function resolveSafeStorage(storage = undefined) {
  if (storage !== undefined) {
    try {
      storage.getItem?.("__probe__");
      return storage;
    } catch {
      return null;
    }
  }
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

export function readHistoryEntries(storage = undefined) {
  const safeStorage = resolveSafeStorage(storage);
  if (!safeStorage) return [];
  let rawValue = "[]";
  try {
    rawValue = safeStorage.getItem(HISTORY_KEY) ?? "[]";
  } catch {
    return [];
  }
  const parsed = safeJsonParse(rawValue);
  if (!Array.isArray(parsed)) return [];
  return parsed.map(normalizeHistoryEntry).filter(Boolean);
}

export function saveHistoryEntry(entry, storage = undefined) {
  const safeStorage = resolveSafeStorage(storage);
  if (!safeStorage) return false;
  const normalized = normalizeHistoryEntry(entry);
  if (!normalized) return false;
  try {
    const current = readHistoryEntries(safeStorage).filter((item) => item.attemptId !== normalized.attemptId);
    current.unshift(normalized);
    safeStorage.setItem(HISTORY_KEY, JSON.stringify(current.slice(0, 24)));
    return true;
  } catch {
    return false;
  }
}

export function findHistoryEntry(attemptId, storage = undefined) {
  const needle = String(attemptId ?? "").trim();
  return readHistoryEntries(storage).find((entry) => entry.attemptId === needle) ?? null;
}

export function removeHistoryEntry(attemptId, storage = undefined) {
  const safeStorage = resolveSafeStorage(storage);
  if (!safeStorage) return false;
  const needle = String(attemptId ?? "").trim();
  try {
    const remaining = readHistoryEntries(safeStorage).filter((entry) => entry.attemptId !== needle);
    safeStorage.setItem(HISTORY_KEY, JSON.stringify(remaining));
    return true;
  } catch {
    return false;
  }
}

export function saveDraft(challengeSlug, draft, storage = undefined) {
  const safeStorage = resolveSafeStorage(storage);
  if (!safeStorage) return false;
  try {
    safeStorage.setItem(`${DRAFT_PREFIX}${String(challengeSlug ?? "").trim()}`, JSON.stringify(draft ?? null));
    return true;
  } catch {
    return false;
  }
}

export function readDraft(challengeSlug, storage = undefined) {
  const safeStorage = resolveSafeStorage(storage);
  if (!safeStorage) return null;
  try {
    return safeJsonParse(safeStorage.getItem(`${DRAFT_PREFIX}${String(challengeSlug ?? "").trim()}`) ?? "null");
  } catch {
    return null;
  }
}

export function clearDraft(challengeSlug, storage = undefined) {
  const safeStorage = resolveSafeStorage(storage);
  if (!safeStorage) return false;
  try {
    safeStorage.removeItem(`${DRAFT_PREFIX}${String(challengeSlug ?? "").trim()}`);
    return true;
  } catch {
    return false;
  }
}

export function pickNextChallenge(catalog = [], { currentSlug = "", historyEntries = [] } = {}) {
  const recent = new Set(
    (historyEntries ?? [])
      .map((entry) => String(entry?.challengeSlug ?? "").trim())
      .filter(Boolean)
  );
  const current = String(currentSlug ?? "").trim();
  return catalog.find((item) => item?.slug && item.slug !== current && !recent.has(item.slug))
    ?? catalog.find((item) => item?.slug && item.slug !== current)
    ?? catalog[0]
    ?? null;
}
