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
import { PLAYALONG_SONGS, playalongSongById } from '../data/playalong-songs.js';

// The toy's whole keyboard, low to high. The staff and the keys are both drawn
// from this one list, so they can never disagree. Exported for the world card.
export const PITCHES = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'];

// One color per pitch, and the same color everywhere — note-head, key, hint.
// C5 is a deeper rose than C4's red so the two C's differ by more than height.
export const NOTE_COLORS = {
  C4: '#e5484d', D4: '#f0862a', E4: '#f2bc2a', F4: '#4aa35a',
  G4: '#3e9fd4', A4: '#7d66e0', B4: '#dd7fbe', C5: '#b23d6d'
};

// The black keys, each named by the white key it follows — a real octave, in
// the 2+3 groups every piano shows. Their colors are darker shades of the
// family they rise from (the color-music convention for accidentals: C# is the
// dark red of C), so a black key is findable by color without pretending to be
// a white one. Free play only by design: every song in the book is diatonic
// and the bar instruments are diatonic too, so no song ever asks for a key
// that one of the views doesn't have.
export const BLACK_KEYS = [
  { n: 'C#4', after: 0 }, { n: 'D#4', after: 1 },
  { n: 'F#4', after: 3 }, { n: 'G#4', after: 4 }, { n: 'A#4', after: 5 }
];
export const BLACK_COLORS = {
  'C#4': '#a93238', 'D#4': '#b06116', 'F#4': '#357643',
  'G#4': '#2a7099', 'A#4': '#5746ad'
};

const STORE_KEY = 'music-book.toyroom';

// ── room state ───────────────────────────────────────────────────────────────

let stage = null;
let engine = null;
let player = null;
let active = false;
let wired = false;

let instrumentId = null;
let songId = null;
let mode = 'idle';          // 'idle' | 'listen' | 'turn'
let turnIndex = -1;         // index into the song's notes of the note being waited for

function readStore() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch { return {}; }
}

function writeStore() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify({ instrumentId, songId })); } catch { /* private mode */ }
}

// ── staff layout ─────────────────────────────────────────────────────────────

// A simplified staff: four lines, eight pitch steps. Positions 1, 3, 5, 7 sit on
// the lines, C4 hangs just below the bottom line and C5 rides the top one —
// enough geography that "higher on the page" still means "higher to the ear".
const LINE_GAP = 24;        // distance between staff lines
const STEP = LINE_GAP / 2;  // one diatonic step
const SYSTEM_HEIGHT = 116;  // staff plus breathing room for the two outer notes
const VIEW_WIDTH = 800;
const CONTENT_LEFT = 16;
const CONTENT_WIDTH = VIEW_WIDTH - CONTENT_LEFT * 2;
const MAX_SYSTEMS = 3;
const HEAD_RX = 15.5;
const HEAD_RY = 12;

// Lay a song out into systems (staff rows). Slot width grows with duration, so
// long notes simply take more room — the pre-reader's rhythm notation. The unit
// shrinks for long songs so they still fit one book page of at most 3 systems.
function layoutSong(song) {
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
    if (systems.length <= MAX_SYSTEMS || unit <= 16) break;
    unit -= 2;
  }
  return systems;
}

function noteLetter(pitch) {
  return pitch.includes('#') ? `${pitch[0]}♯` : pitch[0];
}

function staffSvg(song) {
  const systems = layoutSong(song);
  const height = systems.length * SYSTEM_HEIGHT;
  const parts = [];
  let noteIndex = 0;

  systems.forEach((system, si) => {
    const baseY = si * SYSTEM_HEIGHT + 86;   // y of the bottom staff line
    // The four lines, through pitch positions 1, 3, 5 and 7.
    for (let line = 0; line < 4; line += 1) {
      const y = baseY - line * LINE_GAP;
      parts.push(`<line class="staff-line" x1="${CONTENT_LEFT - 6}" y1="${y}" x2="${VIEW_WIDTH - CONTENT_LEFT + 6}" y2="${y}"/>`);
    }
    for (const note of system.notes) {
      const idx = noteIndex;
      noteIndex += 1;
      if (!note.n) {
        // A rest takes its room in the rhythm but shows only a quiet mark.
        const y = baseY - STEP * 3;
        parts.push(`<rect class="staff-rest" data-note-index="${idx}" x="${note.x + note.w / 2 - 5}" y="${y}" width="10" height="4" rx="2"/>`);
        continue;
      }
      const p = PITCHES.indexOf(note.n);
      const cx = note.x + note.w / 2;
      const cy = baseY - (p - 1) * STEP;
      const color = NOTE_COLORS[note.n];
      parts.push(
        `<g class="staff-note" data-note-index="${idx}" data-pitch="${note.n}">` +
        `<ellipse cx="${cx}" cy="${cy}" rx="${HEAD_RX}" ry="${HEAD_RY}" fill="${color}"/>` +
        `<text x="${cx}" y="${cy + 4.5}" text-anchor="middle">${noteLetter(note.n)}</text>` +
        `</g>`
      );
    }
  });

  return `<svg class="toy-staff__svg" viewBox="0 0 ${VIEW_WIDTH} ${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Easy notes for ${song.title}">${parts.join('')}</svg>`;
}

// ── keyboard ─────────────────────────────────────────────────────────────────

// Piano keys for the piano — a real octave, white keys with the five black
// keys sitting in the 2+3 groups between them. Colored bars, longest at the
// low end, for everything struck or blown — the xylophone look a child already
// knows from the toy box, and real xylophones have no black bars, so the bars
// view stays diatonic. Both views keep color = pitch, so switching instruments
// never breaks the map between the notes on the page and the keys under the
// child's hand.
function keysMarkup() {
  if (instrumentId !== 'piano') {
    return PITCHES.map((pitch, i) => {
      const color = NOTE_COLORS[pitch];
      const barH = Math.round(100 - i * 5.5);
      return `
        <button class="toy-key toy-key--bar" data-key="${pitch}"
                style="--key-color:${color};--bar-h:${barH}%" aria-label="Play ${noteLetter(pitch)}">
          <span class="toy-key__band" style="background:${color}">${noteLetter(pitch)}</span>
        </button>`;
    }).join('');
  }
  const white = PITCHES.map((pitch) => {
    const color = NOTE_COLORS[pitch];
    return `
      <button class="toy-key" data-key="${pitch}" aria-label="Play ${noteLetter(pitch)}">
        <span class="toy-key__band" style="background:${color}">${noteLetter(pitch)}</span>
      </button>`;
  }).join('');
  // Each black key straddles the boundary after its white key — eighths of the
  // keyboard's width, the same arithmetic the CSS grid lays the white keys by.
  const black = BLACK_KEYS.map(({ n, after }) => {
    const color = BLACK_COLORS[n];
    return `
      <button class="toy-key toy-key--black" data-key="${n}"
              style="left:${(after + 1) * 12.5}%" aria-label="Play ${noteLetter(n)}">
        <span class="toy-key__band" style="background:${color}">${noteLetter(n)}</span>
      </button>`;
  }).join('');
  return white + black;
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
//   song's own emoji as a reminder of what is on the stand, and two icon
//   buttons: ▶ to hear it, ↺ to start your turn over. Your turn begins by
//   itself — the first note is already waiting.

function songTilesMarkup() {
  return PLAYALONG_SONGS.map((s) => `
    <button class="song-tile${s.id === songId ? ' is-current' : ''}" data-song="${s.id}"
            aria-label="Song: ${s.title}" title="${s.title}">
      ${s.art
        ? `<img class="song-tile__art" src="${s.art}" alt="">`
        : `<span class="song-tile__emoji">${s.emoji}</span>`}
    </button>`).join('');
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
  stage.innerHTML = `
    <div class="scrim">
      <div class="topbar">
        <!-- "Back", not "Back to Music World": the room is entered from the
             landing with no companion chosen, and app.js's go('world') guard
             sends this arrow back to the landing — label the destination it
             actually reaches. -->
        <button class="round-btn" data-go="world" aria-label="Back">←</button>
        <div class="banner banner--slim"><h1>🎹 Toy Piano</h1></div>
        <span class="topbar-spacer"></span>
      </div>

      <div class="toy-select">
        <div class="song-grid" id="toy-songs">${songTilesMarkup()}</div>
        <div class="friend-row" id="toy-friends">${friendTilesMarkup()}</div>
        <button class="go-btn" data-play-go aria-label="Go play">
          <span class="go-btn__icon">▶</span>
        </button>
      </div>
    </div>`;
}

function renderPlay() {
  const song = playalongSongById(songId);
  const c = companionById(instrumentId);
  engine.setInstrument(c);

  stage.className = 'stage stage--playroom stage--toy-play';
  stage.style.backgroundImage = 'url(assets/backgrounds/garden-pastel.webp)';
  stage.innerHTML = `
    <div class="scrim">
      <div class="topbar">
        <button class="round-btn" data-goselect aria-label="Choose another song">←</button>
        <div class="toy-songdot" aria-label="${song.title}">${song.emoji}</div>
        <div class="toy-playbtns">
          <button class="toy-iconbtn" data-try aria-pressed="false" aria-label="Start over"><span>↺</span></button>
          <button class="toy-iconbtn" data-listen-toy aria-pressed="false" aria-label="Listen"><span class="toy-iconbtn__listen">▶</span></button>
        </div>
      </div>

      <div class="toy-panel">
        <div class="toy-staff" id="toy-staff">${staffSvg(song)}</div>
      </div>

      <div class="toy-keys${instrumentId === 'piano' ? '' : ' toy-keys--bars'}" id="toy-keys">${keysMarkup()}</div>
    </div>`;

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
  active = true;
  mode = 'idle';
  turnIndex = -1;

  const stored = readStore();
  // First visit: start the child on the song with fewest decisions (the easiest
  // one in the book), holding the friend they already chose for the journey.
  instrumentId = stored.instrumentId || ctx.journeyCompanionId || 'piano';
  songId = stored.songId && playalongSongById(stored.songId) ? stored.songId : PLAYALONG_SONGS[0].id;
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
      if (note && note.n) strikeKey(note.n);
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
  if (icon) icon.textContent = on ? '⏹' : '▶';
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
  banner.textContent = `🎉 ${song.emoji} 🎉`;
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
    if (key) { tapKey(key.dataset.key); return; }

    // Select page: a tap on a song picture answers in sound; a second tap of
    // the already-chosen picture goes straight to the keys.
    const song = t.closest('[data-song]');
    if (song) {
      const chosen = song.dataset.song;
      const again = chosen === songId;
      songId = chosen;
      writeStore();
      updateSelectUI();
      if (again) renderPlay();
      else previewSong(playalongSongById(chosen));
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

    if (t.closest('[data-play-go]')) { renderPlay(); return; }

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
  active = false;
  mode = 'idle';
  turnIndex = -1;
  if (player) {
    player.stop();
    player.onNote = () => {};
    player.onFinish = () => {};
  }
}
