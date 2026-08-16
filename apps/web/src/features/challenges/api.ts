const RAW_CHALLENGES = Object.freeze([
  { slug: "spoon", name: "Spoon", description: "A familiar utensil with a rounded bowl and a short handle.", difficulty: "easy", theme: "kitchen-drawer", artKey: "spoon", prompt: "What else could this be?", targetCategoryBreadth: 5 },
  { slug: "empty-bottle", name: "Empty bottle", description: "A hollow bottle with no liquid left inside.", difficulty: "easy", theme: "recycling-bin", artKey: "empty-bottle", prompt: "What else could this be?", targetCategoryBreadth: 5 },
  { slug: "cardboard-box", name: "Cardboard box", description: "A plain corrugated box that once carried something else.", difficulty: "easy", theme: "delivery-day", artKey: "cardboard-box", prompt: "What else could this be?", targetCategoryBreadth: 6 },
  { slug: "sock", name: "Sock", description: "A soft single sock, easy to picture and twist into new roles.", difficulty: "easy", theme: "laundry-pile", artKey: "sock", prompt: "What else could this be?", targetCategoryBreadth: 5 },
  { slug: "paper-cup", name: "Paper cup", description: "A lightweight disposable cup from a cafe or party table.", difficulty: "easy", theme: "break-room", artKey: "paper-cup", prompt: "What else could this be?", targetCategoryBreadth: 5 },
  { slug: "towel", name: "Towel", description: "A folded towel with lots of surface area and flexible shapes.", difficulty: "easy", theme: "bathroom-shelf", artKey: "towel", prompt: "What else could this be?", targetCategoryBreadth: 6 },
  { slug: "clothespin", name: "Clothespin", description: "A small spring clip used to hold fabric in place.", difficulty: "uncommon", theme: "forgotten-drawer", artKey: "clothespin", prompt: "What else could this be?", targetCategoryBreadth: 6 },
  { slug: "bottle-cap", name: "Bottle cap", description: "A tiny ridged cap that usually disappears after a drink opens.", difficulty: "uncommon", theme: "picnic-leftovers", artKey: "bottle-cap", prompt: "What else could this be?", targetCategoryBreadth: 6 },
  { slug: "chalk-stub", name: "Chalk stub", description: "A worn-down chalk nub with only a little length left.", difficulty: "uncommon", theme: "sidewalk-doodles", artKey: "chalk-stub", prompt: "What else could this be?", targetCategoryBreadth: 6 },
  { slug: "lost-button", name: "Lost button", description: "A single spare button with no shirt or coat attached.", difficulty: "uncommon", theme: "sewing-kit", artKey: "lost-button", prompt: "What else could this be?", targetCategoryBreadth: 6 },
  { slug: "marble", name: "Marble", description: "A small glass marble that catches light and invites scale shifts.", difficulty: "uncommon", theme: "toy-box", artKey: "marble", prompt: "What else could this be?", targetCategoryBreadth: 6 },
  { slug: "popsicle-stick", name: "Popsicle stick", description: "A flat wooden stick with rounded ends from a frozen treat.", difficulty: "uncommon", theme: "summer-odds", artKey: "popsicle-stick", prompt: "What else could this be?", targetCategoryBreadth: 6 },
  { slug: "pencil-shaving", name: "Pencil shaving", description: "A curled shaving peeled from a freshly sharpened pencil.", difficulty: "uncommon", theme: "desk-scraps", artKey: "pencil-shaving", prompt: "What else could this be?", targetCategoryBreadth: 7 },
  { slug: "empty-cassette-case", name: "Empty cassette case", description: "A clear plastic cassette case with the tape long gone.", difficulty: "uncommon", theme: "nostalgia-shelf", artKey: "empty-cassette-case", prompt: "What else could this be?", targetCategoryBreadth: 7 },
  { slug: "bread-bag-clip", name: "Bread-bag clip", description: "A tiny plastic clip that keeps a loaf bag closed.", difficulty: "uncommon", theme: "pantry-corner", artKey: "bread-bag-clip", prompt: "What else could this be?", targetCategoryBreadth: 7 },
  { slug: "toy-block", name: "Toy block", description: "A simple block from a child’s building set.", difficulty: "uncommon", theme: "playroom-floor", artKey: "toy-block", prompt: "What else could this be?", targetCategoryBreadth: 6 },
  { slug: "crayon-wrapper", name: "Crayon wrapper", description: "A peeled paper wrapper that used to hug a wax crayon.", difficulty: "uncommon", theme: "art-bin", artKey: "crayon-wrapper", prompt: "What else could this be?", targetCategoryBreadth: 7 },
  { slug: "shoelace-tip", name: "Shoelace tip", description: "The small plastic end piece from a shoelace.", difficulty: "uncommon", theme: "coat-closet", artKey: "shoelace-tip", prompt: "What else could this be?", targetCategoryBreadth: 7 }
]);

function cloneChallenge(item) {
  return {
    slug: String(item.slug),
    name: String(item.name),
    description: String(item.description),
    difficulty: item.difficulty === "easy" ? "easy" : "uncommon",
    theme: String(item.theme ?? "curiosity-cabinet"),
    artKey: String(item.art_key ?? item.artKey ?? item.slug),
    prompt: String(item.prompt ?? "What else could this be?"),
    targetCategoryBreadth: Number(item.target_category_breadth ?? item.targetCategoryBreadth ?? 5)
  };
}

function configuredApiBase(windowRef = globalThis.window) {
  const value = windowRef?.UNROT_API_BASE ?? windowRef?.__UNROT_API_BASE__;
  return typeof value === "string" && value.trim() ? value.trim().replace(/\/$/, "") : "";
}

function apiUrl(pathname, windowRef = globalThis.window) {
  const base = configuredApiBase(windowRef);
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${base}${path}`;
}

async function requestJson(pathname, {
  fetcher = globalThis.fetch,
  windowRef = globalThis.window,
  headers = {},
  ...options
} = {}) {
  if (typeof fetcher !== "function") throw new Error("fetch unavailable");
  const response = await fetcher(apiUrl(pathname, windowRef), {
    ...options,
    headers: {
      Accept: "application/json",
      ...headers
    }
  });
  if (!response?.ok) {
    const detail = typeof response?.json === "function" ? await response.json().catch(() => null) : null;
    throw new Error(detail?.detail || `request failed: ${response?.status ?? "offline"}`);
  }
  return response.json();
}

export const STATIC_CHALLENGES = Object.freeze(RAW_CHALLENGES.map((item) => {
  const normalized = cloneChallenge(item);
  return {
    slug: normalized.slug,
    name: normalized.name,
    description: normalized.description,
    difficulty: normalized.difficulty,
    theme: normalized.theme,
    artKey: normalized.artKey
  };
}));

export const STATIC_CHALLENGE_DETAILS = Object.freeze(RAW_CHALLENGES.map((item) => cloneChallenge(item)));

export function getStaticChallenge(slug) {
  const item = STATIC_CHALLENGE_DETAILS.find((challenge) => challenge.slug === String(slug ?? "").trim());
  return item ? { ...item } : null;
}

export function resolveApiBase(windowRef = globalThis.window) {
  return configuredApiBase(windowRef);
}

export async function fetchChallengeCatalog(fetcher = globalThis.fetch) {
  try {
    const body = await requestJson("/v1/challenges", { fetcher });
    const items = Array.isArray(body) ? body : body?.items;
    if (!Array.isArray(items) || items.length !== 18) throw new Error("challenge catalog incomplete");
    return items.map((item) => {
      const normalized = cloneChallenge(item);
      return {
        slug: normalized.slug,
        name: normalized.name,
        description: normalized.description,
        difficulty: normalized.difficulty,
        theme: normalized.theme,
        artKey: normalized.artKey
      };
    });
  } catch {
    return STATIC_CHALLENGES.map((item) => ({ ...item }));
  }
}

export async function fetchChallengeDetail(slug, fetcher = globalThis.fetch) {
  const fallback = getStaticChallenge(slug);
  try {
    const body = await requestJson(`/v1/challenges/${encodeURIComponent(String(slug ?? "").trim())}`, { fetcher });
    return cloneChallenge(body);
  } catch {
    if (fallback) return fallback;
    throw new Error(`Challenge '${slug}' not found`);
  }
}

export async function transcribeAudio(blob, { fetcher = globalThis.fetch, windowRef = globalThis.window } = {}) {
  if (typeof fetcher !== "function") throw new Error("fetch unavailable");
  const bytes = blob instanceof Blob ? await blob.arrayBuffer() : blob;
  const response = await fetcher(apiUrl("/v1/transcriptions", windowRef), {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": blob?.type || "audio/webm"
    },
    body: bytes
  });
  if (!response?.ok) {
    const detail = typeof response?.json === "function" ? await response.json().catch(() => null) : null;
    throw new Error(detail?.detail || "Transcription failed");
  }
  return response.json();
}

export async function fetchCapabilities(fetcher = globalThis.fetch) {
  try {
    const body = await requestJson("/v1/capabilities", { fetcher });
    return {
      voice: {
        available: body?.voice?.available === true,
        provider: String(body?.voice?.provider ?? "local")
      }
    };
  } catch {
    return { voice: { available: false, provider: "local" } };
  }
}

export function fetchPreviewAnalysis(payload, fetcher = globalThis.fetch) {
  return requestJson("/v1/analyses/preview", {
    fetcher,
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
}

export function createAttempt(payload, idempotencyKey, fetcher = globalThis.fetch) {
  return requestJson("/v1/attempts", {
    fetcher,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": String(idempotencyKey ?? "").trim()
    },
    body: JSON.stringify(payload)
  });
}

export function fetchAttemptResult(attemptId, receipt, fetcher = globalThis.fetch) {
  return requestJson(`/v1/attempts/${encodeURIComponent(String(attemptId ?? "").trim())}`, {
    fetcher,
    headers: {
      "X-Attempt-Receipt": String(receipt ?? "").trim()
    }
  });
}

export async function deleteAttempt(attemptId, receipt, fetcher = globalThis.fetch) {
  if (typeof fetcher !== "function") throw new Error("fetch unavailable");
  const response = await fetcher(apiUrl(`/v1/attempts/${encodeURIComponent(String(attemptId ?? "").trim())}`), {
    method: "DELETE",
    headers: {
      Accept: "application/json",
      "X-Attempt-Receipt": String(receipt ?? "").trim()
    }
  });
  if (!response?.ok) {
    const detail = typeof response?.json === "function" ? await response.json().catch(() => null) : null;
    throw new Error(detail?.detail || "Attempt deletion failed");
  }
  return { deleted: true };
}

export async function fetchCommunityResults(challengeSlug, receipt, fetcher = globalThis.fetch) {
  try {
    return await requestJson(`/v1/challenges/${encodeURIComponent(String(challengeSlug ?? "").trim())}/community`, {
      fetcher,
      headers: {
        "X-Attempt-Receipt": String(receipt ?? "").trim()
      }
    });
  } catch (error) {
    return {
      comparisonBasis: "reference-set",
      items: [],
      error: error instanceof Error ? error.message : "Community answers unavailable"
    };
  }
}
