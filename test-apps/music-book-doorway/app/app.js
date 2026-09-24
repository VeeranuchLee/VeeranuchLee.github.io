import { AudioEngine } from './audio-engine.js';
import { Player } from './player.js';
import { MusicBed } from './music-bed.js';
import { Ambience } from './ambience.js';
import { COMPANIONS, companionById } from '../data/instruments.js';
import { PIECES, composerById } from '../data/catalogue.js';
import { WINGS, ROOMS, PIECE_ROOMS } from '../data/rooms.js';
import { motifFor, PARADE } from '../data/motifs.js';
import { journey } from './journey.js';
import { speakTitle, configureTitles } from './titles.js';
import { createChapter } from './read-together.js';
import { renderPlayroom, leavePlayroom, PITCHES, NOTE_COLORS, BLACK_KEYS, BLACK_COLORS } from './playroom.js';

const engine = new AudioEngine();
const player = new Player(engine);
const musicBed = new MusicBed(engine);
const ambience = new Ambience(engine);
configureTitles({ engine });

const stage = document.getElementById('stage');
const popup = document.getElementById('popup');
const popupBody = document.getElementById('popup-body');
const soundBtn = document.getElementById('sound');

let playingPieceId = null;
let playingWhich = null;
let currentView = 'landing';
let bedTune = null;
// Set when a compare-link crosses rooms: the target room renders first, then
// its piece popup opens. Without this the child lands in a new room with no
// sign of what they followed to get there.
let pendingPopupPieceId = null;
// Rooms whose companion greeting has already shown once this journey. A
// character who speaks after every tap stops being a character and becomes a
// notification.
const greetedRooms = new Set();

const PAGE_SIZE = 6;

// A room the child chose to explore instead of reading its chapter. Held per
// room id and cleared on every room change, so Read Together stays the default
// door into a room rather than something you opt back into.
let exploreOverride = null;

const pieceById = (id) => PIECES.find((p) => p.id === id);
const wingById = (id) => WINGS.find((w) => w.id === id);
const roomById = (id) => ROOMS.find((r) => r.id === id);
// A room's motif falls back to its wing's. `motifs.js` asks for this rather
// than importing rooms.js, so the tune data stays independent of the room data.
const wingOfRoom = (id) => roomById(id)?.wingId || null;

const SOUND_KEY = 'music-book.sound';
const sound = {
  on: true,
  load() {
    try {
      this.on = localStorage.getItem(SOUND_KEY) !== 'off';
    } catch (err) { /* private mode: sound stays on */ }
  },
  save() {
    try {
      localStorage.setItem(SOUND_KEY, this.on ? 'on' : 'off');
    } catch (err) { /* private mode: the choice just does not persist */ }
  }
};

function nudgeSound() {
  soundBtn.classList.remove('is-nudged');
  void soundBtn.offsetWidth;
  soundBtn.classList.add('is-nudged');
}

function syncSoundButton() {
  soundBtn.textContent = sound.on ? 'Sound' : 'Muted';
  soundBtn.setAttribute('aria-pressed', String(sound.on));
  soundBtn.setAttribute('aria-label', sound.on ? 'Sound on' : 'Sound off');
  // Tell the engine now, not only once it has a context. applyAtmosphere() does
  // nothing before the first audio gesture, and the Toy Piano room starts the
  // engine itself — so a child who chose Muted on the landing (or came back to a
  // stored "off") heard every song and key at full volume under a Muted chip.
  // setMuted only records the flag until start() builds the master gain from it.
  engine.setMuted(!sound.on);
}

// AUDIO-DIRECTION.md decision 12: the page chooses the tune, the companion
// chooses the timbre. Everything from here to `unlockAudio` is that rule.

// Which pages get environmental sound. **Empty, on purpose, and it is not an
// oversight.** This book's background is musical rather than environmental, so
// `ambientBed` stays present, wired and silent here. The map is the only thing
// a book that DOES want ambience has to fill in — see `ambience.js`, which
// knows about layers and nothing about pages.
const AMBIENT_SCENES = {};

// Restarting the same tune on every render would retrigger it on every tap. The
// key names the page AND the companion, because changing either changes what
// should be sounding.
function setTune(key, motif, by, onPhrase) {
  if (bedTune === key && musicBed.playing) return;
  bedTune = key;
  musicBed.play(motif, by, onPhrase);
}

function stopTune() {
  musicBed.stop();
  bedTune = null;
}

// The landing page's tune is the one exception to "one companion plays it":
// its phrases pass between all six so the child hears each voice before
// choosing. This lights the card whose turn it is.
function paradeGlow(index) {
  stage.querySelectorAll('[data-companion]').forEach((card, i) => {
    card.classList.toggle('is-voicing', i === index);
  });
}

function applyAtmosphere() {
  if (!engine.ctx) return;
  engine.setMuted(!sound.on);

  const scene = AMBIENT_SCENES[journey.roomId];
  ambience.start(journey.roomId, sound.on && !document.hidden ? scene : null);

  // A piece the child started is the foreground and the lesson. The page tune
  // steps out of the way entirely rather than ducking: two tunes at once is a
  // teaching problem, not a mix problem. It comes back when the piece ends.
  if (!sound.on || document.hidden || player.playing) {
    stopTune();
    return;
  }

  if (currentView === 'landing') {
    setTune('landing', PARADE, COMPANIONS, paradeGlow);
    stage.querySelector('.listen-cue')?.remove();
    return;
  }

  // The Toy Piano room is its own instrument: the keys under the child's hand
  // are the sound in there, and the parade that followed them from the landing
  // must not play under the piano — two tunes at once is the teaching problem
  // the rule above exists to prevent. Stop the page tune and start nothing.
  // `visibilitychange` lands here too, so a hidden tab cannot restart the
  // parade inside the room on the way back.
  if (currentView === 'playroom') {
    stopTune();
    return;
  }

  const companion = companionById(journey.companionId);
  const where = { wingId: journey.wingId, roomId: journey.roomId };
  const page = currentView === 'room' ? journey.roomId
    : currentView === 'wing' ? journey.wingId
      : 'world';
  setTune(`${currentView}:${page}:${companion.id}`,
    motifFor(currentView, where, wingOfRoom), companion);
}

function unlockAudio() {
  engine.start();
  if (journey.companionId) engine.setInstrument(companionById(journey.companionId));
  applyAtmosphere();
}

function stopPiece() {
  player.stop();
  engine.duck('piece', false);
  setPlayingUI(null, null);
  applyAtmosphere();          // the page's tune comes back
}

// Owner, 2026-09-14: the map is the menu. Each wing is a tappable region of the
// painting itself — no circular thumbnails over the art. `region` is the
// elliptical hotspot as a percentage of the complete 4:3 plate (x/y its centre,
// rx/ry its half-size); `label` is the plate point the name pill is centred on.
// This table is the single placement source — the controller tunes these numbers
// against screenshots and everything on the world screen derives from them.
// `background`, `focus` and `accent` stay: the wing and room screens still wash
// with them. The wing's content comes entirely from data/rooms.js.
const WING_STYLE = {
  'songs-we-already-carry': { background: 'assets/backgrounds/garden-pastel.webp', focus: '50% 46%', accent: '#3f6b4f', region: { x: 21, y: 30, rx: 13, ry: 14 }, label: { x: 17, y: 43 } },
  'the-world-sings': { background: 'assets/backgrounds/garden-green.webp', focus: '50% 50%', accent: '#2f6b63', region: { x: 51, y: 18, rx: 11, ry: 14 }, label: { x: 51, y: 5 } },
  'music-for-shared-days': { background: 'assets/backgrounds/music-room.webp', focus: '50% 40%', accent: '#8a5a12', region: { x: 81, y: 31, rx: 13, ry: 13 }, label: { x: 79, y: 45 } },
  'the-time-corridor': { background: 'assets/backgrounds/beethoven-hall.webp', focus: '50% 42%', accent: '#22385a', region: { x: 19, y: 58, rx: 12, ry: 12 }, label: { x: 18, y: 73 } },
  'the-romantic-century': { background: 'assets/backgrounds/night-piano.webp', focus: '50% 45%', accent: '#2b2f6b', region: { x: 48, y: 76, rx: 16, ry: 17 }, label: { x: 48, y: 95 } },
  'cities-colour-new-pulse': { background: 'assets/backgrounds/garden-green.webp', focus: '18% 62%', accent: '#6b3f5f', region: { x: 81, y: 63, rx: 14, ry: 13 }, label: { x: 80, y: 82 } }
};
const wingStyle = (id) => WING_STYLE[id] ?? { background: 'assets/backgrounds/garden-green.webp', focus: 'center', accent: '#22385a', region: { x: 50, y: 50, rx: 13, ry: 13 }, label: { x: 50, y: 76 } };

// Owner, 2026-09-13: "use bg." — the painted room plates go on their rooms'
// screens (1448×1086, the stage's own 4:3, so `cover` shows the whole picture).
// Room 14 is wired like the rest: its plate is being redrawn in the book's
// style under the same file name and drops in without a code change. Rooms 13,
// 16 and 17 gained their plates on 2026-09-13; Rooms 15 and 18 followed on
// 2026-09-19, followed by Rooms 21–24 later that day. Room 1 keeps its separate
// Read Together plate treatment rather than using this map.
const ROOM_BACKGROUND = {
  'playground-of-patterns': { background: 'assets/backgrounds/r02-playground-of-patterns-background.webp', focus: '50% 45%' },
  'steps-beats-marches': { background: 'assets/backgrounds/r03-steps-beats-marches-background.webp', focus: '50% 45%' },
  'home-distance-belonging': { background: 'assets/backgrounds/r04-home-distance-belonging-background.webp', focus: '50% 45%' },
  'gardens-season-memory': { background: 'assets/backgrounds/r05-gardens-season-memory-background.webp', focus: '50% 45%' },
  'southeast-asian-courtyard': { background: 'assets/backgrounds/r06-southeast-asian-courtyard-background.webp', focus: '50% 45%' },
  'roads-prayer-city-sea': { background: 'assets/backgrounds/r07-roads-prayer-city-sea-background.webp', focus: '50% 45%' },
  'songs-that-transform': { background: 'assets/backgrounds/r08-songs-that-transform-background.webp', focus: '50% 45%' },
  'when-song-means-home': { background: 'assets/backgrounds/r09-when-a-song-means-home-background.webp', focus: '50% 45%' },
  'celebration-square': { background: 'assets/backgrounds/r10-celebration-square-background.webp', focus: '50% 45%' },
  'winter-lanterns': { background: 'assets/backgrounds/r11-winter-lanterns-background.webp', focus: '50% 45%' },
  'baroque-pattern-workshop': { background: 'assets/backgrounds/r12-baroque-pattern-workshop-background.webp', focus: '50% 45%' },
  'baroque-stage-seasons-water-fireworks': { background: 'assets/backgrounds/r13-baroque-stage-seasons-water-fireworks-background.webp', focus: '50% 45%' },
  'vienna-classical-city': { background: 'assets/backgrounds/r14-vienna-classical-city-background.webp', focus: '50% 45%' },
  'beethoven-door-two-eras': { background: 'assets/backgrounds/r15-beethoven-door-two-eras-background.webp', focus: '50% 45%' },
  'music-learns-to-sing': { background: 'assets/backgrounds/r16-music-learns-to-sing-background.webp', focus: '50% 45%' },
  'piano-diary': { background: 'assets/backgrounds/r17-piano-diary-background.webp', focus: '50% 45%' },
  'home-memory-dance': { background: 'assets/backgrounds/r18-home-memory-dance-background.webp', focus: '50% 45%' },
  'ballet-kingdom': { background: 'assets/backgrounds/r19-ballet-kingdom-background.webp', focus: '50% 45%' },
  'when-music-storybook': { background: 'assets/backgrounds/r20-when-music-storybook-background.webp', focus: '50% 45%' },
  'pictures-legends-russian-colour': { background: 'assets/backgrounds/r21-pictures-legends-russian-colour-background.webp', focus: '50% 45%' },
  'three-theatre-cities': { background: 'assets/backgrounds/r22-three-theatre-cities-background.webp', focus: '50% 45%' },
  'painting-with-sound': { background: 'assets/backgrounds/r23-painting-with-sound-background.webp', focus: '50% 45%' },
  'new-century-many-sounds': { background: 'assets/backgrounds/r24-new-century-many-sounds-background.webp', focus: '50% 45%' }
};

// Owner, 2026-09-13: "let's also make arts for these cards." — the room-selection
// cards on the wing screen, which until now were a flat slate gradient with text
// on it. A card is NOT the room's background shrunk: measured in Chrome, a card
// is 303×195 CSS px at 768×1024 and 404×261 at 1024×768, so ~1.55:1 — a wide,
// short thumbnail, against the room plate's 4:3. The art is painted for that
// shape, with the incident in the left and right thirds and a calm middle,
// because the number/title/subtitle/count sit over the centre in cream.
// Keyed by room id and kept out of data/rooms.js on purpose: that file is
// generated from the private curation sources and tools/check-rooms.mjs rebuilds
// it, so an art path added there would be lost on the next regenerate. Same
// keying and shape as ROOM_BACKGROUND above. Wing 1 only for now — the other
// twenty rooms fall back to the plain card until their art is made.
const ROOM_CARD = {
  'melody-detective-workshop': { card: 'assets/room-cards/r01-melody-detective-workshop-card.webp', focus: '50% 50%' },
  'playground-of-patterns': { card: 'assets/room-cards/r02-playground-of-patterns-card.webp', focus: '50% 50%' },
  'steps-beats-marches': { card: 'assets/room-cards/r03-steps-beats-marches-card.webp', focus: '50% 50%' },
  'home-distance-belonging': { card: 'assets/room-cards/r04-home-distance-belonging-card.webp', focus: '50% 50%' },
  // The remaining twenty, painted 2026-09-15. Each card leaves a calm centre because
  // the app prints the room number, title, subtitle and piece count OVER the art --
  // a busy middle makes the title unreadable, which is invisible in the file and
  // obvious on the wing screen.
  'gardens-season-memory': { card: 'assets/room-cards/r05-gardens-season-memory-card.webp', focus: '50% 50%' },
  'southeast-asian-courtyard': { card: 'assets/room-cards/r06-southeast-asian-courtyard-card.webp', focus: '50% 50%' },
  'roads-prayer-city-sea': { card: 'assets/room-cards/r07-roads-prayer-city-sea-card.webp', focus: '50% 50%' },
  'songs-that-transform': { card: 'assets/room-cards/r08-songs-that-transform-card.webp', focus: '50% 50%' },
  'when-song-means-home': { card: 'assets/room-cards/r09-when-song-means-home-card.webp', focus: '50% 50%' },
  'celebration-square': { card: 'assets/room-cards/r10-celebration-square-card.webp', focus: '50% 50%' },
  'winter-lanterns': { card: 'assets/room-cards/r11-winter-lanterns-card.webp', focus: '50% 50%' },
  'baroque-pattern-workshop': { card: 'assets/room-cards/r12-baroque-pattern-workshop-card.webp', focus: '50% 50%' },
  'baroque-stage-seasons-water-fireworks': { card: 'assets/room-cards/r13-baroque-stage-seasons-water-fireworks-card.webp', focus: '50% 50%' },
  'vienna-classical-city': { card: 'assets/room-cards/r14-vienna-classical-city-card.webp', focus: '50% 50%' },
  'beethoven-door-two-eras': { card: 'assets/room-cards/r15-beethoven-door-two-eras-card.webp', focus: '50% 50%' },
  'music-learns-to-sing': { card: 'assets/room-cards/r16-music-learns-to-sing-card.webp', focus: '50% 50%' },
  'piano-diary': { card: 'assets/room-cards/r17-piano-diary-card.webp', focus: '50% 50%' },
  'home-memory-dance': { card: 'assets/room-cards/r18-home-memory-dance-card.webp', focus: '50% 50%' },
  'ballet-kingdom': { card: 'assets/room-cards/r19-ballet-kingdom-card.webp', focus: '50% 50%' },
  'when-music-storybook': { card: 'assets/room-cards/r20-when-music-storybook-card.webp', focus: '50% 50%' },
  'pictures-legends-russian-colour': { card: 'assets/room-cards/r21-pictures-legends-russian-colour-card.webp', focus: '50% 50%' },
  'three-theatre-cities': { card: 'assets/room-cards/r22-three-theatre-cities-card.webp', focus: '50% 50%' },
  'painting-with-sound': { card: 'assets/room-cards/r23-painting-with-sound-card.webp', focus: '50% 50%' },
  'new-century-many-sounds': { card: 'assets/room-cards/r24-new-century-many-sounds-card.webp', focus: '50% 50%' }
};

// A relative url() carried inside a custom property is resolved against the
// STYLESHEET that substitutes it, not against the element or the document — so
// `--card-art:url(assets/...)` read by app/styles.css asks the server for
// app/assets/… and 404s. Caught by reading the network log, not the DOM: the
// DOM looked right and the card quietly showed the stage behind it. Resolving to
// an absolute href here removes the question, and stays correct both at
// /music-book/ locally and wherever the app is published.
const cardArtUrl = (path) => new URL(path, document.baseURI).href;

// ── companion presence ───────────────────────────────────────────────────────

function companionCorner(line) {
  const c = companionById(journey.companionId);
  return `
    <div class="companion-corner">
      ${line ? `<p class="companion-bubble">${line}</p>` : ''}
      <img class="companion-figure" src="${c.art}" alt="${c.name}">
    </div>`;
}

// ── page 1: choose a companion ───────────────────────────────────────────────

// The Toy Piano bubble's face: the toy's own octave in miniature, the eight
// colored keys plus the five black ones, drawn from the room's exported key
// lists so the face can never advertise a key the toy does not have.
function toyKeysFaceMarkup() {
  const white = PITCHES.map((pitch) =>
    `<span class="toy-face__key" style="background:${NOTE_COLORS[pitch]}"></span>`).join('');
  // Each black key straddles the boundary after its white key — eighths of the
  // face's width, the same arithmetic the room's own keyboard uses.
  const black = BLACK_KEYS.map(({ n, after }) =>
    `<span class="toy-face__key toy-face__key--black" style="left:${(after + 1) * 12.5}%;background:${BLACK_COLORS[n]}"></span>`).join('');
  return `<span class="toy-face" aria-hidden="true">${white}${black}</span>`;
}

function renderLanding() {
  currentView = 'landing';
  document.body.dataset.view = currentView;
  stopPiece();                  // sets currentView first so the tune it restores is this page's
  stage.className = 'stage stage--landing';
  stage.style.backgroundImage = 'url(assets/backgrounds/garden-pastel.webp)';
  stage.innerHTML = `
    <div class="scrim">
      <!-- Owner, 2026-08-26: "add back button to test hub for the test apps too."
           Only the landing carries it, because only the landing is the top of this app --
           the world screen already has a house button back to here, and a child who taps
           back twice should leave the book, not fall out of it from the middle. Absolute
           URL on purpose: published, /music-book/ and /test-apps/ are siblings, but in the
           repo the hub lives under site/, so a relative link would work live and 404 in
           every local preview. -->
      <a class="round-btn hub-btn" href="https://veeranuchlee.github.io/test-apps/" aria-label="Back to Test Apps">&larr;</a>
      <!-- The Toy Piano room's only door. The owner pinned it to the landing's
           top-right on 2026-08-27 and removed the Music World's door the same
           evening: a pre-reader meets the toy on its own, before the journey,
           not as a room inside it. -->
      <button class="toy-bubble" data-go="playroom" aria-label="Toy Piano">${toyKeysFaceMarkup()}</button>
      <header class="hero">
        <p class="hero__eyebrow">Welcome, young musician</p>
        <h1 class="hero__title"><span class="hero__line">Choose Your</span> <span class="hero__line">Music Companion</span></h1>
        <p class="hero__sub">Your friend plays every piece on your journey.</p>
        ${musicBed.playing ? '' : '<button class="listen-cue" data-listen>Hear them play</button>'}
      </header>
      <div class="companion-grid">
        ${COMPANIONS.map((c) => `
          <button class="companion-card" data-companion="${c.id}">
            <img class="companion-card__art" src="${c.art}" alt="">
            <span class="companion-card__name">${c.name}</span>
            <span class="companion-card__tag">${c.tagline}</span>
          </button>`).join('')}
      </div>
    </div>`;
  applyAtmosphere();
}

// ── page 2: the music world (six wings) ──────────────────────────────────────

function renderWorld() {
  currentView = 'world';
  document.body.dataset.view = currentView;
  stopPiece();                  // sets currentView first so the tune it restores is this page's
  const c = companionById(journey.companionId);
  stage.className = 'stage stage--world';
  stage.style.backgroundImage = '';
  stage.innerHTML = `
    <div class="world-shell">
      <div class="world-map" role="img" aria-label="A painted island map of Music World">
        <div class="wing-map" aria-label="Choose a wing">
          ${WINGS.map((wing) => {
            const style = wingStyle(wing.id);
            const rooms = wing.roomIds.length;
            const roomsWord = `${rooms} room${rooms === 1 ? '' : 's'}`;
            // The label point arrives as a plate percentage, but the pill lives
            // inside the hotspot's own box — convert it into that box's
            // coordinates so both come from the one placement table.
            const left = style.region.x - style.region.rx;
            const top = style.region.y - style.region.ry;
            const lx = (((style.label.x - left) / (style.region.rx * 2)) * 100).toFixed(2);
            const ly = (((style.label.y - top) / (style.region.ry * 2)) * 100).toFixed(2);
            return `
            <button class="wing-spot" data-wing="${wing.id}" aria-label="${wing.title}, ${roomsWord}"
              style="--x:${style.region.x}%;--y:${style.region.y}%;--w:${style.region.rx * 2}%;--h:${style.region.ry * 2}%;--lx:${lx}%;--ly:${ly}%;--accent:${style.accent}">
              <span class="wing-spot__ring" aria-hidden="true"></span>
              <span class="wing-spot__tag">
                <span class="wing-spot__name">${wing.title}</span>
                <span class="wing-spot__count">${roomsWord}</span>
              </span>
            </button>`;
          }).join('')}
        </div>
      </div>
      <div class="world-topbar">
        <button class="world-home" data-go="landing" aria-label="Home — choose another companion"><span aria-hidden="true">⌂</span> Home</button>
        <div class="world-title"><h1>Music World</h1><p>Six wings, twenty-four rooms.</p></div>
        <div class="guide-badge guide-badge--world"><img src="${c.art}" alt=""><span>${c.name}<small>companion</small></span></div>
      </div>
      <p class="world-greeting">${c.greeting}</p>
      <p class="world-motto">A Kinder Brighter World Through Music</p>
      <div class="world-compass" aria-hidden="true"><span class="world-compass__north">N</span><span class="world-compass__star">✦</span></div>
    </div>`;
  applyAtmosphere();
}

// ── page 3: a wing (its rooms) ───────────────────────────────────────────────

function renderWing() {
  currentView = 'wing';
  document.body.dataset.view = currentView;
  stopPiece();                  // sets currentView first so the tune it restores is this page's
  const wing = wingById(journey.wingId);
  if (!wing) { renderWorld(); return; }
  const c = companionById(journey.companionId);
  const style = wingStyle(wing.id);
  stage.className = 'stage stage--wing';
  stage.style.backgroundImage = `url(${style.background})`;
  stage.innerHTML = `
    <div class="scrim">
      <div class="topbar">
        <button class="round-btn" data-go="world" aria-label="Back to Music World">←</button>
        <div class="banner banner--wing"><h1>${wing.title}</h1><p>${wing.tagline}</p></div>
        <div class="guide-badge"><img src="${c.art}" alt=""><span>${c.name}</span></div>
      </div>
      <div class="room-grid">
        ${wing.roomIds.map((roomId) => {
          const room = roomById(roomId);
          const card = ROOM_CARD[room.id];
          return `
          <button class="room-card${card ? ' room-card--art' : ''}" data-room="${room.id}" style="--accent:${style.accent}${card ? `;--card-art:url(&quot;${cardArtUrl(card.card)}&quot;);--card-focus:${card.focus}` : ''}">
            <span class="room-card__number">Room ${room.number}</span>
            <span class="room-card__title">${room.title}</span>
            <span class="room-card__subtitle">${room.subtitle}</span>
            <span class="room-card__count">${room.pieceIds.length} piece${room.pieceIds.length === 1 ? '' : 's'}</span>
          </button>`;
        }).join('')}
      </div>
      ${companionCorner(null)}
    </div>`;
  applyAtmosphere();
}

// ── page 4: a room (its pieces) ──────────────────────────────────────────────

function renderRoom() {
  currentView = 'room';
  document.body.dataset.view = currentView;
  stopPiece();                  // sets currentView first so the tune it restores is this page's
  const room = roomById(journey.roomId);
  if (!room) { renderWorld(); return; }

  // Read Together is the default and Explore is the return mode. A room with an
  // authored chapter the child has not finished opens into the chapter.
  if (chapter.isFor(room.id) && exploreOverride !== room.id) {
    applyAtmosphere();
    chapter.open(room.id);
    return;
  }
  chapter.close();
  const wing = wingById(room.wingId);
  const c = companionById(journey.companionId);
  const style = wingStyle(room.wingId);
  // Owner, 2026-09-13: "use bg." A room with its own painting wears it; the
  // accent colour stays the wing's either way — a painting is a picture, not
  // a palette.
  const art = ROOM_BACKGROUND[room.id];
  const pieces = room.pieceIds.map(pieceById).filter(Boolean);

  // The pager page never outlives the room it belongs to: clamped here on
  // every render, and reset to 0 by the room-change handlers below.
  const pages = Math.max(1, Math.ceil(pieces.length / PAGE_SIZE));
  journey.page = Math.min(Math.max(0, journey.page), pages - 1);
  const shown = pieces.slice(journey.page * PAGE_SIZE, journey.page * PAGE_SIZE + PAGE_SIZE);

  stage.className = 'stage stage--room';
  // With a painting the focus is its own; without one the position goes back
  // to the stylesheet, whose `center` is exactly what the wing wash has always
  // shown. (`cover` on 4:3 art in a 4:3 stage leaves no slack either way.)
  stage.style.backgroundImage = `url(${art ? art.background : style.background})`;
  stage.style.backgroundPosition = art ? art.focus : '';
  stage.innerHTML = `
    <div class="scrim">
      <div class="topbar">
        <button class="round-btn" data-go="wing" aria-label="Back to ${wing.title}">←</button>
        <div class="banner banner--room"><h1>${room.title}</h1><p>${room.subtitle}</p></div>
        <div class="guide-badge"><img src="${c.art}" alt=""><span>${c.name}</span></div>
      </div>

      <div class="room-body">
        <div class="bubble-field">
          ${shown.map((p) => bubbleMarkup(p)).join('')}
        </div>
        <aside class="info-rail">
          ${room.composers.slice(0, 2).map((composerId) => {
            const composer = composerById(composerId);
            return `
            <button class="info-square" data-composer="${composer.id}" aria-label="About ${composer.name}">
              ${composer.portrait ? `<img class="info-square__face" src="${composer.portrait}" alt="">` : `<span class="info-square__face info-square__face--monogram">${composer.shortName[0]}</span>`}
              <span class="info-square__label"><span class="info-square__line">About</span> <span class="info-square__line">${composer.shortName}</span></span>
            </button>`;
          }).join('')}
          <button class="info-diamond" data-knowledge="${room.id}" aria-label="About this room">
            <span class="info-diamond__inner"><span>💡</span></span>
            <span class="info-diamond__label">Learn More</span>
          </button>
        </aside>
      </div>

      ${roomLinksMarkup(room)}

      ${pages > 1 ? `
        <div class="pager">
          ${Array.from({ length: pages }, (_, i) =>
            `<button class="pager__dot${i === journey.page ? ' is-current' : ''}" data-page="${i}" aria-label="Page ${i + 1}"></button>`
          ).join('')}
        </div>` : ''}

      ${companionCorner(greetedRooms.has(room.id) ? null : c.greeting)}
    </div>`;

  greetedRooms.add(room.id);

  if (pendingPopupPieceId) {
    const target = pendingPopupPieceId;
    pendingPopupPieceId = null;
    piecePopup(target);
  }
  applyAtmosphere();
}

function bubbleMarkup(p) {
  const big = p.importanceLevel === 3;
  const art = p.art
    ? `<img class="bubble__art" src="${p.art}" alt="">`
    : `<span class="bubble__art bubble__art--none">♪</span>`;
  // The second score is the melody plus a root-fifth bass, played on whichever
  // companion the child chose at the landing page -- the instrument never changes
  // mid-journey (2026-08-21: "the companion IS the instrument"). So this control
  // must name the arrangement, never an instrument: labelling it "Piano" promised
  // a piano to a child on a Flute journey, and "Piano" is also a companion name.
  const modes = p.piano
    ? `<div class="bubble__modes">
         <button class="bubble__mode" data-play="${p.id}" data-which="melody">Melody</button>
         <button class="bubble__mode" data-play="${p.id}" data-which="piano">Melody + bass</button>
       </div>`
    : '';
  return `
    <div class="bubble${big ? ' bubble--large' : ''}" data-piece-wrap="${p.id}">
      <button class="bubble__disc" data-play="${p.id}" aria-label="Play ${p.title}">
        ${art}
        <span class="bubble__pulse"></span>
      </button>
      <button class="bubble__name" data-say="${p.id}">${p.shortTitle || p.title}</button>
      ${modes}
    </div>`;
}

// The connections strip: where this room leads. Cross-room links navigate;
// the single within-room link (toRoomId null, scope 'within-room') stays on
// the page as a hint rather than pretending to go somewhere.
function roomLinksMarkup(room) {
  if (!room.connections.length) return '';
  return `
    <div class="room-links" aria-label="Where this room leads">
      ${room.connections.map((conn) => {
        const target = conn.toRoomId ? roomById(conn.toRoomId) : null;
        if (target) {
          return `
          <button class="room-link" data-connection="${conn.toRoomId}">
            <span class="room-link__label">${conn.label}</span>
            <span class="room-link__target">➜ ${target.title}</span>
          </button>`;
        }
        return `
          <div class="room-link room-link--hint">
            <span class="room-link__label">${conn.label}</span>
            <span class="room-link__target">in this room</span>
          </div>`;
      }).join('')}
    </div>`;
}

// ── information pop-ups ──────────────────────────────────────────────────────

function openPopup(html) {
  popupBody.innerHTML = html;
  popup.hidden = false;
}

function composerPopup(id) {
  const c = composerById(id);
  openPopup(`
    <h2><button class="popup__say" data-say="composer-${c.id}">${c.name}<span class="popup__say-cue" aria-hidden="true">🔊</span></button></h2>
    <p class="popup__meta">${[c.country, (c.birthYear && c.deathYear) ? `${c.birthYear}–${c.deathYear}` : null, c.period].filter(Boolean).join(' · ')}</p>
    <p>${c.summary}</p>
    <p><strong>Known for.</strong> ${c.knownFor}</p>`);
}

function knowledgePopup(room) {
  const origins = originLine(room);
  openPopup(`
    <h2>${room.title}</h2>
    <p class="popup__meta">${room.openingQuestion}</p>
    <p>${room.thesis}</p>
    ${origins ? `<p><strong>Music from.</strong> ${origins}</p>` : ''}
    <div class="popup__vocab">${room.keyVocabulary.map((v) => `<span class="vocab-chip">${v}</span>`).join('')}</div>`);
}

// Who made a room's music, for the knowledge popup: the composers not already
// shown as tappable squares, plus every tradition label. Both come from
// data/rooms.js — never a hardcoded string, because a tradition label is
// catalogue content, not UI chrome.
function originLine(room) {
  const shown = new Set(room.composers.slice(0, 2));
  const names = room.composers.filter((id) => !shown.has(id)).map((id) => composerById(id)?.shortName);
  return [...names.filter(Boolean), ...room.traditions].join(' · ');
}

function piecePopup(id) {
  const p = pieceById(id);
  const room = roomById(journey.roomId);
  const compare = room?.compareWith?.[id] ?? [];
  openPopup(`
    <h2><button class="popup__say" data-say="${p.id}">${p.title}<span class="popup__say-cue" aria-hidden="true">🔊</span></button></h2>
    ${/* 'traditional' is a catalogue pseudo-composer, not a name a child should
         read under a title — traditional pieces show no byline (their room's
         knowledge popup carries the tradition labels from data). */
      (p.composerId && p.composerId !== 'traditional')
      ? `<p class="popup__meta">${composerById(p.composerId)?.name || ''}${p.year ? ` · ${p.year}` : ''}</p>`
      : (p.year ? `<p class="popup__meta">${p.year}</p>` : '')}
    <p><strong>Listen for.</strong> ${p.info.listenFor}</p>
    ${p.info.whyItMatters ? `<p>${p.info.whyItMatters}</p>` : ''}
    ${compare.length ? `
      <div class="popup__compare">
        <strong>Compare with</strong>
        ${compare.map((targetId) => {
          const t = pieceById(targetId);
          return `<button class="popup__compare-link" data-compare="${targetId}">${t.shortTitle || t.title}</button>`;
        }).join('')}
      </div>` : ''}`);
}

// compareWith navigation, stated once and used one way:
//   — the target lives in a room the child is already in: just open its popup;
//   — otherwise: go to the target's canonical home room, then open its popup.
// The home room comes from PIECE_ROOMS, never from a piece→roomId assumption,
// because a reserve piece can legitimately live in more than one room.
function openCompare(targetId) {
  const current = roomById(journey.roomId);
  const targetRooms = PIECE_ROOMS[targetId]?.roomIds ?? [];
  if (targetRooms.includes(current?.id)) {
    piecePopup(targetId);
    return;
  }
  const homeRoomId = PIECE_ROOMS[targetId]?.homeRoomId;
  const homeRoom = roomById(homeRoomId);
  if (!homeRoom) return;
  journey.wingId = homeRoom.wingId;
  journey.roomId = homeRoom.id;
  journey.page = 0;
  pendingPopupPieceId = targetId;
  popup.hidden = true;
  renderRoom();
}

// ── playing ──────────────────────────────────────────────────────────────────

function preferredScore(p) {
  return p.full || p.excerpt;
}

function scoreFor(p, which) {
  if (which === 'piano') return p.piano;
  if (which === 'excerpt') return p.excerpt;
  if (which === 'full' || which === 'melody') return p.full || p.excerpt;
  return preferredScore(p);
}

function playPiece(id, which) {
  if (!sound.on) { nudgeSound(); return; }
  const p = pieceById(id);
  const resolved = which || (p.full ? 'melody' : 'excerpt');
  const score = scoreFor(p, resolved);
  if (!score) return;
  // The chapter installs its own note/finish handlers while it is on screen.
  // Explore takes them back here rather than at module load, so returning from
  // a chapter cannot leave Explore driving a contour that is no longer drawn.
  player.onNote = () => {};

  if (playingPieceId === id && playingWhich === resolved && player.playing) {
    stopPiece();
    return;
  }
  player.onFinish = pieceFinished;
  engine.duck('piece', true);
  engine.setInstrument(companionById(journey.companionId));
  player.load(score);
  player.play();
  setPlayingUI(id, resolved);
  applyAtmosphere();          // the page's tune steps aside for the piece
}

function pieceFinished() {
  engine.duck('piece', false);
  setPlayingUI(null, null);
  applyAtmosphere();
}

function setPlayingUI(id, which) {
  playingPieceId = id;
  playingWhich = which;
  stage.querySelectorAll('[data-piece-wrap]').forEach((node) => {
    node.classList.toggle('is-playing', node.dataset.pieceWrap === id);
  });
  stage.querySelectorAll('.bubble__mode').forEach((btn) => {
    const on = btn.dataset.play === id && btn.dataset.which === which;
    btn.classList.toggle('is-current', on);
  });
}

player.onFinish = pieceFinished;

const chapter = createChapter({
  stage,
  engine,
  player,
  journey,
  pieceById,
  companionById,
  canPlaySound: () => {
    if (sound.on) return true;
    nudgeSound();
    return false;
  },
  // The chapter starts and stops pieces of its own, and the page's tune has to
  // get out of the way for those too.
  atmosphere: applyAtmosphere,
  exitToExplore: () => { exploreOverride = journey.roomId; renderRoom(); },
  exitToWing: () => { chapter.close(); go('wing'); }
});

// ── routing ──────────────────────────────────────────────────────────────────

function go(view) {
  // Leaving the Toy Piano room: it has already stopped its own sound and handed
  // the player's callbacks back blank, so restore main's defaults before the
  // next page renders — pieceFinished is what clears a playing bubble and
  // brings the page tune back. Nothing to do for any navigation that is not
  // out of the room.
  if (currentView === 'playroom') {
    leavePlayroom();
    player.onNote = () => {};
    player.onFinish = pieceFinished;
  }
  if (view === 'landing') { journey.restart(); renderLanding(); }
  else if (view === 'world') {
    // The room's back arrow targets the world, but the room is only reachable
    // from the landing, where no companion is chosen (arriving here restarts
    // the journey). Without the guard the world would render with
    // companionById's silent INSTRUMENTS[0] fallback wearing the guide badge —
    // not a crash on main, just quietly the wrong page. Land on the landing.
    if (!journey.companionId) renderLanding();
    else { journey.wingId = null; journey.roomId = null; renderWorld(); }
  }
  else if (view === 'wing') { journey.roomId = null; renderWing(); }
  else if (view === 'room') renderRoom();
  else if (view === 'playroom') {
    currentView = 'playroom';
    document.body.dataset.view = currentView;
    // Sets currentView first, so the atmosphere stopPiece() restores is the
    // room's own: page tune stopped, nothing started.
    stopPiece();
    renderPlayroom({ stage, engine, player, journeyCompanionId: journey.companionId });
  }
}

// Tapping any name -- a bubble's plate, or a heading inside a popup -- speaks it.
// Shared rather than duplicated: the highlight window and the speak call have to
// stay in step, and two copies of a 700ms timeout is how they stop being.
function handleSay(target) {
  const say = target.closest('[data-say]');
  if (!say) return false;
  if (!sound.on) { nudgeSound(); return true; }
  say.classList.add('is-speaking');
  setTimeout(() => say.classList.remove('is-speaking'), 700);
  speakTitle(say.dataset.say);
  return true;
}

// Offline, a room that has never been visited has no pictures (owner decision
// D3, 2026-09-22: the shell is precached, art caches room by room on first
// visit — see service-worker.js). The room still opens and every piece still
// plays; what must not happen is a disc of broken-image glyphs. A song picture
// that fails becomes the same ♪ disc a piece with no art already shows, and any
// other picture that fails steps out of the way. `error` does not bubble, hence
// the capture listener on the stage, which outlives every re-render.
stage.addEventListener('error', (event) => {
  const img = event.target;
  if (!img || img.tagName !== 'IMG') return;
  if (img.classList.contains('bubble__art')) {
    const note = document.createElement('span');
    note.className = 'bubble__art bubble__art--none';
    note.textContent = '♪';
    img.replaceWith(note);
  } else {
    img.style.visibility = 'hidden';
  }
}, true);

stage.addEventListener('click', (event) => {
  const t = event.target;

  if (chapter.active() && chapter.click(t)) return;

  const listen = t.closest('[data-listen]');
  if (listen) { unlockAudio(); return; }

  const companion = t.closest('[data-companion]');
  if (companion) {
    journey.start(companion.dataset.companion);
    unlockAudio();                        // first gesture: unlock audio
    engine.setInstrument(companionById(journey.companionId));
    renderWorld();
    return;
  }

  const wing = t.closest('[data-wing]');
  if (wing) { journey.wingId = wing.dataset.wing; journey.roomId = null; journey.page = 0; renderWing(); return; }

  const room = t.closest('[data-room]');
  if (room) { journey.wingId = roomById(room.dataset.room).wingId; journey.roomId = room.dataset.room; journey.page = 0; exploreOverride = null; renderRoom(); return; }

  const nav = t.closest('[data-go]');
  if (nav) { go(nav.dataset.go); return; }

  const play = t.closest('[data-play]');
  if (play) { playPiece(play.dataset.play, play.dataset.which); return; }

  if (handleSay(t)) return;

  const comp = t.closest('[data-composer]');
  if (comp) { composerPopup(comp.dataset.composer); return; }

  const know = t.closest('[data-knowledge]');
  if (know) { knowledgePopup(roomById(know.dataset.knowledge)); return; }

  const connection = t.closest('[data-connection]');
  if (connection) {
    const target = roomById(connection.dataset.connection);
    if (target) {
      journey.wingId = target.wingId;
      journey.roomId = target.id;
      journey.page = 0;
      exploreOverride = null;
      renderRoom();
    }
    return;
  }

  const compare = t.closest('[data-compare]');
  if (compare) { openCompare(compare.dataset.compare); return; }

  const page = t.closest('[data-page]');
  if (page) { journey.page = Number(page.dataset.page); renderRoom(); }
});

// Long-press a bubble for the piece's own information.
let pressTimer = null;
stage.addEventListener('pointerdown', (event) => {
  const disc = event.target.closest('.bubble__disc[data-play]');
  if (!disc) return;
  pressTimer = setTimeout(() => { pressTimer = null; piecePopup(disc.dataset.play); }, 620);
});
stage.addEventListener('pointerup', () => { if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; } });
stage.addEventListener('pointercancel', () => { if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; } });

popup.addEventListener('click', (event) => {
  if (handleSay(event.target)) return;
  const compare = event.target.closest('[data-compare]');
  if (compare) { openCompare(compare.dataset.compare); return; }
  if (event.target.closest('[data-close]') || event.target === popup) popup.hidden = true;
});

// Audio is scheduled ahead on the audio clock; a hidden page would come back
// with the picture frozen and the music gone. Stop cleanly instead.
document.addEventListener('visibilitychange', () => {
  if (document.hidden && player.playing) stopPiece();
  applyAtmosphere();
});

journey.restore();
sound.load();
syncSoundButton();
window.musicBook = { engine, player, musicBed, ambience, sound, journey };
soundBtn.addEventListener('click', () => {
  sound.on = !sound.on;
  sound.save();
  syncSoundButton();
  if (sound.on) unlockAudio();
  else {
    stopPiece();
    applyAtmosphere();
  }
});
if (journey.companionId) renderWorld(); else renderLanding();
