// Toy Guitar — a free-play instrument. Touch the guitar and it plays.
//
// This file only wires things together. The physical model lives in
// lib/string-board.js (six strings, one sounding fret each, highest fret wins),
// the touch geometry in lib/geometry.js, the recorder in lib/recorder.js, the
// plucked-string engine in audio/ks-worklet.js and the drawings in
// ui/draw-guitar.js. There is no quiz, score, song or mode to choose first.

import { StringBoard } from './lib/string-board.js';
import { makeLayout, hitTest, fretOf, StrumTracker, bendFromOffset, strumVelocity } from './lib/geometry.js';
import { createRecorder, stateWords } from './lib/recorder.js';
import { recordingPerformer } from './lib/performer.js';
import { positionFrequency, STRING_COUNT, FRET_COUNT } from './lib/theory.js';
import { MODELS, modelById } from './audio/guitar-models.js';
import { AudioShell, GuitarRig } from './audio/rig.js';
import { drawGuitar, drawSilhouette, stringD } from './ui/draw-guitar.js';

const STORE_KEY = 'toy-guitar.v2';
const $ = (id) => document.getElementById(id);
const now = () => performance.now() / 1000;

const playEl = $('play');
const shell = new AudioShell();
let model = modelById(readStore().model);
let rig = null;
let layout = null;
let marks = new Map();       // "lane-fret" -> element
let stringEls = [];          // { line, glow }
const pointers = new Map();  // pointerId -> { kind: 'fret' | 'strum', ... }
const visualTimers = new Set();
const energy = new Array(STRING_COUNT).fill(0);
const heldState = Array.from({ length: STRING_COUNT }, () => []);
let raf = 0; let lastFrame = 0; let lastPluckAt = -Infinity;

function readStore() { try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch (e) { return {}; } }
function writeStore() { try { localStorage.setItem(STORE_KEY, JSON.stringify({ model: model.id })); } catch (e) { /* private mode */ } }

// ---------- sound + picture: what the board asks for ----------
function ensureRig() {
  if (!shell.ctx) shell.prepare();
  if (!shell.ctx) return null;
  if (!rig) rig = new GuitarRig(shell, model);
  return rig;
}

function later(fn, seconds) {
  if (seconds <= 0.001) { fn(); return; }
  const id = setTimeout(() => { visualTimers.delete(id); fn(); }, seconds * 1000);
  visualTimers.add(id);
}

const inner = {
  pluck(lane, fret, o = {}) {
    const r = ensureRig();
    const when = o.when || 0;
    lastPluckAt = now() + when;
    if (r) r.pluck(lane, positionFrequency(lane, fret, o.bend || 0), o.velocity ?? 0.8, when);
    later(() => ringString(lane, o.velocity ?? 0.8, fret), when);
  },
  retune(lane, fret, o = {}) {
    const r = ensureRig();
    if (r) r.retune(lane, positionFrequency(lane, fret, o.bend || 0), o.via === 'bend' ? 0.03 : 0.012);
  },
  mute() {
    if (rig) rig.muteAll();
    visualTimers.forEach((id) => clearTimeout(id)); visualTimers.clear();
    energy.fill(0);
    stringEls.forEach((s) => { s.glow.setAttribute('opacity', '0'); s.line.setAttribute('d', stringD(layout, Number(s.lane), 0, 0)); s.glow.setAttribute('d', stringD(layout, Number(s.lane), 0, 0)); });
    const btn = $('muteBtn'); btn.classList.add('flash'); setTimeout(() => btn.classList.remove('flash'), 220);
  },
  held(lane, fret, frets) {
    heldState[lane] = frets ? frets.slice() : (fret === null ? [] : [fret]);
    paintHeld(lane);
  },
  heldReset() { for (let l = 0; l < STRING_COUNT; l += 1) { heldState[l] = []; paintHeld(l); } }
};

// ---------- recorder ----------
const clockSeconds = now;
const recorder = createRecorder({
  clock: clockSeconds,
  target: {
    pluck: (l, f, o) => inner.pluck(l, f, o),
    retune: (l, f, o) => inner.retune(l, f, o),
    mute: () => inner.mute(),
    held: (l, f, fr) => inner.held(l, f, fr),
    heldReset: () => inner.heldReset(),
    setModel: (id) => selectModel(id, { fromPlayback: true })
  },
  currentModel: () => model.id,
  currentHeld: () => board.snapshot().filter((s) => s.fret > 0).map((s) => ({ lane: s.lane, fret: s.fret }))
});
const board = new StringBoard(recordingPerformer(inner, recorder), clockSeconds);

// ---------- drawing ----------
function build() {
  const w = playEl.clientWidth; const h = playEl.clientHeight;
  if (w < 50 || h < 50) return;
  layout = makeLayout(w, h);
  playEl.innerHTML = drawGuitar(model, layout);
  playEl.dataset.orientation = layout.orientation;
  marks = new Map();
  playEl.querySelectorAll('.mark').forEach((el) => marks.set(`${el.dataset.lane}-${el.dataset.fret}`, el));
  stringEls = [...playEl.querySelectorAll('.string-line')].map((line) => ({
    lane: line.dataset.lane, line, glow: playEl.querySelector(`.string-glow[data-lane="${line.dataset.lane}"]`)
  }));
  for (let l = 0; l < STRING_COUNT; l += 1) paintHeld(l);
}

function paintHeld(lane) {
  for (let fret = 0; fret <= FRET_COUNT; fret += 1) {
    const el = marks.get(`${lane}-${fret}`); if (!el) continue;
    const held = fret > 0 && heldState[lane].includes(fret);
    el.classList.toggle('held', held);
    el.setAttribute('opacity', held ? '0.95' : '0');
  }
}

function ringString(lane, velocity, fret) {
  energy[lane] = Math.min(1, 0.5 + velocity * 0.6);
  const el = marks.get(`${lane}-${fret}`);
  if (el && !heldState[lane].includes(fret)) {
    el.setAttribute('opacity', '0.8');
    setTimeout(() => { if (!heldState[lane].includes(fret)) el.setAttribute('opacity', '0'); }, 70);
  }
  if (!raf) { lastFrame = now(); raf = requestAnimationFrame(frame); }
}

function frame() {
  const t = now(); const dt = Math.min(0.1, t - lastFrame); lastFrame = t;
  const tau = Math.max(0.5, model.string.t60 * 0.28);
  let any = false;
  for (let lane = 0; lane < STRING_COUNT; lane += 1) {
    const s = stringEls[lane]; if (!s) continue;
    energy[lane] *= Math.exp(-dt / tau);
    const e = energy[lane];
    if (e < 0.02) { if (energy[lane] !== 0) { energy[lane] = 0; const d = stringD(layout, lane, 0, 0); s.line.setAttribute('d', d); s.glow.setAttribute('d', d); s.glow.setAttribute('opacity', '0'); } continue; }
    any = true;
    const d = stringD(layout, lane, e * 7, t * (28 + lane * 3));
    s.line.setAttribute('d', d); s.glow.setAttribute('d', d);
    s.glow.setAttribute('opacity', String(Math.min(0.85, e * 0.9)));
  }
  raf = any ? requestAnimationFrame(frame) : 0;
}

// ---------- touch: pointer ids, hold / strum / slide / bend ----------
function localXY(e) { const r = playEl.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }

playEl.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  if (!layout) return;
  shell.resume();
  const { x, y } = localXY(e);
  const hit = hitTest(layout, x, y);
  if (!hit || hit.lane === null) return;
  e.preventDefault();
  try { playEl.setPointerCapture(e.pointerId); } catch (err) { /* synthetic ids */ }
  if (pointers.has(e.pointerId)) release(e.pointerId);
  const t = (e.timeStamp || performance.now()) / 1000;
  if (hit.zone === 'neck') {
    pointers.set(e.pointerId, { kind: 'fret', lane: hit.lane, fret: hit.fret });
    board.fretDown(e.pointerId, hit.lane, hit.fret, { velocity: 0.8 });
  } else {
    const tracker = new StrumTracker(layout);
    const crossings = tracker.down(hit.u, hit.v, t);
    pointers.set(e.pointerId, { kind: 'strum', tracker, t, f: tracker.f });
    board.strum(crossings, 0.8, 'down');
  }
}, { passive: false });

playEl.addEventListener('pointermove', (e) => {
  const entry = pointers.get(e.pointerId);
  if (!entry || !layout) return;
  e.preventDefault();
  const samples = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : [];
  (samples.length ? samples : [e]).forEach((s) => sample(e.pointerId, entry, s));
}, { passive: false });

function sample(id, entry, s) {
  const { x, y } = localXY(s);
  const { u, v } = layout.toUV(x, y);
  const t = (s.timeStamp || performance.now()) / 1000;
  if (entry.kind === 'fret') {
    const fret = fretOf(layout, u);
    if (fret !== entry.fret) { entry.fret = fret; board.fretMove(id, entry.lane, fret); }
    if (model.bendMax > 0) {
      const cents = bendFromOffset(layout.laneCoord(u, v) - entry.lane, model.bendMax);
      board.fretBend(id, entry.lane, cents);
    }
  } else {
    const tr = entry.tracker;
    const before = tr.f;
    const crossings = tr.move(u, v, t);
    if (crossings.length) {
      const dtSec = Math.max(0.001, t - entry.t);
      board.strum(crossings, strumVelocity(Math.abs(tr.f - before) / dtSec), tr.direction);
    }
    entry.t = t;
  }
}

function release(id) {
  const entry = pointers.get(id);
  if (!entry) return;
  pointers.delete(id);
  if (entry.kind === 'fret') board.fretUp(id, entry.lane);
}
['pointerup', 'pointercancel', 'lostpointercapture'].forEach((type) => playEl.addEventListener(type, (e) => release(e.pointerId)));
playEl.addEventListener('contextmenu', (e) => e.preventDefault());

// Every way a finger can vanish without a pointerup ends here.
function releaseEverything() {
  [...pointers.keys()].forEach(release);
  board.releaseAll();
}
window.addEventListener('blur', releaseEverything);
window.addEventListener('pagehide', releaseEverything);
document.addEventListener('visibilitychange', () => { if (document.hidden) releaseEverything(); });

// ---------- mute ----------
const muteBtn = $('muteBtn');
muteBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); shell.resume(); board.mute(); });
muteBtn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); board.mute(); } });
muteBtn.addEventListener('click', (e) => { if (e.detail === 0) board.mute(); });

// ---------- switching guitars ----------
function selectModel(id, { fromPlayback = false } = {}) {
  const next = modelById(id);
  if (!fromPlayback) {
    // user switch: let go of everything, silence, stop any playback
    [...pointers.keys()].forEach(release);
    board.releaseAll();
    if (recorder.getMode() === 'playing') recorder.stop();
  }
  if (next.id === model.id && rig) return;
  visualTimers.forEach((t) => clearTimeout(t)); visualTimers.clear();
  energy.fill(0);
  if (rig) { rig.dispose(); rig = null; }
  model = next;
  recorder.record({ type: 'model', id: model.id });
  heldState.forEach((_, l) => { heldState[l] = []; });
  writeStore();
  build();
  paintPicker();
  if (shell.ctx) ensureRig();
}

// ---------- picker ----------
const pickerEl = $('picker');
function paintPicker() {
  $('pickerMini').innerHTML = drawSilhouette(model, 160, 64);
  $('pickerName').textContent = model.name.replace(' Guitar', '');
  pickerEl.querySelectorAll('.pick').forEach((b) => {
    const on = b.dataset.id === model.id; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on));
  });
}
$('pickerGrid').innerHTML = MODELS.map((m) => `<button type="button" class="pick" data-id="${m.id}" aria-label="${m.name}">${drawSilhouette(m, 260, 96)}<span class="nm">${m.name}</span><span class="bl">${m.blurb}</span></button>`).join('');
$('pickerGrid').addEventListener('click', (e) => {
  const b = e.target.closest('.pick'); if (!b) return;
  shell.resume(); selectModel(b.dataset.id); closePicker();
});
function openPicker() {
  releaseEverything();
  pickerEl.hidden = false; paintPicker();
  const first = pickerEl.querySelector('.pick.on') || pickerEl.querySelector('.pick'); if (first) first.focus();
}
function closePicker() { pickerEl.hidden = true; }
$('pickerBtn').addEventListener('click', openPicker);
$('pickerClose').addEventListener('click', closePicker);
pickerEl.addEventListener('click', (e) => { if (e.target === pickerEl) closePicker(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePicker(); });

// ---------- record / play ----------
const recBtn = $('recBtn'); const playBtn = $('playBtn'); const statusEl = $('status'); const clockEl = $('clock');
let say = null; let sayTimer = 0; let ticker = 0;
const fmt = (s) => { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
function paintTransport(snap = recorder.snapshot()) {
  const recording = snap.mode === 'recording'; const playing = snap.mode === 'playing';
  recBtn.setAttribute('aria-pressed', String(recording));
  playBtn.setAttribute('aria-pressed', String(playing));
  playBtn.disabled = recording;
  const notReady = !snap.hasTake && !recording && !playing;
  playBtn.classList.toggle('not-ready', notReady);
  if (notReady) playBtn.setAttribute('aria-disabled', 'true'); else playBtn.removeAttribute('aria-disabled');
  recBtn.lastElementChild.textContent = recording ? 'Stop' : 'Record';
  const words = say || stateWords(snap);
  statusEl.firstChild.nodeValue = words + ' ';
  clockEl.textContent = recording ? fmt(snap.elapsed) : (playing ? fmt(snap.duration) : '');
  clearInterval(ticker);
  if (recording) ticker = setInterval(() => { clockEl.textContent = fmt(recorder.snapshot().elapsed); }, 500);
}
recorder.onChange(paintTransport);
function saySoon(text, ms) { say = text; paintTransport(); clearTimeout(sayTimer); sayTimer = setTimeout(() => { say = null; paintTransport(); }, ms); }
recBtn.addEventListener('click', () => {
  shell.resume();
  if (recorder.getMode() === 'recording') { recorder.stop(); return; }
  const had = recorder.snapshot().hasTake;
  recorder.start();
  if (had) saySoon('New song!', 900);
});
playBtn.addEventListener('click', () => {
  shell.resume();
  const snap = recorder.snapshot();
  if (snap.mode === 'playing') { recorder.stop(); return; }
  if (!snap.hasTake) {
    saySoon('Record a song first!', 1600);
    [recBtn, playBtn].forEach((b) => { b.classList.remove('nudge'); void b.offsetWidth; b.classList.add('nudge'); });
    setTimeout(() => [recBtn, playBtn].forEach((b) => b.classList.remove('nudge')), 1600);
    return;
  }
  recorder.play();
});

// ---------- start ----------
// A turn of the iPad changes the geometry under the fingers: let go of everything first.
let lastOrientation = null;
new ResizeObserver(() => {
  const o = playEl.clientHeight > playEl.clientWidth ? 'portrait' : 'landscape';
  if (lastOrientation && o !== lastOrientation) releaseEverything();
  lastOrientation = o;
  build();
}).observe(playEl);
build();
paintPicker();
paintTransport();
// Swap the buffer fallback for the AudioWorklet once it has loaded, only while nothing is being played.
function upgradeRigWhenIdle() {
  if (!shell.ctx || !shell.workletPromise) return;
  shell.workletPromise.then(() => {
    const timer = setInterval(() => {
      if (!rig || rig.kind === 'worklet' || !shell.workletReady) { clearInterval(timer); return; }
      if (pointers.size === 0 && now() - lastPluckAt > 3 && recorder.getMode() !== 'playing') {
        rig.dispose(); rig = new GuitarRig(shell, model); clearInterval(timer);
      }
    }, 700);
  });
}
window.addEventListener('pointerdown', () => { shell.resume(); upgradeRigWhenIdle(); }, { once: true, capture: true });

// QA hooks: read-only views of the instrument state for the browser checks.
window.__toyGuitar = {
  board, recorder, shell, pointers,
  get rig() { return rig; }, get model() { return model; }, get layout() { return layout; },
  level: () => shell.level(),
  select: (id) => selectModel(id)
};
