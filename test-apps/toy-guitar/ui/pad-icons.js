// Toy Guitar — picture symbols for the pads and toy controls, drawn in code.
// A pre-reader chooses by the picture; the word under it is for the reader in
// the house (Toy Keyboard's rule for its pads and sound buttons). Each icon is
// a 64x64 drawing in three paints the toy's CSS sets: `.pa` (main), `.pb`
// (second) and `currentColor` lines, so one drawing wears every toy's palette.

const S = (body) => `<svg class="ico" viewBox="0 0 64 64" aria-hidden="true" focusable="false">${body}</svg>`;
const L = 'fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"';

export const ICONS = {
  // a bass drum seen from the front, its beater about to land
  kick: S(`<circle class="pa" cx="30" cy="36" r="21"/><circle class="pb" cx="30" cy="36" r="12"/><circle cx="30" cy="36" r="21" ${L}/><path d="M52 8 L40 26" ${L}/><circle class="pb" cx="38" cy="29" r="5"/><circle cx="38" cy="29" r="5" ${L}/>`),
  // two flat hands meeting, with three little claps of air
  clap: S(`<path class="pa" d="M14 46 C8 36 10 24 20 16 L30 28 L26 44 Z"/><path class="pb" d="M50 46 C56 36 54 24 44 16 L34 28 L38 44 Z"/><path d="M14 46 C8 36 10 24 20 16 L30 28 L26 44 Z M50 46 C56 36 54 24 44 16 L34 28 L38 44 Z" ${L}/><path d="M32 6 V12 M22 8 L25 13 M42 8 L39 13" ${L}/>`),
  // a maraca
  shaker: S(`<ellipse class="pa" cx="26" cy="24" rx="16" ry="14" transform="rotate(-35 26 24)"/><ellipse cx="26" cy="24" rx="16" ry="14" transform="rotate(-35 26 24)" ${L}/><path d="M36 34 L54 54" ${L} stroke-width="7"/><circle class="pb" cx="22" cy="21" r="3"/><circle class="pb" cx="30" cy="27" r="3"/><path d="M48 12 l4 -4 M54 20 l5 -2" ${L}/>`),
  // an egg shaker
  egg: S(`<path class="pa" d="M32 8 C44 8 52 26 52 38 C52 50 43 56 32 56 C21 56 12 50 12 38 C12 26 20 8 32 8 Z"/><path d="M32 8 C44 8 52 26 52 38 C52 50 43 56 32 56 C21 56 12 50 12 38 C12 26 20 8 32 8 Z" ${L}/><path class="pb" d="M17 36 Q32 30 47 36 L46 42 Q32 36 18 42 Z"/><path d="M6 20 l-3 -3 M58 20 l3 -3" ${L}/>`),
  // a hand bell
  bell: S(`<path class="pa" d="M16 44 C16 26 20 14 32 14 C44 14 48 26 48 44 Z"/><path d="M12 44 H52 M16 44 C16 26 20 14 32 14 C44 14 48 26 48 44" ${L}/><circle class="pb" cx="32" cy="50" r="6"/><circle cx="32" cy="50" r="6" ${L}/><path d="M32 6 V14" ${L}/>`),
  // a cajón: a wooden box with a sound hole, played on its face
  cajon: S(`<rect class="pa" x="14" y="8" width="36" height="50" rx="4"/><rect x="14" y="8" width="36" height="50" rx="4" ${L}/><circle class="pb" cx="32" cy="40" r="8"/><circle cx="32" cy="40" r="8" ${L}/><circle cx="19" cy="13" r="1.8" fill="currentColor"/><circle cx="45" cy="13" r="1.8" fill="currentColor"/><circle cx="19" cy="53" r="1.8" fill="currentColor"/><circle cx="45" cy="53" r="1.8" fill="currentColor"/>`),
  // a triangle and its beater
  triangle: S(`<path class="pb" d="M30 10 L52 50 H12 Z" opacity=".35"/><path d="M27 14 L10 50 H50 L32 16" ${L}/><path d="M30 10 V4" ${L}/><path d="M56 22 L40 40" ${L}/><path d="M54 6 q4 4 0 8 M59 2 q7 8 0 16" ${L} stroke-width="3"/>`),
  // a wooden stomp box under a boot
  stomp: S(`<rect class="pb" x="8" y="42" width="48" height="16" rx="3"/><rect x="8" y="42" width="48" height="16" rx="3" ${L}/><path class="pa" d="M18 8 H34 V26 L50 30 C54 31 54 38 50 38 H18 Z"/><path d="M18 8 H34 V26 L50 30 C54 31 54 38 50 38 H18 Z" ${L}/>`),
  // a snare with a brush resting on it
  brush: S(`<ellipse class="pb" cx="32" cy="44" rx="24" ry="8"/><path class="pa" d="M8 44 V52 C8 56 56 56 56 52 V44"/><ellipse cx="32" cy="44" rx="24" ry="8" ${L}/><path d="M8 44 V52 M56 44 V52" ${L}/><path d="M48 6 L30 38" ${L}/><path d="M30 38 L22 44 M30 38 L28 46 M30 38 L34 46 M30 38 L38 43" ${L} stroke-width="2.5"/>`),
  // a tambourine with its jingles
  tambourine: S(`<circle class="pa" cx="32" cy="32" r="22"/><circle class="pb" cx="32" cy="32" r="14"/><circle cx="32" cy="32" r="22" ${L}/>${[0, 60, 120, 180, 240, 300].map((a) => { const r = a * Math.PI / 180; return `<ellipse cx="${(32 + 22 * Math.cos(r)).toFixed(1)}" cy="${(32 + 22 * Math.sin(r)).toFixed(1)}" rx="5" ry="3.4" fill="#fff6c8" stroke="currentColor" stroke-width="2.5"/>`; }).join('')}`),
  // a snare drum, side on, with two sticks
  snare: S(`<ellipse class="pb" cx="32" cy="34" rx="24" ry="8"/><path class="pa" d="M8 34 V50 C8 56 56 56 56 50 V34"/><ellipse cx="32" cy="34" rx="24" ry="8" ${L}/><path d="M8 34 V50 C8 56 56 56 56 50 V34 M16 38 V52 M32 42 V56 M48 38 V52" ${L}/><path d="M14 6 L30 30 M50 6 L36 30" ${L}/>`),
  // two hi-hat cymbals on a stand
  hihat: S(`<path class="pa" d="M8 24 Q32 12 56 24 Z"/><path class="pb" d="M8 30 Q32 42 56 30 Z"/><path d="M8 24 Q32 12 56 24 Z M8 30 Q32 42 56 30 Z" ${L}/><path d="M32 6 V60 M22 60 H42" ${L}/>`),
  // a floor tom
  tom: S(`<ellipse class="pb" cx="32" cy="22" rx="22" ry="8"/><path class="pa" d="M10 22 V48 C10 54 54 54 54 48 V22"/><ellipse cx="32" cy="22" rx="22" ry="8" ${L}/><path d="M10 22 V48 C10 54 54 54 54 48 V22 M20 28 V50 M44 28 V50" ${L}/>`),
  // a crash cymbal, tilted, with a splash of sound
  crash: S(`<path class="pa" d="M6 30 L58 20 L54 30 L8 38 Z"/><path d="M6 30 L58 20 M8 38 L54 30 M6 30 L8 38 M58 20 L54 30" ${L}/><path d="M32 30 V60 M22 60 H42" ${L}/><path d="M10 14 l4 6 M24 6 l1 8 M42 6 l-2 8 M56 10 l-5 6" ${L} stroke-width="3"/>`),
  // tone switches
  moon: S(`<path class="pa" d="M40 8 C24 10 14 22 14 34 C14 48 26 58 40 56 C30 50 26 42 26 32 C26 22 32 12 40 8 Z"/><path d="M40 8 C24 10 14 22 14 34 C14 48 26 58 40 56 C30 50 26 42 26 32 C26 22 32 12 40 8 Z" ${L}/>`),
  sun: S(`<circle class="pa" cx="32" cy="32" r="13"/><circle cx="32" cy="32" r="13" ${L}/>${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => { const r = a * Math.PI / 180; return `<path d="M${(32 + 19 * Math.cos(r)).toFixed(1)} ${(32 + 19 * Math.sin(r)).toFixed(1)} L${(32 + 27 * Math.cos(r)).toFixed(1)} ${(32 + 27 * Math.sin(r)).toFixed(1)}" ${L}/>`; }).join('')}`),
  pick: S(`<path class="pa" d="M32 58 C20 44 10 30 12 18 C14 8 50 8 52 18 C54 30 44 44 32 58 Z"/><path d="M32 58 C20 44 10 30 12 18 C14 8 50 8 52 18 C54 30 44 44 32 58 Z" ${L}/><path d="M22 20 C26 16 38 16 42 20" fill="none" stroke-width="4" stroke="currentColor" opacity=".35"/>`),
  thumb: S(`<path class="pa" d="M22 58 V30 C22 22 18 18 18 12 C18 6 26 6 28 12 L32 24 H48 C54 24 56 30 52 34 C56 36 54 42 50 42 C54 44 52 50 48 50 C50 54 46 58 42 58 Z"/><path d="M22 58 V30 C22 22 18 18 18 12 C18 6 26 6 28 12 L32 24 H48 C54 24 56 30 52 34 C56 36 54 42 50 42 C54 44 52 50 48 50 C50 54 46 58 42 58 Z" ${L}/>`),
  // the three-way pickup switch: which pickup is lit
  pickup1: S(`<rect x="6" y="22" width="14" height="22" rx="4" class="pa"/><rect x="25" y="22" width="14" height="22" rx="4" ${L}/><rect x="44" y="22" width="14" height="22" rx="4" ${L}/><rect x="6" y="22" width="14" height="22" rx="4" ${L}/>`),
  pickup2: S(`<rect x="6" y="22" width="14" height="22" rx="4" ${L}/><rect x="25" y="22" width="14" height="22" rx="4" class="pa"/><rect x="25" y="22" width="14" height="22" rx="4" ${L}/><rect x="44" y="22" width="14" height="22" rx="4" ${L}/>`),
  pickup3: S(`<rect x="6" y="22" width="14" height="22" rx="4" ${L}/><rect x="25" y="22" width="14" height="22" rx="4" ${L}/><rect x="44" y="22" width="14" height="22" rx="4" class="pa"/><rect x="44" y="22" width="14" height="22" rx="4" ${L}/>`),
  // amp effects
  drive: S(`<path class="pa" d="M32 58 C18 58 12 48 14 38 C16 28 26 26 24 12 C34 18 36 26 34 32 C40 30 42 24 42 20 C50 28 54 36 52 44 C50 54 42 58 32 58 Z"/><path d="M32 58 C18 58 12 48 14 38 C16 28 26 26 24 12 C34 18 36 26 34 32 C40 30 42 24 42 20 C50 28 54 36 52 44 C50 54 42 58 32 58 Z" ${L}/><path class="pb" d="M32 54 C26 54 22 50 24 44 C26 40 30 38 30 34 C36 38 40 44 38 48 C38 52 36 54 32 54 Z"/>`),
  heavy: S(`<path class="pa" d="M36 4 L14 36 H30 L24 60 L50 24 H34 Z"/><path d="M36 4 L14 36 H30 L24 60 L50 24 H34 Z" ${L}/>`),
  echo: S(`<circle class="pa" cx="14" cy="32" r="8"/><circle cx="14" cy="32" r="8" ${L}/><path d="M28 18 Q38 32 28 46 M38 12 Q52 32 38 52 M48 8 Q64 32 48 56" ${L}/>`),
  wah: S(`<path class="pa" d="M6 40 Q14 14 22 40 T38 40 T54 40 L58 40 V52 H6 Z" opacity=".55"/><path d="M6 40 Q14 14 22 40 T38 40 T54 40" ${L}/><path d="M6 52 H58" ${L}/>`),
  // First's strum bar: a hand sweeping down across six strings
  strum: S(`${[0, 1, 2, 3, 4, 5].map((i) => `<path d="M${10 + i * 9} 8 V56" stroke="currentColor" stroke-width="${4 - i * 0.4}" stroke-linecap="round" opacity=".55"/>`).join('')}<path d="M4 22 H48 L42 14 M48 22 L42 30" ${L} stroke-width="5"/><path d="M4 42 H48 L42 34 M48 42 L42 50" ${L} stroke-width="5"/>`)
};

export function icon(name) { return ICONS[name] || ''; }
