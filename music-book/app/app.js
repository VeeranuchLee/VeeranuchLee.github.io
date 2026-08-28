import { AudioEngine } from './audio-engine.js';
import { Player } from './player.js';
import { COMPANIONS, companionById } from '../data/instruments.js';
import { PIECES, composerById } from '../data/catalogue.js';
import { WINGS, ROOMS, PIECE_ROOMS } from '../data/rooms.js';
import { journey } from './journey.js';
import { speakTitle } from './titles.js';
import { createChapter } from './read-together.js';

const engine = new AudioEngine();
const player = new Player(engine);

const stage = document.getElementById('stage');
const popup = document.getElementById('popup');
const popupBody = document.getElementById('popup-body');

let playingPieceId = null;
let playingWhich = null;
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

// Placeholder visual identity per wing until wing art exists. Six wings, five
// painted backgrounds: `cities-colour-new-pulse` deliberately reuses a
// background at a different focus rather than inventing art. Accents are
// presentational only — the wing's content comes entirely from data/rooms.js.
const WING_STYLE = {
  'songs-we-already-carry': { background: 'assets/backgrounds/garden-pastel.webp', focus: '50% 46%', accent: '#3f6b4f' },
  'the-world-sings': { background: 'assets/backgrounds/garden-green.webp', focus: '50% 50%', accent: '#2f6b63' },
  'music-for-shared-days': { background: 'assets/backgrounds/music-room.webp', focus: '50% 40%', accent: '#8a5a12' },
  'the-time-corridor': { background: 'assets/backgrounds/beethoven-hall.webp', focus: '50% 42%', accent: '#22385a' },
  'the-romantic-century': { background: 'assets/backgrounds/night-piano.webp', focus: '50% 45%', accent: '#2b2f6b' },
  'cities-colour-new-pulse': { background: 'assets/backgrounds/garden-green.webp', focus: '18% 62%', accent: '#6b3f5f' }
};
const wingStyle = (id) => WING_STYLE[id] ?? { background: 'assets/backgrounds/garden-green.webp', focus: 'center', accent: '#22385a' };

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
  player.stop();
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
      <header class="hero">
        <p class="hero__eyebrow">Welcome, young musician</p>
        <h1 class="hero__title"><span class="hero__line">Choose Your</span> <span class="hero__line">Music Companion</span></h1>
        <p class="hero__sub">Your friend plays every piece on your journey.</p>
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

// ── page 2: the music world (six wings) ──────────────────────────────────────

function renderWorld() {
  player.stop();
  const c = companionById(journey.companionId);
  stage.className = 'stage stage--world';
  stage.style.backgroundImage = 'url(assets/backgrounds/garden-green.webp)';
  stage.innerHTML = `
    <div class="scrim">
      <div class="topbar">
        <button class="round-btn" data-go="landing" aria-label="Choose another companion">⌂</button>
        <div class="banner"><h1>Music World</h1><p>Six wings, twenty-four rooms.</p></div>
        <div class="guide-badge"><img src="${c.art}" alt=""><span>${c.name}</span></div>
      </div>
      <div class="wing-grid">
        ${WINGS.map((wing) => {
          const style = wingStyle(wing.id);
          return `
          <button class="wing-card" data-wing="${wing.id}">
            <span class="wing-card__art" style="background-image:url(${style.background});background-position:${style.focus}"></span>
            <span class="wing-card__label" style="--accent:${style.accent}">${wing.title}</span>
            <span class="wing-card__count">${wing.roomIds.length} room${wing.roomIds.length === 1 ? '' : 's'}</span>
          </button>`;
        }).join('')}
      </div>
      ${companionCorner(c.greeting)}
    </div>`;
}

// ── page 3: a wing (its rooms) ───────────────────────────────────────────────

function renderWing() {
  player.stop();
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
          return `
          <button class="room-card" data-room="${room.id}" style="--accent:${style.accent}">
            <span class="room-card__number">Room ${room.number}</span>
            <span class="room-card__title">${room.title}</span>
            <span class="room-card__subtitle">${room.subtitle}</span>
            <span class="room-card__count">${room.pieceIds.length} piece${room.pieceIds.length === 1 ? '' : 's'}</span>
          </button>`;
        }).join('')}
      </div>
      ${companionCorner(null)}
    </div>`;
}

// ── page 4: a room (its pieces) ──────────────────────────────────────────────

function renderRoom() {
  player.stop();
  const room = roomById(journey.roomId);
  if (!room) { renderWorld(); return; }

  // Read Together is the default and Explore is the return mode. A room with an
  // authored chapter the child has not finished opens into the chapter.
  if (chapter.isFor(room.id) && exploreOverride !== room.id) {
    chapter.open(room.id);
    return;
  }
  chapter.close();
  const wing = wingById(room.wingId);
  const c = companionById(journey.companionId);
  const style = wingStyle(room.wingId);
  const pieces = room.pieceIds.map(pieceById).filter(Boolean);

  // The pager page never outlives the room it belongs to: clamped here on
  // every render, and reset to 0 by the room-change handlers below.
  const pages = Math.max(1, Math.ceil(pieces.length / PAGE_SIZE));
  journey.page = Math.min(Math.max(0, journey.page), pages - 1);
  const shown = pieces.slice(journey.page * PAGE_SIZE, journey.page * PAGE_SIZE + PAGE_SIZE);

  stage.className = 'stage stage--room';
  stage.style.backgroundImage = `url(${style.background})`;
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
  const p = pieceById(id);
  const resolved = which || (p.full ? 'melody' : 'excerpt');
  const score = scoreFor(p, resolved);
  if (!score) return;
  // The chapter installs its own note/finish handlers while it is on screen.
  // Explore takes them back here rather than at module load, so returning from
  // a chapter cannot leave Explore driving a contour that is no longer drawn.
  player.onNote = () => {};
  player.onFinish = () => setPlayingUI(null, null);
  engine.setInstrument(companionById(journey.companionId));

  if (playingPieceId === id && playingWhich === resolved && player.playing) {
    player.stop();
    setPlayingUI(null, null);
    return;
  }
  player.load(score);
  player.play();
  setPlayingUI(id, resolved);
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

player.onFinish = () => setPlayingUI(null, null);

const chapter = createChapter({
  stage,
  engine,
  player,
  journey,
  pieceById,
  companionById,
  exitToExplore: () => { exploreOverride = journey.roomId; renderRoom(); },
  exitToWing: () => { chapter.close(); go('wing'); }
});

// ── routing ──────────────────────────────────────────────────────────────────

function go(view) {
  if (view === 'landing') { journey.restart(); renderLanding(); }
  else if (view === 'world') { journey.wingId = null; journey.roomId = null; renderWorld(); }
  else if (view === 'wing') { journey.roomId = null; renderWing(); }
  else if (view === 'room') renderRoom();
}

// Tapping any name -- a bubble's plate, or a heading inside a popup -- speaks it.
// Shared rather than duplicated: the highlight window and the speak call have to
// stay in step, and two copies of a 700ms timeout is how they stop being.
function handleSay(target) {
  const say = target.closest('[data-say]');
  if (!say) return false;
  say.classList.add('is-speaking');
  setTimeout(() => say.classList.remove('is-speaking'), 700);
  speakTitle(say.dataset.say);
  return true;
}

stage.addEventListener('click', (event) => {
  const t = event.target;

  if (chapter.active() && chapter.click(t)) return;

  const companion = t.closest('[data-companion]');
  if (companion) {
    journey.start(companion.dataset.companion);
    engine.start();                       // first gesture: unlock audio
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
  if (document.hidden && player.playing) { player.stop(); setPlayingUI(null, null); }
});

journey.restore();
if (journey.companionId) renderWorld(); else renderLanding();
