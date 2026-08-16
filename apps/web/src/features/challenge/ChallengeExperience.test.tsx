import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

async function load(relativePath) {
  const source = await readFile(path.resolve(relativePath), "utf8");
  return import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
}

const SPOON = {
  slug: "spoon",
  name: "Spoon",
  description: "A familiar utensil with a rounded bowl and a short handle.",
  difficulty: "easy",
  theme: "kitchen-drawer",
  artKey: "spoon",
  prompt: "What else could this be?",
  targetCategoryBreadth: 5
};

export async function run() {
  const [experience, objectArt, styles] = await Promise.all([
    load("apps/web/src/features/challenge/ChallengeExperience.tsx"),
    load("apps/web/src/components/objects/ObjectArt.tsx"),
    readFile(path.resolve("apps/web/src/app/globals.css"), "utf8")
  ]);

  const readyHtml = experience.default({
    challenge: SPOON,
    state: { phase: "ready", voiceAvailable: true },
    renderObjectArt: objectArt.default
  });

  assert.match(readyHtml, /What else could this be\?/i);
  assert.match(readyHtml, /Find as many unexpected uses for this as you can\./i);
  assert.match(readyHtml, /Start talking/i);
  assert.match(readyHtml, /I’d rather type|I'd rather type/i);
  assert.match(readyHtml, /Your recording is transcribed, then discarded\./i);
  assert.match(readyHtml, /aria-label="Why 60 seconds\?"/i);
  assert.match(readyHtml, /This isn’t a test you can fail\./i);
  assert.doesNotMatch(readyHtml, /other people tried|community answers/i);
  assert.equal((readyHtml.match(/wordmark-hybrid/g) ?? []).length, 0, "the challenge body must not repeat the hybrid wordmark treatment");
  assert.match(readyHtml, /aria-modal="true"/i);

  const localReadyHtml = experience.default({
    challenge: SPOON,
    state: { phase: "ready", voiceAvailable: false },
    renderObjectArt: objectArt.default
  });
  assert.match(localReadyHtml, /Start typing/i);
  assert.match(localReadyHtml, /Voice.+unavailable|voice unavailable/i);
  assert.doesNotMatch(localReadyHtml, /Your recording is transcribed/i);
  assert.ok(localReadyHtml.indexOf("Start typing") < localReadyHtml.indexOf("Voice"));

  const activeHtml = experience.default({
    challenge: SPOON,
    state: {
      phase: "active",
      inputMode: "text",
      secondsLeft: 42,
      isPaused: false,
      transcript: "seed shovel\nsun signal",
      typedIdeas: ["seed shovel", "sun signal"],
      liveStatus: "2 ideas found",
      voiceFallbackMessage: ""
    },
    renderObjectArt: objectArt.default
  });

  assert.match(activeHtml, /42/);
  assert.match(activeHtml, /Pause/i);
  assert.match(activeHtml, /I’m done thinking|I'm done thinking/i);
  assert.match(activeHtml, /seed shovel/i);
  assert.match(activeHtml, /sun signal/i);
  assert.match(activeHtml, /2 ideas found/i);
  assert.match(activeHtml, /Type one idea at a time/i);

  const activeVoiceHtml = experience.default({
    challenge: SPOON,
    state: {
      phase: "active",
      inputMode: "voice",
      secondsLeft: 31,
      isPaused: false,
      transcript: "",
      typedIdeas: [],
      interimTranscript: "tiny shovel",
      liveStatus: "Listening for ideas…",
      voiceFallbackMessage: ""
    },
    renderObjectArt: objectArt.default
  });
  assert.match(activeVoiceHtml, /Listening for ideas/i);
  assert.match(activeVoiceHtml, /tiny shovel/i);
  assert.match(activeVoiceHtml, /31/i);

  const reviewHtml = experience.default({
    challenge: SPOON,
    state: {
      phase: "review",
      inputMode: "text",
      draftValue: "tiny puppet leg",
      reviewIdeas: [
        {
          id: "idea-1",
          raw: "seed shovel",
          canonical: "seed shovel",
          category: "gardening",
          valid: true,
          plausibility: 0.7,
          elaboration: 0.5
        },
        {
          id: "idea-2",
          raw: "sun signal",
          canonical: "sun signal",
          category: "communication",
          valid: true,
          plausibility: 0.8,
          elaboration: 0.6
        }
      ],
      networkNotice: "Draft saved locally while you reconnect."
    },
    renderObjectArt: objectArt.default
  });

  assert.match(reviewHtml, /Review your ideas/i);
  assert.match(reviewHtml, /Merge with the one above/i);
  assert.match(reviewHtml, /Delete/i);
  assert.match(reviewHtml, /Add another idea/i);
  assert.match(reviewHtml, /Draft saved locally while you reconnect\./i);
  assert.match(reviewHtml, /Submit for my result/i);
  assert.match(reviewHtml, /submitted text ideas are retained.+scoring.+rarity/i);

  assert.match(styles, /\.challenge-timer[^}]*font-variant-numeric:\s*tabular-nums/i);
  assert.match(styles, /\.idea-dock[^}]*position:\s*sticky/i);
  assert.doesNotMatch(styles, /\.idea-dock\s*{[^}]*position:\s*static/i, "the typed input dock should stay sticky instead of flattening on wider layouts");
}
