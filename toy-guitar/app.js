// Toy Guitar — five guitar toys and one ribbon. Touch the guitar and it plays.
//
// Owner, 2026-10-07 (briefs/2026-10-07-pass2-keyboard-parity.md): the same
// shape as Toy Keyboard — persistent five-guitar ribbon → the toy's own
// controls and four support pads → the dominant, freely playable guitar →
// Record/Play inside the toy. The only chrome is Back, the ribbon and the
// parent Effects / Mute buttons. There is no picker, menu or mode between a
// child and the strings.
//
// This file only wires things together. The physical model lives in
// lib/string-board.js (six strings, one sounding fret each, highest fret
// wins), the touch geometry in lib/geometry.js, the toys' pads, tone switches
// and effects in lib/toys.js, switching rules in lib/session.js, the recorder
// in lib/recorder.js, the string engine in audio/ks-worklet.js + audio/rig.js,
// the pad sounds in audio/percussion.js and the drawings in ui/.

import { StringBoard } from './lib/string-board.js';
import { makeLayout, hitTest, fretOf, StrumTracker, bendFromOffset, strumVelocity, railRects } from './lib/geometry.js';
import { createRecorder, stateWords } from './lib/recorder.js';
import { recordingPerformer } from './lib/performer.js';
import { positionFrequency, STRING_COUNT, FRET_COUNT } from './lib/theory.js';
import { TOYS, TOY_ORDER, EFFECTS, toyById } from './lib/toys.js';
import { GuitarSession } from './lib/session.js';
import { modelById } from './audio/guitar-models.js';
import { AudioShell, GuitarRig } from './audio/rig.js';
import { PadKit } from './audio/percussion.js';
import { drawGuitar, drawChip, stringD } from './ui/draw-guitar.js';
import { icon } from './ui/pad-icons.js';
import { mountSparkles } from './ui/sparkle.js';

const STORE_KEY = 'toy-guitar.v2';
const RAIL_MIN = 112;   // side compartments: pads >= 88 px with room for their frame
const $ = (id) => document.getElementById(id);
const now = () => performance.now() / 1000;

const toyEl = $('toy');
const playEl = $('play');
const railA = $('railA');
const railB = $('railB');
const shell = new AudioShell();
let rig = null;
let pads = null;
let layout = null;
let model = null;            // audio/guitar-models.js entry of the mounted toy
let tone = null;             // current tone object (lib/toys.js) or null
let fxState = {};
let cells = new Map();       // "lane-fret" -> fret cell
let marks = new Map();       // "lane-fret" -> fingertip mark
let stringEls = [];          // { lane, parts: [paths], glow }
const pointers = new Map();  // pointerId -> { kind: 'fret' | 'strum', ... }
const visualTimers = new Set();
const energy = new Array(STRING_COUNT).fill(0);
const heldState = Array.from({ length: STRING_COUNT }, () => []);
let raf = 0; let lastFrame = 0; let lastPluckAt = -Infinity;
let sparkles = null;
let unmountTransport = () => {};

function readStore() { try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch (e) { return {}; } }
const stored = readStore();
let effectsPref = typeof stored.effects === 'boolean' ? stored.effects : null;
function writeStore(snapshot) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify({ ...snapshot, effects: effectsPref })); } catch (e) { /* private mode */ }
}

// ---------- sound + picture: what the board asks for ----------
function ensureAudio() {
  if (!shell.ctx) shell.prepare();
  if (!shell.ctx || !model) return false;
  if (!pads) pads = new PadKit(shell);
  if (!rig) { rig = new GuitarRig(shell, model); rig.setTone(tone); rig.setFx(fxState); }
  return true;
}

function later(fn, seconds) {
  if (seconds <= 0.001) { fn(); return; }
  const id = setTimeout(() => { visualTimers.delete(id); fn(); }, seconds * 1000);
  visualTimers.add(id);
}

const inner = {
  pluck(lane, fret, o = {}) {
    const ok = ensureAudio();
    const when = o.when || 0;
    lastPluckAt = now() + when;
    if (ok) rig.pluck(lane, positionFrequency(lane, fret, o.bend || 0), o.velocity ?? 0.8, when);
    later(() => ringString(lane, o.velocity ?? 0.8, fret, o.via), when);
  },
  retune(lane, fret, o = {}) {
    if (ensureAudio()) rig.retune(lane, positionFrequency(lane, fret, o.bend || 0), o.via === 'bend' ? 0.03 : 0.012);
  },
  mute() {
    if (rig) rig.muteAll();
    if (pads) pads.stopAll();
    visualTimers.forEach((id) => clearTimeout(id)); visualTimers.clear();
    energy.fill(0);
    stringEls.forEach((s) => drawString(s, 0, 0));
    const btn = $('muteBtn'); btn.classList.add('flash'); setTimeout(() => btn.classList.remove('flash'), 220);
  },
  held(lane, fret, frets) {
    heldState[lane] = frets ? frets.slice() : (fret === null ? [] : [fret]);
    paintHeld(lane);
  },
  heldReset() { for (let l = 0; l < STRING_COUNT; l += 1) { heldState[l] = []; paintHeld(l); } },
  hit(id, o = {}) {
    if (ensureAudio()) pads.hit(id, o.velocity ?? 1);
    const el = railB.querySelector(`[data-pad="${id}"]`);
    if (el) {
      el.classList.remove('lit'); void el.offsetWidth; el.classList.add('lit');
      clearTimeout(el._lit); el._lit = setTimeout(() => el.classList.remove('lit'), 140);
      if (sparkles) sparkles.burstAt(el, 'pad-' + id);
    }
  }
};

// ---------- recorder, board and session ----------
const recorder = createRecorder({
  clock: now,
  target: {
    pluck: (l, f, o) => inner.pluck(l, f, o),
    retune: (l, f, o) => inner.retune(l, f, o),
    mute: () => inner.mute(),
    held: (l, f, fr) => inner.held(l, f, fr),
    heldReset: () => inner.heldReset(),
    hit: (id, o) => inner.hit(id, o),
    padsOff: () => { if (pads) pads.stopAll(); },
    setModel: (id) => session.select(id, { fromPlayback: true }),
    setTone: (id) => session.setTone(id, { fromPlayback: true }),
    setFx: (state) => session.applyFxState(state)
  },
  currentModel: () => session.model,
  currentHeld: () => board.snapshot().filter((s) => s.fret > 0).map((s) => ({ lane: s.lane, fret: s.fret })),
  currentSettings: () => session.current
});
const performer = recordingPerformer(inner, recorder);
const board = new StringBoard(performer, now);

const session = new GuitarSession({
  board, recorder, performer, saved: stored,
  hooks: {
    releasePointers: () => [...pointers.keys()].forEach(release),
    padsOff: () => { if (pads) pads.stopAll(); },
    mountToy: (id) => mountToy(id),
    applyTone: (t) => { tone = t; if (rig) rig.setTone(t); paintControls(); },
    applyFx: (state) => { fxState = state; if (rig) rig.setFx(state); paintControls(); },
    save: (snapshot) => writeStore(snapshot)
  }
});

// ---------- mounting a toy ----------
const TRANSPORT = `<div class="transport" role="group" aria-label="Record">
  <button type="button" class="tbtn rec" id="recBtn" aria-pressed="false"><span class="lamp" aria-hidden="true"></span><span class="w">Record</span></button>
  <button type="button" class="tbtn play not-ready" id="playBtn" aria-pressed="false" aria-disabled="true"><span class="tri" aria-hidden="true"></span><span class="w">Play</span></button>
  <p class="record-status" id="status" aria-live="polite">Ready <span class="record-time" id="clock"></span></p>
</div>`;

function controlsFor(id) {
  const toy = TOYS[id];
  const parts = [];
  if (toy.strumBar) {
    parts.push(`<button type="button" class="strumbar" id="strumBar" aria-label="Strum all six strings">${icon('strum')}<span class="w">Strum</span></button>`);
  }
  if (toy.tones) {
    const label = id === 'electric' ? 'Pickups' : 'Sound';
    parts.push(`<div class="tones tones-${toy.tones.length}" role="group" aria-label="${label}">${toy.tones.map((t) =>
      `<button type="button" class="tone" data-tone="${t.id}" aria-pressed="false">${icon(t.icon)}<span class="w">${t.word}</span></button>`).join('')}</div>`);
  }
  if (toy.effects.length) {
    parts.push(`<div class="fxbank" role="group" aria-label="${id === 'rock' ? 'Pedals' : 'Amp'}">${toy.effects.map((name) =>
      `<button type="button" class="fx fx-${name}" data-fx="${name}" aria-pressed="false" aria-label="${EFFECTS[name].label}"><span class="led" aria-hidden="true"></span>${icon(name)}<span class="w">${EFFECTS[name].word}</span></button>`).join('')}</div>`);
  }
  return `<div class="toyctl">${parts.join('')}</div>`;
}

function padsFor(id) {
  return TOYS[id].pads.map((p, i) =>
    `<button type="button" class="pad pad-${i}" data-pad="${p.id}" aria-label="${p.word}">${icon(p.icon)}<span class="w">${p.word}</span></button>`).join('');
}

function mountToy(id) {
  // the old toy is already silent (session.select released everything)
  visualTimers.forEach((t) => clearTimeout(t)); visualTimers.clear();
  energy.fill(0);
  if (rig) { rig.dispose(); rig = null; }
  model = modelById(id);
  // the new rig starts clean; session.select applies this toy's own tone and
  // effects right after the mount, so nothing of the old toy carries over
  tone = null; fxState = {};
  heldState.forEach((_, l) => { heldState[l] = []; });
  unmountTransport();
  if (sparkles) sparkles.destroy();
  TOY_ORDER.forEach((t) => toyEl.classList.toggle('toy-' + t, t === id));
  document.body.dataset.toy = id;
  railA.innerHTML = TRANSPORT + controlsFor(id);
  railA.setAttribute('aria-label', TOYS[id].label + ' controls');
  railB.innerHTML = padsFor(id);
  railB.setAttribute('aria-label', TOYS[id].label + ' drums');
  playEl.setAttribute('aria-label', `${TOYS[id].label}: touch a string to pluck it, hold a fret, swipe across the body to strum`);
  wireControls();
  unmountTransport = mountTransport();
  sparkles = mountSparkles($('sparkles'), id, () => effectsOn());
  paintRibbon();
  build();
  if (shell.ctx) ensureAudio();
}

// ---------- drawing ----------
function build() {
  const w = toyEl.clientWidth; const h = toyEl.clientHeight;
  if (w < 50 || h < 50 || !model) return;
  const toy = toyById(model.id);
  layout = makeLayout(w, h, toy.layout, RAIL_MIN);
  playEl.innerHTML = drawGuitar(model, layout);
  toyEl.dataset.orientation = layout.orientation;
  toyEl.classList.toggle('portrait', layout.portrait);
  toyEl.classList.toggle('landscape', !layout.portrait);
  const rails = railRects(layout, toy.horn);
  [[railA, rails.a], [railB, rails.b]].forEach(([el, r]) => {
    el.style.left = r.x + 'px'; el.style.top = r.y + 'px'; el.style.width = r.w + 'px'; el.style.height = r.h + 'px';
  });
  cells = new Map(); marks = new Map();
  playEl.querySelectorAll('.cell').forEach((el) => cells.set(`${el.dataset.lane}-${el.dataset.fret}`, el));
  playEl.querySelectorAll('.mark').forEach((el) => marks.set(`${el.dataset.lane}-${el.dataset.fret}`, el));
  stringEls = [];
  for (let lane = 0; lane < STRING_COUNT; lane += 1) {
    stringEls.push({
      lane,
      parts: [...playEl.querySelectorAll(`.string-glow[data-lane="${lane}"], .string-shadow[data-lane="${lane}"], .string-line[data-lane="${lane}"], .string-core[data-lane="${lane}"]`)],
      glow: playEl.querySelector(`.string-glow[data-lane="${lane}"]`)
    });
  }
  for (let l = 0; l < STRING_COUNT; l += 1) paintHeld(l);
}

function drawString(s, amp, phase) {
  const d = stringD(layout, s.lane, amp, phase);
  s.parts.forEach((p) => p.setAttribute('d', d));
  if (!amp) s.glow.setAttribute('opacity', '0');
}

function paintHeld(lane) {
  for (let fret = 0; fret <= FRET_COUNT; fret += 1) {
    const mark = marks.get(`${lane}-${fret}`); const cell = cells.get(`${lane}-${fret}`);
    if (!mark) continue;
    const held = fret > 0 && heldState[lane].includes(fret);
    mark.classList.toggle('held', held); cell.classList.toggle('held', held);
    mark.setAttribute('opacity', held ? '0.95' : '0');
    cell.setAttribute('opacity', held ? '0.55' : '0');
  }
}

function ringString(lane, velocity, fret, via) {
  energy[lane] = Math.min(1, 0.5 + velocity * 0.6);
  const cell = cells.get(`${lane}-${fret}`);
  if (cell && !heldState[lane].includes(fret)) {
    cell.classList.add('flash'); cell.setAttribute('opacity', '0.75');
    setTimeout(() => { cell.classList.remove('flash'); if (!heldState[lane].includes(fret)) cell.setAttribute('opacity', '0'); }, 90);
  }
  if (sparkles && layout) {
    const onNeck = fret > 0 || via === 'tap';
    const u = onNeck ? layout.slotStart(fret) + layout.fretW / 2 : layout.neckEnd + layout.bodyLen * 0.34;
    const p = layout.toXY(u, layout.stringV(lane, u));
    sparkles.burst(p.x, p.y, 'lane-' + lane, lane);
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
    if (e < 0.02) { if (energy[lane] !== 0) { energy[lane] = 0; drawString(s, 0, 0); } continue; }
    any = true;
    drawString(s, e * 7, t * (28 + lane * 3));
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
  if (pads) pads.stopAll();
}
window.addEventListener('blur', releaseEverything);
window.addEventListener('pagehide', releaseEverything);
document.addEventListener('visibilitychange', () => { if (document.hidden) releaseEverything(); });

// ---------- the toy's own controls ----------
// A struck control answers on pointerdown (both hands can drum at once); the
// click is the fallback for keyboards and engines that deliver only clicks.
function onPress(el, fire) {
  let pointered = -Infinity;
  el.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    pointered = performance.now(); e.preventDefault(); shell.resume(); fire();
  });
  el.addEventListener('click', () => { if (performance.now() - pointered < 800) return; shell.resume(); fire(); });
}

function wireControls() {
  railB.querySelectorAll('.pad').forEach((b) => onPress(b, () => session.pad(b.dataset.pad)));
  const bar = $('strumBar');
  if (bar) {
    onPress(bar, () => {
      board.strum([0, 1, 2, 3, 4, 5].map((lane) => ({ lane, t: lane * 0.03 })), 0.82, 'down');
      bar.classList.remove('lit'); void bar.offsetWidth; bar.classList.add('lit');
      clearTimeout(bar._lit); bar._lit = setTimeout(() => bar.classList.remove('lit'), 200);
    });
  }
  railA.querySelectorAll('.tone').forEach((b) => b.addEventListener('click', () => { shell.resume(); session.setTone(b.dataset.tone); }));
  railA.querySelectorAll('.fx').forEach((b) => b.addEventListener('click', () => {
    shell.resume(); session.setFx(b.dataset.fx, !session.current.fx[b.dataset.fx]);
  }));
}

function paintControls() {
  railA.querySelectorAll('.tone').forEach((b) => b.setAttribute('aria-pressed', String(Boolean(tone) && b.dataset.tone === tone.id)));
  railA.querySelectorAll('.fx').forEach((b) => b.setAttribute('aria-pressed', String(Boolean(fxState[b.dataset.fx]))));
}

// ---------- record / play, inside the toy ----------
const fmt = (s) => { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
function mountTransport() {
  const recBtn = $('recBtn'); const playBtn = $('playBtn'); const statusEl = $('status'); const clockEl = $('clock');
  const row = railA.querySelector('.transport');
  let say = null; let sayTimer = 0; let ticker = 0; let nudging = 0; let prevHadTake = recorder.snapshot().hasTake;
  function paint(snap = recorder.snapshot()) {
    const recording = snap.mode === 'recording'; const playing = snap.mode === 'playing';
    recBtn.setAttribute('aria-pressed', String(recording));
    playBtn.setAttribute('aria-pressed', String(playing));
    playBtn.disabled = recording;
    const notReady = !snap.hasTake && !recording && !playing;
    playBtn.classList.toggle('not-ready', notReady);
    if (notReady) playBtn.setAttribute('aria-disabled', 'true'); else playBtn.removeAttribute('aria-disabled');
    row.classList.toggle('is-recording', recording);
    row.classList.toggle('is-playing', playing);
    row.classList.toggle('is-finished', !recording && !playing && snap.hasTake && snap.ended === 'finished');
    recBtn.querySelector('.w').textContent = recording ? 'Stop' : 'Record';
    playBtn.querySelector('.w').textContent = playing ? 'Stop' : 'Play';
    statusEl.firstChild.nodeValue = (say || stateWords(snap)) + ' ';
    clockEl.textContent = recording ? fmt(snap.elapsed) : (playing ? fmt(snap.duration) : '');
    clearInterval(ticker);
    if (recording) ticker = setInterval(() => { clockEl.textContent = fmt(recorder.snapshot().elapsed); }, 250);
  }
  function saySoon(text, ms) { say = text; paint(); clearTimeout(sayTimer); sayTimer = setTimeout(() => { say = null; paint(); }, ms); }
  const unsubscribe = recorder.onChange((snap) => {
    if (snap.mode === 'recording' && prevHadTake) saySoon('New song — the old one goes away!', 1800);
    prevHadTake = snap.hasTake || snap.mode === 'recording';
    paint(snap);
  });
  recBtn.addEventListener('click', () => {
    shell.resume();
    if (recorder.getMode() === 'recording') recorder.stop(); else recorder.start();
  });
  playBtn.addEventListener('click', () => {
    shell.resume();
    const snap = recorder.snapshot();
    if (snap.mode === 'playing') { recorder.stop(); return; }
    if (!snap.hasTake) {
      saySoon('Record a song first!', 1800);
      clearTimeout(nudging);
      [recBtn, playBtn].forEach((b) => { b.classList.remove('nudge'); void b.offsetWidth; b.classList.add('nudge'); });
      nudging = setTimeout(() => [recBtn, playBtn].forEach((b) => b.classList.remove('nudge')), 1600);
      return;
    }
    recorder.play();
  });
  paint();
  return () => { unsubscribe(); clearInterval(ticker); clearTimeout(sayTimer); clearTimeout(nudging); };
}

// ---------- the chrome: ribbon, Effects, Mute ----------
const ribbon = $('ribbon');
TOY_ORDER.forEach((id) => {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'toytab'; b.dataset.toy = id;
  b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', 'false'); b.setAttribute('aria-label', TOYS[id].label);
  b.innerHTML = `<span class="chip" aria-hidden="true">${drawChip(modelById(id))}</span><span class="word">${TOYS[id].word}</span>`;
  // A tab tap is a gesture: also the chance to get the audio context iOS
  // hands out only on one.
  b.addEventListener('click', () => { shell.resume(); session.select(id); });
  ribbon.appendChild(b);
});
function paintRibbon() {
  ribbon.querySelectorAll('.toytab').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.toy === session.model)));
}

// Parent effects: the sparkles that answer a pluck or a pad. The button
// reports the EFFECTIVE value; unset follows the device's reduced-motion
// setting, and the first tap makes it explicit (Toy Keyboard's rule).
const reducedMotion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
function effectsOn() { return typeof effectsPref === 'boolean' ? effectsPref : !(reducedMotion && reducedMotion.matches); }
const effectsBtn = $('effects-toggle');
function paintEffects() {
  const on = effectsOn();
  effectsBtn.setAttribute('aria-pressed', String(on));
  effectsBtn.querySelector('strong').textContent = on ? 'ON' : 'OFF';
  effectsBtn.setAttribute('aria-label', 'Sparkle effects ' + (on ? 'on' : 'off'));
  if (!on && sparkles) sparkles.clear();
}
effectsBtn.addEventListener('click', () => { effectsPref = !effectsOn(); writeStore(session.snapshot()); paintEffects(); });
paintEffects();

const muteBtn = $('muteBtn');
muteBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); shell.resume(); board.mute(); });
muteBtn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); board.mute(); } });
muteBtn.addEventListener('click', (e) => { if (e.detail === 0) board.mute(); });

// ---------- start ----------
// A turn of the iPad changes the geometry under the fingers: let go of everything first.
let lastOrientation = null;
new ResizeObserver(() => {
  const o = toyEl.clientHeight > toyEl.clientWidth ? 'portrait' : 'landscape';
  if (lastOrientation && o !== lastOrientation) releaseEverything();
  lastOrientation = o;
  build();
}).observe(toyEl);
session.boot();

// Swap the buffer fallback for the AudioWorklet once it has loaded, only while nothing is being played.
function upgradeRigWhenIdle() {
  if (!shell.ctx || !shell.workletPromise) return;
  shell.workletPromise.then(() => {
    const timer = setInterval(() => {
      if (!rig || rig.kind === 'worklet' || !shell.workletReady) { clearInterval(timer); return; }
      if (pointers.size === 0 && now() - lastPluckAt > 3 && recorder.getMode() !== 'playing') {
        rig.dispose(); rig = null; ensureAudio(); clearInterval(timer);
      }
    }, 700);
  });
}
window.addEventListener('pointerdown', () => { shell.resume(); ensureAudio(); upgradeRigWhenIdle(); }, { once: true, capture: true });

// QA hooks: read-only views of the instrument state for the browser checks.
window.__toyGuitar = {
  board, recorder, shell, pointers, session,
  get rig() { return rig; }, get pads() { return pads; }, get model() { return model; }, get layout() { return layout; },
  level: () => shell.level(),
  select: (id) => session.select(id)
};
