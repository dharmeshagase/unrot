const ART = {
  "spoon": '<ellipse cx="30" cy="21" rx="14" ry="12"/><path d="M35 31 48 74c2 7-9 10-11 3L27 33"/>',
  "empty-bottle": '<path d="M31 8h18v12c9 5 13 15 13 27v34H18V47c0-12 4-22 13-27V8Z"/><path d="M30 16h20"/>',
  "cardboard-box": '<path d="m9 30 35-17 35 17-35 17L9 30Z"/><path d="M9 30v39l35 17 35-17V30M44 47v39"/>',
  "sock": '<path d="M27 8h27v35c0 10 9 15 21 15v17H16V53h14c7 0 10-4 10-11V8"/>',
  "paper-cup": '<path d="M22 16h47l-7 66H29l-7-66Z"/><path d="M18 16h55"/>',
  "towel": '<rect x="17" y="14" width="56" height="68" rx="5"/><path d="M25 27h40M25 41h40M25 55h40M25 69h31"/>',
  "clothespin": '<path d="M24 11c15 0 15 69 0 69M49 11c15 0 15 69 0 69"/><circle cx="44" cy="45" r="8"/><path d="m30 50-14 32m42-32 14 32"/>',
  "bottle-cap": '<path d="M25 17h40l7 11v36L62 76H28L18 64V28l7-11Z"/><path d="M28 25h34v43H28z"/>',
  "chalk-stub": '<path d="m18 62 44-42 14 15-44 42H18V62Z"/><path d="m55 27 14 15"/>',
  "lost-button": '<circle cx="45" cy="45" r="34"/><circle cx="35" cy="35" r="4"/><circle cx="55" cy="35" r="4"/><circle cx="35" cy="55" r="4"/><circle cx="55" cy="55" r="4"/>',
  "marble": '<circle cx="45" cy="45" r="34"/><path d="M25 59c8-20 29-29 42-21M29 24c12 8 22 25 25 44"/>',
  "popsicle-stick": '<rect x="30" y="7" width="30" height="76" rx="15"/><path d="M37 22h16"/>',
  "pencil-shaving": '<path d="M13 55c12-32 43-42 65-17-17 33-45 36-65 17Z"/><circle cx="62" cy="38" r="8"/><path d="M20 56c17-2 23-18 38-19"/>',
  "empty-cassette-case": '<rect x="15" y="9" width="60" height="72" rx="5"/><rect x="27" y="23" width="36" height="42" rx="3"/><path d="M27 65h36M33 30h24"/>',
  "bread-bag-clip": '<path d="M18 20h54v18H50v11h22v20H18V49h22V38H18V20Z"/>',
  "toy-block": '<rect x="14" y="25" width="62" height="51" rx="5"/><path d="M27 25V13h14v12m9 0V13h14v12M24 42h42M24 58h42"/>',
  "crayon-wrapper": '<path d="m16 67 24-50h34L50 77H16V67Z"/><path d="M35 28h32M29 42h32M23 56h31"/>',
  "shoelace-tip": '<path d="M12 68c25 0 37-30 61-30"/><rect x="64" y="27" width="17" height="23" rx="3"/><path d="m68 31 9 15"/>'
};

function escapeAttribute(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;");
}

export default function ObjectArt({ artKey, name = artKey, decorative = false } = {}) {
  const drawing = ART[artKey] ?? ART.spoon;
  const accessibility = decorative
    ? 'aria-hidden="true"'
    : `role="img" aria-label="${escapeAttribute(name)} silhouette"`;
  return `<svg class="object-art object-art-${escapeAttribute(artKey)}" viewBox="0 0 90 90" ${accessibility} xmlns="http://www.w3.org/2000/svg">${drawing}</svg>`;
}

export const OBJECT_ART_KEYS = Object.freeze(Object.keys(ART));
