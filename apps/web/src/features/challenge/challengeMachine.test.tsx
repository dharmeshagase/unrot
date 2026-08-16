import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

async function load(relativePath) {
  const source = await readFile(path.resolve(relativePath), "utf8");
  return import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
}

const SAMPLE_ANALYSIS = [
  {
    raw: "tiny shovel",
    canonical: "tiny gardening shovel",
    category: "gardening",
    valid: true,
    plausibility: 0.8,
    elaboration: 0.7
  },
  {
    raw: "sun signal",
    canonical: "sunlight signal mirror",
    category: "communication",
    valid: true,
    plausibility: 0.9,
    elaboration: 0.6
  }
];

export async function run() {
  const machine = await load("apps/web/src/features/challenge/challengeMachine.ts");

  assert.equal(
    machine.TIMER_INFO_COPY,
    "Why 60 seconds? A little time pressure helps your brain move past the obvious. This isn’t a test you can fail. Don’t stress—say whatever arrives. You’ve got this."
  );
  assert.deepEqual(machine.PROCESSING_MESSAGES, [
    "Untangling your ideas",
    "Finding the different directions",
    "Checking what surprised us"
  ]);

  let state = machine.createChallengeState({ slug: "spoon" });
  assert.equal(state.phase, "ready");
  state = machine.startTypedChallenge(state);
  assert.equal(state.phase, "active");
  assert.equal(state.inputMode, "text");
  assert.equal(state.secondsLeft, 60);
  assert.equal(state.isPaused, false);

  state = machine.addTypedIdea(state, " seed shovel ");
  state = machine.addTypedIdea(state, "sun signal");
  state = machine.addTypedIdea(state, "");
  assert.deepEqual(state.typedIdeas, ["seed shovel", "sun signal"]);
  assert.equal(state.transcript, "seed shovel\nsun signal");

  state = machine.togglePause(state);
  assert.equal(state.isPaused, true);
  assert.equal(machine.tickChallenge(state).secondsLeft, 60, "paused timers should not count down");
  state = machine.togglePause(state);
  state = machine.tickChallenge(state, 59);
  assert.equal(state.secondsLeft, 1);
  state = machine.tickChallenge(state, 1);
  assert.equal(state.phase, "review", "time expiry should advance into review");
  assert.equal(state.finishReason, "timeout");
  assert.equal(state.inputMode, "text");

  const review = machine.createReviewDraft(SAMPLE_ANALYSIS);
  assert.equal(review.length, 2);
  assert.equal(review[0].id.startsWith("idea-"), true);

  const edited = machine.editReviewIdea(review, review[0].id, "tiny shovel for plants");
  assert.equal(edited[0].raw, "tiny shovel for plants");

  const merged = machine.mergeReviewIdeas(edited, {
    targetId: edited[0].id,
    sourceId: edited[1].id
  });
  assert.equal(merged.length, 1);
  assert.match(merged[0].raw, /tiny shovel for plants \/ sun signal/i);

  const expanded = machine.addReviewIdea(merged, "tiny puppet leg");
  assert.equal(expanded.length, 2);
  assert.equal(expanded[1].canonical, "tiny puppet leg");
  const trimmed = machine.deleteReviewIdea(expanded, expanded[1].id);
  assert.equal(trimmed.length, 1);

  assert.equal(machine.validateReviewIdeas([]).ok, false);
  assert.equal(machine.validateReviewIdeas(trimmed).ok, true);

  assert.deepEqual(machine.buildPreviewPayload("spoon", "tiny shovel"), {
    challengeId: "spoon",
    transcript: "tiny shovel"
  });
  assert.deepEqual(machine.buildAttemptPayload({
    challengeId: "spoon",
    inputMode: "text",
    durationSeconds: 60,
    anonymousSessionId: "anon-123",
    reviewIdeas: trimmed
  }), {
    challengeId: "spoon",
    inputMode: "text",
    durationSeconds: 60,
    anonymousSessionId: "anon-123",
    ideas: [
      {
        raw: merged[0].raw,
        canonical: merged[0].canonical,
        category: merged[0].category,
        valid: true,
        plausibility: merged[0].plausibility,
        elaboration: merged[0].elaboration
      }
    ]
  });

  assert.equal(
    machine.resolveVoiceFallback("denied"),
    "Microphone access was denied. You can keep going by typing your ideas instead."
  );
  assert.equal(
    machine.resolveVoiceFallback("unsupported"),
    "This browser can’t record audio here. Type your ideas instead."
  );
  assert.equal(
    machine.resolveVoiceFallback("failed"),
    "Recording did not work this time. Your typed path is ready below."
  );
  assert.equal(machine.nextModalFocusIndex(1, 2, false), 0);
  assert.equal(machine.nextModalFocusIndex(0, 2, true), 1);
}
