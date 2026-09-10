import { AudioEngine } from './audio-engine.js';
import { Player } from './player.js';
import { Bed } from './bed.js';
import { Ambience, hasScene } from './ambience.js';
import { COMPANIONS, companionById } from '../data/instruments.js';
import { PIECES, composerById } from '../data/catalogue.js';
import { GROUPS, groupById } from '../data/world.js';
import { journey } from './journey.js';
import { speakTitle, configureTitles } from './titles.js';

const engine = new AudioEngine();
const player = new Player(engine);
const bed = new Bed(engine);
const ambience = new Ambience(engine);

const stage = document.getElementById('stage');
const popup = document.getElementById('popup');
const popupBody = document.getElementById('popup-body');
const soundBtn = document.getElementById('sound');

let playingPieceId = null;
// Which page is on screen. The background layers depend on it, and reading it
// back off the DOM would mean the atmosphere and the picture could disagree.
let currentView = 'landing';
let bedMode = null;

// ── sound on or off ──────────────────────────────────────────────────────────
//
// AUDIO-DIRECTION.md: every page keeps a Sound toggle. This book shipped without
// one, which was survivable while the only sound was a piece the child chose to
// play and could stop by tapping again. Decision 9's continuous background makes
// it a requirement: sound that starts on its own must be stoppable in one tap.
//
// Off means silent — no bed, no ambience, no instruments, no spoken titles — and
// it is remembered, because a child who turned sound off wants it off tomorrow
// too.

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

// Sound is off and the child just asked for a sound. A dead tap reads as a
// broken app, so the answer points at the control that would fix it — a glow on
// the Sound button, which needs no reading to understand.
function nudgeSound() {
  soundBtn.classList.remove('is-nudged');
  void soundBtn.offsetWidth;            // restart the animation rather than queue it
  soundBtn.classList.add('is-nudged');
}

function syncSoundButton() {
  soundBtn.textContent = sound.on ? '🔊' : '🔇';
  soundBtn.setAttribute('aria-pressed', String(sound.on));
  soundBtn.setAttribute('aria-label', sound.on ? 'Sound on' : 'Sound off');
}

// ── the background layers ────────────────────────────────────────────────────

/**
 * Decide what should be sounding behind the current page, and make it so.
 *
 * Called after every navigation, every toggle and every visibility change
 * rather than having each of those start and stop layers itself. One place
 * decides, so there is no combination of taps that can leave a bed running
 * under a page that should be quiet.
 */
function applyAtmosphere() {
  if (!engine.ctx) return;                     // nothing has been unlocked yet
  // Asserted here rather than only in the toggle handler. `engine.start()` is
  // reached from several taps, and each one that built the graph without going
  // through the toggle would otherwise leave an unmuted master behind a Sound
  // button that says off.
  engine.setMuted(!sound.on);
  if (!sound.on || document.hidden) { stopBed(); ambience.stop(); return; }

  if (currentView === 'landing') {
    ambience.stop();
    setBed('parade', () => bed.startParade(COMPANIONS, paradeGlow));
    const cue = stage.querySelector('.listen-cue');
    if (cue) cue.remove();
  } else if (currentView === 'world') {
    ambience.stop();
    setBed(`world:${journey.companionId}`, () => bed.startWorld(companionById(journey.companionId)));
  } else {
    // A group page. The bed stops rather than ducking: the child came here to
    // tap a piece, and a tune playing underneath the piece is the app talking
    // over its own lesson. What stays is the sound of the place.
    stopBed();
    if (hasScene(journey.groupId)) ambience.start(journey.groupId); else ambience.stop();
  }
}

function setBed(mode, begin) {
  if (bedMode === mode && bed.playing) return;
  bed.stop();
  bedMode = mode;
  begin();
}

function stopBed() {
  bed.stop();
  bedMode = null;
}

// The card whose instrument currently has the melody.
function paradeGlow(index) {
  stage.querySelectorAll('[data-companion]').forEach((card, i) => {
    card.classList.toggle('is-voicing', i === index);
  });
}

// The first touch. Browsers will not sound anything before one, so this is where
// the audio graph is built and the background starts — from any tap at all, not
// only from the invitation on the landing page, so a child who goes straight for
// a companion is not left in silence.
function unlockAudio() {
  engine.start();
  if (journey.companionId) engine.setInstrument(companionById(journey.companionId));
  applyAtmosphere();                    // which is also what applies the mute
}

const pieceById = (id) => PIECES.find((p) => p.id === id);

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

function renderLanding() {
  stopPiece();
  currentView = 'landing';
  stage.className = 'stage stage--landing';
  stage.style.backgroundImage = 'url(assets/backgrounds/garden-pastel.webp)';
  stage.innerHTML = `
    <div class="scrim">
      <header class="hero">
        <p class="hero__eyebrow">Welcome, young musician</p>
        <h1 class="hero__title"><span class="hero__line">Choose Your</span> <span class="hero__line">Music Companion</span></h1>
        <p class="hero__sub">Your friend plays every piece on your journey.</p>
        ${bed.playing ? '' : '<button class="listen-cue" data-listen>Hear them play</button>'}
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
}

// ── page 2: the music world ──────────────────────────────────────────────────

function renderWorld() {
  stopPiece();
  currentView = 'world';
  const c = companionById(journey.companionId);
  stage.className = 'stage stage--world';
  stage.style.backgroundImage = 'url(assets/backgrounds/garden-green.webp)';
  stage.innerHTML = `
    <div class="scrim">
      <div class="topbar">
        <button class="round-btn" data-go="landing" aria-label="Choose another companion">⌂</button>
        <div class="banner"><h1>Music World</h1><p>Choose where to explore.</p></div>
        <div class="guide-badge"><img src="${c.art}" alt=""><span>${c.name}</span></div>
      </div>
      <div class="group-grid">
        ${GROUPS.map((g) => `
          <button class="group-card${g.status === 'soon' ? ' is-soon' : ''}"
                  data-group="${g.id}" ${g.status === 'soon' ? 'disabled' : ''}>
            <span class="group-card__art" style="background-image:url(${g.background});background-position:${g.focus || 'center'}"></span>
            <span class="group-card__label" style="--accent:${g.accent}">${g.title}</span>
            ${g.status === 'soon' ? '<span class="group-card__soon">Opening soon</span>' : ''}
          </button>`).join('')}
      </div>
      ${companionCorner(c.greeting)}
    </div>`;
}

// ── page 3: a group ──────────────────────────────────────────────────────────

function renderGroup() {
  stopPiece();
  currentView = 'group';
  const g = groupById(journey.groupId);
  const c = companionById(journey.companionId);
  const pieces = g.pieceIds.map(pieceById).filter(Boolean);
  const start = journey.page * g.pageSize;
  const shown = pieces.slice(start, start + g.pageSize);
  const pages = Math.max(1, Math.ceil(pieces.length / g.pageSize));
  const composer = g.composerId ? composerById(g.composerId) : null;

  stage.className = 'stage stage--group';
  stage.style.backgroundImage = `url(${g.background})`;
  stage.innerHTML = `
    <div class="scrim">
      <div class="topbar">
        <button class="round-btn" data-go="world" aria-label="Back to Music World">←</button>
        <div class="banner banner--group"><h1>${g.title}</h1><p>${g.subtitle}</p></div>
        <div class="guide-badge"><img src="${c.art}" alt=""><span>${c.name}</span></div>
      </div>

      <div class="group-body">
        <div class="bubble-field">
          ${shown.map((p) => bubbleMarkup(p)).join('')}
        </div>
        <aside class="info-rail">
          ${composer ? `
            <button class="info-square" data-composer="${composer.id}" aria-label="About ${composer.name}">
              ${composer.portrait ? `<img class="info-square__face" src="${composer.portrait}" alt="">` : `<span class="info-square__face info-square__face--monogram">${composer.shortName[0]}</span>`}
              <span class="info-square__label"><span class="info-square__line">About</span> <span class="info-square__line">${composer.shortName}</span></span>
            </button>` : ''}
          ${g.knowledge ? `
            <button class="info-diamond" data-knowledge="${g.id}" aria-label="${g.knowledge.title}">
              <span class="info-diamond__inner"><span>💡</span></span>
              <span class="info-diamond__label">Learn More</span>
            </button>` : ''}
        </aside>
      </div>

      ${pages > 1 ? `
        <div class="pager">
          ${Array.from({ length: pages }, (_, i) =>
            `<button class="pager__dot${i === journey.page ? ' is-current' : ''}" data-page="${i}" aria-label="Page ${i + 1}"></button>`
          ).join('')}
        </div>` : ''}

      ${companionCorner(g.greetingShown ? null : c.greeting)}
    </div>`;

  // One line per page, and only the first time this group is opened in the
  // journey. The companion should feel present, not chatty -- a character who
  // speaks after every tap stops being a character and becomes a notification.
  g.greetingShown = true;
}

function bubbleMarkup(p) {
  const big = p.importanceLevel === 3;
  const art = p.art
    ? `<img class="bubble__art" src="${p.art}" alt="">`
    : `<span class="bubble__art bubble__art--none">♪</span>`;
  return `
    <div class="bubble${big ? ' bubble--large' : ''}" data-piece-wrap="${p.id}">
      <button class="bubble__disc" data-play="${p.id}" aria-label="Play ${p.title}">
        ${art}
        <span class="bubble__pulse"></span>
      </button>
      <button class="bubble__name" data-say="${p.id}">${p.shortTitle || p.title}</button>
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
    <p class="popup__meta">${c.country} · ${c.birthYear}–${c.deathYear} · ${c.period}</p>
    <p>${c.summary}</p>
    <p><strong>Known for.</strong> ${c.knownFor}</p>`);
}

function knowledgePopup(groupId) {
  const g = groupById(groupId);
  openPopup(`<h2>${g.knowledge.title}</h2><p>${g.knowledge.body}</p>`);
}

function piecePopup(id) {
  const p = pieceById(id);
  openPopup(`
    <h2><button class="popup__say" data-say="${p.id}">${p.title}<span class="popup__say-cue" aria-hidden="true">🔊</span></button></h2>
    <p class="popup__meta">${composerById(p.composerId).name}${p.year ? ` · ${p.year}` : ''}</p>
    <p><strong>Listen for.</strong> ${p.info.listenFor}</p>
    ${p.info.whyItMatters ? `<p>${p.info.whyItMatters}</p>` : ''}`);
}

// ── playing ──────────────────────────────────────────────────────────────────

function playPiece(id) {
  // Silent playback with a pulsing ring would tell the child the app is playing
  // something they simply cannot hear. Refuse, and say where the switch is.
  if (!sound.on) { nudgeSound(); return; }
  const p = pieceById(id);
  engine.setInstrument(companionById(journey.companionId));

  if (playingPieceId === id && player.playing) {
    stopPiece();
    return;
  }
  player.load({ tempo: p.excerpt.tempo, notes: p.excerpt.notes });
  player.play();
  setPlayingUI(id);
  // The place the child is standing in stays audible, but well back. Stopping
  // it dead would make the room vanish the moment a piece starts and reappear
  // when it ends, which is more distracting than the ambience ever was.
  engine.duck('piece', true);
}

// Stopping a piece is three things that have to happen together: the sound, the
// pulsing ring, and letting the background back up. Every path that ends a piece
// goes through here -- tapping the bubble again, navigating away, the toggle, the
// page being hidden, the piece simply finishing -- because the one that forgot
// the third would leave the room ducked for the rest of the session and there
// would be nothing on screen to show why.
function stopPiece() {
  player.stop();
  setPlayingUI(null);
  engine.duck('piece', false);
}

function setPlayingUI(id) {
  playingPieceId = id;
  stage.querySelectorAll('[data-piece-wrap]').forEach((node) => {
    node.classList.toggle('is-playing', node.dataset.pieceWrap === id);
  });
}

player.onFinish = () => stopPiece();

// ── routing ──────────────────────────────────────────────────────────────────

function go(view) {
  if (view === 'landing') { journey.restart(); renderLanding(); }
  else if (view === 'world') { journey.groupId = null; renderWorld(); }
  else if (view === 'group') renderGroup();
}

// Tapping any name -- a bubble's plate, or a heading inside a popup -- speaks it.
// Shared rather than duplicated: the highlight window and the speak call have to
// stay in step, and two copies of a 700ms timeout is how they stop being.
function handleSay(target) {
  const say = target.closest('[data-say]');
  if (!say) return false;
  say.classList.add('is-speaking');
  setTimeout(() => say.classList.remove('is-speaking'), 700);
  if (!sound.on) { nudgeSound(); return true; }
  // The clip plays through the mixer, so the graph has to exist before it does.
  // This is inside a tap, which is the only place a browser allows it.
  engine.start();
  speakTitle(say.dataset.say);
  return true;
}

stage.addEventListener('click', (event) => {
  const t = event.target;

  const companion = t.closest('[data-companion]');
  if (companion) {
    journey.start(companion.dataset.companion);
    renderWorld();
    unlockAudio();                        // first gesture: build the graph, start the world bed
    return;
  }

  // "Hear them play". A child may also have sound switched off from a previous
  // visit, in which case asking to hear something is an unambiguous request for
  // it to be on.
  if (t.closest('[data-listen]')) {
    if (!sound.on) { sound.on = true; sound.save(); syncSoundButton(); }
    unlockAudio();
    return;
  }

  const group = t.closest('[data-group]');
  if (group) {
    journey.groupId = group.dataset.group;
    journey.page = 0;
    renderGroup();
    applyAtmosphere();
    return;
  }

  const nav = t.closest('[data-go]');
  if (nav) { go(nav.dataset.go); applyAtmosphere(); return; }

  const play = t.closest('[data-play]');
  if (play) { playPiece(play.dataset.play); return; }

  if (handleSay(t)) return;

  const comp = t.closest('[data-composer]');
  if (comp) { composerPopup(comp.dataset.composer); return; }

  const know = t.closest('[data-knowledge]');
  if (know) { knowledgePopup(know.dataset.knowledge); return; }

  const page = t.closest('[data-page]');
  if (page) { journey.page = Number(page.dataset.page); renderGroup(); }
});

// Long-press a bubble for the piece's own information.
let pressTimer = null;
stage.addEventListener('pointerdown', (event) => {
  const disc = event.target.closest('[data-play]');
  if (!disc) return;
  pressTimer = setTimeout(() => { pressTimer = null; piecePopup(disc.dataset.play); }, 620);
});
stage.addEventListener('pointerup', () => { if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; } });
stage.addEventListener('pointercancel', () => { if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; } });

popup.addEventListener('click', (event) => {
  if (handleSay(event.target)) return;
  if (event.target.closest('[data-close]') || event.target === popup) popup.hidden = true;
});

soundBtn.addEventListener('click', () => {
  sound.on = !sound.on;
  sound.save();
  syncSoundButton();
  engine.setMuted(!sound.on);
  // Muting alone would leave a bubble pulsing away silently, which tells the
  // child the app is still playing something. Stop it properly.
  if (!sound.on) stopPiece();
  applyAtmosphere();
});

// Any first touch unlocks the audio graph. Capture, and once: the click handlers
// below assume a context already exists, and a child's first tap should not be
// the one tap that makes no sound.
document.addEventListener('pointerdown', unlockAudio, { capture: true, once: true });

// Audio is scheduled ahead on the audio clock; a hidden page would come back
// with the picture frozen and the music gone. Stop cleanly instead.
//
// The background layers are torn down too, not just paused. A bed scheduled
// twenty-five seconds ahead does not survive being backgrounded on an iPad, and
// a child returning to the page should hear the room start again rather than
// arrive in the middle of a phrase that was scheduled before they left.
document.addEventListener('visibilitychange', () => {
  if (document.hidden && player.playing) stopPiece();
  applyAtmosphere();
});

sound.load();
syncSoundButton();
configureTitles({ engine, soundOn: () => sound.on });

// A handle on the audio layer, on purpose.
//
// Sound is the one part of this book that cannot be checked by looking at it,
// and the two places it gets checked -- a preview pane that keeps the page
// hidden, and Safari on the iPad itself -- both need a way in. With this, a
// duck is `musicBook.engine.buses.ambience.dry.gain.value` rather than an act
// of faith. It exposes no secrets and holds no state the app reads back.
window.musicBook = { engine, player, bed, ambience, sound };

journey.restore();
if (journey.companionId) renderWorld(); else renderLanding();
