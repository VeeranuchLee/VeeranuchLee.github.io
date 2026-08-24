import { AudioEngine } from './audio-engine.js';
import { Player } from './player.js';
import { COMPANIONS, companionById } from '../data/instruments.js';
import { PIECES, composerById } from '../data/catalogue.js';
import { GROUPS, groupById } from '../data/world.js';
import { journey } from './journey.js';
import { speakTitle } from './titles.js';

const engine = new AudioEngine();
const player = new Player(engine);

const stage = document.getElementById('stage');
const popup = document.getElementById('popup');
const popupBody = document.getElementById('popup-body');

let playingPieceId = null;

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
  player.stop();
  stage.className = 'stage stage--landing';
  stage.style.backgroundImage = 'url(assets/backgrounds/garden-pastel.webp)';
  stage.innerHTML = `
    <div class="scrim">
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

// ── page 2: the music world ──────────────────────────────────────────────────

function renderWorld() {
  player.stop();
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
  player.stop();
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
  const p = pieceById(id);
  engine.setInstrument(companionById(journey.companionId));

  if (playingPieceId === id && player.playing) {
    player.stop();
    setPlayingUI(null);
    return;
  }
  player.load({ tempo: p.excerpt.tempo, notes: p.excerpt.notes });
  player.play();
  setPlayingUI(id);
}

function setPlayingUI(id) {
  playingPieceId = id;
  stage.querySelectorAll('[data-piece-wrap]').forEach((node) => {
    node.classList.toggle('is-playing', node.dataset.pieceWrap === id);
  });
}

player.onFinish = () => setPlayingUI(null);

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
  speakTitle(say.dataset.say);
  return true;
}

stage.addEventListener('click', (event) => {
  const t = event.target;

  const companion = t.closest('[data-companion]');
  if (companion) {
    journey.start(companion.dataset.companion);
    engine.start();                       // first gesture: unlock audio
    engine.setInstrument(companionById(journey.companionId));
    renderWorld();
    return;
  }

  const group = t.closest('[data-group]');
  if (group) { journey.groupId = group.dataset.group; journey.page = 0; renderGroup(); return; }

  const nav = t.closest('[data-go]');
  if (nav) { go(nav.dataset.go); return; }

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

// Audio is scheduled ahead on the audio clock; a hidden page would come back
// with the picture frozen and the music gone. Stop cleanly instead.
document.addEventListener('visibilitychange', () => {
  if (document.hidden && player.playing) { player.stop(); setPlayingUI(null); }
});

journey.restore();
if (journey.companionId) renderWorld(); else renderLanding();
