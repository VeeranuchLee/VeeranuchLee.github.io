// Princess Dress Up Room — the dressing room, Show time, the album and the fashion show.
// PLAN.md 3 is the design; this file wires it to the page.
import { preload, ensureLook, onImageReady, pinLook, lookReady, drawLook, drawStage, fitDoll, drawThumb, drawPattern } from './art.js';
import { defaultLook, sanitize, applyItem, isWorn, setShade, setPattern, currentShade, surprise, sameLook } from './look.js';
import { play, setEnabled, isEnabled, context as audioContext, rebuild as rebuildAudio } from './sound.js';
import { icons } from './icons.js';
import { runShowTime, runFashionShow, drawCard } from './show.js';
import * as store from './store.js';
import { hexToRgb, mix, rgbToHex } from './colour.js';
import { POSE_DATASETS, poseForDataset, choosePoseDoll, rememberPoseLook, entryPose, tagAlbum, mergeLegacyAlbums } from './poses.js';

const $ = (id) => document.getElementById(id);
// Production always opens the reviewed Standing room. Runway is reached through the
// in-app pose buttons; prototype plates and layout review switches are not public routes.
const DATASET = 'items';
const POSE_ROOM = true;
let pose = poseForDataset(DATASET);

const HOLDOVER_MS = 300;   // taps ignored after any screen change (PLAN.md 3.3)
const HOLD_MS = 2000;      // the grown-up hold for Save to Photos
const DPR = () => Math.min(2, window.devicePixelRatio || 1);

let data = null;
let datasets = {};         // pose -> data; prototypes have a single entry
let state = null;          // { poses: { pose: { doll, looks } }, album, sound }
let tab = 'dresses';
let dressStyle = 'all';
let undoStack = [];
let lastTheme = null;
let tapLockUntil = 0;
let screen = 'room';
let lastFit = null;
let stopFashion = null;
let cardEntry = null;
let showTaken = false;
let lastShowMs = 0;
let poseSwitchToken = 0;
let poseLoading = false;

// ---------- tap gating: the holdover rule ----------
function lockTaps() { tapLockUntil = performance.now() + HOLDOVER_MS; }
document.addEventListener('click', (e) => {
  if (performance.now() < tapLockUntil) { e.stopPropagation(); e.preventDefault(); }
}, true);
document.addEventListener('pointerdown', (e) => {
  if (performance.now() < tapLockUntil) e.stopPropagation();
}, true);

function ack(el) {
  if (!el) return;
  el.classList.remove('ack');
  void el.offsetWidth; // restart the animation
  el.classList.add('ack');
}
function wiggle(el) {
  el.classList.remove('wiggle'); void el.offsetWidth; el.classList.add('wiggle');
}

// ---------- state ----------
const poseState = () => state.poses[pose];
const look = () => poseState().looks[poseState().doll];
function persist() {
  if (POSE_ROOM) store.savePoseRoom({ pose, poses: state.poses, album: state.album, sound: state.sound });
  else store.saveDataset(DATASET, { doll: poseState().doll, looks: poseState().looks, album: state.album, sound: state.sound });
}
function pushUndo() { undoStack.push({ doll: poseState().doll, look: JSON.parse(JSON.stringify(look())) }); }
function commit(nextLook) {
  pushUndo();
  rememberPoseLook(state.poses, pose, poseState().doll, nextLook);
  persist();
}

// ---------- the doll ----------
function sizeCanvas(c) {
  const r = c.getBoundingClientRect();
  const w = Math.max(1, Math.round(r.width * DPR())), h = Math.max(1, Math.round(r.height * DPR()));
  if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  return { w, h };
}

let dollWait = null;
function renderDoll(waited = false) {
  // Never draw her with a picture still loading: that painted her without hair or dress
  // for a moment on every tap (owner 2026-11-05, "the hair keep flashing"). Keep the
  // previous picture up until the new look is decoded.
  const want = look();
  pinLook(data, want);
  if (!waited && !lookReady(data, want, { stage: true })) {
    const w = dollWait = ensureLook(data, want, { stage: true }).catch(() => {}).then(() => { if (dollWait === w) { dollWait = null; renderDoll(true); } });
    return;
  }
  const sc = $('stage-canvas'), dc = $('doll-canvas'), fc = $('fx-canvas');
  const { w, h } = sizeCanvas(sc);
  sizeCanvas(dc); sizeCanvas(fc);
  const fit = fitDoll(data, w, h, Math.min(w, h) * 0.03);
  lastFit = fit;
  const L = want;
  const sctx = sc.getContext('2d');
  sctx.clearRect(0, 0, w, h);
  drawStage(sctx, data, L.stage, w, h, fit.oy + data.rig.feetY * fit.s, fit.s);
  const dctx = dc.getContext('2d');
  dctx.clearRect(0, 0, w, h);
  drawLook(dctx, data, L, fit.ox, fit.oy, fit.s, { stage: false });
  // the twirl turns about her own middle
  dc.style.transformOrigin = `${(fit.ox + 600 * fit.s) / DPR()}px ${(fit.oy + 1000 * fit.s) / DPR()}px`;
  document.body.dataset.dress = L.dress.id;
}

// sparkles answering a tap, drawn over the doll and never under a control
let fxParts = [];
let fxRaf = 0;
function burst(rx, ry, n = 22, spread = 1) {
  if (!lastFit) return;
  const x = lastFit.ox + rx * lastFit.s, y = lastFit.oy + ry * lastFit.s;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  for (let i = 0; i < (reduced ? Math.ceil(n / 3) : n); i++) {
    const a = Math.random() * Math.PI * 2, v = (0.6 + Math.random() * 2.4) * DPR() * spread * (reduced ? 0.3 : 1);
    fxParts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.6 * DPR(), life: 1, r: (5 + Math.random() * 9) * DPR(),
      c: ['#FFFFFF', '#FFE08A', '#F9B8D3', '#DDF0FF'][i % 4] });
  }
  if (!fxRaf) fxRaf = requestAnimationFrame(fxFrame);
}
function fxFrame() {
  const c = $('fx-canvas'), ctx = c.getContext('2d');
  ctx.clearRect(0, 0, c.width, c.height);
  fxParts = fxParts.filter((p) => p.life > 0);
  for (const p of fxParts) {
    p.x += p.vx; p.y += p.vy; p.vy += 0.04 * DPR(); p.life -= 0.022;
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.c;
    const r = p.r * (0.6 + 0.4 * p.life);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - r); ctx.quadraticCurveTo(p.x, p.y, p.x + r, p.y); ctx.quadraticCurveTo(p.x, p.y, p.x, p.y + r);
    ctx.quadraticCurveTo(p.x, p.y, p.x - r, p.y); ctx.quadraticCurveTo(p.x, p.y, p.x, p.y - r); ctx.fill();
  }
  ctx.globalAlpha = 1;
  fxRaf = fxParts.length ? requestAnimationFrame(fxFrame) : 0;
}

function twirl() {
  const dc = $('doll-canvas');
  dc.classList.remove('twirl'); void dc.offsetWidth; dc.classList.add('twirl');
  play('twirl');
  burst(600, 1000, 30, 1.4);
}

// tapping the doll twirls her; tapping the stage around her sparkles where it landed
$('stage-box').addEventListener('click', (e) => {
  if (!lastFit) return;
  const c = $('stage-canvas'), r = c.getBoundingClientRect();
  const px = (e.clientX - r.left) * DPR(), py = (e.clientY - r.top) * DPR();
  const rx = (px - lastFit.ox) / lastFit.s, ry = (py - lastFit.oy) / lastFit.s;
  const b = data.rig.twirlBox;
  if (rx >= b.x && rx <= b.x + b.w && ry >= b.y && ry <= b.y + b.h) twirl();
  else { play('tap'); burst(rx, ry, 10, 0.6); }
});

// ---------- doll ribbon ----------
function portraitLook(doll) {
  const slip = data.items.find((it) => it.id === 'dress-slip');
  return {
    ...poseState().looks[doll.id],
    dress: { id: slip.id, shade: slip.defaultShade || 0, pattern: 'none' },
    crown: null, earrings: null, necklace: null, wings: null,
  };
}

function drawPortrait(canvas, doll, loaded = false) {
  const size = 64 * DPR();
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size * 0.4, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, '#FFFFFF'); g.addColorStop(1, doll.signature);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2); ctx.clip();
  const L = portraitLook(doll);
  drawThumb(ctx, data, L, doll.portrait || { x: 340, y: 150, w: 520, h: 520 }, size, size);
  ctx.restore();
  if (!loaded) ensureLook(data, L).then(() => { if (canvas.isConnected) drawPortrait(canvas, doll, true); });
}

function buildRibbon() {
  const rib = $('ribbon');
  rib.innerHTML = '';
  for (const d of data.dolls) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'portrait'; b.dataset.doll = d.id;
    b.setAttribute('aria-label', d.name);
    b.setAttribute('aria-pressed', String(d.id === poseState().doll));
    const c = document.createElement('canvas');
    b.appendChild(c);
    rib.appendChild(b);
    drawPortrait(c, d);
    b.addEventListener('click', () => {
      ack(b);
      if (d.id === poseState().doll) { play('same'); twirl(); return; }
      undoStack.push({ doll: poseState().doll, look: JSON.parse(JSON.stringify(look())), dollSwitch: true });
      poseState().doll = d.id; persist();
      play('doll');
      refreshAll();
      burst(600, 700, 26);
    });
  }
}
function refreshRibbon(onlyCurrent = true) {
  for (const b of $('ribbon').children) {
    b.setAttribute('aria-pressed', String(b.dataset.doll === poseState().doll));
    if (!onlyCurrent || b.dataset.doll === poseState().doll) drawPortrait(b.firstChild, data.dolls.find((d) => d.id === b.dataset.doll));
  }
}

// ---------- pose switch ----------
function refreshPoseButtons() {
  const wrap = $('pose-switch');
  wrap.hidden = !POSE_ROOM;
  for (const b of wrap.children) b.setAttribute('aria-pressed', String(b.dataset.pose === pose));
}

function setupPoseButtons() {
  const buttons = [...$('pose-switch').children];
  for (const b of buttons) {
    b.innerHTML = b.dataset.pose === 'runway' ? icons.poseRunway : icons.poseStanding;
    b.addEventListener('click', async () => {
      ack(b);
      if (b.dataset.pose === pose) { play('same'); return; }
      play('tap');
      await switchPose(b.dataset.pose);
    });
  }
  refreshPoseButtons();
}

async function switchPose(target, { dollId = null, rebuild = true } = {}) {
  if (!POSE_ROOM || !datasets[target]) return false;
  const token = ++poseSwitchToken;
  poseLoading = true;
  const targetData = datasets[target];
  const currentDoll = poseState().doll;
  const nextDoll = dollId && targetData.dolls.some((d) => d.id === dollId)
    ? dollId : choosePoseDoll(targetData, currentDoll);
  const targetState = state.poses[target];
  targetState.doll = nextDoll;
  const targetLook = targetState.looks[nextDoll];

  // Keep the old canvases painted while the target base/look decodes. The target sources
  // are pinned before data changes, which is the same no-flash rule used for outfit taps.
  pinLook(targetData, targetLook);
  await ensureLook(targetData, targetLook, { stage: true }).catch(() => {});
  if (token !== poseSwitchToken) return false;

  pose = target;
  data = targetData;
  poseLoading = false;
  dollWait = null;
  undoStack = [];
  lastTheme = null;
  tileQueue.length = 0;
  if (!data.tabs.some((t) => t.id === tab && data.items.some((i) => i.tab === t.id))) tab = data.tabs[0].id;
  if (!data.items.some((it) => it.tab === 'dresses' && styleMatches(it))) dressStyle = 'all';
  persist();
  refreshPoseButtons();
  if (rebuild) {
    buildRibbon();
    buildTabs();
    buildGrid();
    buildColours();
    renderDoll(true);
  }
  return true;
}

// ---------- tabs ----------
function buildTabs() {
  const nav = $('tabs');
  nav.innerHTML = '';
  nav.setAttribute('role', 'tablist');
  for (const t of data.tabs.filter((x) => data.items.some((i) => i.tab === x.id))) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'tab'; b.dataset.tab = t.id;
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-label', t.label);
    b.innerHTML = `${icons[t.icon]}<span class="lbl">${t.label}</span>`;
    b.addEventListener('click', () => {
      ack(b);
      play('tap');
      if (tab === t.id) return;
      tab = t.id;
      refreshTabs(); buildGrid(); buildColours();
      $('grid').scrollTop = 0; $('grid').scrollLeft = 0;
    });
    nav.appendChild(b);
  }
  refreshTabs();
}
function refreshTabs() {
  for (const b of $('tabs').children) b.setAttribute('aria-selected', String(b.dataset.tab === tab));
}

// ---------- item grid ----------
const tabDef = () => data.tabs.find((t) => t.id === tab);
let tileObserver = null;

const styleDefs = [
  ['all', 'All', 'styleAll'],
  ['princess', 'Princess', 'stylePrincess'],
  ['idol', 'Idol', 'styleIdol'],
  ['everyday', 'Everyday', 'styleEveryday'],
  ['magical', 'Magical', 'styleMagical'],
];

function buildStyleFilters() {
  const wrap = $('style-filters');
  wrap.hidden = tab !== 'dresses';
  wrap.innerHTML = '';
  if (wrap.hidden) return;
  const hasStyle = (id) => id === 'all' || data.items.some((it) => it.tab === 'dresses'
    && (id === 'idol' ? it.style === 'idol' || it.style === 'kpop' : it.style === id));
  for (const [id, label, icon] of styleDefs.filter(([id]) => hasStyle(id))) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'style-chip'; b.dataset.style = id;
    b.setAttribute('aria-label', `${label} dresses`);
    b.setAttribute('aria-pressed', String(dressStyle === id));
    b.innerHTML = `${icons[icon]}<span>${label}</span>`;
    b.addEventListener('click', () => {
      ack(b);
      play('tap');
      if (dressStyle === id) return;
      dressStyle = id;
      buildGrid();
      $('grid').scrollTop = 0; $('grid').scrollLeft = 0;
    });
    wrap.appendChild(b);
  }
}

function styleMatches(it) {
  if (dressStyle === 'all') return true;
  if (dressStyle === 'idol') return it.style === 'idol' || it.style === 'kpop';
  return it.style === dressStyle;
}

// A tile is painted once per look and size; its canvas keeps the picture, so its sources
// may be evicted afterwards. Tiles load one at a time so they never evict each other.
const tileQueue = [];
let tileBusy = false;

function tileSig(b, it) {
  return `${JSON.stringify(tileLook(it))}|${Math.round(b.getBoundingClientRect().width)}`;
}

function drawTile(b) {
  if (!b.isConnected) return;
  const it = data.items.find((x) => x.id === b.dataset.item);
  const r = b.getBoundingClientRect();
  if (!r.width || !r.height) return;
  if (b.dataset.sig === tileSig(b, it)) return;
  if (!tileQueue.includes(b)) tileQueue.push(b);
  pumpTiles();
}

async function pumpTiles() {
  if (tileBusy) return;
  tileBusy = true;
  try {
    while (tileQueue.length) {
      const b = tileQueue.shift();
      if (!b.isConnected) continue;
      const it = data.items.find((x) => x.id === b.dataset.item);
      const stage = it.slot === 'stage';
      const tl = tileLook(it);
      if (!lookReady(data, tl, { stage })) await ensureLook(data, tl, { stage }).catch(() => {});
      if (!b.isConnected || !lookReady(data, tileLook(it), { stage })) continue;
      const r = b.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      const c = b.firstChild;
      c.width = Math.round(r.width * DPR()); c.height = Math.round(r.height * DPR());
      const ctx = c.getContext('2d');
      ctx.clearRect(0, 0, c.width, c.height);
      drawThumb(ctx, data, tileLook(it), it.thumb, c.width, c.height, { stage });
      b.dataset.sig = tileSig(b, it);
      await new Promise((res) => setTimeout(res, 16)); // one per frame or so, doll first
    }
  } finally { tileBusy = false; }
}

function buildGrid() {
  const grid = $('grid');
  const def = tabDef();
  buildStyleFilters();
  if (tileObserver) tileObserver.disconnect();
  grid.innerHTML = '';
  grid.dataset.tab = tab;
  grid.setAttribute('aria-label', def.label);
  grid.classList.toggle('aspect-wide', def.tileAspect < 1);
  const items = data.items.filter((i) => i.tab === tab && (tab !== 'dresses' || styleMatches(i)));
  for (const it of items) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'tile'; b.dataset.item = it.id;
    b.setAttribute('aria-label', it.name);
    b.style.setProperty('--tile-ratio', `${(100 / def.tileAspect).toFixed(2)}%`);
    b.innerHTML = `<canvas></canvas><span class="badge">${icons.heart}</span>`;
    b.addEventListener('click', () => wearItem(it, b));
    grid.appendChild(b);
  }
  if ('IntersectionObserver' in window) {
    tileObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) if (entry.isIntersecting) drawTile(entry.target);
    }, { root: grid, rootMargin: '140px' });
    for (const b of grid.children) tileObserver.observe(b);
  }
  refreshTiles(true);
}

function tileLook(it) {
  if (isWorn(look(), it)) return look();
  return applyItem(data, look(), it, { removable: false }).look;
}

function refreshTiles(redraw) {
  const tiles = [...$('grid').children];
  for (const b of tiles) {
    const it = data.items.find((i) => i.id === b.dataset.item);
    const worn = isWorn(look(), it);
    b.classList.toggle('worn', worn);
    b.setAttribute('aria-pressed', String(worn));
  }
  if (!redraw) return;
  // Only visible and near-visible tiles decode their art. They are drawn after the doll,
  // a few per frame, so the first screen never waits for the full wardrobe.
  const gr = $('grid').getBoundingClientRect();
  const visible = tiles.filter((b) => {
    const r = b.getBoundingClientRect();
    return r.bottom >= gr.top - 140 && r.top <= gr.bottom + 140 && r.right >= gr.left - 140 && r.left <= gr.right + 140;
  });
  // drawTile only queues; the queue paints them one at a time
  for (const b of visible) drawTile(b);
}

function wearItem(it, el) {
  ack(el);
  const res = applyItem(data, look(), it);
  if (res.change === 'same') {
    play('same');
    burst(it.anchor.x, it.anchor.y, 14, 0.8);
    return;
  }
  commit(res.look);
  play(res.change === 'remove' ? 'remove' : 'wear');
  renderDoll();
  burst(it.anchor.x, it.anchor.y, res.change === 'remove' ? 10 : 26, res.change === 'remove' ? 0.6 : 1.1);
  afterChange(it.slot === 'dress' || it.slot === 'hair' || it.slot === 'wings');
}

function afterChange(coloursToo) {
  refreshTiles(tab === 'hair' || tab === 'dresses' || tab === 'wings' || tab === 'stages' || tab === 'crowns' || tab === 'jewels');
  if (coloursToo) buildColours(); else refreshColours();
  refreshRibbon(true);
}

// ---------- colour wall and patterns ----------
function colourTarget() {
  const def = tabDef();
  if (!def.colour) return null;
  if (def.colour === 'wings' && !look().wings) return null;
  if (def.colour === 'dress') {
    const dress = data.items.find((i) => i.id === look().dress.id);
    if (!dress || !dress.layers.some((L) => L.tint)) return null; // already-coloured art
  }
  return def.colour;
}

function swatchStyle(hex) {
  const rgb = hexToRgb(hex);
  const hi = rgbToHex(mix(rgb, [255, 255, 255], 0.7)), lo = rgbToHex(mix(rgb, [74, 52, 104], 0.25));
  return `background: radial-gradient(circle at 34% 30%, ${hi} 0 14%, ${hex} 46%, ${lo} 100%);`;
}

function buildColours() {
  const wrap = $('colours'), shades = $('shades'), pats = $('patterns');
  const target = colourTarget();
  const def = tabDef();
  wrap.classList.toggle('no-shades', !target);
  wrap.classList.toggle('no-patterns', !(target && def.patterns));
  shades.innerHTML = '';
  pats.innerHTML = '';
  if (!target) return;
  const pal = target === 'hair' ? data.palettes.hair : data.palettes.dress;
  pal.forEach((hex, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'swatch'; b.dataset.shade = String(i);
    b.setAttribute('aria-label', `Colour ${i + 1}`);
    b.style.cssText = swatchStyle(hex);
    b.addEventListener('click', () => {
      ack(b);
      const next = setShade(look(), colourTarget(), i);
      if (!next) { play('same'); return; }
      commit(next);
      play('shimmer');
      renderDoll();
      const anchor = target === 'hair' ? { x: 600, y: 330 } : target === 'wings' ? { x: 600, y: 800 } : { x: 600, y: 1100 };
      burst(anchor.x, anchor.y, 16, 0.9);
      refreshColours(true);
      refreshTiles(true);
      refreshRibbon(true);
    });
    shades.appendChild(b);
  });
  if (def.patterns) {
    for (const p of data.patterns) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'pattern'; b.dataset.pattern = p;
      b.setAttribute('aria-label', p === 'none' ? 'Plain' : p[0].toUpperCase() + p.slice(1));
      b.appendChild(document.createElement('canvas'));
      b.addEventListener('click', () => {
        ack(b);
        const next = setPattern(look(), p);
        if (!next) { play('same'); return; }
        commit(next);
        play('pattern');
        renderDoll();
        burst(600, 1100, 18, 0.9);
        refreshColours(true);
        refreshTiles(true);
        refreshRibbon(true);
      });
      pats.appendChild(b);
    }
  }
  refreshColours(true);
  // bring the worn shade into view
  const sel = shades.querySelector('[aria-pressed="true"]');
  if (sel) {
    const sr = shades.getBoundingClientRect(), br = sel.getBoundingClientRect();
    shades.scrollLeft = Math.max(0, shades.scrollLeft + (br.left - sr.left) - sr.width / 2 + br.width / 2);
  }
}

function refreshColours(repaintPatterns) {
  const target = colourTarget();
  if (!target) return;
  const cur = currentShade(look(), target);
  for (const b of $('shades').children) b.setAttribute('aria-pressed', String(Number(b.dataset.shade) === cur));
  const L = look();
  for (const b of $('patterns').children) {
    b.setAttribute('aria-pressed', String(b.dataset.pattern === L.dress.pattern));
    if (!repaintPatterns) continue;
    const c = b.firstChild, size = 64 * DPR();
    c.width = size; c.height = size;
    const ctx = c.getContext('2d');
    const hex = data.palettes.dress[L.dress.shade];
    ctx.fillStyle = hex; ctx.fillRect(0, 0, size, size);
    const sh = ctx.createLinearGradient(0, 0, size, size);
    sh.addColorStop(0, 'rgba(255,255,255,0.55)'); sh.addColorStop(1, 'rgba(74,52,104,0.18)');
    ctx.fillStyle = sh; ctx.fillRect(0, 0, size, size);
    if (b.dataset.pattern !== 'none') {
      const p = document.createElement('canvas'); p.width = size; p.height = size;
      drawPattern(p.getContext('2d'), b.dataset.pattern, size, size, size / 150);
      const pc = p.getContext('2d');
      pc.globalCompositeOperation = 'source-in';
      const rgb = hexToRgb(hex), lum = (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255;
      pc.fillStyle = lum > 0.78 ? rgbToHex(mix(rgb, [74, 52, 104], 0.45)) : '#FFFFFF';
      pc.fillRect(0, 0, size, size);
      ctx.drawImage(p, 0, 0);
    }
  }
}

// ---------- the always-visible buttons ----------
function setupActions() {
  $('act-undo').querySelector('.ico').innerHTML = icons.undo;
  $('act-start-over').querySelector('.ico').innerHTML = icons.startOver;
  $('act-surprise').querySelector('.ico').innerHTML = icons.wand;
  $('act-show').querySelector('.ico').innerHTML = icons.star;
  $('act-album').querySelector('.ico').innerHTML = icons.album;
  $('card-wear').querySelector('.ico').innerHTML = icons.wearAgain;
  $('card-show').querySelector('.ico').innerHTML = icons.star;
  $('card-save').querySelector('.ico').innerHTML = icons.save;
  $('fashion-play').innerHTML = icons.play;
  document.querySelector('.album-title').innerHTML = icons.album;
  $('album-empty').innerHTML = icons.frame;

  $('act-undo').addEventListener('click', (e) => {
    const b = e.currentTarget;
    ack(b);
    const snap = undoStack.pop();
    if (!snap) { play('same'); wiggle(b); return; }
    rememberPoseLook(state.poses, pose, snap.doll, snap.look);
    persist();
    play('undo');
    refreshAll();
    burst(600, 900, 12, 0.7);
  });
  $('act-start-over').addEventListener('click', (e) => {
    const b = e.currentTarget;
    ack(b);
    const fresh = defaultLook(data, poseState().doll);
    if (sameLook(look(), fresh)) { play('same'); wiggle(b); return; }
    commit(fresh);
    play('tap');
    refreshAll();
    burst(600, 900, 18, 0.9);
  });
  $('act-surprise').addEventListener('click', (e) => {
    ack(e.currentTarget);
    const res = surprise(data, look(), Math.random, lastTheme);
    lastTheme = res.theme.id;
    commit(res.look);
    play('sweep');
    refreshAll();
    burst(600, 300, 18, 1.2); burst(600, 1000, 30, 1.6); burst(600, 1500, 18, 1.2);
  });
  $('act-show').addEventListener('click', (e) => { ack(e.currentTarget); startShow(look(), { fromAlbum: false }); });
  $('act-album').addEventListener('click', (e) => { ack(e.currentTarget); play('tap'); openAlbum(); });

  $('back-step').addEventListener('click', () => {
    play('tap');
    if (screen === 'card') openAlbum();
    else if (screen === 'album') goRoom();
  });

  $('fashion-play').addEventListener('click', (e) => { ack(e.currentTarget); startFashion(); });
  $('card-wear').addEventListener('click', async (e) => {
    ack(e.currentTarget);
    if (!cardEntry) return;
    await switchPose(entryPose(cardEntry, pose), { dollId: cardEntry.look.doll });
    const L = sanitize(data, cardEntry.look, cardEntry.look.doll);
    undoStack.push({ doll: poseState().doll, look: JSON.parse(JSON.stringify(look())) });
    rememberPoseLook(state.poses, pose, L.doll, L);
    persist();
    play('wear');
    goRoom();
    burst(600, 1000, 30, 1.4);
  });
  $('card-show').addEventListener('click', (e) => {
    ack(e.currentTarget);
    if (cardEntry) startShow(sanitize(data, cardEntry.look, cardEntry.look.doll), { fromAlbum: true });
  });
  setupHold($('card-save'));
}

// ---------- screens ----------
function setScreen(name) {
  screen = name;
  for (const [id, n] of [['room', 'room'], ['show', 'show'], ['album', 'album'], ['card-view', 'card'], ['fashion', 'fashion']]) $(id).hidden = n !== name;
  $('back-hub').hidden = name !== 'room';
  $('back-step').hidden = !(name === 'album' || name === 'card');
  document.body.classList.toggle('fullscreen', name === 'show' || name === 'fashion');
  document.body.classList.remove('after');
  lockTaps();
}

function goRoom() {
  setScreen('room');
  refreshAll();
}

function refreshAll() {
  renderDoll();
  refreshRibbon(false);
  refreshTabs();
  // keep the tiles in place (no blank flash) when the tab is unchanged
  if ($('grid').dataset.tab === tab && $('grid').children.length) refreshTiles(true);
  else buildGrid();
  buildColours();
}

// ---------- Show time ----------
function startShow(showLook, { fromAlbum }) {
  setScreen('show');
  showTaken = false;
  const shownAt = performance.now();
  const canvas = $('show-canvas');
  runShowTime(canvas, data, showLook, {
    noCard: fromAlbum,
    flyTo: () => ({ x: window.innerWidth - 70, y: 70 }),
    onCard: (entry) => {
      state.album.unshift({ ...entry, pose });
      persist();
    },
  }).then(() => {
    showTaken = true;
    lastShowMs = performance.now() - shownAt;
    document.body.classList.add('after');
    lockTaps();
  });
  $('show').onclick = () => {
    if (!showTaken) return;           // taps do nothing until the photo card is taken
    play('tap');
    if (fromAlbum) openCard(cardEntry); else goRoom();
  };
}

// ---------- album ----------
let albumObserver = null;
function openAlbum() {
  setScreen('album');
  const grid = $('album-grid');
  grid.innerHTML = '';
  $('album-empty').hidden = state.album.length > 0;
  if (albumObserver) albumObserver.disconnect();
  albumObserver = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (!en.isIntersecting) continue;
      const b = en.target;
      albumObserver.unobserve(b);
      drawAlbumCard(b);
    }
  }, { root: grid, rootMargin: '200px' }) : null;
  state.album.forEach((entry, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'card-btn' + (i === 0 && entry.fresh ? ' new' : '');
    b.dataset.index = String(i);
    b.setAttribute('aria-label', 'Photo card');
    b.appendChild(document.createElement('canvas'));
    b.addEventListener('click', () => { ack(b); play('tap'); openCard(state.album[Number(b.dataset.index)]); });
    grid.appendChild(b);
    if (albumObserver) albumObserver.observe(b); else requestAnimationFrame(() => drawAlbumCard(b));
  });
}

async function drawAlbumCard(b) {
  const entry = state.album[Number(b.dataset.index)];
  const cardData = datasets[entryPose(entry, pose)] || data;
  const cardLook = sanitize(cardData, entry.look, entry.look && entry.look.doll);
  await ensureLook(cardData, cardLook, { stage: true }).catch(() => {});
  if (!b.isConnected) return;
  const r = b.getBoundingClientRect();
  const c = b.firstChild;
  c.width = Math.max(1, Math.round(r.width * DPR())); c.height = Math.max(1, Math.round(r.height * DPR()));
  drawCard(c.getContext('2d'), cardData, { ...entry, look: cardLook }, c.width, c.height);
}

async function openCard(entry) {
  if (!entry) { openAlbum(); return; }
  cardEntry = entry;
  setScreen('card');
  const cardPose = entryPose(entry, pose);
  await switchPose(cardPose, { dollId: entry.look.doll });
  if (cardEntry !== entry) return;
  const cardLook = sanitize(data, entry.look, entry.look.doll);
  await ensureLook(data, cardLook, { stage: true }).catch(() => {});
  requestAnimationFrame(() => {
    const c = $('big-card');
    const r = c.getBoundingClientRect();
    c.width = Math.round(r.width * DPR()); c.height = Math.round(r.height * DPR());
    drawCard(c.getContext('2d'), data, { ...entry, look: cardLook }, c.width, c.height);
  });
}

// ---------- the fashion show ----------
function startFashion() {
  const entries = state.album.length ? state.album.map((e) => {
    const entryData = datasets[entryPose(e, pose)] || data;
    return { ...e, data: entryData, look: sanitize(entryData, e.look, e.look.doll) };
  }) : [{ id: 'now', t: Date.now(), data, look: look() }];
  setScreen('fashion');
  play('fanfare');
  stopFashion = runFashionShow($('fashion-canvas'), data, entries);
  $('fashion').onclick = () => {
    if (stopFashion) { stopFashion(); stopFashion = null; }
    play('tap');
    openAlbum();
  };
}

// ---------- Save to Photos: behind a two-second grown-up hold ----------
function setupHold(btn) {
  let t0 = 0, raf = 0, blob = null, ready = false, holding = false;
  const setP = (p) => btn.style.setProperty('--p', String(p));
  const reset = () => { holding = false; ready = false; cancelAnimationFrame(raf); btn.classList.remove('holding', 'ready'); setP(0); };
  btn.addEventListener('contextmenu', (e) => e.preventDefault());
  btn.addEventListener('pointerdown', (e) => {
    if (performance.now() < tapLockUntil) return;
    e.preventDefault();
    try { btn.setPointerCapture(e.pointerId); } catch (err) { /* older Safari */ }
    holding = true; ready = false; t0 = performance.now(); blob = null;
    btn.classList.add('holding');
    ack(btn);
    play('hold');
    // the picture is made while the grown-up holds, so the share sheet can open on release
    const c = document.createElement('canvas'); c.width = 800; c.height = 1200;
    if (cardEntry) drawCard(c.getContext('2d'), data, { ...cardEntry, look: sanitize(data, cardEntry.look, cardEntry.look.doll) }, 800, 1200);
    try { c.toBlob((b) => { blob = b; }, 'image/png'); } catch (err) { blob = null; }
    const tick = () => {
      if (!holding) return;
      const p = Math.min(1, (performance.now() - t0) / HOLD_MS);
      setP(p);
      if (p >= 1 && !ready) { ready = true; btn.classList.add('ready'); play('wear'); }
      if (!ready) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  });
  btn.addEventListener('pointerup', () => {
    const wasReady = ready;
    reset();
    if (wasReady && blob) share(blob);
  });
  btn.addEventListener('pointercancel', reset);
  btn.addEventListener('click', (e) => e.preventDefault());
}

function share(blob) {
  const name = 'princess-photo-card.png';
  let file = null;
  try { file = new File([blob], name, { type: 'image/png' }); } catch (e) { file = null; }
  if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
    navigator.share({ files: [file] }).catch(() => {});
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

// ---------- sound toggle (on every screen) ----------
function setupSound() {
  const b = $('sound');
  const paint = () => { b.innerHTML = isEnabled() ? icons.soundOn : icons.soundOff; b.setAttribute('aria-pressed', String(isEnabled())); };
  setEnabled(state.sound);
  paint();
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    ack(b);
    setEnabled(!isEnabled());
    state.sound = isEnabled();
    persist();
    paint();
    play('tap');
  });
  try { if (window.AudioWake) window.AudioWake.attach(audioContext, rebuildAudio); } catch (e) { /* sound is a bonus */ }
}

// ---------- start ----------
async function start() {
  if (POSE_ROOM) {
    const loaded = await Promise.all(Object.entries(POSE_DATASETS).map(async ([p, name]) => {
      const res = await fetch(`data/${name}.json`);
      return [p, await res.json()];
    }));
    datasets = Object.fromEntries(loaded);
    let saved = store.loadPoseRoom();
    if (!saved) {
      const standing = store.loadDataset('items');
      const runway = store.loadDataset('runway');
      saved = {
        poses: {
          standing: { doll: standing.doll, looks: standing.looks },
          runway: { doll: runway.doll, looks: runway.looks },
        },
        album: mergeLegacyAlbums(standing.album, runway.album),
        sound: pose === 'runway' ? runway.sound : standing.sound,
      };
    }
    state = { poses: {}, album: [], sound: saved.sound !== false };
    for (const p of Object.keys(POSE_DATASETS)) {
      const dset = datasets[p];
      const raw = saved.poses && saved.poses[p] || {};
      const doll = dset.dolls.some((d) => d.id === raw.doll) ? raw.doll : dset.dolls[0].id;
      const looks = {};
      for (const d of dset.dolls) looks[d.id] = raw.looks && raw.looks[d.id]
        ? sanitize(dset, raw.looks[d.id], d.id) : defaultLook(dset, d.id);
      state.poses[p] = { doll, looks };
    }
    state.album = tagAlbum(saved.album || [], 'standing').map((entry) => {
      const p = entryPose(entry, 'standing');
      const entryData = datasets[p];
      return { ...entry, pose: p, look: sanitize(entryData, entry.look, entry.look.doll) };
    });
  } else {
    const res = await fetch(`data/${DATASET}.json`);
    datasets[pose] = await res.json();
    const saved = store.loadDataset(DATASET);
    const dset = datasets[pose];
    const doll = dset.dolls.some((d) => d.id === saved.doll) ? saved.doll : dset.dolls[0].id;
    const looks = {};
    for (const d of dset.dolls) looks[d.id] = saved.looks[d.id]
      ? sanitize(dset, saved.looks[d.id], d.id) : defaultLook(dset, d.id);
    state = { poses: { [pose]: { doll, looks } }, album: tagAlbum(saved.album, pose), sound: saved.sound };
  }
  data = datasets[pose];
  persist();
  await preload(data, look());
  setupSound();
  setupActions();
  setupPoseButtons();
  buildRibbon();
  buildTabs();
  setScreen('room');
  refreshAll();
  let resizeT = 0;
  const onResize = () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => {
      if (screen === 'room') { renderDoll(); refreshTiles(true); refreshRibbon(false); }
      else if (screen === 'card' && cardEntry) openCard(cardEntry);
      else if (screen === 'album') openAlbum();
    }, 120);
  };
  window.addEventListener('resize', onResize);
  document.body.dataset.ready = '1';
}

let artRefresh = 0;
onImageReady(() => {
  if (!state || poseLoading || artRefresh) return;
  artRefresh = requestAnimationFrame(() => {
    artRefresh = 0;
    // tiles queue and load their own pictures; repainting them here is what looped
    if (screen === 'room') renderDoll();
    else if (screen === 'album') openAlbum();
    else if (screen === 'card' && cardEntry) openCard(cardEntry);
  });
});

// exposed for the browser checks only
window.__dressUp = { get state() { return state; }, get data() { return data; }, get datasets() { return datasets; }, get pose() { return pose; }, get screen() { return screen; }, get fit() { return lastFit; }, get showTaken() { return showTaken; }, get undoDepth() { return undoStack.length; }, get lastShowMs() { return lastShowMs; }, sameLook, switchPose };

start().catch((err) => {
  document.body.dataset.error = String(err && err.message || err);
  throw err;
});
