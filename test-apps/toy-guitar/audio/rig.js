// Toy Guitar — the audio shell and per-guitar rig.
//
//   six KS strings -> string mix -> body/pickup filters -> tone switch -> wah
//        -> amp (drive) -> model gain -> (shared) compressor -> limiter -> master
//                                    \-> echo (delay + feedback, wet 0 when off)
//
// The tone switch is the toy's own sound control (lib/toys.js `tones`); wah,
// drive/heavy and echo are the amp effects only Electric and Rock expose. Off,
// each effect node is transparent, so the acoustic guitars are unchanged.
//
// The strings run in an AudioWorklet (one processor per string: a new pluck
// replaces the old vibration, a retune glides the pitch). Where AudioWorklet
// is unavailable the SAME string maths pre-renders buffers instead and a
// pluck plays one through a per-string gain; slides then glide the playback
// rate. Everything is computed; no sample or sound file exists in this app.

import { KSString, renderPluck } from './ks-worklet.js';
import { stringParams } from './guitar-models.js';
import { STRING_COUNT } from '../lib/theory.js';

const WORKLET_URL = new URL('./ks-worklet.js', import.meta.url).href;

export class AudioShell {
  constructor() {
    this.ctx = null; this.input = null; this.workletReady = false; this.workletFailed = false;
    this.listeners = new Set();
  }

  // Safe to call before a gesture: the context is created suspended and
  // resumed by the first touch.
  prepare() {
    if (this.ctx) return this.ctx;
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return null;
    this.ctx = new Context({ latencyHint: 'interactive' });
    this.input = this.ctx.createGain();
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 14; comp.ratio.value = 5;
    comp.attack.value = 0.003; comp.release.value = 0.22;
    const limiter = this.ctx.createDynamicsCompressor();
    limiter.threshold.value = -4; limiter.knee.value = 0; limiter.ratio.value = 20;
    limiter.attack.value = 0.001; limiter.release.value = 0.08;
    this.master = this.ctx.createGain(); this.master.gain.value = 0.9;
    this.input.connect(comp); comp.connect(limiter); limiter.connect(this.master);
    this.master.connect(this.ctx.destination);
    this.analyser = this.ctx.createAnalyser(); this.analyser.fftSize = 1024;
    this.master.connect(this.analyser);
    if (this.ctx.audioWorklet && typeof AudioWorkletNode !== 'undefined') {
      this.workletPromise = this.ctx.audioWorklet.addModule(WORKLET_URL)
        .then(() => { this.workletReady = true; })
        .catch(() => { this.workletFailed = true; });
    } else { this.workletFailed = true; this.workletPromise = Promise.resolve(); }
    return this.ctx;
  }

  resume() {
    const ctx = this.prepare();
    if (ctx && ctx.state !== 'running') { try { ctx.resume(); } catch (e) { /* needs a gesture */ } }
    return ctx;
  }

  // RMS of what is leaving the speakers right now (QA: proves nothing is stuck).
  level() {
    if (!this.analyser) return 0;
    const data = new Float32Array(this.analyser.fftSize);
    this.analyser.getFloatTimeDomainData(data);
    let sum = 0; for (let i = 0; i < data.length; i += 1) sum += data[i] * data[i];
    return Math.sqrt(sum / data.length);
  }

  get state() { return this.ctx ? this.ctx.state : 'none'; }
}

function makeCurve(amount) {
  const curve = new Float32Array(2048);
  const norm = Math.tanh(amount);
  for (let i = 0; i < curve.length; i += 1) curve[i] = Math.tanh(amount * (i * 2 / (curve.length - 1) - 1)) / norm;
  return curve;
}

function filterFrom(ctx, spec) {
  const f = ctx.createBiquadFilter();
  f.type = spec.type; f.frequency.value = spec.frequency; f.Q.value = spec.q ?? 0.7;
  if (spec.gain != null) f.gain.value = spec.gain;
  return f;
}

export class GuitarRig {
  constructor(shell, model) {
    this.shell = shell; this.ctx = shell.ctx; this.model = model;
    this.kind = shell.workletReady ? 'worklet' : 'buffer';
    this.nodes = []; this.live = true;
    const ctx = this.ctx;
    this.mix = ctx.createGain();
    let tail = this.mix;
    const chain = (specs) => specs.forEach((spec) => { const f = filterFrom(ctx, spec); tail.connect(f); tail = f; this.nodes.push(f); });
    chain(model.body);
    // the toy's tone switch: neutral until a tone with a filter is chosen
    this.toneFilter = ctx.createBiquadFilter();
    this.toneFilter.type = 'peaking'; this.toneFilter.frequency.value = 1000; this.toneFilter.gain.value = 0;
    tail.connect(this.toneFilter); tail = this.toneFilter; this.nodes.push(this.toneFilter);
    // wah: a resonant low-pass swept on every pluck while it is on; wide open when off
    this.wah = ctx.createBiquadFilter();
    this.wah.type = 'lowpass'; this.wah.frequency.value = 18000; this.wah.Q.value = 0.7;
    tail.connect(this.wah); tail = this.wah; this.nodes.push(this.wah);
    this.shaper = null; this.trim = ctx.createGain(); this.trim.gain.value = 1;
    this.fx = { drive: false, heavy: false, echo: false, wah: false };
    this.tone = null;
    if (model.amp) {
      if (model.amp.pre) chain(model.amp.pre);
      const shaper = ctx.createWaveShaper();
      shaper.curve = makeCurve(model.amp.drive); shaper.oversample = '2x';
      tail.connect(shaper); tail = shaper; this.nodes.push(shaper); this.shaper = shaper;
      if (model.amp.cab) chain(model.amp.cab);
      if (model.amp.compress) {
        const c = ctx.createDynamicsCompressor();
        Object.entries(model.amp.compress).forEach(([k, v]) => { c[k].value = v; });
        tail.connect(c); tail = c; this.nodes.push(c);
      }
    }
    tail.connect(this.trim); tail = this.trim;
    this.level = ctx.createGain(); this.level.gain.value = model.gain;
    tail.connect(this.level); this.level.connect(shell.input);
    // echo: a send from the guitar's own level, so the pads never echo
    this.delay = ctx.createDelay(1); this.delay.delayTime.value = 0.32;
    this.feedback = ctx.createGain(); this.feedback.gain.value = 0;
    this.wet = ctx.createGain(); this.wet.gain.value = 0;
    this.echoTone = ctx.createBiquadFilter(); this.echoTone.type = 'lowpass'; this.echoTone.frequency.value = 3200;
    this.level.connect(this.delay); this.delay.connect(this.echoTone); this.echoTone.connect(this.feedback);
    this.feedback.connect(this.delay); this.echoTone.connect(this.wet); this.wet.connect(shell.input);
    this.nodes.push(this.mix, this.trim, this.level, this.delay, this.feedback, this.wet, this.echoTone);

    this.strings = [];
    for (let lane = 0; lane < STRING_COUNT; lane += 1) {
      const gain = ctx.createGain();
      gain.connect(this.mix); this.nodes.push(gain);
      const s = { gain, node: null, source: null, baseFreq: 0, sourceGain: null };
      if (this.kind === 'worklet') {
        s.node = new AudioWorkletNode(ctx, 'ks-string', { numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [1], processorOptions: { lane } });
        s.node.connect(gain); this.nodes.push(s.node);
      }
      this.strings.push(s);
    }
    this.cache = new Map();
  }

  _frame(offset) { return Math.round((this.ctx.currentTime + Math.max(0, offset)) * this.ctx.sampleRate); }

  pluck(lane, freq, velocity, offset = 0) {
    if (!this.live) return;
    const s = this.strings[lane];
    const params = stringParams(this.model, lane, this.tone);
    if (this.fx.wah) this._sweepWah(offset, velocity);
    if (this.kind === 'worklet') {
      s.node.port.postMessage({ type: 'pluck', frame: this._frame(offset), freq, velocity, params });
      return;
    }
    // fallback: pre-rendered buffer on a per-string gain, replacing the last
    const ctx = this.ctx; const when = ctx.currentTime + Math.max(0, offset);
    this._stopSource(s, when);
    const key = `${lane}:${Math.round(freq * 4)}:${Math.round(velocity * 4)}:${this.tone ? this.tone.id : ''}`;
    let buffer = this.cache.get(key);
    if (!buffer) {
      const data = renderPluck(freq, velocity, params, ctx.sampleRate, Math.min(4, params.t60 * 0.9), 11 + lane);
      buffer = ctx.createBuffer(1, data.length, ctx.sampleRate); buffer.copyToChannel(data, 0);
      this.cache.set(key, buffer);
      if (this.cache.size > 160) this.cache.delete(this.cache.keys().next().value);
    }
    const src = ctx.createBufferSource(); src.buffer = buffer;
    const g = ctx.createGain(); g.gain.setValueAtTime(1, when);
    src.connect(g); g.connect(s.gain); src.start(when);
    src.onended = () => { try { src.disconnect(); g.disconnect(); } catch (e) { /* gone */ } };
    s.source = src; s.sourceGain = g; s.baseFreq = freq;
  }

  _stopSource(s, when) {
    if (!s.source) return;
    try {
      s.sourceGain.gain.cancelScheduledValues(when);
      s.sourceGain.gain.setValueAtTime(1, when);
      s.sourceGain.gain.linearRampToValueAtTime(0, when + 0.006);
      s.source.stop(when + 0.01);
    } catch (e) { /* already ended */ }
    s.source = null;
  }

  retune(lane, freq, slew = 0.012) {
    if (!this.live) return;
    const s = this.strings[lane];
    if (this.kind === 'worklet') { s.node.port.postMessage({ type: 'retune', frame: this._frame(0), freq, slew }); return; }
    if (s.source && s.baseFreq) s.source.playbackRate.setTargetAtTime(freq / s.baseFreq, this.ctx.currentTime, Math.max(0.004, slew / 3));
  }

  // The toy's tone switch (null = the guitar's own sound).
  setTone(tone) {
    this.tone = tone || null;
    const f = this.toneFilter; const spec = this.tone && this.tone.filter;
    const t = this.ctx.currentTime;
    f.type = spec ? spec.type : 'peaking';
    f.frequency.setTargetAtTime(spec ? spec.frequency : 1000, t, 0.02);
    f.Q.setTargetAtTime(spec ? (spec.q ?? 0.7) : 0.7, t, 0.02);
    f.gain.setTargetAtTime(spec && spec.gain != null ? spec.gain : 0, t, 0.02);
  }

  // Amp effects. Only names this model's amp knows are honoured; the toy
  // decides which it shows (lib/toys.js `effects`).
  setFx(state = {}) {
    const ctx = this.ctx; const t = ctx.currentTime; const amp = this.model.fx || {};
    ['drive', 'heavy'].forEach((name) => {
      if (!(name in state) || !amp[name] || !this.shaper) return;
      this.fx[name] = Boolean(state[name]);
    });
    if (this.shaper) {
      const on = ['drive', 'heavy'].find((n) => this.fx[n] && amp[n]);
      this.shaper.curve = makeCurve(on ? amp[on].drive : this.model.amp.drive);
      this.trim.gain.setTargetAtTime(on ? amp[on].trim : 1, t, 0.02);
    }
    if ('echo' in state) {
      this.fx.echo = Boolean(state.echo);
      this.wet.gain.setTargetAtTime(this.fx.echo ? 0.42 : 0, t, 0.03);
      this.feedback.gain.setTargetAtTime(this.fx.echo ? 0.38 : 0, t, 0.03);
    }
    if ('wah' in state) {
      this.fx.wah = Boolean(state.wah);
      this.wah.frequency.cancelScheduledValues(t);
      this.wah.frequency.setTargetAtTime(this.fx.wah ? 700 : 18000, t, 0.02);
      this.wah.Q.setTargetAtTime(this.fx.wah ? 7 : 0.7, t, 0.02);
    }
  }

  // The wah's "wow": open up through the pluck, then close.
  _sweepWah(offset, velocity) {
    const f = this.wah.frequency; const t = this.ctx.currentTime + Math.max(0, offset);
    const top = 1400 + 1400 * Math.min(1, velocity);
    f.cancelScheduledValues(t);
    f.setValueAtTime(380, t);
    f.exponentialRampToValueAtTime(top, t + 0.11);
    f.exponentialRampToValueAtTime(600, t + 0.5);
  }

  // Hand on the strings: every string fades out fast and is silent.
  muteAll(seconds = 0.05) {
    const now = this.ctx.currentTime;
    // the echo's tail is part of the strings' sound: cut it, then re-arm it
    if (this.fx.echo) {
      [this.wet.gain, this.feedback.gain].forEach((g) => { g.cancelScheduledValues(now); g.setValueAtTime(0, now); });
      clearTimeout(this.rearm);
      this.rearm = setTimeout(() => { if (this.live && this.fx.echo) this.setFx({ echo: true }); }, 700);
    }
    this.strings.forEach((s) => {
      if (this.kind === 'worklet') s.node.port.postMessage({ type: 'damp', frame: this._frame(0), seconds });
      else { this._stopSource(s, now); }
    });
  }

  // Teardown: nothing may keep ringing after a guitar is switched away.
  dispose() {
    if (!this.live) return;
    this.live = false;
    this.strings.forEach((s) => {
      if (s.node) { try { s.node.port.postMessage({ type: 'kill', frame: 0 }); } catch (e) { /* closed */ } }
      this._stopSource(s, this.ctx.currentTime);
    });
    clearTimeout(this.rearm);
    try {
      [this.level.gain, this.wet.gain, this.feedback.gain].forEach((g) => { g.cancelScheduledValues(0); g.setValueAtTime(0, this.ctx.currentTime); });
    } catch (e) { /* closed */ }
    const nodes = this.nodes.slice();
    setTimeout(() => nodes.forEach((n) => { try { n.disconnect(); } catch (e) { /* gone */ } }), 120);
  }
}

export { KSString };
