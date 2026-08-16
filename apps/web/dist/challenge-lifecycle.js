function normalizeCount(value) {
  const count = Number(value);
  return Number.isFinite(count) ? Math.max(0, Math.round(count)) : 0;
}

export function countReviewIdeas(reviewIdeas = []) {
  return (reviewIdeas ?? []).filter((idea) => {
    const raw = String(idea?.raw ?? "").trim();
    return raw && idea?.valid !== false;
  }).length;
}

export function createChallengeFinishTracker(trackChallengeFinished = () => {}) {
  let currentRound = 0;
  let finishedRound = 0;

  function beginRound() {
    currentRound += 1;
    finishedRound = 0;
    return currentRound;
  }

  function finish({ challengeId, count } = {}) {
    if (currentRound <= 0 || finishedRound === currentRound) return false;
    finishedRound = currentRound;
    trackChallengeFinished({
      challengeId: String(challengeId ?? "").trim(),
      count: normalizeCount(count)
    });
    return true;
  }

  return {
    beginRound,
    finish,
    finishTyped({ challengeId, typedIdeas = [] } = {}) {
      return finish({
        challengeId,
        count: Array.isArray(typedIdeas) ? typedIdeas.length : 0
      });
    },
    finishReviewed({ challengeId, reviewIdeas = [] } = {}) {
      return finish({
        challengeId,
        count: countReviewIdeas(reviewIdeas)
      });
    }
  };
}
