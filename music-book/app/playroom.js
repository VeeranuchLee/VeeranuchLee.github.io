// The Toy Piano room — play-along the way the owner's Usborne keyboard books do it.
//
// Two pages, and words carry nothing a child needs (the owner, 2026-08-27: the
// players are pre-readers — "these words will cause problem to pre-readers").
//
//   SELECT — the songs as big picture tiles, the six friends as picture tiles,
//   one big ▶. Tapping a picture answers in sound: a few notes of that song,
//   one note in that friend's voice. A second tap of the chosen song picture,
//   or the ▶, goes to the keys.
//
//   PLAY — nearly the whole page is the song and the toy: colored note-heads
//   with letters inside on a simplified four-line staff, and under them a real
//   piano octave (white keys plus working black keys) or a xylophone's colored
//   bars, wearing the same colors. Matching the color IS the notation.
//
// Three ways to play:
//   • your turn — begins by itself: the next note waits, pulsing, until the
//     child taps its key. Any wrong key still sounds and nothing is subtracted:
//     at this age the toy must never punish. ↺ starts the tune over.
//   • Listen (▶) — the room plays the song, staff and keys lighting together;
//   • free play — the keys always sound, whatever else is happening.
//
// The instrument switcher is local to this room on purpose. The listening journey
// keeps its rule — the companion IS the instrument, chosen once at the start. The
// toy room is a different place with a different job: here trying the same song on
// the xylophone is the point, and the choice is stored separately
// (`music-book.toyroom`, never touching `music-book.journey`).
//
// Everything is WebAudio through the shared engine — no audio files (decision 6),
// and both pages are HTML+CSS+SVG like every other screen in this book.

import { COMPANIONS, companionById } from '../data/instruments.js';
import { PLAYALONG_SONGS, playalongSongById, CATALOGUE_TO_PLAYALONG } from '../data/playalong-songs.js';
import { ROOMS } from '../data/rooms.js';
import { PLAYALONG_TITLE_CLIPS } from '../data/playalong-title-clips.js';
import { PLAYALONG_FACTS, PLAYALONG_FACT_CLIPS } from '../data/playalong-facts.js';
import { EXPLANATIONS } from '../data/explanations.js';
import { speakTitleUrl, stopTitle } from './titles.js';

const roomById = (id) => ROOMS.find((r) => r.id === id);

// ── the keyboard: one piano that grows (owner, 2026-10-03) ──────────────────
//
// "to get the big piano -> tap on toy piano, if the song need more keys -> the
// piano shown on screen will be the bigger one with more keys." So the toy has
// three sizes and a song plays on the SMALLEST one that holds all its notes:
//
//   small  — 8 white keys, C4–C5 (the youngest children's diatonic songs)
//   medium — the same octave with its 5 black keys
//   big    — two octaves, C4–C6: 15 white keys and 10 black keys
//
// The staff, the keys, the select-page hint mark and tools/check-scores.mjs all
// read KEYBOARD_SIZES, so the gate and the toy can never disagree about what a
// key is. See BIG-PIANO-PLAN.md.

// Every white key the piano can ever show, low to high.
export const WHITE_KEYS = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4',
  'C5', 'D5', 'E5', 'F5', 'G5', 'A5', 'B5', 'C6'];

// The first octave — the toy's original keyboard, still drawn on the landing
// bubble's face (app.js) and still the whole of a Small song's keyboard.
export const PITCHES = WHITE_KEYS.slice(0, 8);

// One color per pitch, and the same color everywhere — note-head, key, hint.
// C5 is a deeper rose than C4's red so the two C's differ by more than height;
// the upper octave follows the same rule — the same color family as its lower
// twin, a shade deeper — so a letter keeps its color across the whole piano.
export const NOTE_COLORS = {
  C4: '#e5484d', D4: '#f0862a', E4: '#f2bc2a', F4: '#4aa35a',
  G4: '#3e9fd4', A4: '#7d66e0', B4: '#dd7fbe', C5: '#b23d6d',
  D5: '#d06a1a', E5: '#cf9a12', F5: '#2f8a45', G5: '#2a86bd',
  A5: '#6450cc', B5: '#c45fa5', C6: '#8e2f57'
};

// The black keys, each named by the white key it follows (`after` indexes
// WHITE_KEYS) — the 2+3 groups every piano shows. Their colors are darker
// shades of the family they rise from (the color-music convention for
// accidentals: C# is the dark red of C), so a black key is findable by color
// without pretending to be a white one.
export const ALL_BLACK_KEYS = [
  { n: 'C#4', after: 0 }, { n: 'D#4', after: 1 },
  { n: 'F#4', after: 3 }, { n: 'G#4', after: 4 }, { n: 'A#4', after: 5 },
  { n: 'C#5', after: 7 }, { n: 'D#5', after: 8 },
  { n: 'F#5', after: 10 }, { n: 'G#5', after: 11 }, { n: 'A#5', after: 12 }
];
// The first octave's five — the landing bubble's face draws exactly these.
export const BLACK_KEYS = ALL_BLACK_KEYS.slice(0, 5);
export const BLACK_COLORS = {
  'C#4': '#a93238', 'D#4': '#b06116', 'F#4': '#357643', 'G#4': '#2a7099', 'A#4': '#5746ad',
  'C#5': '#a93238', 'D#5': '#b06116', 'F#5': '#357643', 'G#5': '#2a7099', 'A#5': '#5746ad'
};

export const KEYBOARD_SIZES = {
  small: { whites: WHITE_KEYS.slice(0, 8), blacks: [] },
  medium: { whites: WHITE_KEYS.slice(0, 8), blacks: ALL_BLACK_KEYS.slice(0, 5).map((k) => k.n) },
  big: { whites: WHITE_KEYS.slice(), blacks: ALL_BLACK_KEYS.map((k) => k.n) }
};
export const SIZE_ORDER = ['small', 'medium', 'big'];

const SEMITONE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// The key a written pitch lands on. Flats stay flats in the song data (Brahms'
// Lullaby is in E-flat, so it says Bb4); the piano's keys are named by sharps,
// so B♭4 lands on the black key A#4 — the same key, never a respelt song.
export function keyFor(name) {
  const m = /^([A-G])(#|b)?(\d)$/.exec(name || '');
  if (!m) return null;
  const midi = (Number(m[3]) + 1) * 12 + SEMITONE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  return `${SHARP_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
}

export function sizeKeys(size) {
  const s = KEYBOARD_SIZES[size];
  return new Set([...s.whites, ...s.blacks]);
}

// The smallest keyboard that holds every note, or null if none does.
export function smallestSizeFor(notes) {
  const keys = notes.filter((note) => note.n).map((note) => keyFor(note.n));
  return SIZE_ORDER.find((size) => {
    const have = sizeKeys(size);
    return keys.every((k) => have.has(k));
  }) || null;
}

// A song declares its size (data/playalong-songs.js `keyboard`); the gate
// proves the declaration is the smallest that fits. Undeclared → computed.
export function songSize(song) {
  return song.keyboard || smallestSizeFor(song.notes) || 'big';
}

const STORE_KEY = 'music-book.toyroom';

// ── room state ───────────────────────────────────────────────────────────────

let openSongFacts = null;
let stage = null;
let engine = null;
let player = null;
let active = false;
let wired = false;

let instrumentId = null;
let songId = null;
let mode = 'idle';          // 'idle' | 'listen' | 'turn'
let turnIndex = -1;         // index into the song's notes of the note being waited for

let roomId = null;          // when opened from a Music World room, filter to that room's songs
let roomFilteredIds = null; // ordered list of play-along ids for the current room filter

let shownSize = null;       // the keyboard size last drawn — the piano grows or shrinks from it
let rotateDismissed = false; // the portrait "turn me" card, once waved away, stays away this visit
let staffSystems = 1;       // how many staff rows the current song has
let staffWindow = 0;        // first staff row in view (big songs page two rows at a time)
let staffHeight = 116;      // height of one staff row in the current song's layout

function readStore() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch { return {}; }
}

function writeStore() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify({ instrumentId, songId })); } catch { /* private mode */ }
}

// ── staff layout ─────────────────────────────────────────────────────────────

// A simplified staff. Small and Medium songs keep the toy's four-line staff:
// lines through positions 1, 3, 5, 7, C4 hanging just below the bottom line and
// C5 riding the top one — enough geography that "higher on the page" still
// means "higher to the ear". A Big song needs two octaves, so its staff grows
// to seven lines (C4 to C6) and the panel shows two rows at a time, turning
// the page to follow the note — long pieces keep readable note-heads instead
// of shrinking the whole song onto one panel.
const LINE_GAP = 24;        // distance between staff lines
const STEP = LINE_GAP / 2;  // one diatonic step
const VIEW_WIDTH = 800;
const CONTENT_LEFT = 16;
const CONTENT_WIDTH = VIEW_WIDTH - CONTENT_LEFT * 2;
const HEAD_RX = 15.5;
const HEAD_RY = 12;

const STAFF = {
  // height: one row; base: y of the bottom line within a row; lines: how many;
  // maxSystems: rows before the rhythm unit starts shrinking; visible: rows in view.
  small: { height: 116, base: 86, lines: 4, maxSystems: 3, visible: 3 },
  big: { height: 208, base: 176, lines: 7, maxSystems: 99, visible: 2 }
};
const staffFor = (size) => (size === 'big' ? STAFF.big : STAFF.small);

const LETTER_STEP = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };

// Diatonic position counted from C4 = 0. A sharp or flat sits on its own
// letter's line or space, as on any staff; the letter inside the head says ♯/♭.
function staffPosition(name) {
  const m = /^([A-G])(#|b)?(\d)$/.exec(name);
  return (Number(m[3]) - 4) * 7 + LETTER_STEP[m[1]];
}

function noteColor(name) {
  const key = keyFor(name);
  return NOTE_COLORS[key] || BLACK_COLORS[key] || '#888';
}

// Lay a song out into systems (staff rows). Slot width grows with duration, so
// long notes simply take more room — the pre-reader's rhythm notation. For the
// small staff the unit shrinks for long songs so they still fit one book page
// of at most 3 systems; the big staff pages instead, so its unit stays put.
function layoutSong(song, staff) {
  const minSlot = 34;       // wide enough that two heads can never touch
  let unit = 34;
  let systems;
  for (;;) {
    systems = [];
    let current = null;
    for (const note of song.notes) {
      // A rest takes only a sliver — it is a breath in the rhythm, not a beat
      // a child has to find on the keys, so it must not eat the page.
      const w = note.n ? Math.max(minSlot, note.d * unit) : 10;
      if (!current || current.width + w > CONTENT_WIDTH) {
        current = { width: 0, notes: [] };
        systems.push(current);
      }
      current.notes.push({ ...note, x: CONTENT_LEFT + current.width, w });
      current.width += w;
    }
    if (systems.length <= staff.maxSystems || unit <= 16) break;
    unit -= 2;
  }
  return systems;
}

function noteLetter(pitch) {
  if (pitch.includes('#')) return `${pitch[0]}♯`;
  if (/^[A-G]b/.test(pitch)) return `${pitch[0]}♭`;
  return pitch[0];
}

function staffSvg(song, size) {
  const staff = staffFor(size);
  const systems = layoutSong(song, staff);
  staffSystems = systems.length;
  staffHeight = staff.height;
  staffWindow = 0;
  const visible = Math.min(systems.length, staff.visible);
  const parts = [];
  let noteIndex = 0;

  systems.forEach((system, si) => {
    const baseY = si * staff.height + staff.base;   // y of the bottom staff line
    // The lines, through pitch positions 1, 3, 5 … (2 × lines − 1).
    for (let line = 0; line < staff.lines; line += 1) {
      const y = baseY - line * LINE_GAP;
      parts.push(`<line class="staff-line" x1="${CONTENT_LEFT - 6}" y1="${y}" x2="${VIEW_WIDTH - CONTENT_LEFT + 6}" y2="${y}"/>`);
    }
    for (const note of system.notes) {
      const idx = noteIndex;
      noteIndex += 1;
      if (!note.n) {
        // A rest takes its room in the rhythm but shows only a quiet mark.
        const y = baseY - STEP * 3;
        parts.push(`<rect class="staff-rest" data-note-index="${idx}" data-system="${si}" x="${note.x + note.w / 2 - 5}" y="${y}" width="10" height="4" rx="2"/>`);
        continue;
      }
      const p = staffPosition(note.n);
      const cx = note.x + note.w / 2;
      const cy = baseY - (p - 1) * STEP;
      parts.push(
        `<g class="staff-note" data-note-index="${idx}" data-system="${si}" data-pitch="${keyFor(note.n)}">` +
        `<ellipse cx="${cx}" cy="${cy}" rx="${HEAD_RX}" ry="${HEAD_RY}" fill="${noteColor(note.n)}"/>` +
        `<text x="${cx}" y="${cy + 4.5}" text-anchor="middle">${noteLetter(note.n)}</text>` +
        `</g>`
      );
    }
  });

  return `<svg class="toy-staff__svg" viewBox="0 0 ${VIEW_WIDTH} ${visible * staff.height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Easy notes for ${song.title}">${parts.join('')}</svg>`;
}

// Big songs page two staff rows at a time: keep the row holding note `index`
// in view (on top, unless the song is ending).
function followStaff(index) {
  const staff = staffFor(shownSize);
  if (staffSystems <= staff.visible || index < 0) return;
  const node = stage.querySelector(`[data-note-index="${index}"]`);
  if (!node) return;
  const row = Number(node.dataset.system);
  const first = Math.max(0, Math.min(row, staffSystems - staff.visible));
  if (first === staffWindow) return;
  staffWindow = first;
  const svg = stage.querySelector('.toy-staff__svg');
  if (svg) svg.setAttribute('viewBox', `0 ${first * staffHeight} ${VIEW_WIDTH} ${staff.visible * staffHeight}`);
}

// ── keyboard ─────────────────────────────────────────────────────────────────

// The piano is always built as fifteen white-key slots, C4 to C6, each carrying
// the black key that rises from its right edge. A size switches slots on and
// off; the slots animate their width and the black keys fade in, so the
// child SEES the piano grow (or shrink back). Black keys ride inside their
// slot, so they stay glued to their boundary all through the animation.
// Switched-off keys are inert: aria-hidden, untabbable and untappable.
//
// Colored bars for everything struck or blown — the xylophone look a child
// already knows from the toy box. Bars are longest at the low end; the
// accidentals of a Medium or Big song sit on a raised second row of shorter
// bars, which is how a real chromatic xylophone or glockenspiel is built (the
// 2026-08-27 note "a chromatic song ... has to be decided together with the
// bars view" is settled that way, 2026-10-03). Both views keep color = pitch,
// so switching friends never breaks the map between the notes on the page and
// the keys under the child's hand.
// A song written with flats (Brahms' Lullaby, in E-flat) labels its black keys
// as flats, so the letter on the key matches the letter in the note-head.
const FLAT_OF = { C: 'D', D: 'E', F: 'G', G: 'A', A: 'B' };
function blackLabel(name, flats) {
  return flats ? `${FLAT_OF[name[0]]}♭` : noteLetter(name);
}

function keysMarkup(size, flats = false) {
  const bars = instrumentId !== 'piano';
  const on = sizeKeys(drawnSize(size));
  return WHITE_KEYS.map((pitch, i) => {
    const color = NOTE_COLORS[pitch];
    const live = on.has(pitch);
    const off = live ? '' : ' is-off';
    const inert = live ? '' : ' aria-hidden="true" tabindex="-1"';
    const barH = Math.round(100 - i * 4.3);
    const white = bars
      ? `<button class="toy-key toy-key--bar${off}" data-key="${pitch}"${inert}
                style="--key-color:${color};--bar-h:${barH}%" aria-label="Play ${noteLetter(pitch)}">
          <span class="toy-key__band" style="background:${color}">${noteLetter(pitch)}</span>
        </button>`
      : `<button class="toy-key${off}" data-key="${pitch}"${inert} aria-label="Play ${noteLetter(pitch)}">
          <span class="toy-key__band" style="background:${color}">${noteLetter(pitch)}</span>
        </button>`;
    const black = ALL_BLACK_KEYS.find((k) => k.after === i);
    let blackMarkup = '';
    if (black) {
      const bLive = on.has(black.n);
      const bColor = BLACK_COLORS[black.n];
      blackMarkup = `
        <button class="toy-key ${bars ? 'toy-key--accbar' : 'toy-key--black'}${bLive ? '' : ' is-off'}" data-key="${black.n}"
                ${bLive ? '' : 'aria-hidden="true" tabindex="-1"'} style="--key-color:${bColor}" aria-label="Play ${blackLabel(black.n, flats)}">
          <span class="toy-key__band" style="background:${bColor}">${blackLabel(black.n, flats)}</span>
        </button>`;
    }
    return `<div class="toy-slot${off}" data-slot="${pitch}">${white}${blackMarkup}</div>`;
  }).join('');
}

// Switch the drawn keyboard to `size` in place — the CSS transitions on the
// slots and black keys are the growing animation.
// Owner, 2026-10-04, verbatim: "black key-> bring them back pls." The octave's
// five black keys are DRAWN and playable for free play at every size, as the
// owner asked on 2026-08-27 ("with the working black keys too"). The Small size
// stays the fitting rule only: a song still declares the smallest size that
// holds its notes, and the score gate still proves it; Small is simply drawn
// with Medium's keys, the same width, so free play never loses them.
const drawnSize = (size) => (size === 'small' ? 'medium' : size);

function applySize(size) {
  const keys = document.getElementById('toy-keys');
  if (!keys) return;
  const on = sizeKeys(drawnSize(size));
  keys.dataset.size = size;
  SIZE_ORDER.forEach((s) => keys.classList.toggle(`toy-keys--${s}`, s === size));
  keys.classList.toggle('has-sharps', KEYBOARD_SIZES[drawnSize(size)].blacks.length > 0);
  keys.querySelectorAll('.toy-slot').forEach((slot) => {
    slot.classList.toggle('is-off', !on.has(slot.dataset.slot));
  });
  keys.querySelectorAll('.toy-key').forEach((key) => {
    const live = on.has(key.dataset.key);
    key.classList.toggle('is-off', !live);
    if (live) { key.removeAttribute('aria-hidden'); key.removeAttribute('tabindex'); }
    else { key.setAttribute('aria-hidden', 'true'); key.setAttribute('tabindex', '-1'); }
  });
  shownSize = size;
}

// A tiny picture of the keyboard a song will open — the select page's hint
// that this song makes the piano grow (owner, 2026-10-03: "yes", picture only,
// no words). Small songs carry none.
function sizeMarkSvg(size) {
  if (size === 'small') return '';
  const whites = KEYBOARD_SIZES[size].whites.length;
  const blacks = ALL_BLACK_KEYS.filter((k) => KEYBOARD_SIZES[size].blacks.includes(k.n));
  const W = 6;
  const parts = [`<rect x="0" y="0" width="${whites * W}" height="16" rx="2" fill="#fffdf6" stroke="#3a3f55" stroke-width="1"/>`];
  for (let i = 1; i < whites; i += 1) parts.push(`<line x1="${i * W}" y1="0" x2="${i * W}" y2="16" stroke="#3a3f55" stroke-width=".8"/>`);
  for (const b of blacks) parts.push(`<rect x="${(b.after + 1) * W - 2}" y="0" width="4" height="10" rx="1" fill="#1e2333"/>`);
  return `<span class="song-tile__size song-tile__size--${size}" aria-hidden="true">` +
    `<svg viewBox="-1 -1 ${whites * W + 2} 18" preserveAspectRatio="xMidYMid meet">${parts.join('')}</svg></span>`;
}

// Portrait is allowed for every song (owner, 2026-10-03: "allow, but also 'ask
// to turn for better UX'"). For a Big song in portrait, a small picture-only
// card — a tablet turning sideways — sits over the top of the staff. It never
// blocks: the keys stay live, a tap waves it away, and it leaves by itself
// when the iPad turns.
function isPortrait() {
  try { return !!(window.matchMedia && window.matchMedia('(orientation: portrait)').matches); } catch { return false; }
}

const ROTATE_CARD = `
  <button class="toy-rotate" data-rotate-dismiss aria-label="Turn the iPad sideways for the big piano">
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path class="toy-rotate__arrow" d="M14 22 A22 22 0 0 1 46 12" fill="none" stroke="#f5a623" stroke-width="4" stroke-linecap="round"/>
      <path d="M44 6 L48 13 L40 15 Z" fill="#f5a623"/>
      <g class="toy-rotate__tablet">
        <rect x="20" y="16" width="24" height="36" rx="4" fill="#fffdf6" stroke="#3a3f55" stroke-width="3"/>
        <rect x="24" y="40" width="16" height="7" rx="1.5" fill="#3a3f55"/>
        <line x1="28" y1="40" x2="28" y2="47" stroke="#fffdf6" stroke-width="1"/>
        <line x1="32" y1="40" x2="32" y2="47" stroke="#fffdf6" stroke-width="1"/>
        <line x1="36" y1="40" x2="36" y2="47" stroke="#fffdf6" stroke-width="1"/>
      </g>
    </svg>
  </button>`;

function updateRotateCard() {
  if (!stage || !active) return;
  const panel = stage.querySelector('.toy-panel');
  const card = stage.querySelector('.toy-rotate');
  const want = !!panel && shownSize === 'big' && isPortrait() && !rotateDismissed;
  if (want && !card) panel.insertAdjacentHTML('beforeend', ROTATE_CARD);
  if (!want && card) card.remove();
}

let orientationWired = false;
function wireOrientation() {
  if (orientationWired) return;
  orientationWired = true;
  try {
    const mq = window.matchMedia && window.matchMedia('(orientation: portrait)');
    if (mq && mq.addEventListener) mq.addEventListener('change', updateRotateCard);
    else if (mq && mq.addListener) mq.addListener(updateRotateCard);
  } catch { /* no matchMedia: no card */ }
}

// ── rendering ────────────────────────────────────────────────────────────────
//
// Two pages, and neither of them leans on words — the players are pre-readers.
//
//   SELECT — every song as a big picture tile, every friend as a picture tile,
//   one big ▶. Tapping a picture answers in sound (a few notes of the song, one
//   note in the friend's voice), so a child can choose by ear before by eye.
//   Tapping the already-chosen song picture again goes straight to the keys.
//
//   PLAY — almost the whole page is the notes and the toy. A back arrow, the
//   song's own picture as a reminder of what is on the stand, and two icon
//   buttons: ▶ to hear it, ↺ to start your turn over. Your turn begins by
//   itself — the first note is already waiting.

function songsToShow() {
  if (roomFilteredIds) {
    return PLAYALONG_SONGS.filter((s) => roomFilteredIds.includes(s.id));
  }
  return PLAYALONG_SONGS;
}

// The library is grouped (owner, 2026-10-19: "Organize by category and
// difficulty"). Each group opens with a picture-only marker — the players are
// pre-readers, so a category is a small drawn icon with its name only for
// screen readers — and inside a group the easiest songs come first. A Music
// World room's door keeps that room's own order and shows no markers: five
// songs need no shelves.
//
// The markers are drawn in the book's own hand (owner rule, 2026-10-20: no
// emoji in the UI): rounded strokes, currentColor, one em square so each
// tracks the row's own font-size. The name beside each is for screen readers.
export const CATEGORY_ORDER = ['nursery', 'lullaby', 'traditional', 'international', 'holiday', 'classical', 'thai'];
const CATEGORY_ICON = {
  // A chick: round body, wing, eye, beak, two legs.
  nursery: '<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="10.6" cy="13" r="6.2" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M7 13.6c1.2 1.7 3.5 2.2 5.4 1.2" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/><circle cx="12.8" cy="11.2" r="1" fill="currentColor"/><path d="M16.7 12.3l2.5 1-2.4 1.1z" fill="currentColor"/><path d="M8.4 19.3v1.9M11.8 19.4v1.8" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>',
  // A crescent moon with one star in its hollow.
  lullaby: '<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M14.6 3.6a9.2 9.2 0 1 0 5.9 11.6A7.3 7.3 0 0 1 14.6 3.6z" fill="currentColor"/><path d="M18.8 3.2l.6 1.5 1.5.6-1.5.6-.6 1.5-.6-1.5-1.5-.6 1.5-.6z" fill="currentColor"/></svg>',
  // A banjo: round body, head, neck and peg.
  traditional: '<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="8.7" cy="15.3" r="5.7" fill="none" stroke="currentColor" stroke-width="1.9"/><circle cx="8.7" cy="15.3" r="2.2" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M12.7 11.3 19.4 4.6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><circle cx="20.3" cy="3.7" r="1" fill="currentColor"/></svg>',
  // A globe: one circle, the meridian and the equator.
  international: '<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="8.3" fill="none" stroke="currentColor" stroke-width="1.9"/><ellipse cx="12" cy="12" rx="3.9" ry="8.3" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M3.7 12h16.6" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>',
  // A gift: box, lid, ribbon and bow.
  holiday: '<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="3.6" y="10.2" width="16.8" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M12 10.2v10" fill="none" stroke="currentColor" stroke-width="1.9"/><rect x="2.6" y="6.6" width="18.8" height="3.6" rx="1.7" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M12 6.6C10.7 4.4 7 4.2 7 6.2c.1 1.8 3.4 1.9 5 .4zM12 6.6c1.3-2.2 5-2.4 5-.4-.1 1.8-3.4 1.9-5 .4z" fill="currentColor"/></svg>',
  // A violin: two bouts, the f-holes, neck and scroll.
  classical: '<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="16.3" r="4.7" fill="none" stroke="currentColor" stroke-width="1.9"/><circle cx="12" cy="9.2" r="3.2" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M10.3 14.6c.5.8.5 1.9 0 2.9M13.7 14.6c-.5.8-.5 1.9 0 2.9" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M12 6V3.1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="2.6" r=".9" fill="currentColor"/></svg>',
  // An elephant's head: the ear, the eye, the trunk curling down.
  thai: '<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="10.2" cy="11.5" r="6.1" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M5.9 9.4a4.8 4.8 0 0 0 .9 6.6" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/><circle cx="12.4" cy="10.2" r="1" fill="currentColor"/><path d="M15.7 13c2 1.4 2.5 4.3 1.3 6.5-.5.9-1.7 1.1-2.4.3" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>'
};
const CATEGORY_MARK = {
  nursery: [CATEGORY_ICON.nursery, 'Nursery songs'],
  lullaby: [CATEGORY_ICON.lullaby, 'Lullabies'],
  traditional: [CATEGORY_ICON.traditional, 'Traditional songs'],
  international: [CATEGORY_ICON.international, 'Songs from around the world'],
  holiday: [CATEGORY_ICON.holiday, 'Holiday songs'],
  classical: [CATEGORY_ICON.classical, 'Classical music'],
  thai: [CATEGORY_ICON.thai, 'Thai songs']
};

export function groupedSongs(songs) {
  const groups = [];
  for (const category of CATEGORY_ORDER) {
    const inGroup = songs
      .map((song, i) => ({ song, i }))
      .filter(({ song }) => song.category === category)
      .sort((a, b) => (a.song.difficulty || 2) - (b.song.difficulty || 2) || a.i - b.i)
      .map(({ song }) => song);
    if (inGroup.length) groups.push({ category, songs: inGroup });
  }
  const placed = new Set(groups.flatMap((g) => g.songs));
  const rest = songs.filter((s) => !placed.has(s));
  if (rest.length) groups.push({ category: null, songs: rest });
  return groups;
}

// Facts for a song: the Toy Piano facts (data/playalong-facts.js) or, for a song that
// is also a catalogue piece, that piece's own facts. `clip` is the pre-rendered
// audio/explain/<clip>.m4a. Null when there are none: no control is drawn for it.
export function songFacts(song) {
  if (PLAYALONG_FACTS[song.id]) return { clip: PLAYALONG_FACT_CLIPS[song.id], text: PLAYALONG_FACTS[song.id] };
  for (const [catId, playId] of Object.entries(CATALOGUE_TO_PLAYALONG)) {
    if (playId === song.id && EXPLANATIONS[catId]?.facts?.text) return { clip: `${catId}-facts`, text: EXPLANATIONS[catId].facts.text };
  }
  if (EXPLANATIONS[song.id]?.facts?.text) return { clip: `${song.id}-facts`, text: EXPLANATIONS[song.id].facts.text };
  return null;
}

const FACTS_ICON = '<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" focusable="false"><path d="M12 2.5a6.5 6.5 0 0 0-3.7 11.8c.6.5 1 1.2 1 2V17h5.4v-.7c0-.8.4-1.5 1-2A6.5 6.5 0 0 0 12 2.5z" fill="currentColor"/><rect x="9.3" y="18.3" width="5.4" height="1.8" rx=".9" fill="currentColor"/><rect x="10.3" y="21" width="3.4" height="1.5" rx=".75" fill="currentColor"/></svg>';

// The room's other drawn marks (owner rule, 2026-10-20: no emoji in the UI —
// every glyph the operating system used to draw is now a small SVG in the
// book's own hand, rounded strokes, currentColor, sized in em like FACTS_ICON's
// siblings in app.js so each tracks the font-size its emoji sat in).
// A single eighth note — the stand-in wherever a song has no painting yet.
const NOTE_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9 18V5l11-2v13" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="6" cy="18" r="3" fill="currentColor"/><circle cx="17" cy="16" r="3" fill="currentColor"/></svg>';
// The banner's little keyboard — the same white-keys-and-blacks picture the
// size marks and the rotate card draw, in one em.
const PIANO_ICON = '<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="2.8" y="5.4" width="18.4" height="13.2" rx="2.2" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M7.4 5.4v13.2M12 5.4v13.2M16.6 5.4v13.2" fill="none" stroke="currentColor" stroke-width="1.9"/><rect x="5" y="5.4" width="2.4" height="7" rx="1" fill="currentColor"/><rect x="9.6" y="5.4" width="2.4" height="7" rx="1" fill="currentColor"/><rect x="14.2" y="5.4" width="2.4" height="7" rx="1" fill="currentColor"/></svg>';
// The Listen toggle's two states, swapped in place by setListenUI.
const PLAY_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" fill="currentColor"/></svg>';
const STOP_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 7h10v10H7z" fill="currentColor"/></svg>';
// The celebration's sparkle burst — pictures, not words, either side of the
// song's own painting.
const CHEER_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 2c.7 6.2 3.8 9.3 10 10-6.2.7-9.3 3.8-10 10-.7-6.2-3.8-9.3-10-10 6.2-.7 9.3-3.8 10-10z" fill="currentColor"/></svg>';
const BACK_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const REPLAY_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20 12a8 8 0 1 1-2.3-5.6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M20 4v5h-5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

// A song without its painting yet shows a drawn eighth note on a dashed tile —
// a clear placeholder, never an empty one. The corner mark is the hint that
// this song makes the piano grow.
function songTilesMarkup() {
  if (roomFilteredIds) return tilesMarkup(songsToShow());
  return groupedSongs(songsToShow()).map((g) => {
    const mark = g.category && CATEGORY_MARK[g.category];
    const header = mark
      ? `<div class="song-group" data-category="${g.category}" role="heading" aria-level="2" aria-label="${mark[1]}"><span aria-hidden="true">${mark[0]}</span></div>`
      : '';
    return header + tilesMarkup(g.songs);
  }).join('');
}

function tilesMarkup(songs) {
  return songs.map((s) => {
    const size = songSize(s);
    return `
    <button class="song-tile${s.id === songId ? ' is-current' : ''}${s.art ? '' : ' song-tile--placeholder'}" data-song="${s.id}"
            data-size="${size}" aria-label="Song: ${s.title}${size === 'small' ? '' : ' (big piano)'}" title="${s.title}">
      ${s.art
        ? `<img class="song-tile__art" src="${s.art}" alt="">`
        : `<span class="song-tile__emoji">${NOTE_ICON}</span>`}
      ${sizeMarkSvg(size)}
    </button>`;
  }).join('');
}

function friendTilesMarkup() {
  return COMPANIONS.map((c) => `
    <button class="friend-tile${c.id === instrumentId ? ' is-current' : ''}" data-toy="${c.id}"
            aria-label="Friend: ${c.name}" title="${c.name}">
      <img src="${c.art}" alt="">
    </button>`).join('');
}

function renderSelect() {
  player.stop();
  mode = 'idle';
  turnIndex = -1;
  stage.className = 'stage stage--playroom stage--toy-select';
  stage.style.backgroundImage = 'url(assets/backgrounds/garden-pastel.webp)';
  const room = roomId ? roomById(roomId) : null;
  const backDest = room ? 'room' : 'world';
  const roomHeading = room
    ? `<p class="toy-room-heading">${room.title}</p>`
    : '';
  stage.innerHTML = `
    <div class="scrim">
      <div class="topbar">
        <!-- From the landing the room is entered with no companion chosen, so
             app.js's go('world') guard sends the arrow back to the landing.
             From a Music World room, the arrow returns to that room. -->
        <span class="cg-back-slot" aria-hidden="true"></span><button class="cg-back" data-go="${backDest}" aria-label="${room ? `Back to ${room.title}` : 'Back to the menu'}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        <div class="banner banner--slim"><h1>${PIANO_ICON} Toy Piano</h1></div>
        <span class="topbar-spacer"></span>
      </div>

      ${roomHeading}

      <div class="toy-select">
        <div class="song-grid" id="toy-songs">${songTilesMarkup()}</div>
        <div class="friend-row" id="toy-friends">${friendTilesMarkup()}</div>
        <button class="go-btn" data-play-go aria-label="Go play">
          <span class="go-btn__icon">${PLAY_ICON}</span>
        </button>
      </div>
    </div>`;
  scrollCurrentTileIntoView();
}

// The song grid scrolls (39 songs), so the chosen song is brought into view.
function scrollCurrentTileIntoView() {
  const grid = document.getElementById('toy-songs');
  const tile = grid && grid.querySelector('.song-tile.is-current');
  if (!grid || !tile || !(grid.clientHeight > 0)) return;
  const top = tile.offsetTop;   // the grid is the offsetParent (position: relative)
  if (top < grid.scrollTop || top + tile.offsetHeight > grid.scrollTop + grid.clientHeight) {
    grid.scrollTop = Math.max(0, top - 8);
  }
}

function renderPlay() {
  const song = playalongSongById(songId);
  const c = companionById(instrumentId);
  engine.setInstrument(c);
  const size = songSize(song);
  // The piano is drawn at the size it last showed, then switched to this
  // song's size — that switch is the growing (or shrinking) animation.
  const from = shownSize || 'small';

  stage.className = 'stage stage--playroom stage--toy-play';
  stage.style.backgroundImage = 'url(assets/backgrounds/garden-pastel.webp)';
  stage.innerHTML = `
    <div class="scrim">
      <div class="topbar">
        <button class="round-btn" data-goselect aria-label="Choose another song">${BACK_ICON}</button>
        <div class="toy-songdot" aria-label="${song.title}">${song.art ? `<img class="toy-songdot__art" src="${song.art}" alt="">` : NOTE_ICON}</div>
        ${songFacts(song) ? `<button class="toy-iconbtn toy-factsbtn" data-song-facts="${song.id}" aria-label="A true story about ${song.title}">${FACTS_ICON}</button>` : ''}
        <div class="toy-playbtns">
          <button class="toy-iconbtn" data-try aria-pressed="false" aria-label="Start over"><span aria-hidden="true">${REPLAY_ICON}</span></button>
          <button class="toy-iconbtn" data-listen-toy aria-pressed="false" aria-label="Listen"><span class="toy-iconbtn__listen" aria-hidden="true">${PLAY_ICON}</span></button>
        </div>
      </div>

      <div class="toy-panel">
        <div class="toy-staff" id="toy-staff">${staffSvg(song, size)}</div>
      </div>

      <div class="toy-keys${instrumentId === 'piano' ? '' : ' toy-keys--bars'}" id="toy-keys">${keysMarkup(from, song.notes.some((x) => /^[A-G]b/.test(x.n || '')))}</div>
    </div>`;
  stage.classList.toggle('stage--toy-big', size === 'big');

  applySize(from);
  if (from !== size) {
    const keys = document.getElementById('toy-keys');
    // Commit the starting size's layout before switching, so the browser
    // animates from it rather than painting the end state directly.
    if (keys) void keys.offsetWidth;
    applySize(size);
  }
  updateRotateCard();

  // The book assumes you play: the first note is already waiting.
  setListenUI(false);
  startTurn();
}

function updateSelectUI() {
  const songs = document.getElementById('toy-songs');
  const friends = document.getElementById('toy-friends');
  if (songs) songs.innerHTML = songTilesMarkup();
  if (friends) friends.innerHTML = friendTilesMarkup();
}

export function renderPlayroom(ctx) {
  ({ stage, engine, player } = ctx);
  openSongFacts = ctx.openSongFacts || null;
  active = true;
  mode = 'idle';
  turnIndex = -1;
  roomId = ctx.roomId || null;
  rotateDismissed = false;
  wireOrientation();

  const room = roomId ? roomById(roomId) : null;
  if (room) {
    roomFilteredIds = room.pieceIds
      .map((pid) => CATALOGUE_TO_PLAYALONG[pid])
      .filter(Boolean);
  } else {
    roomFilteredIds = null;
  }

  const stored = readStore();
  // First visit: start the child on the song with fewest decisions (the easiest
  // one in the book), holding the friend they already chose for the journey.
  instrumentId = stored.instrumentId || ctx.journeyCompanionId || 'piano';
  const available = songsToShow();
  const storedSong = playalongSongById(stored.songId);
  songId = (storedSong && available.some((s) => s.id === stored.songId))
    ? stored.songId
    : (available[0] ? available[0].id : PLAYALONG_SONGS[0].id);
  writeStore();

  renderSelect();
  wire();
}

// A few notes of a song, straight from the engine — a tap on a picture tile
// answers in sound so a pre-reader can pick by ear. The player is not involved:
// no timeline, no follow, nothing for a page without a staff to keep in step.
function previewSong(song) {
  engine.setInstrument(companionById(instrumentId));
  const ctx = engine.start();
  engine.stopAll();
  const spb = 60 / (song.tempo * 1.15);
  let at = ctx.currentTime + 0.06;
  for (const note of song.notes.filter((n) => n.n).slice(0, 4)) {
    engine.playNote(note.n, at, note.d * spb);
    at += note.d * spb;
  }
}

// ── interaction ──────────────────────────────────────────────────────────────

function clearHighlights() {
  stage.querySelectorAll('.staff-note.is-current').forEach((n) => n.classList.remove('is-current'));
  stage.querySelectorAll('.toy-key.is-struck').forEach((k) => k.classList.remove('is-struck'));
  stage.querySelectorAll('.toy-key.is-hint').forEach((k) => k.classList.remove('is-hint'));
}

function strikeKey(pitch) {
  const key = stage.querySelector(`.toy-key[data-key="${pitch}"]`);
  if (!key) return;
  key.classList.remove('is-struck');
  void key.offsetWidth;   // restart the animation on repeated notes
  key.classList.add('is-struck');
}

function highlightNote(index) {
  clearHighlights();
  if (index < 0) return;
  followStaff(index);
  const node = stage.querySelector(`.staff-note[data-note-index="${index}"]`);
  if (node) node.classList.add('is-current');
}

// Listen: the room plays, the page and the keys light together.
function startListen() {
  leaveTurn();
  const song = playalongSongById(songId);
  engine.setInstrument(companionById(instrumentId));
  mode = 'listen';
  player.load({ tempo: song.tempo, notes: song.notes });
  player.onNote = (index, slot) => {
    if (!active) return;
    // -1 arrives both from finishing and from any stop — including the
    // visibilitychange stop app.js performs on a hidden page.
    if (index === -1) {
      clearHighlights();
      if (mode === 'listen') { setListenUI(false); mode = 'idle'; }
      return;
    }
    highlightNote(index);
    // The player's timeline slots carry timing only, no pitch — main's Player
    // schedules pitches straight to the engine — so the struck key comes from
    // the song's own notes, at the slot's index. A rest has no key to strike.
    if (slot && !slot.rest) {
      const note = song.notes[slot.index];
      if (note && note.n) strikeKey(keyFor(note.n));
    }
  };
  player.onFinish = () => {
    if (!active) return;
    clearHighlights();
    setListenUI(false);
    mode = 'idle';
  };
  player.play();
  setListenUI(true);
}

function stopListen() {
  player.stop();   // fires onNote(-1) → highlightNote clears
  setListenUI(false);
  mode = 'idle';
}

function setListenUI(on) {
  // `data-listen-toy`, not `data-listen`: the book's own delegated stage
  // handler treats every [data-listen] as the landing's "Hear them play" cue
  // and unlocks audio + restarts the page tune on it. Sharing the name made
  // every Listen tap here also fire that. One attribute, one meaning.
  const button = stage.querySelector('[data-listen-toy]');
  if (!button) return;
  button.setAttribute('aria-pressed', on ? 'true' : 'false');
  button.classList.toggle('is-on', on);
  const icon = button.querySelector('.toy-iconbtn__listen');
  if (icon) icon.innerHTML = on ? STOP_ICON : PLAY_ICON;
}

// Your turn: the next note waits for the child, at the child's own pace.
function startTurn() {
  if (mode === 'listen') stopListen();
  mode = 'turn';
  stage.querySelectorAll('.staff-note').forEach((n) => n.classList.remove('is-done'));
  turnIndex = nextNoteIndex(-1);
  setTurnUI();
}

function leaveTurn() {
  mode = 'idle';
  turnIndex = -1;
  clearHighlights();
  stage.querySelectorAll('.staff-note.is-done').forEach((n) => n.classList.remove('is-done'));
  const tryButton = stage.querySelector('[data-try]');
  if (tryButton) tryButton.setAttribute('aria-pressed', 'false');
}

function setTurnUI() {
  const tryButton = stage.querySelector('[data-try]');
  if (tryButton) tryButton.setAttribute('aria-pressed', mode === 'turn' ? 'true' : 'false');
  if (mode !== 'turn' || turnIndex < 0) return;

  followStaff(turnIndex);
  const node = stage.querySelector(`.staff-note[data-note-index="${turnIndex}"]`);
  if (node) node.classList.add('is-current');
  const pitch = node && node.dataset.pitch;
  stage.querySelectorAll('.toy-key.is-hint').forEach((k) => k.classList.remove('is-hint'));
  if (pitch) {
    const key = stage.querySelector(`.toy-key[data-key="${pitch}"]`);
    if (key) key.classList.add('is-hint');
  }
}

function nextNoteIndex(from) {
  const song = playalongSongById(songId);
  for (let i = from + 1; i < song.notes.length; i += 1) {
    if (song.notes[i].n) return i;
  }
  return -1;
}

function celebrate() {
  const song = playalongSongById(songId);
  turnIndex = -1;
  mode = 'idle';
  clearHighlights();
  stage.querySelectorAll('.toy-key.is-hint').forEach((k) => k.classList.remove('is-hint'));
  setTurnUI();
  const staff = document.getElementById('toy-staff');
  const banner = document.createElement('div');
  banner.className = 'toy-cheer';
  banner.setAttribute('role', 'status');
  banner.setAttribute('aria-label', `You played ${song.title}!`);
  // Pictures, not words — the player just played it and knows what this means.
  banner.innerHTML = `${CHEER_ICON}${song.art ? `<img class="toy-cheer__art" src="${song.art}" alt="">` : NOTE_ICON}${CHEER_ICON}`;
  staff.parentNode.insertBefore(banner, staff);
  setTimeout(() => banner.remove(), 2600);
}

function tapKey(pitch) {
  player.pluck(pitch);
  strikeKey(pitch);
  if (mode !== 'turn' || turnIndex < 0) return;

  const node = stage.querySelector(`.staff-note[data-note-index="${turnIndex}"]`);
  if (!node || node.dataset.pitch !== pitch) return;   // a wrong key only sounds

  node.classList.remove('is-current');
  node.classList.add('is-done');
  const next = nextNoteIndex(turnIndex);
  if (next < 0) { celebrate(); return; }
  turnIndex = next;
  setTurnUI();
}

// ── wiring ───────────────────────────────────────────────────────────────────

function wire() {
  if (wired) return;
  wired = true;

  stage.addEventListener('click', (event) => {
    if (!active) return;
    const t = event.target;

    const key = t.closest('[data-key]');
    if (key) {
      if (key.classList.contains('is-off')) return;   // a key the piano has folded away
      tapKey(key.dataset.key);
      return;
    }

    if (t.closest('[data-rotate-dismiss]')) {
      rotateDismissed = true;
      updateRotateCard();
      return;
    }

    // Select page: a tap on a song picture answers in sound; a second tap of
    // the already-chosen picture goes straight to the keys.
    const song = t.closest('[data-song]');
    if (song) {
      const chosen = song.dataset.song;
      const again = chosen === songId;
      songId = chosen;
      writeStore();
      updateSelectUI();
      if (again) { stopTitle(); renderPlay(); }
      else {
        // Say the name, then play the few notes — one after the other, never
        // together. engine.start() is called inside the tap so the audio
        // context is unlocked exactly as before; a missing clip falls straight
        // through to the notes.
        engine.start();
        const clip = PLAYALONG_TITLE_CLIPS[chosen];
        const preview = () => { if (active && songId === chosen && mode === 'idle' && stage.classList.contains('stage--toy-select')) previewSong(playalongSongById(chosen)); };
        if (clip) speakTitleUrl(clip, preview); else preview();
      }
      return;
    }

    const friend = t.closest('[data-toy]');
    if (friend) {
      instrumentId = friend.dataset.toy;
      writeStore();
      engine.setInstrument(companionById(instrumentId));
      engine.start();
      player.pluck('G4');            // one note in the new voice — choosing by ear
      updateSelectUI();
      return;
    }

    if (t.closest('[data-play-go]')) { stopTitle(); renderPlay(); return; }

    const factsBtn = t.closest('[data-song-facts]');
    if (factsBtn) {
      const fs = playalongSongById(factsBtn.dataset.songFacts);
      const facts = fs && songFacts(fs);
      if (facts && openSongFacts) {
        if (mode === 'listen') stopListen();
        engine.stopAll();
        openSongFacts({ title: fs.title, text: facts.text, clip: facts.clip });
      }
      return;
    }

    if (t.closest('[data-goselect]')) {
      if (mode === 'listen') stopListen();
      leaveTurn();
      renderSelect();
      return;
    }

    if (t.closest('[data-listen-toy]')) {
      if (mode === 'listen') stopListen(); else startListen();
      return;
    }

    // ↺ always starts the song over — a pre-reader tapping it wants the tune
    // from the top, never "off".
    if (t.closest('[data-try]')) startTurn();
  });
}

// Leaving the room (any navigation): stop sound and give the player's callbacks
// back to the book, so a bubble finishing in the world still clears its own UI.
// app.js restores its own defaults in go() before re-rendering; this makes the
// room inert even if some other path swaps the screen first.
export function leavePlayroom() {
  if (!active) return;
  stopTitle();
  active = false;
  mode = 'idle';
  turnIndex = -1;
  if (player) {
    player.stop();
    player.onNote = () => {};
    player.onFinish = () => {};
  }
}
