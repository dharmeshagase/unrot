function clean(value) {
  return String(value ?? "").trim();
}

export function resolveAttemptId(locationLike = {}, embeddedAttemptId = "") {
  const embedded = clean(embeddedAttemptId);
  if (embedded) return embedded;
  const params = new URLSearchParams(String(locationLike?.search ?? ""));
  const queryAttempt = clean(params.get("attempt"));
  if (queryAttempt) return queryAttempt;
  const match = String(locationLike?.pathname ?? "").match(/^\/results\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : "";
}

export function takeReceiptFromFragment(locationLike = {}, historyLike = globalThis.history) {
  const hash = String(locationLike?.hash ?? "").replace(/^#/, "");
  const receipt = clean(new URLSearchParams(hash).get("receipt"));
  if (!receipt) return "";
  const scrubbedUrl = `${String(locationLike?.pathname ?? "/")}${String(locationLike?.search ?? "")}`;
  historyLike?.replaceState?.(historyLike?.state ?? null, "", scrubbedUrl);
  return receipt;
}

export async function deleteAttemptAndForget({
  attemptId,
  receipt,
  deleteAttempt,
  removeHistoryEntry
} = {}) {
  try {
    await deleteAttempt(clean(attemptId), clean(receipt));
    removeHistoryEntry?.(clean(attemptId));
    return { status: "deleted", detail: "This attempt was deleted." };
  } catch (error) {
    return {
      status: "error",
      detail: error instanceof Error ? error.message : "Attempt deletion failed"
    };
  }
}
