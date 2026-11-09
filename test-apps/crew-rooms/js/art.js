// art.js — every icon and picture is drawn inline SVG. House rule: no emoji and no
// Unicode glyph icons anywhere in the UI, and no text inside art.

export const UI_ICONS = Object.freeze({
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" fill="currentColor"/></svg>',
  go: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  again: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.3-5.6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M20 4v5h-5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  lock: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="9.5" rx="2.5" fill="currentColor"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 16.9 6.6 19.7l1-6.1L3.2 9.3l6.1-.9z" fill="currentColor"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/></svg>'
});

// One job pictogram per slot kind. No words, no letters — a pre-reader can match them.
export const JOB_ICONS = Object.freeze({
  ram: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 14v-5M21 16l-3-4M43 16l3-4" fill="none" stroke="#8FDCC2" stroke-width="3" stroke-linecap="round"/><rect x="19" y="20" width="26" height="13" rx="4" fill="#8FDCC2" stroke="#3f8a72" stroke-width="2.5"/><rect x="23" y="33" width="5" height="4" rx="1" fill="#F6CB57"/><rect x="29.5" y="33" width="5" height="4" rx="1" fill="#F6CB57"/><rect x="36" y="33" width="5" height="4" rx="1" fill="#F6CB57"/><path d="M11 45h42M16 45v11M48 45v11" fill="none" stroke="#c99b6d" stroke-width="4.5" stroke-linecap="round"/></svg>',
  storage: '<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="12" y="12" width="40" height="42" rx="7" fill="#C7B5EE" stroke="#8d76c1" stroke-width="2.5"/><path d="M12 33h40" stroke="#8d76c1" stroke-width="2.5"/><circle cx="32" cy="43" r="2.6" fill="#fff"/><path d="M32 8.5l2 4.1 4.5.7-3.2 3.2.7 4.5L32 19l-4 2.1.7-4.5-3.2-3.2 4.5-.7z" fill="#F6CB57" stroke="#d9a92f" stroke-width="1.5"/></svg>',
  cpu: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 8a13 13 0 0 1 8 23.2V36H24v-4.8A13 13 0 0 1 32 8z" fill="#FFF3C4" stroke="#F6CB57" stroke-width="2.5"/><circle cx="32" cy="19" r="4.5" fill="#F6CB57"/><path d="M27 40h10M28.5 44h7" fill="none" stroke="#F6CB57" stroke-width="3" stroke-linecap="round"/><circle cx="14" cy="52" r="3.2" fill="#5CC3C0"/><circle cx="26" cy="52" r="3.2" fill="#5CC3C0"/><circle cx="38" cy="52" r="3.2" fill="#5CC3C0"/><circle cx="50" cy="52" r="3.2" fill="#5CC3C0"/></svg>',
  gpu: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M12 46a20 20 0 0 1 40 0" fill="none" stroke="#E06AB8" stroke-width="5" stroke-linecap="round"/><path d="M20 46a12 12 0 0 1 24 0" fill="none" stroke="#F6CB57" stroke-width="5" stroke-linecap="round"/><path d="M28 46a4 4 0 0 1 8 0" fill="none" stroke="#5CC3C0" stroke-width="5" stroke-linecap="round"/><path d="M46 8l8 8" fill="none" stroke="#8d76c1" stroke-width="4.5" stroke-linecap="round"/><path d="M42 20l6-8 4 4-8 6z" fill="#E06AB8"/></svg>',
  token: '<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="7" y="10" width="50" height="34" rx="10" fill="#fff" stroke="#F6CB57" stroke-width="3"/><path d="M20 44l-3 10 11-10z" fill="#F6CB57"/><ellipse cx="19" cy="22" rx="4.4" ry="3.2" fill="#F6CB57"/><ellipse cx="32" cy="22" rx="4.4" ry="3.2" fill="#F6CB57"/><ellipse cx="45" cy="22" rx="4.4" ry="3.2" fill="#F6CB57"/><ellipse cx="25.5" cy="32" rx="4.4" ry="3.2" fill="#F6CB57"/><ellipse cx="38.5" cy="32" rx="4.4" ry="3.2" fill="#F6CB57"/></svg>',
  bug: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M8 42c7-18 11 8 16-3s6 13 13 3 7 7 12-3 7 5 9-2" fill="none" stroke="#B9AEDC" stroke-width="4" stroke-linecap="round"/><path d="M22 16c9-7 15 3 8 8s-15-2-8-8z" fill="none" stroke="#B9AEDC" stroke-width="3.5"/><path d="M48 12l4 4M52 12l-4 4" fill="none" stroke="#F6CB57" stroke-width="2.5" stroke-linecap="round"/></svg>'
});

// The dark screen while the machine is broken: two sleepy closed eyes, nothing else.
export const SLEEP_ART = '<svg viewBox="0 0 200 120" aria-hidden="true"><path d="M62 54q12 12 24 0M114 54q12 12 24 0" fill="none" stroke="#8f84b8" stroke-width="5" stroke-linecap="round"/></svg>';

// The silly boot pictures, one per room round-robin. The classed groups animate in CSS.
export const BOOT_ARTS = Object.freeze([
  '<svg viewBox="0 0 200 120" class="boot-art" aria-hidden="true"><g class="b-slide"><path d="M35 96a65 65 0 0 1 130 0" fill="none" stroke="#E06AB8" stroke-width="13" stroke-linecap="round"/><path d="M54 96a46 46 0 0 1 92 0" fill="none" stroke="#F6CB57" stroke-width="13" stroke-linecap="round"/><path d="M73 96a27 27 0 0 1 54 0" fill="none" stroke="#5CC3C0" stroke-width="13" stroke-linecap="round"/></g><g fill="#fff"><circle class="b-twinkle" cx="30" cy="30" r="5"/><circle class="b-twinkle" cx="170" cy="24" r="4"/></g></svg>',
  '<svg viewBox="0 0 200 120" class="boot-art" aria-hidden="true"><g class="b-sun" fill="none" stroke="#F6CB57" stroke-width="6" stroke-linecap="round"><path d="M100 10v14M58 24l10 10M142 24l-10 10M36 62h14M150 62h-14"/></g><circle class="b-sun" cx="100" cy="62" r="30" fill="#F6CB57"/><circle cx="90" cy="58" r="4" fill="#3a2f55"/><circle cx="110" cy="58" r="4" fill="#3a2f55"/><path d="M90 70q10 9 20 0" fill="none" stroke="#3a2f55" stroke-width="4" stroke-linecap="round"/></svg>',
  '<svg viewBox="0 0 200 120" class="boot-art" aria-hidden="true"><g fill="#F6CB57"><path class="b-twinkle" d="M60 20l6 12 13 2-9.5 9 2.3 13L60 50l-11.8 6 2.3-13L41 34l13-2z"/><path class="b-twinkle" d="M140 56l5 10 11 1.6-8 7.6 1.9 11L140 81l-9.9 5.2 1.9-11-8-7.6 11-1.6z"/><path class="b-twinkle" d="M100 78l4 8 9 1.3-6.5 6.2 1.5 9L100 98l-8.1 4.2 1.5-9-6.5-6.2 9-1.3z"/></g><circle class="b-twinkle" cx="32" cy="86" r="5" fill="#8FDCC2"/><circle class="b-twinkle" cx="172" cy="30" r="5" fill="#E06AB8"/></svg>'
]);

// If a crew webp fails to load, draw a soft rounded blob in the character's colour
// with two eyes (house rule: fallback art carries no text).
export const blobSVG = (colour) =>
  `<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M50 10c23 0 39 17 39 37 0 25-16 43-39 43S11 72 11 47c0-20 16-37 39-37z" fill="${colour}"/><circle cx="38" cy="45" r="5.5" fill="#33305a"/><circle cx="62" cy="45" r="5.5" fill="#33305a"/><path d="M41 62c5 5 13 5 18 0" fill="none" stroke="#33305a" stroke-width="4" stroke-linecap="round"/></svg>`;
