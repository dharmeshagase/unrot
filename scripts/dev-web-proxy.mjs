const UPSTREAM_ORIGIN = "http://127.0.0.1:8000";
const ALLOWED_HEADERS = new Set([
  "accept",
  "content-type",
  "idempotency-key",
  "x-attempt-receipt"
]);

function assertOriginForm(requestUrl) {
  const value = String(requestUrl ?? "");
  if (!value.startsWith("/") || value.startsWith("//") || /^[a-z][a-z0-9+.-]*:/i.test(value)) {
    throw new Error("Proxy request must use an origin-form URL");
  }
  return value;
}

export function buildProxyRequest({ requestUrl, method = "GET", headers = {}, body } = {}) {
  const pathname = assertOriginForm(requestUrl);
  const upstreamUrl = new URL(pathname, UPSTREAM_ORIGIN);
  const forwardedHeaders = {};
  for (const [key, value] of Object.entries(headers ?? {})) {
    const normalizedKey = String(key).toLowerCase();
    if (!ALLOWED_HEADERS.has(normalizedKey)) continue;
    forwardedHeaders[normalizedKey] = String(value);
  }
  return {
    url: upstreamUrl,
    method: String(method ?? "GET").toUpperCase(),
    headers: forwardedHeaders,
    body
  };
}
