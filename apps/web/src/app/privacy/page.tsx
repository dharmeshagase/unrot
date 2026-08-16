export default function PrivacyPage({ renderWordmark } = {}) {
  return `<header class="site-header">
    ${renderWordmark({ compact: true })}
    <nav aria-label="Main navigation"><a class="quiet-link" href="/">Home</a><a class="quiet-link" href="/about">About</a></nav>
  </header>
  <main id="main-content" class="static-page">
    <p class="eyebrow">Privacy</p>
    <h1>Privacy and deletion</h1>
    <p>Voice capture is available only when a transcription provider is configured and starts only after you choose it.</p>
    <p>When voice is enabled, audio is sent for transcription and then discarded; Unrot does not store the recording.</p>
    <p>We keep your submitted text ideas so we can score the round and calculate rarity.</p>
    <p>Your anonymous session id is hashed on the server before storage.</p>
    <p>When OpenAI providers are configured, transcription and idea analysis are processed server-side through OpenAI.</p>
    <p>When voice is unavailable, typing is the primary input and local analysis keeps scoring available without provider traffic.</p>
    <p>Use <strong>Delete this attempt</strong> on the result page to remove the server attempt and its matching local history entry. The receipt is required.</p>
  </main>`;
}
