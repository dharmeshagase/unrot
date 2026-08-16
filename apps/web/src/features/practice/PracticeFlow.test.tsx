import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

async function load(relativePath) {
  const source = await readFile(path.resolve(relativePath), "utf8");
  return import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
}

export async function run() {
  const machine = await load("apps/web/src/features/practice/practiceMachine.ts");
  const practice = await load("apps/web/src/features/practice/PracticeFlow.tsx");
  const objectArt = await load("apps/web/src/components/objects/ObjectArt.tsx");
  const styles = await readFile(path.resolve("apps/web/src/app/globals.css"), "utf8");
  const practiceClientSource = await readFile(path.resolve("apps/web/src/app/practice/practiceClient.ts"), "utf8");

  let state = machine.createPracticeState();
  assert.deepEqual(state, { step: "ready" });
  state = machine.startPractice(state);
  assert.deepEqual(state, { step: "active", secondsLeft: 15, ideas: [] });

  state = machine.addPracticeIdea(state, "tiny shovel");
  state = machine.addPracticeIdea(state, "kitchen drumstick");
  assert.equal(state.step, "active");
  state = machine.addPracticeIdea(state, "sunlight signal");
  assert.equal(state.step, "lesson", "a third idea should finish early");
  assert.deepEqual(state.ideas, ["tiny shovel", "kitchen drumstick", "sunlight signal"]);

  let timed = machine.startPractice(machine.createPracticeState());
  timed = machine.addPracticeIdea(timed, "bookmark");
  timed = machine.tickPractice(timed, 15);
  assert.equal(timed.step, "lesson", "time expiry advances with fewer than three ideas");
  assert.deepEqual(timed.ideas, ["bookmark"]);

  assert.deepEqual(machine.PRACTICE_EXAMPLES, [
    { answer: "A tiny shovel for planting seeds", category: "Gardening" },
    { answer: "A rhythm stick for a kitchen band", category: "Music" },
    { answer: "A mirror for sending a sunlight signal", category: "Communication" }
  ]);

  const stored = [];
  assert.equal(machine.persistPracticeComplete({ setItem: (...args) => stored.push(args) }), true);
  assert.deepEqual(stored, [["unrot.practiceComplete", "true"]]);
  assert.equal(
    machine.persistPracticeComplete({ setItem: () => { throw new Error("blocked"); } }),
    false,
    "practice remains usable when storage is blocked"
  );

  const readyHtml = practice.default({ state: machine.createPracticeState() });
  assert.match(readyHtml, /15-second warm-up · not scored/i);
  assert.match(readyHtml, /Give this spoon three new jobs\./i);
  assert.match(readyHtml, /Start warm-up/i);
  assert.match(readyHtml, /Start typing/i);
  assert.doesNotMatch(readyHtml, /voice button|Start talking/i);
  assert.match(readyHtml, /<form[^>]*data-idea-form/i, "typed ideas use a semantic form for Enter-key submission");
  assert.match(readyHtml, /class="idea-form-dock"/i, "the practice input should sit inside a dedicated dock");
  assert.doesNotMatch(readyHtml, /Skip warm-up/i, "first-time players should not see a returning-player skip");
  const returningReadyHtml = practice.default({ state: machine.createPracticeState(), showSkip: true });
  assert.match(returningReadyHtml, /Skip warm-up/i, "returning players can skip practice");
  assert.doesNotMatch(readyHtml, /Divergence Score|points|\bscore:\s*\d/i);
  assert.match(styles, /\.idea-form-dock\s*{[^}]*position:\s*sticky/i, "mobile practice should keep the input dock within thumb reach");
  assert.match(styles, /\.timer-shell\s*{[^}]*background:/i, "the timer should have a dedicated high-contrast field");
  assert.match(styles, /\.timer\s*{[^}]*color:\s*var\(--ink\)/i, "the timer digits should use a high-contrast ink color");

  assert.equal(machine.categorizePracticeIdea("tiny shovel for seeds"), "Gardening");
  assert.equal(machine.categorizePracticeIdea("kitchen drumstick"), "Music");
  assert.equal(machine.categorizePracticeIdea("sunlight signal"), "Communication");

  const lessonHtml = practice.default({
    state,
    categorizeIdea: machine.categorizePracticeIdea,
    renderObjectArt: objectArt.default
  });
  assert.match(lessonHtml, /That’s the move\. Now try changing direction\./i);
  assert.match(
    lessonHtml,
    /<h1[^>]*tabindex="-1"[^>]*>That’s the move\. Now try changing direction\.<\/h1>/i,
    "lesson heading must accept programmatic focus"
  );
  assert.match(
    lessonHtml,
    /role="status"[^>]*>Warm-up complete\. Your ideas are ready to explore by category\.<\/p>/i,
    "completion should have a dedicated live status announcement"
  );
  assert.match(lessonHtml, /Ideas become more divergent when they travel into different worlds\./i);
  assert.match(
    lessonHtml,
    /Creative range comes from changing direction\. If your first ideas are all tools, try a game, a sound, a costume, a signal, or something for a tiny creature\./i
  );
  assert.ok(lessonHtml.indexOf("Your three ideas") < lessonHtml.indexOf("A tiny shovel for planting seeds"));
  assert.ok(lessonHtml.indexOf("A tiny shovel for planting seeds") < lessonHtml.indexOf("A rhythm stick for a kitchen band"));
  assert.ok(lessonHtml.indexOf("A rhythm stick for a kitchen band") < lessonHtml.indexOf("A mirror for sending a sunlight signal"));
  assert.match(lessonHtml, /Gardening/);
  assert.match(lessonHtml, /Music/);
  assert.match(lessonHtml, /Communication/);
  assert.equal((lessonHtml.match(/data-player-star=/g) ?? []).length, 3);
  assert.match(lessonHtml, /data-player-star="Gardening"[\s\S]*tiny shovel/i);
  assert.match(lessonHtml, /data-player-star="Music"[\s\S]*kitchen drumstick/i);
  assert.match(lessonHtml, /data-player-star="Communication"[\s\S]*sunlight signal/i);
  assert.match(
    lessonHtml,
    /class="constellation-object"[\s\S]*class="object-art object-art-spoon"/i,
    "the constellation center should use the spoon silhouette"
  );
  assert.doesNotMatch(lessonHtml, /class="constellation-object"[^>]*>\s*spoon\s*</i);
  assert.match(lessonHtml, />Try the real thing</i);

  assert.equal(machine.isIdeaSubmitKey("Enter"), true);
  assert.equal(machine.isIdeaSubmitKey(" "), false);

  let keyboardSubmissions = 0;
  let prevented = 0;
  const handled = machine.handleIdeaKeydown(
    { key: "Enter", preventDefault: () => { prevented += 1; } },
    () => { keyboardSubmissions += 1; }
  );
  assert.equal(handled, true);
  assert.equal(prevented, 1);
  assert.equal(keyboardSubmissions, 1, "Enter should invoke the same typed submission as the button");

  assert.equal(machine.readPracticeComplete({ getItem: () => "true" }), true);
  const localStorageDescriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  try {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      get() { throw new Error("property access blocked"); }
    });
    assert.equal(machine.readPracticeComplete(), false);
    assert.equal(machine.persistPracticeComplete(), false);
  } finally {
    if (localStorageDescriptor) Object.defineProperty(globalThis, "localStorage", localStorageDescriptor);
    else delete globalThis.localStorage;
  }

  assert.match(practiceClientSource, /renderPracticeFlow\(\{[\s\S]*showSkip/i, "the client should re-render the ready state with the returning-player skip when available");
  assert.match(practiceClientSource, /scrollIntoView\(/i, "the client should scroll the lesson heading into view on completion");
}
