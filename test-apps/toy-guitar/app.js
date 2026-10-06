// Toy Guitar — choose a chord, then strum six visible strings.
//
// Every sound is generated at runtime. A buffer-based Karplus–Strong string
// feeds the selected guitar's body-filter graph and this app's `music` bus;
// no sample or rendered instrument file is fetched or shipped.

import { noteToFrequency } from './audio-engine.js';
import { AudioEngine } from './audio-engine.js';
import { GUITARS, guitarById } from './data/guitars.js';
import { CHORDS, DEFAULT_CHORD_IDS, chordNotes } from './data/chords.js';
import { crossedLanes, strumOrder } from './data/strum-patterns.js';
import { GUITAR_SONGS, guitarSongById } from './data/guitar-songs.js';

const STORE_KEY = 'toy-guitar.settings';
const STRING_NAMES = ['Low E', 'A', 'D', 'G', 'B', 'High E'];
const AUTO_SPACING = 0.028;
const MAX_VOICES = 14;
const BUFFER_LIMIT = 24;

let stage = null;
let sharedEngine = null;
let guitarEngine = null;
let active = false;
let wiredStage = null;
let screen = 'select';
let guitarId = 'nylon';
let chordId = 'C';
let songId = 'hot-cross-buns';
let lastDirection = 'down';
let mode = 'idle';
let turnIndex = -1;
const listenTimers = new Set();
const pointers = new Map();

function readStore() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch { return {}; }
}

function writeStore() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify({ guitarId, songId })); } catch { /* private mode */ }
}

export function latchChord(previous, next) {
  if (!CHORDS[next]) throw new Error(`cannot latch unknown chord: ${next}`);
  return next === previous ? previous : next;
}

export function shouldAdvanceTurn(expectedChord, playedChord) {
  return Boolean(expectedChord && playedChord === expectedChord);
}

export function advanceTurnIndex(chart, index, playedChord) {
  if (!Array.isArray(chart) || index < 0 || index >= chart.length) return index;
  return shouldAdvanceTurn(chart[index].c, playedChord) ? index + 1 : index;
}

function makeCurve(amount) {
  const curve = new Float32Array(1024);
  for (let i = 0; i < curve.length; i += 1) {
    const x = i * 2 / (curve.length - 1) - 1;
    curve[i] = Math.tanh(amount * x) / Math.tanh(amount);
  }
  return curve;
}

export class GuitarEngine {
  constructor(engine) {
    this.engine = engine;
    this.cache = new Map();
    this.voices = [];
    this.stringVoices = new Map();
    this.model = GUITARS[0];
  }

  setGuitar(id) {
    this.stop();
    this.model = guitarById(id);
  }

  _cacheKey(note, stringIndex) {
    return `${this.model.id}:${note}:${stringIndex}`;
  }

  _buffer(note, stringIndex) {
    const ctx = this.engine.start();
    const key = this._cacheKey(note, stringIndex);
    if (this.cache.has(key)) {
      const buffer = this.cache.get(key);
      this.cache.delete(key);
      this.cache.set(key, buffer);
      return buffer;
    }

    const ks = this.model.strings.ks;
    const frequency = noteToFrequency(note) * Math.pow(2, (this.model.strings.detune[stringIndex] || 0) / 1200);
    const delay = Math.max(2, Math.round(ctx.sampleRate / frequency));
    const length = Math.ceil(ctx.sampleRate * ks.seconds);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let smooth = 0;
    let seed = 2166136261 ^ Math.round(frequency * 100) ^ (stringIndex * 2654435761);
    for (let i = 0; i < delay && i < length; i += 1) {
      seed = Math.imul(seed ^ (seed >>> 15), 2246822519);
      const noise = ((seed >>> 0) / 4294967295) * 2 - 1;
      smooth += ks.pick * (noise - smooth);
      data[i] = smooth * 0.72;
    }
    for (let i = delay; i < length; i += 1) {
      const a = data[i - delay];
      const b = data[Math.max(0, i - delay - 1)];
      const age = i / ctx.sampleRate;
      data[i] = 0.5 * (a + b) * ks.damping * Math.exp(-age / ks.decay);
    }

    this.cache.set(key, buffer);
    while (this.cache.size > BUFFER_LIMIT) this.cache.delete(this.cache.keys().next().value);
    return buffer;
  }

  prepareChord(id) {
    chordNotes(id, this.model.strings.tuning).forEach((note, stringIndex) => {
      if (note) this._buffer(note, stringIndex);
    });
  }

  _release(voice, now) {
    if (!voice) return;
    try {
      voice.gain.gain.cancelScheduledValues(now);
      voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
      voice.gain.gain.linearRampToValueAtTime(0, now + 0.008);
      voice.source.stop(now + 0.012);
    } catch { /* an ended buffer is already silent */ }
    this.voices = this.voices.filter((item) => item !== voice);
    if (this.stringVoices.get(voice.stringIndex) === voice) this.stringVoices.delete(voice.stringIndex);
  }

  playString(chord, stringIndex, at) {
    const notes = chordNotes(chord, this.model.strings.tuning);
    const note = notes[stringIndex];
    if (!note) return false;
    const ctx = this.engine.start();
    const bus = this.engine.bus('music');
    if (!bus) return false;
    const now = at ?? ctx.currentTime;
    this._release(this.stringVoices.get(stringIndex), ctx.currentTime);

    const source = ctx.createBufferSource();
    source.buffer = this._buffer(note, stringIndex);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(this.model.gain, now + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + this.model.strings.ks.seconds);
    source.connect(gain);

    let tail = gain;
    for (const spec of this.model.body) {
      const filter = ctx.createBiquadFilter();
      filter.type = spec.type;
      filter.frequency.value = spec.frequency;
      filter.Q.value = spec.q ?? 0.7;
      if (spec.gain != null) filter.gain.value = spec.gain;
      tail.connect(filter);
      tail = filter;
    }
    if (this.model.amp) {
      for (const spec of this.model.amp.pre || []) {
        const filter = ctx.createBiquadFilter();
        filter.type = spec.type;
        filter.frequency.value = spec.frequency;
        filter.Q.value = spec.q ?? 0.7;
        if (spec.gain != null) filter.gain.value = spec.gain;
        tail.connect(filter); tail = filter;
      }
      const shaper = ctx.createWaveShaper();
      shaper.curve = makeCurve(this.model.amp.drive);
      shaper.oversample = '4x';
      tail.connect(shaper); tail = shaper;
      for (const spec of this.model.amp.cab || []) {
        const filter = ctx.createBiquadFilter();
        filter.type = spec.type;
        filter.frequency.value = spec.frequency;
        filter.Q.value = spec.q ?? 0.7;
        if (spec.gain != null) filter.gain.value = spec.gain;
        tail.connect(filter); tail = filter;
      }
    }

    const dry = ctx.createGain();
    dry.gain.value = 1 - this.model.reverb;
    tail.connect(dry); dry.connect(bus.dry);
    const wet = ctx.createGain();
    wet.gain.value = this.model.reverb;
    tail.connect(wet); wet.connect(bus.wet);

    const voice = { source, gain, stringIndex };
    this.voices.push(voice);
    this.stringVoices.set(stringIndex, voice);
    while (this.voices.length > MAX_VOICES) this._release(this.voices[0], ctx.currentTime);
    source.onended = () => this._release(voice, ctx.currentTime);
    source.start(now);
    source.stop(now + this.model.strings.ks.seconds + 0.03);
    return true;
  }

  strum(chord, direction = 'down', at = null, spacing = AUTO_SPACING) {
    const ctx = this.engine.start();
    this.prepareChord(chord);
    const frets = CHORDS[chord].frets;
    const order = strumOrder(direction, frets);
    const start = at ?? ctx.currentTime;
    order.forEach((stringIndex, index) => this.playString(chord, stringIndex, start + index * spacing));
    return order;
  }

  stop() {
    if (!this.engine.ctx) return;
    [...this.voices].forEach((voice) => this._release(voice, this.engine.ctx.currentTime));
    this.engine.stopAll('music');
  }
}

function guitarTile(guitar) {
  return `<button class="guitar-tile guitar-tile--placeholder guitar-tile--${guitar.id}${guitar.id === guitarId ? ' is-current' : ''}"
    data-guitar="${guitar.id}" aria-label="${guitar.name}" title="${guitar.name}"
    style="--guitar-body:${guitar.palette.body};--guitar-accent:${guitar.palette.accent}">
      <span class="guitar-silhouette" aria-hidden="true"><i></i></span>
    </button>`;
}

function chordCardsMarkup(ids = DEFAULT_CHORD_IDS) {
  return ids.map((id) => `<button class="chord-card${id === chordId ? ' is-current' : ''}"
    data-chord="${id}" style="--chord:${CHORDS[id].colour}" aria-pressed="${id === chordId}" aria-label="Chord ${id}">
      <span>${id}</span>
    </button>`).join('');
}

function songTilesMarkup() {
  return GUITAR_SONGS.map((song) => {
    return `<button class="song-tile guitar-song-tile${song.id === songId ? ' is-current' : ''}"
      data-guitar-song="${song.id}" aria-label="Song: ${song.title}" title="${song.title}">
        <img class="song-tile__art" src="${song.art}" alt="">
        <span class="guitar-pick" aria-hidden="true"></span>
      </button>`;
  }).join('');
}

function renderSelect() {
  screen = 'select';
  mode = 'idle';
  stopListen();
  guitarEngine.stop();
  stage.className = 'stage stage--guitar stage--guitar-select';
  stage.style.backgroundImage = '';
  stage.innerHTML = `<div class="scrim">
    <div class="topbar">
      <a class="round-btn" href="https://veeranuchlee.github.io/children-apps/music.html" aria-label="Back to Music">←</a>
      <div class="banner banner--slim"><h1>Toy Guitar</h1></div>
      <button class="round-btn sound-btn" data-sound aria-pressed="true" aria-label="Sound on">♪</button>
    </div>
    <div class="guitar-select">
      <div class="guitar-song-grid">${songTilesMarkup()}</div>
      <div class="guitar-grid">${GUITARS.map(guitarTile).join('')}</div>
      <button class="go-btn" data-guitar-play aria-label="Go play"><span class="go-btn__icon">▶</span></button>
    </div>
  </div>`;
}

function renderPlay() {
  screen = 'play';
  guitarEngine.setGuitar(guitarId);
  guitarEngine.prepareChord(chordId);
  const song = guitarSongById(songId);
  stage.className = 'stage stage--guitar stage--guitar-play';
  stage.style.backgroundImage = '';
  stage.innerHTML = `<div class="scrim">
    <div class="topbar">
      <button class="round-btn" data-guitar-select aria-label="Choose another guitar">←</button>
      <div class="guitar-head" aria-hidden="true"><span class="guitar-silhouette"><i></i></span></div>
      <div class="banner banner--slim guitar-song-title"><h1>${song.title}</h1></div>
      <div class="guitar-playbtns">
        <button class="toy-iconbtn" data-guitar-turn aria-pressed="true" aria-label="Your turn"><span>↺</span></button>
        <button class="toy-iconbtn" data-guitar-listen aria-pressed="false" aria-label="Listen"><span class="guitar-listen-icon">▶</span></button>
      </div>
    </div>
    <div class="guitar-chart" aria-label="Chord path for ${song.title}">${chartMarkup(song)}</div>
    <div class="strum-surface" data-strum aria-label="Strum the guitar strings">
      ${STRING_NAMES.map((name, index) => `<div class="guitar-string" data-string="${index}" aria-label="${name} string"><span></span></div>`).join('')}
      <div class="guitar-soundhole" aria-hidden="true"></div>
    </div>
    <div class="chord-row">${chordCardsMarkup(DEFAULT_CHORD_IDS)}</div>
  </div>`;
  startTurn();
}

function chartMarkup(song) {
  return song.chart.map((step, index) => `<div class="chord-bead" data-bead="${index}"
    style="--chord:${CHORDS[step.c].colour};--beats:${step.beats}" aria-label="${step.c}, ${step.beats} beats">
      <span>${step.c}</span>
    </div>`).join('');
}

function clearListenTimers() {
  listenTimers.forEach((timer) => clearTimeout(timer));
  listenTimers.clear();
}

function setListenUI(on) {
  const button = stage?.querySelector('[data-guitar-listen]');
  if (!button) return;
  button.setAttribute('aria-pressed', String(on));
  button.classList.toggle('is-on', on);
  const icon = button.querySelector('.guitar-listen-icon');
  if (icon) icon.textContent = on ? '⏹' : '▶';
}

function paintTurn() {
  stage.querySelectorAll('[data-bead]').forEach((bead, index) => {
    bead.classList.toggle('is-current', mode === 'turn' && index === turnIndex);
    bead.classList.toggle('is-done', mode === 'turn' && index < turnIndex);
  });
  const button = stage.querySelector('[data-guitar-turn]');
  if (button) button.setAttribute('aria-pressed', String(mode === 'turn'));
}

function startTurn() {
  stopListen();
  mode = 'turn';
  turnIndex = 0;
  paintTurn();
}

function attemptTurn(playedChord) {
  if (mode !== 'turn') return false;
  const song = guitarSongById(songId);
  const next = advanceTurnIndex(song.chart, turnIndex, playedChord);
  if (next === turnIndex) return false;
  turnIndex = next;
  if (turnIndex >= song.chart.length) mode = 'idle';
  paintTurn();
  return true;
}

function stopListen() {
  clearListenTimers();
  if (mode === 'listen') guitarEngine?.stop();
  setListenUI(false);
  if (mode === 'listen') mode = 'idle';
}

function startListen() {
  stopListen();
  mode = 'listen';
  turnIndex = -1;
  paintTurn();
  setListenUI(true);
  const song = guitarSongById(songId);
  sharedEngine.start();
  let beats = 0;
  const secondsPerBeat = 60 / song.tempo;
  song.chart.forEach((step, index) => {
    const timer = setTimeout(() => {
      if (!active || mode !== 'listen') return;
      // Schedule each chord when its bead arrives. Pre-scheduling the whole
      // chart would make per-string monophony release a future strum while a
      // later one was being queued; this keeps only the actually ringing
      // voice replaceable and preserves the chart's order.
      guitarEngine.strum(step.c, 'down');
      stage.querySelectorAll('[data-bead]').forEach((bead, beadIndex) => bead.classList.toggle('is-listening', beadIndex === index));
      stage.querySelectorAll('[data-chord]').forEach((card) => card.classList.toggle('is-listening', card.dataset.chord === step.c));
    }, (0.08 + beats * secondsPerBeat) * 1000);
    listenTimers.add(timer);
    beats += step.beats;
  });
  const finish = setTimeout(() => {
    if (!active || mode !== 'listen') return;
    mode = 'idle';
    stage.querySelectorAll('.is-listening').forEach((node) => node.classList.remove('is-listening'));
    setListenUI(false);
  }, (0.12 + beats * secondsPerBeat) * 1000);
  listenTimers.add(finish);
}

function flashString(index) {
  const string = stage.querySelector(`[data-string="${index}"]`);
  if (!string) return;
  string.classList.remove('is-struck');
  void string.offsetWidth;
  string.classList.add('is-struck');
}

function chooseChord(id, auto = true) {
  chordId = latchChord(chordId, id);
  guitarEngine.prepareChord(chordId);
  stage.querySelectorAll('[data-chord]').forEach((card) => {
    const on = card.dataset.chord === chordId;
    card.classList.toggle('is-current', on);
    card.setAttribute('aria-pressed', String(on));
  });
  if (auto) {
    const order = guitarEngine.strum(chordId, lastDirection);
    order.forEach((stringIndex, index) => setTimeout(() => flashString(stringIndex), index * AUTO_SPACING * 1000));
    attemptTurn(chordId);
  }
}

function laneAt(event, surface) {
  const rect = surface.getBoundingClientRect();
  const y = Math.max(0, Math.min(rect.height - 0.001, event.clientY - rect.top));
  return Math.max(0, Math.min(5, Math.floor(y / rect.height * 6)));
}

function fireCrossing(state, lane) {
  for (const stringIndex of crossedLanes(state.lastLane, lane)) {
    if (state.fired.has(stringIndex)) continue;
    state.fired.add(stringIndex);
    guitarEngine.playString(chordId, stringIndex);
    flashString(stringIndex);
  }
  if (Number.isInteger(state.lastLane) && lane !== state.lastLane) lastDirection = lane > state.lastLane ? 'down' : 'up';
  state.lastLane = lane;
}

function onPointerDown(event, surface) {
  if (!active || screen !== 'play' || (event.pointerType === 'mouse' && event.button !== 0)) return;
  const state = { lastLane: null, fired: new Set() };
  pointers.set(event.pointerId, state);
  try { surface.setPointerCapture(event.pointerId); } catch { /* optional in DOM harnesses */ }
  fireCrossing(state, laneAt(event, surface));
}

function endPointer(event) {
  const state = pointers.get(event.pointerId);
  pointers.delete(event.pointerId);
  if (state?.fired.size) attemptTurn(chordId);
}

function wire() {
  if (wiredStage === stage) return;
  wiredStage = stage;
  stage.addEventListener('click', (event) => {
    if (!active) return;
    const guitar = event.target.closest('[data-guitar]');
    if (guitar) {
      guitarId = guitar.dataset.guitar;
      writeStore();
      guitarEngine.setGuitar(guitarId);
      guitarEngine.strum('Am', 'down');
      stage.querySelectorAll('[data-guitar]').forEach((tile) => {
        tile.classList.toggle('is-current', tile.dataset.guitar === guitarId);
      });
      return;
    }
    const song = event.target.closest('[data-guitar-song]');
    if (song) {
      const chosen = song.dataset.guitarSong;
      const again = chosen === songId;
      songId = chosen;
      writeStore();
      stage.querySelectorAll('[data-guitar-song]').forEach((tile) => tile.classList.toggle('is-current', tile.dataset.guitarSong === songId));
      if (again) renderPlay();
      else guitarEngine.strum(guitarSongById(songId).chart[0].c, 'down');
      return;
    }
    const chord = event.target.closest('[data-chord]');
    if (chord) { chooseChord(chord.dataset.chord); return; }
    if (event.target.closest('[data-guitar-play]')) { renderPlay(); return; }
    if (event.target.closest('[data-guitar-select]')) { renderSelect(); return; }
    const sound = event.target.closest('[data-sound]');
    if (sound) {
      const muted = sound.getAttribute('aria-pressed') === 'true';
      sharedEngine.setMuted(muted);
      sound.setAttribute('aria-pressed', String(!muted));
      sound.setAttribute('aria-label', muted ? 'Sound off' : 'Sound on');
      return;
    }
    if (event.target.closest('[data-guitar-turn]')) { startTurn(); return; }
    if (event.target.closest('[data-guitar-listen]')) {
      if (mode === 'listen') stopListen(); else startListen();
    }
  });
  stage.addEventListener('pointerdown', (event) => {
    const surface = event.target.closest('[data-strum]');
    if (surface) onPointerDown(event, surface);
  });
  stage.addEventListener('pointermove', (event) => {
    const state = pointers.get(event.pointerId);
    const surface = event.target.closest('[data-strum]') || stage.querySelector('[data-strum]');
    if (state && surface) fireCrossing(state, laneAt(event, surface));
  });
  stage.addEventListener('pointerup', endPointer);
  stage.addEventListener('pointercancel', endPointer);
}

export function renderGuitarroom(context) {
  stage = context.stage;
  sharedEngine = context.engine;
  guitarEngine = new GuitarEngine(sharedEngine);
  active = true;
  pointers.clear();
  const stored = readStore();
  guitarId = guitarById(stored.guitarId || 'nylon').id;
  songId = guitarSongById(stored.songId)?.id || GUITAR_SONGS[0].id;
  chordId = 'C';
  guitarEngine.setGuitar(guitarId);
  renderSelect();
  wire();
}

export function silenceGuitarroom() {
  clearListenTimers();
  pointers.clear();
  guitarEngine?.stop();
}

export function leaveGuitarroom() {
  if (!active) return;
  silenceGuitarroom();
  active = false;
}

if (typeof document !== 'undefined') {
  const engine = new AudioEngine();
  const appStage = document.querySelector('#stage');
  if (appStage) renderGuitarroom({ stage: appStage, engine });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) silenceGuitarroom();
  });
}
