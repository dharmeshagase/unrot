# Unrot privacy

## Microphone permission timing

- Voice capture is offered only when a transcription provider is configured.
- The app requests microphone access only after the user actively chooses the voice path.
- If microphone access is denied, unsupported, or fails, the typed path remains available.

## Raw audio handling

- Raw audio is kept in browser memory only long enough to send it for transcription.
- The server does not persist raw audio.
- After transcription succeeds or fails, the browser clears the in-memory audio buffer.

## Processing modes

- Local transcription is unavailable and never fabricates a transcript; typing is primary in local mode.
- Local idea analysis stays on the app’s deterministic local path.
- With OpenAI providers enabled, voice transcription and/or idea analysis are processed server-side through OpenAI.
- Transcription and analysis providers can be swapped independently.

## Text idea retention

- Submitted text ideas are retained so the app can score the round, compute rarity, and return the result later from the same browser session.
- Review drafts may be cached locally in the browser after a network hiccup so the user does not lose edited text before submission.

## Receipt and local history fields

Local browser history stores only:

- `attemptId`
- `receipt`
- `challengeSlug`
- `score`
- `completedAt`

The receipt is required to reopen or delete that attempt from the same browser session.

## Anonymous identifiers

- Attempt records store a SHA-256 hash of the anonymous session id, not the raw value.
- Analytics events also hash the anonymous analytics session id server-side before storage.

## Analytics minimization

Analytics accepts only an allowlisted event name plus these allowlisted fields:

- anonymous session id
- optional known challenge id
- optional numeric value
- ISO timestamp

Analytics rejects extra keys and sensitive keys such as audio, transcript, raw idea text, canonical idea text, receipts, API keys, emails, and user-agent-like data. Analytics failures are swallowed on the client and return a safe accepted response on the server.

## Community moderation and display

- Community rarity can influence originality once a challenge has enough completed attempts.
- Reference example displays are gated behind a valid completed-attempt receipt for that challenge and are labeled “Ideas from the reference set.”
- Stored attempts stay private and are never presented as other people’s ideas. A future moderated community source will be labeled separately.

## Deletion

- Attempts can be deleted with the matching receipt.
- The delete route is `DELETE /v1/attempts/{attemptId}` with `X-Attempt-Receipt`.
- If the receipt does not match, deletion is rejected.
- The result-page control also clears the matching local history entry after server deletion succeeds.
