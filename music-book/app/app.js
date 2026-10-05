import { AudioEngine } from './audio-engine.js';
import { Player } from './player.js';
import { MusicBed } from './music-bed.js';
import { Ambience } from './ambience.js';
import { COMPANIONS, companionById } from '../data/instruments.js';
import { PIECES, composerById } from '../data/catalogue.js';
import { EXPLANATIONS } from '../data/explanations.js';
import { MUSIC_KNOWLEDGE } from '../data/music-knowledge.js';
import { WINGS, ROOMS, PIECE_ROOMS } from '../data/rooms.js';
import { motifFor, PARADE } from '../data/motifs.js';
import { journey } from './journey.js';
import { speakTitle, stopTitle, configureTitles } from './titles.js';
import { speakExplain, stopExplain, configureExplain, explainClipPath } from './explain-audio.js';
import { configureLearnMore, roomClipId, roomWordCards, speakLearnMore, stopLearnMore } from './learnmore.js';
import { LEARN_MORE_ROOM_SCRIPTS, LEARN_MORE_WORD_MEANINGS } from './learnmore-clips.js';
import { createChapter } from './read-together.js';
import { renderPlayroom, leavePlayroom, PITCHES, NOTE_COLORS, BLACK_KEYS, BLACK_COLORS } from './playroom.js';
import { CATALOGUE_TO_PLAYALONG } from '../data/playalong-songs.js';

const engine = new AudioEngine();
const player = new Player(engine);
const musicBed = new MusicBed(engine);
const ambience = new Ambience(engine);
configureTitles({ engine });
configureExplain({ engine });
configureLearnMore({ engine });

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
// Set when the song index sends the child to a room: that room renders, then
// the song lights up and its name is spoken, so the child sees where it lives.
let pendingFoundPieceId = null;
// One arrangement choice per room for this in-memory journey. It deliberately
// does not go into localStorage: returning to a room remembers the choice,
// while starting the book afresh starts in the simplest, melody-only mode.
const roomModes = new Map();

const PAGE_SIZE = 6;

// A room the child chose to explore instead of reading its chapter. Held per
// room id and cleared on every room change, so Read Together stays the default
// door into a room rather than something you opt back into.
let exploreOverride = null;
// The companion explainer above the word scroll: one bubble at a time.
let stripExplainer = null;
let stripExplainerTimer = null;

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
  // The song index is a page of the Music World: it keeps the world's tune
  // running rather than restarting it on the way in and out.
  const tuneView = currentView === 'index' ? 'world' : currentView;
  const page = tuneView === 'room' ? journey.roomId
    : tuneView === 'wing' ? journey.wingId
      : 'world';
  setTune(`${tuneView}:${page}:${companion.id}`,
    motifFor(tuneView, where, wingOfRoom), companion);
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

// Owner-approved painted maps for the six wings (2026-09-27). Coordinates are
// percentages of the complete 4:3 painting; each landmark box is the ellipse's
// full tap target, not a smaller control placed inside it. A missing map or a
// missing room entry deliberately hands the wing back to the old card grid.
const WING_MAP = {
  'songs-we-already-carry': { background: 'assets/wings/w1-map.webp', landmarks: {
    'melody-detective-workshop': { x: 17, y: 28, w: 25, h: 25 },
    'playground-of-patterns': { x: 61, y: 27, w: 28, h: 23 },
    'steps-beats-marches': { x: 21, y: 70, w: 26, h: 25 },
    'home-distance-belonging': { x: 85, y: 69, w: 23, h: 27 }
  } },
  'the-world-sings': { background: 'assets/wings/w2-map.webp', landmarks: {
    'gardens-season-memory': { x: 16, y: 27, w: 25, h: 27 },
    'southeast-asian-courtyard': { x: 85, y: 28, w: 25, h: 29 },
    'roads-prayer-city-sea': { x: 51, y: 27, w: 23, h: 25 },
    'songs-that-transform': { x: 17, y: 68, w: 28, h: 30 },
    'when-song-means-home': { x: 83, y: 70, w: 23, h: 28 }
  } },
  'music-for-shared-days': { background: 'assets/wings/w3-map.webp', landmarks: {
    'celebration-square': { x: 21, y: 36, w: 33, h: 36 },
    'winter-lanterns': { x: 79, y: 38, w: 30, h: 35 }
  } },
  'the-time-corridor': { background: 'assets/wings/w4-map.webp', landmarks: {
    'baroque-pattern-workshop': { x: 14, y: 34, w: 22, h: 38 },
    'baroque-stage-seasons-water-fireworks': { x: 38, y: 35, w: 23, h: 37 },
    'vienna-classical-city': { x: 62, y: 35, w: 23, h: 38 },
    'beethoven-door-two-eras': { x: 87, y: 34, w: 22, h: 38 }
  } },
  'the-romantic-century': { background: 'assets/wings/w5-map.webp', landmarks: {
    'piano-diary': { x: 15, y: 27, w: 24, h: 24 },
    'music-learns-to-sing': { x: 50, y: 25, w: 27, h: 25 },
    'home-memory-dance': { x: 85, y: 28, w: 23, h: 25 },
    'ballet-kingdom': { x: 15, y: 68, w: 26, h: 30 },
    'when-music-storybook': { x: 50, y: 73, w: 25, h: 26 },
    'pictures-legends-russian-colour': { x: 83, y: 68, w: 25, h: 31 }
  } },
  'cities-colour-new-pulse': { background: 'assets/wings/w6-map.webp', landmarks: {
    'three-theatre-cities': { x: 20, y: 40, w: 36, h: 40 },
    'painting-with-sound': { x: 56, y: 51, w: 23, h: 35 },
    'new-century-many-sounds': { x: 86, y: 48, w: 20, h: 37 }
  } }
};

function wingMapFor(wing) {
  const map = WING_MAP[wing.id];
  return map && wing.roomIds.every((roomId) => map.landmarks[roomId]) ? map : null;
}

// Owner, 2026-09-13: "use bg." — the painted room plates go on their rooms'
// screens (1448×1086, the stage's own 4:3, so `cover` shows the whole picture).
// Room 14 is wired like the rest: its plate is being redrawn in the book's
// style under the same file name and drops in without a code change. Rooms 13,
// 16 and 17 gained their plates on 2026-09-13; Rooms 15 and 18 followed on
// 2026-09-19, followed by Rooms 21–24 later that day. Room 1 keeps its separate
// Read Together plate treatment rather than using this map.
const ROOM_BACKGROUND = {
  'melody-detective-workshop': {
    background: 'assets/room-scenes/r01-melody-detective-workshop-scene.webp', focus: '50% 50%',
    scene: {
      'twinkle': { x: 16, y: 27, w: 20, h: 20 },
      'frere-jacques': { x: 82, y: 24, w: 18, h: 14 },
      'london-bridge': { x: 51, y: 51, w: 27, h: 19, label: 'above' },
      'pop-goes-weasel': { x: 14, y: 65.5, w: 20, h: 24 },
      'three-blind-mice': { x: 79, y: 70, w: 20, h: 12, label: 'above' }
    }
  },
  // Owner, 2026-09-16/24 anchors superseded by the room-scene painting
  // (agent, 2026-09-30): the old medallion-over-background anchors are gone
  // now that this room has one continuous painted scene; see roomScene()
  // below. `scene` is all-or-nothing exactly like `anchors` was.
  'playground-of-patterns': { background: 'assets/room-scenes/r02-playground-of-patterns-scene.webp', focus: '50% 50%', scene: {
    'old-macdonald': { x: 17, y: 30, w: 25, h: 25 },
    'farmer-in-dell': { x: 51, y: 39, w: 20, h: 18 },
    'mulberry-bush': { x: 78, y: 54, w: 16, h: 14, label: 'above' },
    'row-row-row-your-boat': { x: 27, y: 67, w: 26, h: 14, label: 'above' },
    'bingo': { x: 80, y: 70, w: 20, h: 12, label: 'above' }
  } },
  // Owner, 2026-09-27 anchors superseded by the room-scene painting (agent,
  // 2026-09-30): one continuous painted scene replaces the medallion anchors.
  'steps-beats-marches': { background: 'assets/room-scenes/r03-steps-beats-marches-scene.webp', focus: '50% 50%', scene: {
    'skip-to-my-lou': { x: 27, y: 38, w: 27, h: 19 },
    'when-saints-go-marching': { x: 73, y: 36, w: 20, h: 16 },
    'this-old-man': { x: 51, y: 63, w: 18, h: 21, label: 'above' },
    'mary-had-little-lamb': { x: 16, y: 70, w: 20, h: 12, label: 'above' },
    'hot-cross-buns': { x: 88, y: 74, w: 17, h: 15, label: 'above' }
  } },
  // Room-scene pilot (owner, 2026-09-28). Unlike `anchors`, which move the
  // existing medallions over a background, `scene` makes each song a place in
  // one painting using the Wing Map's ellipse-and-label language. Keeping this
  // as a per-room field makes rollout explicit: the other 23 rooms do not enter
  // the scene renderer until their own reviewed data exists.
  'home-distance-belonging': {
    background: 'assets/room-scenes/r04-home-distance-belonging-scene.webp', focus: '50% 50%',
    scene: {
      'rock-a-bye-baby': { x: 17, y: 30, w: 23, h: 19 },
      'amazing-grace-new-britain': { x: 43, y: 39, w: 19, h: 14, label: 'above' },
      'simple-gifts': { x: 20, y: 57, w: 22, h: 20 },
      'my-bonnie': { x: 63, y: 59, w: 18, h: 17 },
      'home-on-range': { x: 84, y: 72, w: 20, h: 16, label: 'above' }
    }
  },
  // Anchors superseded by the room-scene painting (agent, 2026-09-30).
  'gardens-season-memory': { background: 'assets/room-scenes/r05-gardens-season-memory-scene.webp', focus: '50% 50%', scene: {
    'sakura-sakura': { x: 18, y: 40, w: 27, h: 27 },
    'arirang': { x: 62, y: 34, w: 25, h: 28 },
    'mo-li-hua': { x: 80, y: 64, w: 20, h: 19, label: 'above' }
  } },
  // Anchors superseded by the room-scene painting (agent, 2026-09-30).
  'southeast-asian-courtyard': { background: 'assets/room-scenes/r06-southeast-asian-courtyard-scene.webp', focus: '50% 50%', scene: {
    'rasa-sayang': { x: 17, y: 30, w: 25, h: 23 },
    'burung-kakak-tua': { x: 87, y: 22, w: 17, h: 14 },
    'leron-leron-sinta': { x: 42, y: 65, w: 26, h: 15, label: 'above' },
    'lao-duang-duen': { x: 84, y: 68, w: 18, h: 13, label: 'above' }
  } },
  // Batch 2 room scenes (owner-approved rollout, 2026-09-30). The former
  // medallion `anchors` are deliberately removed: a room has one renderer.
  'roads-prayer-city-sea': { background: 'assets/room-scenes/r07-roads-prayer-city-sea-scene.webp', focus: '50% 50%', scene: {
    'raghupati-raghava': { x: 17, y: 35, w: 22, h: 22 },
    'uskudara-gider-iken': { x: 49, y: 68, w: 25, h: 17, label: 'above' },
    'misirlou': { x: 78, y: 35, w: 18, h: 17 }
  } },
  'songs-that-transform': { background: 'assets/room-scenes/r08-songs-that-transform-scene.webp', focus: '50% 50%', scene: {
    'hava-nagila': { x: 19, y: 31, w: 25, h: 20 },
    'kalinka': { x: 76, y: 31, w: 19, h: 20 },
    'shchedryk': { x: 18, y: 68, w: 24, h: 23, label: 'above' },
    'greensleeves': { x: 78, y: 69, w: 23, h: 22, label: 'above' }
  } },
  'when-song-means-home': { background: 'assets/room-scenes/r09-when-song-means-home-scene.webp', focus: '50% 50%', scene: {
    'nkosi-sikelel-iafrika': { x: 18, y: 31, w: 25, h: 21 },
    'waltzing-matilda': { x: 75, y: 33, w: 20, h: 20 },
    'el-condor-pasa': { x: 18, y: 69, w: 25, h: 22, label: 'above' },
    'la-bamba': { x: 79, y: 67, w: 20, h: 18, label: 'above' }
  } },
  'celebration-square': { background: 'assets/room-scenes/r10-celebration-square-scene.webp', focus: '50% 50%', scene: {
    'happy-birthday': { x: 18, y: 29, w: 23, h: 19 },
    'jolly-good-fellow': { x: 77, y: 30, w: 21, h: 19 },
    'jingle-bells': { x: 18, y: 56, w: 25, h: 18 },
    'joy-to-world': { x: 76, y: 58, w: 20, h: 18 },
    'auld-lang-syne': { x: 18.5, y: 71.5, w: 17, h: 12 }
  } },
  'winter-lanterns': { background: 'assets/room-scenes/r11-winter-lanterns-scene.webp', focus: '50% 50%', scene: {
    'silent-night': { x: 18, y: 29, w: 25, h: 20 },
    'o-tannenbaum': { x: 78, y: 26, w: 23, h: 20 },
    'deck-the-hall': { x: 20, y: 54, w: 25, h: 18 },
    'we-wish-merry-christmas': { x: 75, y: 58, w: 20.5, h: 20 },
    'first-noel': { x: 16.5, y: 75, w: 21, h: 14, label: 'above' }
  } },
  'baroque-pattern-workshop': { background: 'assets/backgrounds/r12-baroque-pattern-workshop-background.webp', focus: '50% 45%', anchors: {
    'bach-prelude-c-major-bwv-846': { x: 16, y: 35 }, 'bach-air-orchestral-suite-3': { x: 43, y: 35 }, 'bach-jesu-joy': { x: 69, y: 35 }, 'bach-cello-suite-1-prelude': { x: 30, y: 64 }, 'pachelbel-canon-d': { x: 64, y: 64 }
  } },
  'baroque-stage-seasons-water-fireworks': { background: 'assets/backgrounds/r13-baroque-stage-seasons-water-fireworks-background.webp', focus: '50% 45%', anchors: {
    'vivaldi-spring-1': { x: 16, y: 35 }, 'vivaldi-summer-storm': { x: 43, y: 35 }, 'vivaldi-winter-1': { x: 70, y: 35 },
    'handel-hallelujah-chorus': { x: 16, y: 63 }, 'handel-water-music-hornpipe': { x: 43, y: 63 }, 'handel-royal-fireworks-rejouissance': { x: 70, y: 63 }
  } },
  'vienna-classical-city': { background: 'assets/backgrounds/r14-vienna-classical-city-background.webp', focus: '50% 45%' },
  'beethoven-door-two-eras': { background: 'assets/backgrounds/r15-beethoven-door-two-eras-background.webp', focus: '50% 45%', anchors: {
    'symphony-5-opening': { x: 16, y: 35 }, 'fur-elise': { x: 43, y: 35 }, 'moonlight-sonata': { x: 69, y: 35 }, 'beethoven-symphony-7-2': { x: 30, y: 64 }, 'ode-to-joy': { x: 64, y: 64 }
  } },
  'music-learns-to-sing': { background: 'assets/backgrounds/r16-music-learns-to-sing-background.webp', focus: '50% 45%', anchors: {
    'schubert-ave-maria': { x: 16, y: 35 }, 'schubert-die-forelle': { x: 43, y: 35 }, 'mendelssohn-wedding-march': { x: 69, y: 35 }, 'mendelssohn-spring-song': { x: 30, y: 64 }, 'mendelssohn-violin-concerto-opening': { x: 64, y: 64 }
  } },
  'piano-diary': { background: 'assets/backgrounds/r17-piano-diary-background.webp', focus: '50% 45%' },
  'home-memory-dance': { background: 'assets/backgrounds/r18-home-memory-dance-background.webp', focus: '50% 45%', anchors: {
    'brahms-lullaby': { x: 16, y: 35 }, 'brahms-hungarian-dance-5': { x: 43, y: 35 }, 'brahms-waltz-op39-no15': { x: 69, y: 35 },
    'dvorak-new-world-largo': { x: 16, y: 63 }, 'dvorak-humoresque-7': { x: 43, y: 63 }, 'dvorak-slavonic-dance-8': { x: 70, y: 63 }
  } },
  'ballet-kingdom': { background: 'assets/backgrounds/r19-ballet-kingdom-background.webp', focus: '50% 45%', anchors: {
    'swan-lake-theme': { x: 16, y: 35 }, 'tchaikovsky-sugar-plum-fairy': { x: 43, y: 35 }, 'tchaikovsky-waltz-flowers': { x: 69, y: 35 },
    'tchaikovsky-nutcracker-march': { x: 16, y: 63 }, 'tchaikovsky-trepak': { x: 43, y: 63 }, 'tchaikovsky-piano-concerto-1-opening': { x: 70, y: 63 }
  } },
  'when-music-storybook': { background: 'assets/backgrounds/r20-when-music-storybook-background.webp', focus: '50% 45%', anchors: {
    'saint-saens-the-swan': { x: 16, y: 35 }, 'saint-saens-aquarium': { x: 43, y: 35 }, 'saint-saens-danse-macabre': { x: 69, y: 35 },
    'grieg-morning-mood': { x: 16, y: 63 }, 'grieg-mountain-king': { x: 43, y: 63 }, 'grieg-anitras-dance': { x: 70, y: 63 }
  } },
  'pictures-legends-russian-colour': { background: 'assets/backgrounds/r21-pictures-legends-russian-colour-background.webp', focus: '50% 45%', anchors: {
    'mussorgsky-promenade': { x: 16, y: 35 }, 'mussorgsky-unhatched-chicks': { x: 43, y: 35 }, 'mussorgsky-night-bald-mountain': { x: 69, y: 35 }, 'rimsky-flight-bumblebee': { x: 30, y: 64 }, 'rimsky-scheherazade-opening': { x: 64, y: 64 }
  } },
  'three-theatre-cities': { background: 'assets/backgrounds/r22-three-theatre-cities-background.webp', focus: '50% 45%', anchors: {
    'strauss-blue-danube': { x: 16, y: 35 }, 'strauss-tritsch-tratsch-polka': { x: 43, y: 35 }, 'bizet-habanera': { x: 69, y: 35 },
    'bizet-toreador-song': { x: 16, y: 63 }, 'rossini-william-tell-finale': { x: 43, y: 63 }, 'rossini-barber-seville-overture': { x: 70, y: 63 }
  } },
  'painting-with-sound': { background: 'assets/backgrounds/r23-painting-with-sound-background.webp', focus: '50% 45%', anchors: {
    'debussy-clair-de-lune': { x: 22, y: 35 }, 'debussy-arabesque-1': { x: 66, y: 35 }, 'debussy-little-shepherd': { x: 30, y: 64 }, 'satie-gymnopedie-1': { x: 64, y: 64 }
  } },
  'new-century-many-sounds': { background: 'assets/backgrounds/r24-new-century-many-sounds-background.webp', focus: '50% 45%', anchors: {
    'joplin-entertainer': { x: 22, y: 35 }, 'joplin-maple-leaf-rag': { x: 66, y: 35 }, 'holst-jupiter': { x: 30, y: 64 }, 'holst-mars': { x: 64, y: 64 }
  } }
};

// ── anchored song bubbles (pilot) ────────────────────────────────────────────
// A room whose ROOM_BACKGROUND entry carries `anchors` places each song bubble
// on the part of its painting the song belongs to, instead of in the grid.
// Each anchor is the CENTRE OF THE DISC, in % of the stage box. That box IS the
// painted image: the stage is always 4:3 and letterboxed, the plates are
// 1448×1086 (the same 4:3) and drawn with `background-size: cover`, so cover
// has no slack to crop and a % of the stage is the same % of the picture at
// every viewport (tools/check-bubble-anchors.mjs asserts that ratio holds).
//
// All or nothing: if any piece shown on the page lacks an anchor (a curation
// change added a song, or the page pager split the room) the whole room falls
// back to the grid, which can never overflow. The CSS also falls back to the
// grid on a stage smaller than the iPad's, where fixed-size tap targets would
// no longer fit between the positions — see `.bubble-field--anchored`.
function roomAnchors(art, shown) {
  const anchors = art && art.anchors;
  if (!anchors || !shown.length || !shown.every((p) => anchors[p.id])) return null;
  return anchors;
}

// Scene data is also all-or-nothing. A later repertoire edit must never leave
// one song unreachable merely because its landmark has not been painted yet.
function roomScene(art, shown) {
  const scene = art && art.scene;
  if (!scene || !shown.length || !shown.every((p) => scene[p.id])) return null;
  return scene;
}

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

// In a room the companion figure is itself a control (owner, 2026-09-29: the
// room explanation moves to a tap on the companion): it plays the room's
// Learn More script through the same explainer as the word cards. No greeting
// bubble here — it would sit on the word scroll's cards; the wing page greets.
function roomCompanionMarkup(room) {
  const c = companionById(journey.companionId);
  const roomClip = roomClipId(room);
  return `
    <div class="companion-corner companion-corner--room">
      <button class="companion-tap" ${roomClip ? `data-room-say="${roomClip}"` : ''} aria-label="${c.name}: hear about this room" aria-pressed="false">
        <img class="companion-figure" src="${c.art}" alt="">
      </button>
    </div>`;
}

// Owner, 2026-10-04, verbatim: "i want to change my prior companion design, i
// used to not allow to change companion, now if click on companion show on top
// right, will be able to change companion." This supersedes the 2026-08-21
// "chosen once" rule (discussion log). The top-right badge is now a button that
// opens a picture picker; the choice is remembered exactly like the first one
// (journey.js) and keeps the child's finished chapters. The swap mark tells a
// child the badge does something before they try it.
function companionSwitchMarkup(extraClass = '', subtitle = '') {
  const c = companionById(journey.companionId);
  return `<button class="guide-badge companion-switch${extraClass ? ` ${extraClass}` : ''}" data-companion-picker aria-label="${c.name}. Change your companion">
      <img src="${c.art}" alt=""><span>${c.name}${subtitle}</span><i class="companion-switch__swap" aria-hidden="true">⇄</i>
    </button>`;
}

function companionPickerPopup() {
  openPopup(`
    <h2>Choose your friend</h2>
    <div class="companion-picker">
      ${COMPANIONS.map((c) => {
        const current = c.id === journey.companionId;
        return `
        <button class="companion-picker__choice${current ? ' is-current' : ''}" data-companion-pick="${c.id}" aria-pressed="${current}" aria-label="${c.name}${current ? ', your friend now' : ''}">
          <img src="${c.art}" alt="">
          <span>${c.name}</span>
        </button>`;
      }).join('')}
    </div>`, 'popup__card--picker');
}

// Switching keeps the place and the progress: the same page re-renders wearing
// the new friend, and the page tune restarts in the new friend's voice (its key
// names the companion), which is the tap's sound. With Sound off the badge's
// pop is the feedback.
function switchCompanion(id) {
  if (!COMPANIONS.some((c) => c.id === id)) return;
  closePopup();
  journey.setCompanion(id);
  unlockAudio();
  if (currentView === 'world') renderWorld();
  else if (currentView === 'wing') renderWing();
  else if (currentView === 'room') renderRoom();
  else if (currentView === 'index') renderIndex();
  const badge = stage.querySelector('.companion-switch');
  if (badge) {
    badge.classList.add('is-new');
    setTimeout(() => badge.classList.remove('is-new'), 900);
  }
}

function companionCorner(line) {
  const c = companionById(journey.companionId);
  return `
    <div class="companion-corner">
      ${line ? `<p class="companion-bubble">${line}</p>` : ''}
      <img class="companion-figure" src="${c.art}" alt="${c.name}">
    </div>`;
}

// ── the room's word scroll (owner, 2026-10-03) ───────────────────────────────

// Owner, 2026-10-03, with a mockup of Playground of Patterns: "remember the
// music book, i asked to have this new design for the bottom part? like
// instead of door to other room, we have this instead." The bottom of every
// room is a parchment scroll: one heading line and a row of big word cards,
// each a speaker, a small picture and one word. A tap on a card pops the
// child's companion up with the word's meaning while the narrator's existing
// Learn More clip plays (the 2026-09-29 "companion shows it, narrator says it"
// decision). The heading carries the same speaker and plays the room's own
// Learn More script, which is how the room explanation stays reachable now
// that the Learn More diamond is gone (owner, 2026-09-29).
//
// Only words with a rendered meaning clip become cards: a card that cannot
// speak would be a silent control. The others wait in the room data until
// their line is written and rendered, and then appear on their own.

// One heading per room, in the voice of the owner's own line for Room 2 (taken
// from the first sentence of that room's approved script). Visible only — the
// speaker beside it plays the room's rendered script, not this line.
const ROOM_SCROLL_HEADING = {
  'melody-detective-workshop': 'Hear one tune wear different words',
  'playground-of-patterns': 'Hear the parts that make a song easy to join',
  'steps-beats-marches': 'Hear the beat that guides your feet',
  'home-distance-belonging': 'Hear songs about someone far away',
  'gardens-season-memory': 'Hear flower songs from different countries',
  'southeast-asian-courtyard': 'Hear the tunes of nearby places',
  'roads-prayer-city-sea': 'Hear a song travel and change',
  'songs-that-transform': 'Hear a tune keep its notes and change its words',
  'when-song-means-home': 'Hear songs that sound like home',
  'celebration-square': 'Hear songs for special days',
  'winter-lanterns': 'Hear how winter songs begin',
  'baroque-pattern-workshop': 'Hear the low part that repeats',
  'baroque-stage-seasons-water-fireworks': 'Hear instruments paint the weather',
  'vienna-classical-city': 'Hear a tune come back changed',
  'beethoven-door-two-eras': 'Hear a few notes grow into a big piece',
  'music-learns-to-sing': 'Hear an instrument sing without words',
  'piano-diary': 'Hear one note paint a picture',
  'home-memory-dance': 'Hear dance beats move into the music hall',
  'ballet-kingdom': 'Hear music that tells dancers how to move',
  'when-music-storybook': 'Hear music make a creature appear',
  'pictures-legends-russian-colour': 'Hear fast notes fly',
  'three-theatre-cities': 'Hear music race a show to its end',
  'painting-with-sound': 'Hear the quiet gaps in the music',
  'new-century-many-sounds': 'Hear two very different new sounds'
};

// The small picture on each word card. `art` is a painted icon and wins when
// present; until one is painted the card shows the placeholder glyph, so no
// card is ever blank. Keyed by the word's Learn More clip id. Paint each as
// assets/word-icons/<clip id>.webp and add `art` here.
const WORD_PICTURE = {
  'chip-melody': { art: 'assets/word-icons/chip-melody.webp' },
  'chip-tune-family': { art: 'assets/word-icons/chip-tune-family.webp' },
  'chip-repeat': { art: 'assets/word-icons/chip-repeat.webp' },
  'chip-up-down': { art: 'assets/word-icons/chip-up-down.webp' },
  'chip-round': { art: 'assets/word-icons/chip-round.webp' },
  'chip-pattern': { art: 'assets/word-icons/chip-pattern.webp' },
  'chip-refrain': { art: 'assets/word-icons/chip-refrain.webp' },
  'chip-verse': { art: 'assets/word-icons/chip-verse.webp' },
  'chip-call-and-response': { art: 'assets/word-icons/chip-call-and-response.webp' },
  'chip-pulse': { art: 'assets/word-icons/chip-pulse.webp' },
  'chip-rhythm': { art: 'assets/word-icons/chip-rhythm.webp' },
  'chip-dance': { art: 'assets/word-icons/chip-dance.webp' },
  'chip-lullaby': { art: 'assets/word-icons/chip-lullaby.webp' },
  'chip-phrase': { art: 'assets/word-icons/chip-phrase.webp' },
  'chip-lyrics': { art: 'assets/word-icons/chip-lyrics.webp' },
  'chip-arrangement': { art: 'assets/word-icons/chip-arrangement.webp' },
  'chip-bass-line': { art: 'assets/word-icons/chip-bass-line.webp' },
  'chip-concerto': { art: 'assets/word-icons/chip-concerto.webp' },
  'chip-contrast': { art: 'assets/word-icons/chip-contrast.webp' },
  'chip-question-and-answer': { art: 'assets/word-icons/chip-question-and-answer.webp' },
  'chip-variation': { art: 'assets/word-icons/chip-variation.webp' },
  'chip-motif': { art: 'assets/word-icons/chip-motif.webp' },
  'chip-symphony': { art: 'assets/word-icons/chip-symphony.webp' },
  'chip-scale': { art: 'assets/word-icons/chip-scale.webp' },
  'chip-accompaniment': { art: 'assets/word-icons/chip-accompaniment.webp' },
  'chip-waltz': { art: 'assets/word-icons/chip-waltz.webp' },
  'chip-texture': { art: 'assets/word-icons/chip-texture.webp' },
  'chip-ballet': { art: 'assets/word-icons/chip-ballet.webp' },
  'chip-march': { art: 'assets/word-icons/chip-march.webp' },
  'chip-register': { art: 'assets/word-icons/chip-register.webp' },
  'chip-step': { art: 'assets/word-icons/chip-step.webp' },
  'chip-hymn-tune': { art: 'assets/word-icons/chip-hymn-tune.webp' },
  'chip-carol': { art: 'assets/word-icons/chip-carol.webp' },
  'chip-dance-tune': { art: 'assets/word-icons/chip-dance-tune.webp' },
  'chip-baroque': { art: 'assets/word-icons/chip-baroque.webp' },
  'chip-sequence': { art: 'assets/word-icons/chip-sequence.webp' },
  'chip-classical-era': { art: 'assets/word-icons/chip-classical-era.webp' },
  'chip-sonata': { art: 'assets/word-icons/chip-sonata.webp' },
  'chip-nocturne': { art: 'assets/word-icons/chip-nocturne.webp' },
  'chip-prelude': { art: 'assets/word-icons/chip-prelude.webp' },
  'chip-programme-music': { art: 'assets/word-icons/chip-programme-music.webp' },
  'chip-acceleration': { art: 'assets/word-icons/chip-acceleration.webp' },
  'chip-suite': { art: 'assets/word-icons/chip-suite.webp' },
  'chip-promenade': { art: 'assets/word-icons/chip-promenade.webp' },
  'chip-polka': { art: 'assets/word-icons/chip-polka.webp' },
  'chip-opera': { art: 'assets/word-icons/chip-opera.webp' },
  'chip-overture': { art: 'assets/word-icons/chip-overture.webp' },
  'chip-resonance': { art: 'assets/word-icons/chip-resonance.webp' },
  'chip-ragtime': { art: 'assets/word-icons/chip-ragtime.webp' },
  'chip-syncopation': { art: 'assets/word-icons/chip-syncopation.webp' },
  'chip-steady-bass': { art: 'assets/word-icons/chip-steady-bass.webp' },
  'chip-orchestral-suite': { art: 'assets/word-icons/chip-orchestral-suite.webp' },
  'chip-gong': { art: 'assets/word-icons/chip-gong.webp' },
  'chip-sing-along': { art: 'assets/word-icons/chip-sing-along.webp' },
  'chip-drone': { art: 'assets/word-icons/chip-drone.webp' },
  'chip-minor-key': { art: 'assets/word-icons/chip-minor-key.webp' },
  'chip-harmony': { art: 'assets/word-icons/chip-harmony.webp' },
  'chip-pan-pipes': { art: 'assets/word-icons/chip-pan-pipes.webp' }
};

function wordPictureMarkup(clipId) {
  const pic = WORD_PICTURE[clipId] || { glyph: '🎵' };
  return pic.art
    ? `<span class="word-card__picture"><img src="${pic.art}" alt=""></span>`
    : `<span class="word-card__picture word-card__picture--placeholder" aria-hidden="true">${pic.glyph}</span>`;
}

// The room's word cards (its own voiced words, then the extra ones that are
// true of its songs) come from learnmore.js, where the checks can read them.
// "True story" cards follow them: see roomStoryPieces.
function roomStoryPieces(room) {
  return room.pieceIds.map(pieceById).filter((p) => p && EXPLANATIONS[p.id]?.facts?.text);
}

function wordScrollMarkup(room) {
  const words = roomWordCards(room);
  const stories = roomStoryPieces(room);
  const roomClip = roomClipId(room);
  const heading = ROOM_SCROLL_HEADING[room.id] || room.title;
  return `
    <section class="word-scroll" aria-label="Words to hear">
      <button class="word-scroll__heading" ${roomClip ? `data-room-say="${roomClip}"` : ''} aria-label="${heading}. Hear about this room">
        <span class="word-scroll__speaker" aria-hidden="true">🔊</span><span>${heading}</span>
      </button>
      ${words.length || stories.length ? `<div class="word-scroll__cards">
        ${words.map(({ label, clipId }) => `
          <button class="word-card" data-strip-say="${clipId}" aria-label="Hear what ${label} means" aria-pressed="false">
            <span class="word-card__top"><span class="word-card__speaker" aria-hidden="true">🔊</span>${wordPictureMarkup(clipId)}</span>
            <span class="word-card__word">${label}</span>
          </button>`).join('')}
        ${stories.map((p) => `
          <button class="word-card word-card--story" data-story-say="${p.id}" aria-label="A true story about ${p.title}" aria-pressed="false">
            <span class="word-card__top"><span class="word-card__speaker" aria-hidden="true">🔊</span><span class="word-card__picture word-card__picture--song"><img src="${p.art}" alt=""></span></span>
            <span class="word-card__word">True story</span>
          </button>`).join('')}
      </div>` : ''}
      <button class="word-scroll__grownups" data-knowledge="${room.id}" aria-label="For grown-ups: about this room">For grown-ups</button>
    </section>`;
}


// The companion explainer: the child's companion pops up above the word scroll
// with a speech bubble while the narrator's clip plays (owner, 2026-09-29:
// "visually companion speak, but the voice reader is the narrator"). One
// bubble at a time; it leaves two seconds after the clip ends, on the next
// tap anywhere, or when the page changes. With Sound off the bubble still
// shows its words and the Sound button nudges, so no tap is ever silent.
function companionExplainerMarkup() {
  const c = companionById(journey.companionId);
  return `
    <div class="companion-explainer" role="status" aria-live="polite" aria-atomic="true" hidden>
      <img class="companion-explainer__figure" src="${c.art}" alt="">
      <p class="companion-explainer__bubble"></p>
    </div>`;
}

function hideStripExplainer() {
  if (stripExplainerTimer) { clearTimeout(stripExplainerTimer); stripExplainerTimer = null; }
  if (!stripExplainer) return;
  if (!stripExplainer.hidden) stopLearnMore();
  stripExplainer.classList.remove('is-visible');
  stripExplainer.hidden = true;
  stage.querySelectorAll('[data-strip-say], [data-room-say], [data-story-say]').forEach((button) => button.setAttribute('aria-pressed', 'false'));
  stage.querySelector('.companion-corner')?.classList.remove('is-hidden');
}

function showStripExplainer(control, clipId, text, { title = '', src = null } = {}) {
  if (!stripExplainer || !text) return;
  if (stripExplainerTimer) { clearTimeout(stripExplainerTimer); stripExplainerTimer = null; }
  stopTitle();
  const bubble = stripExplainer.querySelector('.companion-explainer__bubble');
  bubble.textContent = text;
  if (title) {
    const strong = document.createElement('strong');
    strong.className = 'companion-explainer__title';
    strong.textContent = title;
    bubble.prepend(strong);
  }
  stripExplainer.hidden = false;
  void stripExplainer.offsetWidth;            // restart the pop-in transition
  stripExplainer.classList.add('is-visible');
  stage.querySelector('.companion-corner')?.classList.add('is-hidden');
  stage.querySelectorAll('[data-strip-say], [data-room-say], [data-story-say]').forEach((button) => {
    button.setAttribute('aria-pressed', String(button === control));
  });
  const linger = () => { stripExplainerTimer = setTimeout(hideStripExplainer, 2000); };
  if (!sound.on) {
    nudgeSound();
    stripExplainerTimer = setTimeout(hideStripExplainer, Math.max(3500, text.length * 70));
    return;
  }
  if (!speakLearnMore(clipId, linger, src)) linger();
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
        <div class="world-topbar__left">
          <button class="world-home" data-go="landing" aria-label="Home — start again"><span aria-hidden="true">⌂</span> Home</button>
          ${songIndexButtonMarkup()}
        </div>
        <div class="world-title"><h1>Music World</h1><p>Six wings, twenty-four rooms.</p></div>
        ${companionSwitchMarkup('guide-badge--world', '<small>companion</small>')}
      </div>
      <p class="world-greeting">${c.greeting}</p>
      <p class="world-motto">A Kinder Brighter World Through Music</p>
      <div class="world-compass" aria-hidden="true"><span class="world-compass__north">N</span><span class="world-compass__star">✦</span></div>
    </div>`;
  applyAtmosphere();
}

// ── the song index (owner, 2026-10-04) ──────────────────────────────────────

// Owner, 2026-10-04, verbatim: "i want to add 'index' to show where each song
// is". Every song in the book, each as its own picture with its name and the
// room it lives in; a tap takes the child to that room with the song lit up.
//
// Alphabetical, not by room: a child who wants a song knows its name, not its
// room — grouping by room would ask them to know the answer before they look.
// Letters are the first letter the child SEES (accents dropped, "The" kept), so
// "The Entertainer" is under T, where a reader looks for it. The letter row
// jumps; the room is shown on every tile with its own painted card.
const INDEX_BUTTON_PICTURES = ['twinkle', 'jingle-bells', 'fur-elise', 'swan-lake-theme'];

function songIndexButtonMarkup() {
  const pics = INDEX_BUTTON_PICTURES.map(pieceById).filter((p) => p && p.art);
  return `<button class="song-index-btn" data-go="index" aria-label="All the songs: find where each song lives">
      <span class="song-index-btn__pics" aria-hidden="true">${pics.map((p) => `<img src="${p.art}" alt="">`).join('')}</span>
      <span class="song-index-btn__label">Songs</span>
    </button>`;
}

const indexLetter = (name) => name.normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/^[^A-Za-z0-9]+/, '').charAt(0).toUpperCase() || '#';

function songIndexEntries() {
  const seen = new Set();
  const entries = [];
  for (const room of ROOMS) {
    for (const pid of room.pieceIds) {
      if (seen.has(pid)) continue;
      seen.add(pid);
      const p = pieceById(pid);
      if (!p) continue;
      const home = roomById(PIECE_ROOMS[pid]?.homeRoomId) || room;
      const name = p.shortTitle || p.title;
      entries.push({ p, name, room: home, letter: indexLetter(name) });
    }
  }
  return entries.sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
}

function songTileMarkup({ p, name, room }) {
  const card = ROOM_CARD[room.id];
  return `
    <button class="index-tile" data-index-song="${p.id}" aria-label="${name}. It lives in ${room.title}">
      <img class="index-tile__art" src="${p.art}" alt="" loading="lazy" decoding="async">
      <span class="index-tile__name">${name}</span>
      <span class="index-tile__room">${card ? `<img class="index-tile__room-art" src="${card.card}" alt="" loading="lazy" decoding="async">` : ''}<span class="index-tile__room-name">${room.title}</span></span>
    </button>`;
}

function renderIndex() {
  currentView = 'index';
  document.body.dataset.view = currentView;
  stopPiece();                  // sets currentView first so the tune it restores is this page's
  const groups = new Map();
  for (const entry of songIndexEntries()) {
    if (!groups.has(entry.letter)) groups.set(entry.letter, []);
    groups.get(entry.letter).push(entry);
  }
  stage.className = 'stage stage--index';
  stage.style.backgroundImage = '';
  stage.style.backgroundPosition = '';
  stage.innerHTML = `
    <div class="song-index">
      <div class="topbar song-index__topbar">
        <button class="round-btn" data-go="world" aria-label="Back to Music World">←</button>
        <div class="banner song-index__banner"><h1>All the Songs</h1><p>Tap a song to go to its room.</p></div>
        ${companionSwitchMarkup()}
      </div>
      <nav class="song-index__letters" aria-label="Jump to a letter">
        ${[...groups.keys()].map((letter) => `<button class="song-index__letter" data-index-letter="${letter}" aria-label="Songs starting with ${letter}">${letter}</button>`).join('')}
      </nav>
      <div class="song-index__list">
        ${[...groups].map(([letter, list]) => `
          <section class="song-index__group" data-index-group="${letter}" aria-label="${letter}">
            <h2 class="song-index__heading">${letter}</h2>
            <div class="song-index__grid">${list.map(songTileMarkup).join('')}</div>
          </section>`).join('')}
      </div>
    </div>`;
  applyAtmosphere();
}

function jumpToLetter(button) {
  const group = stage.querySelector(`[data-index-group="${button.dataset.indexLetter}"]`);
  if (!group) return;
  const list = stage.querySelector('.song-index__list');
  // The list is the groups' offsetParent (position: relative).
  list.scrollTop = group.offsetTop;
  stage.querySelectorAll('.song-index__letter').forEach((b) => b.classList.toggle('is-current', b === button));
  const heading = group.querySelector('.song-index__heading');
  heading.classList.remove('is-flash');
  void heading.offsetWidth;
  heading.classList.add('is-flash');
}

// Straight to the songs: the index skips a room's Read Together chapter (the
// child came for one song) and opens the pager page the song is on.
function openSongFromIndex(pieceId) {
  const room = roomById(PIECE_ROOMS[pieceId]?.homeRoomId);
  if (!room) return;
  const shown = room.pieceIds.map(pieceById).filter(Boolean);
  const at = shown.findIndex((p) => p.id === pieceId);
  journey.wingId = room.wingId;
  journey.roomId = room.id;
  journey.page = at >= 0 ? Math.floor(at / PAGE_SIZE) : 0;
  exploreOverride = room.id;
  pendingFoundPieceId = pieceId;
  renderRoom();
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
  const map = wingMapFor(wing);
  document.body.removeAttribute('data-open-room');
  // A mapped wing draws its painting on its own plate inside the stage, so in
  // portrait the whole picture sits between the title bar and the companion
  // (owner, 2026-10-04, "landscape vs portrait"); in landscape the plate is the
  // whole stage, exactly as before.
  stage.className = `stage stage--wing${map ? ' stage--wing-map' : ''}`;
  stage.style.backgroundImage = map ? '' : `url(${style.background})`;
  stage.innerHTML = `
    <div class="scrim${map ? ' wing-map-page' : ''}">
      <div class="topbar">
        <button class="round-btn" data-go="world" aria-label="Back to Music World">←</button>
        <div class="banner banner--wing"><h1>${wing.title}</h1></div>
        ${companionSwitchMarkup()}
      </div>
      ${map ? `<div class="wing-plate" style="background-image:url(${map.background})"><div class="wing-landmarks" aria-label="Choose a room">
        ${wing.roomIds.map((roomId) => {
          const room = roomById(roomId);
          const landmark = map.landmarks[roomId];
          return `
          <button class="wing-spot room-landmark${landmark.x < 22 ? ' room-landmark--left' : ''}${landmark.x > 78 ? ' room-landmark--right' : ''}" data-room="${room.id}" aria-label="Open ${room.title}"
            style="--x:${landmark.x}%;--y:${landmark.y}%;--w:${landmark.w}%;--h:${landmark.h}%;--accent:${style.accent}">
            <span class="wing-spot__ring" aria-hidden="true"></span>
            <span class="room-landmark__name">${room.title}</span>
          </button>`;
        }).join('')}
      </div></div>` : `<div class="room-grid">
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
      </div>`}
      ${companionCorner(null)}
    </div>`;
  applyAtmosphere();
}

// ── page 4: a room (its pieces) ──────────────────────────────────────────────

function renderRoom() {
  currentView = 'room';
  document.body.dataset.view = currentView;
  stopPiece();                  // sets currentView first so the tune it restores is this page's
  hideStripExplainer();
  stripExplainer = null;
  const room = roomById(journey.roomId);
  if (!room) { renderWorld(); return; }
  document.body.setAttribute('data-open-room', room.id);   // which room is open, for QA (never data-room: taps use closest('[data-room]'))

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
  const anchors = roomAnchors(art, shown);
  const scene = roomScene(art, shown);
  const hasBass = pieces.some((p) => p.piano);
  const roomMode = hasBass ? (roomModes.get(room.id) || 'melody') : 'melody';

  // Which of this room's songs have a play-along arrangement on the toy keyboard.
  const roomPlayalongIds = room.pieceIds
    .map((pid) => CATALOGUE_TO_PLAYALONG[pid])
    .filter(Boolean);

  stage.className = `stage stage--room${scene ? ' stage--room-scene' : ''}`;
  // With a painting the focus is its own; without one the position goes back
  // to the stylesheet, whose `center` is exactly what the wing wash has always
  // shown. (`cover` on 4:3 art in a 4:3 stage leaves no slack either way.)
  stage.style.backgroundImage = `url(${art ? art.background : style.background})`;
  stage.style.backgroundPosition = art ? art.focus : '';
  stage.innerHTML = `
    <div class="scrim${scene ? ' room-scene-page' : ''}">
      <div class="topbar">
        <button class="round-btn" data-go="wing" aria-label="Back to ${wing.title}">←</button>
        <div class="banner banner--room"><h1>${room.title}</h1><p>${room.subtitle}</p></div>
        <div class="room-tools">
          <div class="room-mode" role="group" aria-label="Song arrangement">
            <button class="room-mode__choice${roomMode === 'melody' ? ' is-current' : ''}" data-room-mode="melody" aria-pressed="${roomMode === 'melody'}" aria-label="Play melody only">
              <span class="room-mode__picture" aria-hidden="true">♪</span><small>Melody</small>
            </button>
            <button class="room-mode__choice${roomMode === 'piano' ? ' is-current' : ''}" data-room-mode="piano" aria-pressed="${roomMode === 'piano'}" aria-label="Play melody with bass"${hasBass ? '' : ' disabled'}>
              <span class="room-mode__picture" aria-hidden="true">♪<b>𝄢</b></span><small>${hasBass ? 'Melody + bass' : 'Melody only'}</small>
            </button>
          </div>
          ${companionSwitchMarkup()}
          ${roomPlayalongIds.length ? `<button class="toy-bubble toy-bubble--room" data-go="playroom" aria-label="Toy Piano">${toyKeysFaceMarkup()}</button>` : ''}
        </div>
      </div>

      <div class="room-body${scene ? ' room-body--scene' : ''}">
        ${scene ? `<div class="room-scene-landmarks">
          ${shown.map((p) => sceneLandmarkMarkup(p, scene[p.id])).join('')}
        </div>` : `<div class="bubble-field">
          ${shown.map((p) => bubbleMarkup(p, anchors && anchors[p.id])).join('')}
        </div>`}
        <aside class="info-rail${scene ? ' room-scene-info' : ''}">
          ${room.composers.slice(0, 2).map((composerId) => {
            const composer = composerById(composerId);
            return `
            <button class="info-square" data-composer="${composer.id}" aria-label="About ${composer.name}">
              ${composer.portrait ? `<img class="info-square__face" src="${composer.portrait}" alt="">` : `<span class="info-square__face info-square__face--monogram">${composer.shortName[0]}</span>`}
              <span class="info-square__label"><span class="info-square__line">About</span> <span class="info-square__line">${composer.shortName}</span></span>
            </button>`;
          }).join('')}
        </aside>
      </div>

      ${wordScrollMarkup(room)}

      ${pages > 1 ? `
        <div class="pager">
          ${Array.from({ length: pages }, (_, i) =>
            `<button class="pager__dot${i === journey.page ? ' is-current' : ''}" data-page="${i}" aria-label="Page ${i + 1}"></button>`
          ).join('')}
        </div>` : ''}

      ${roomCompanionMarkup(room)}
      ${companionExplainerMarkup()}
    </div>`;

  // Measure the ordinary grid first, then use those exact disc sizes for the
  // anchored layout. This keeps the owner's no-shrinking rule true when the
  // grid changes: anchors have no parallel size formula that can drift stale.
  if (anchors) {
    const field = stage.querySelector('.bubble-field');
    const gridDiscSizes = new Map([...field.querySelectorAll('.bubble')].map((bubble) => [
      bubble.dataset.pieceWrap,
      bubble.querySelector('.bubble__disc').getBoundingClientRect().height
    ]));
    for (const bubble of field.querySelectorAll('.bubble')) {
      bubble.style.setProperty('--disc', `${gridDiscSizes.get(bubble.dataset.pieceWrap)}px`);
    }
    field.classList.add('bubble-field--anchored');

    // Anchor percentages describe the painting, but the word scroll is
    // ordinary content whose rendered height changes with the viewport. Keep
    // the authored x/y point unless the complete bubble (including its name
    // pill) would enter the scroll; then lift it only far enough to leave
    // the same 3px clearance required by check-bubble-anchors.mjs.
    const linkTops = [...stage.querySelectorAll('.word-scroll')]
      .map((scroll) => scroll.getBoundingClientRect().top);
    if (linkTops.length) {
      const safeBottom = Math.min(...linkTops) - 3;
      for (const bubble of field.querySelectorAll('.bubble')) {
        const nameBottom = bubble.querySelector('.bubble__name').getBoundingClientRect().bottom;
        bubble.style.setProperty('--anchor-lift', `${Math.max(0, nameBottom - safeBottom)}px`);
      }
    }
  }

  stripExplainer = stage.querySelector('.companion-explainer');
  // The explainer stands on the scroll's top edge, measured rather than
  // guessed: the scroll's height depends on the stage width and on whether
  // the room has word cards at all.
  const scrollBox = stage.querySelector('.word-scroll')?.getBoundingClientRect();
  if (scrollBox) {
    const stageBox = stage.getBoundingClientRect();
    stage.style.setProperty('--word-scroll-rise', `${Math.round(stageBox.bottom - scrollBox.top + 6)}px`);
  }

  if (pendingPopupPieceId) {
    const target = pendingPopupPieceId;
    pendingPopupPieceId = null;
    piecePopup(target);
  }
  applyAtmosphere();
  if (pendingFoundPieceId) {
    const target = pendingFoundPieceId;
    pendingFoundPieceId = null;
    const found = stage.querySelector(`[data-piece-wrap="${target}"]`);
    if (found) {
      found.classList.add('is-found');
      setTimeout(() => found.classList.remove('is-found'), 6000);
    }
    // The narrator says the song's name as it lights up (its existing title
    // clip); with Sound off the glow alone answers the tap.
    if (sound.on) speakTitle(target);
  }
}

function sceneLandmarkMarkup(p, landmark) {
  const labelClass = landmark.label === 'above' ? ' room-scene-landmark--label-above' : '';
  return `
    <button class="room-scene-landmark${labelClass}" data-piece-wrap="${p.id}" data-play="${p.id}"
      aria-label="Play ${p.title}"
      style="--x:${landmark.x}%;--y:${landmark.y}%;--w:${landmark.w}%;--h:${landmark.h}%">
      <span class="room-scene-landmark__name">${p.shortTitle || p.title}</span>
    </button>`;
}

// The per-song explanation button (CG-315): a small sibling of the room-level
// info-diamond, one per piece that actually has a `facts` entry. It is ABSENT (not
// disabled) when that piece has no facts text -- a dead control a child can press
// is worse than no control, and with only 10 of 120 pieces covered in this pilot,
// absence is the normal state for a long while.
// One button, not two: the owner's 2026-09-25 decision dropped the 💗 feel button
// ("let's just use the fact and not feel") — see the discussion log and spec
// section 3's superseded sections.
function explainButtonsMarkup(p) {
  const ex = EXPLANATIONS[p.id];
  if (!ex || !ex.facts) return '';
  return `<div class="bubble__explain-row">
    <button class="bubble__explain bubble__explain--facts" data-explain-facts="${p.id}" aria-label="A true story about ${p.title}">
      <span aria-hidden="true">💡</span>
    </button>
  </div>`;
}

function bubbleMarkup(p, anchor) {
  const big = p.importanceLevel === 3;
  const art = p.art
    ? `<img class="bubble__art" src="${p.art}" alt="">`
    : `<span class="bubble__art bubble__art--none">♪</span>`;
  return `
    <div class="bubble${big ? ' bubble--large' : ''}" data-piece-wrap="${p.id}"${anchor ? ` style="--ax:${anchor.x}%;--ay:${anchor.y}%"` : ''}>
      <button class="bubble__disc" data-play="${p.id}" aria-label="Play ${p.title}">
        ${art}
        <span class="bubble__pulse"></span>
      </button>
      <button class="bubble__name" data-say="${p.id}">${p.shortTitle || p.title}</button>
      ${explainButtonsMarkup(p)}
    </div>`;
}

// The picture-door strip that used to sit here (owner, 2026-09-27, "A. Picture
// doors") was replaced by the word scroll on 2026-10-03 — the owner's words:
// "instead of door to other room, we have this instead". Every room a door led
// to is still reached through the back arrow and the wing map; the adult
// connection sentences stay in the For grown-ups popup below.

// ── information pop-ups ──────────────────────────────────────────────────────

function openPopup(html, cardClass = '') {
  hideStripExplainer();
  stopLearnMore();
  stopTitle();
  popup.querySelector('.popup__card').className = `popup__card${cardClass ? ` ${cardClass}` : ''}`;
  popupBody.innerHTML = html;
  popup.hidden = false;
}

// Closing a popup also stops any narration the popup started: explanation clips
// must never outlive the text that introduced them (spec section 5).
function closePopup() {
  stopExplain();
  stopLearnMore();
  popup.hidden = true;
}

function composerPopup(id) {
  const c = composerById(id);
  openPopup(`
    <h2><button class="popup__say" data-say="composer-${c.id}">${c.name}<span class="popup__say-cue" aria-hidden="true">🔊</span></button></h2>
    <p class="popup__meta">${[c.country, (c.birthYear && c.deathYear) ? `${c.birthYear}–${c.deathYear}` : null, c.period].filter(Boolean).join(' · ')}</p>
    <p>${c.summary}</p>
    <p><strong>Known for.</strong> ${c.knownFor}</p>`);
}

// For grown-ups (owner, 2026-10-03): the child-level script and the word
// meanings now live in the room's word scroll, spoken, with the companion
// explaining. What is left here is the material for the adult reading over a
// child's shoulder — the room's question and thesis, where its music comes
// from, and the cross-room connection sentences the picture doors used to
// carry. Nothing here is spoken.
function knowledgePopup(room) {
  const origins = originLine(room);
  const crossRoomConnections = room.connections.filter((c) => c.toRoomId);
  openPopup(`
    <h2>${room.title}</h2>
    <p class="popup__meta">For grown-ups</p>
    <div class="popup__grownups">
      <p class="popup__meta">${room.openingQuestion}</p>
      <p>${room.thesis}</p>
      ${origins ? `<p><strong>Music from.</strong> ${origins}</p>` : ''}
      ${crossRoomConnections.length ? `<div class="popup__connections"><strong>Where this room leads.</strong>${crossRoomConnections.map((conn) => `<p class="popup__connection">${conn.label} <em>➜ ${roomById(conn.toRoomId)?.title || ''}</em></p>`).join('')}</div>` : ''}
    </div>`);
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

// The per-song explanation popup (CG-315, owner decision 2026-09-25: "pop up text
// and voice"). Facts paragraph first, then the shared knowledge-glossary lines the
// piece references (0-2 of them), each with its own 🔊 Listen control. The voice is
// a PRE-RENDERED ElevenLabs clip the app builds by id (see explain-audio.js) — no
// device TTS, ever, no speaker promising a sound: if the clip has not been rendered
// yet the control stays quiet and the text still carries the answer (spec section
// 5; AUDIO-DIRECTION.md).
function listenMarkup(clipId) {
  return `<button class="popup__listen" data-explain-listen="${clipId}" aria-label="Hear this read aloud">
    <span aria-hidden="true">🔊</span><span>Listen</span>
  </button>`;
}

function explainFactsPopup(id) {
  const p = pieceById(id);
  const facts = EXPLANATIONS[id]?.facts;
  if (!p || !facts) return;
  const glossaryLines = (Array.isArray(facts.knowledge) ? facts.knowledge : [])
    .map((gid) => MUSIC_KNOWLEDGE[gid])
    .filter(Boolean);
  openPopup(`
    <h2>${p.title} <span aria-hidden="true">💡</span></h2>
    <p class="popup__meta">A true story</p>
    <p>${facts.text}</p>
    ${listenMarkup(`${id}-facts`)}
    ${glossaryLines.length ? `
      <div class="popup__glossary" aria-label="Good to know">
        ${facts.knowledge.map((gid) => {
          const g = MUSIC_KNOWLEDGE[gid];
          if (!g) return '';
          return `
            <p class="popup__glossary-line"><span class="popup__glossary-cue" aria-hidden="true">✨</span>
              <span class="popup__glossary-text">${g.text}</span>${listenMarkup(`knowledge-${gid}`)}
            </p>`;
        }).join('')}
      </div>` : ''}`);
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
  closePopup();
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

  if (playingPieceId === id && player.playing) {
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
  if (id && which) stage.dataset.playingMode = which;
  else delete stage.dataset.playingMode;
  stage.querySelectorAll('[data-piece-wrap]').forEach((node) => {
    node.classList.toggle('is-playing', node.dataset.pieceWrap === id);
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
  hideStripExplainer();
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
  else if (view === 'index') {
    if (!journey.companionId) renderLanding(); else renderIndex();
  }
  else if (view === 'playroom') {
    currentView = 'playroom';
    document.body.dataset.view = currentView;
    // Sets currentView first, so the atmosphere stopPiece() restores is the
    // room's own: page tune stopped, nothing started.
    stopPiece();
    renderPlayroom({ stage, engine, player, journeyCompanionId: journey.companionId, roomId: journey.roomId });
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
  stopLearnMore();
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
  if (img.classList.contains('bubble__art') || img.classList.contains('index-tile__art')) {
    const note = document.createElement('span');
    note.className = img.classList.contains('index-tile__art') ? 'index-tile__art index-tile__art--none' : 'bubble__art bubble__art--none';
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

  if (t.closest('[data-companion-picker]')) { companionPickerPopup(); return; }

  const indexSong = t.closest('[data-index-song]');
  if (indexSong) { openSongFromIndex(indexSong.dataset.indexSong); return; }

  const indexLetter = t.closest('[data-index-letter]');
  if (indexLetter) { jumpToLetter(indexLetter); return; }

  const companion = t.closest('[data-companion]');
  if (companion) {
    roomModes.clear();
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
  if (play) {
    const p = pieceById(play.dataset.play);
    const wanted = roomModes.get(journey.roomId) || 'melody';
    playPiece(play.dataset.play, wanted === 'piano' && p?.piano ? 'piano' : 'melody');
    return;
  }

  const mode = t.closest('[data-room-mode]');
  if (mode && !mode.disabled) {
    roomModes.set(journey.roomId, mode.dataset.roomMode);
    stage.querySelectorAll('[data-room-mode]').forEach((button) => {
      const current = button.dataset.roomMode === mode.dataset.roomMode;
      button.classList.toggle('is-current', current);
      button.setAttribute('aria-pressed', String(current));
    });
    // A mode choice affects the next disc tap; it never restarts a tune under
    // the child's finger or turns a no-bass song into a silent control.
    return;
  }

  const explainFacts = t.closest('[data-explain-facts]');
  if (explainFacts) { explainFactsPopup(explainFacts.dataset.explainFacts); return; }

  const explainListen = t.closest('[data-explain-listen]');
  if (explainListen) { speakExplain(explainListen.dataset.explainListen); return; }

  const word = t.closest('[data-strip-say]');
  if (word) {
    showStripExplainer(word, word.dataset.stripSay, LEARN_MORE_WORD_MEANINGS[word.dataset.stripSay]);
    return;
  }
  const story = t.closest('[data-story-say]');
  if (story) {
    const p = pieceById(story.dataset.storySay);
    const clipId = `${p.id}-facts`;
    showStripExplainer(story, clipId, EXPLANATIONS[p.id]?.facts?.text,
      { title: p.shortTitle || p.title, src: explainClipPath(clipId) });
    return;
  }
  const roomSay = t.closest('[data-room-say]');
  if (roomSay) {
    showStripExplainer(roomSay, roomSay.dataset.roomSay, LEARN_MORE_ROOM_SCRIPTS[roomSay.dataset.roomSay]);
    return;
  }

  if (handleSay(t)) return;

  const comp = t.closest('[data-composer]');
  if (comp) { composerPopup(comp.dataset.composer); return; }

  const know = t.closest('[data-knowledge]');
  if (know) { knowledgePopup(roomById(know.dataset.knowledge)); return; }

  const compare = t.closest('[data-compare]');
  if (compare) { openCompare(compare.dataset.compare); return; }

  const page = t.closest('[data-page]');
  if (page) { journey.page = Number(page.dataset.page); renderRoom(); return; }

  // A tap anywhere else closes the companion's explanation.
  if (stripExplainer && !stripExplainer.hidden) hideStripExplainer();
});

// Long-press a bubble for the piece's own information.
let pressTimer = null;
stage.addEventListener('pointerdown', (event) => {
  const disc = event.target.closest('.bubble__disc[data-play], .room-scene-landmark[data-play]');
  if (!disc) return;
  pressTimer = setTimeout(() => { pressTimer = null; piecePopup(disc.dataset.play); }, 620);
});
stage.addEventListener('pointerup', () => { if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; } });
stage.addEventListener('pointercancel', () => { if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; } });

popup.addEventListener('click', (event) => {
  const pick = event.target.closest('[data-companion-pick]');
  if (pick) { switchCompanion(pick.dataset.companionPick); return; }
  if (handleSay(event.target)) return;
  const explainListen = event.target.closest('[data-explain-listen]');
  if (explainListen) { speakExplain(explainListen.dataset.explainListen); return; }
  const compare = event.target.closest('[data-compare]');
  if (compare) { openCompare(compare.dataset.compare); return; }
  if (event.target.closest('[data-close]') || event.target === popup) closePopup();
});

// Audio is scheduled ahead on the audio clock; a hidden page would come back
// with the picture frozen and the music gone. Stop cleanly instead.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (player.playing) stopPiece();
    stopExplain();
    stopLearnMore();
    stopTitle();
  }
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
    stopLearnMore();
    stopTitle();
    stopPiece();
    applyAtmosphere();
  }
});
if (journey.companionId) renderWorld(); else renderLanding();
