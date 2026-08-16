export default function UnrotWordmark({ href = "/", compact = false } = {}) {
  return `<a class="wordmark-hybrid${compact ? " wordmark-compact" : ""}" href="${href}" aria-label="Unrot home">
    <svg viewBox="0 0 180 62" role="img" aria-label="Unrot" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 13v24c0 13 22 14 22-1V13m0 14c9-11 19-8 19 4v17m0-17c7-12 18-9 18 3v14" />
      <path d="M75 48V23m0 7c7-10 16-9 19-2m6 7c0-10 6-16 14-16s14 6 14 16-6 16-14 16-14-6-14-16Zm34-14v25c0 6 3 8 9 5m-9-22h15" />
      <path class="wordmark-spark" d="M158 11c0 6 3 9 9 9-6 0-9 3-9 9 0-6-3-9-9-9 6 0 9-3 9-9Z" />
    </svg>
  </a>`;
}
