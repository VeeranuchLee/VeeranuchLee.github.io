// Toy Guitar — the plucked-string engine (Karplus–Strong family).
//
// ONE file, two homes. It is loaded by AudioWorklet.addModule (where it
// registers the "ks-string" processor, one instance per guitar string) and
// imported as a plain module by the main thread, where the same `KSString`
// renders buffers for the no-AudioWorklet fallback and is exercised by the
// Node tests. Nothing here reads a sample file: every sound is computed.
//
// A string is a circular delay line whose length sets the pitch. A burst of
// shaped noise (the pick) is written into it; each trip round the loop passes
// a one-pole low-pass (the string losing its highs) and a loss gain (the
// string losing its energy). The delay uses linear interpolation so its
// length can glide — that is what makes slides and bends continuous. The loop
// filter's own phase delay is subtracted from the delay length analytically,
// so open strings and every fret land on equal-tempered pitch.

const TWO_PI = Math.PI * 2;

function lcg(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// One-pole low-pass y += c (x - y): coefficient from a cutoff in Hz.
export function onePoleCoef(cutoffHz, sampleRate) {
  return 1 - Math.exp(-TWO_PI * Math.min(cutoffHz, sampleRate * 0.45) / sampleRate);
}

// Phase delay (samples) and gain of the loop filter at the fundamental.
export function loopFilterAt(c, freq, sampleRate) {
  const w = TWO_PI * freq / sampleRate;
  const a = 1 - c;
  const re = 1 - a * Math.cos(w);
  const im = a * Math.sin(w);
  return { delay: Math.atan2(im, re) / w, gain: c / Math.hypot(re, im) };
}

export class KSString {
  constructor(sampleRate, seed = 1) {
    this.sr = sampleRate;
    this.size = Math.ceil(sampleRate / 60) + 16;
    this.buf = new Float32Array(this.size);
    this.write = 0;
    this.delay = 100; this.targetDelay = 100; this.slew = 0;
    this.c = 0.3; this.loss = 0.99;
    this.lp = 0;
    this.out = 0;       // output gain 0..1 (fades for retrigger and damp)
    this.outStep = 0; this.outTarget = 1;
    this.env = 0;
    this.active = false;
    this.params = null; this.freq = 440;
    this.rnd = lcg(seed);
    this.queued = null; // a pluck waiting for the 2 ms duck of the old vibration
  }

  // Loop parameters for a pitch: delay length, filter and loss.
  _tune(freq, params) {
    const sr = this.sr;
    const c = onePoleCoef(params.bright * freq, sr);
    const { delay, gain } = loopFilterAt(c, freq, sr);
    const target = sr / freq - delay;
    const perSample = Math.pow(10, -3 / (params.t60 * sr));
    const loss = Math.min(0.99985, Math.pow(perSample, sr / freq) / Math.max(0.5, gain));
    return { c, target, loss };
  }

  // Begin a new vibration. A string that is still sounding is ducked for
  // ~2 ms first, so the retrigger never clicks.
  pluck(freq, velocity, params) {
    const job = { freq, velocity, params };
    if (this.active && this.out > 0.02) {
      this.queued = job;
      this.outTarget = 0; this.outStep = 1 / Math.max(1, Math.round(this.sr * 0.002));
      return;
    }
    this._excite(job);
  }

  _excite({ freq, velocity, params }) {
    const sr = this.sr;
    this.params = params; this.freq = freq;
    const t = this._tune(freq, params);
    this.c = t.c; this.loss = t.loss; this.delay = this.targetDelay = t.target; this.slew = 0;
    this.buf.fill(0); this.lp = 0;
    const n = Math.min(this.size - 2, Math.ceil(t.target) + 1);
    const e = new Float32Array(n);
    // pick hardness: a soft pick/pad smooths the noise (darker attack)
    let s = 0;
    for (let i = 0; i < n; i += 1) { s += params.pick * ((this.rnd() * 2 - 1) - s); e[i] = s; }
    // pick position: a comb notch, the way plucking nearer the bridge thins the tone
    const lag = Math.max(1, Math.round((params.pos ?? 0.18) * n));
    const shaped = new Float32Array(n);
    let mean = 0;
    for (let i = 0; i < n; i += 1) { shaped[i] = e[i] - (i >= lag ? e[i - lag] : 0); mean += shaped[i]; }
    mean /= n;
    let peak = 1e-9;
    for (let i = 0; i < n; i += 1) { shaped[i] -= mean; peak = Math.max(peak, Math.abs(shaped[i])); }
    const scale = (0.9 * velocity) / peak;
    for (let i = 0; i < n; i += 1) this.buf[(this.write - n + i + this.size * 2) % this.size] = shaped[i] * scale;
    this.out = 1; this.outTarget = 1; this.outStep = 0;
    this.env = velocity; this.active = true; this.queued = null;
  }

  // Glide the pitch (slide / bend). Keeps ringing; no new excitation.
  retune(freq, slewSeconds = 0.012, params = this.params) {
    if (!this.params) return;
    const t = this._tune(freq, params || this.params);
    this.freq = freq; this.c = t.c; this.loss = t.loss;
    this.targetDelay = t.target;
    const samples = Math.max(1, Math.round(slewSeconds * this.sr));
    this.slew = (t.target - this.delay) / samples;
  }

  // Hand on the strings: fade out over `seconds`, then go silent.
  damp(seconds = 0.04) {
    this.queued = null;
    this.outTarget = 0; this.outStep = 1 / Math.max(1, Math.round(seconds * this.sr));
  }

  // Immediate silence (guitar switch, teardown).
  kill() {
    this.buf.fill(0); this.out = 0; this.outTarget = 0; this.outStep = 0;
    this.env = 0; this.active = false; this.queued = null; this.lp = 0;
  }

  process(output, start = 0, end = output.length) {
    if (!this.active) { for (let i = start; i < end; i += 1) output[i] = 0; return; }
    const size = this.size; const buf = this.buf;
    for (let i = start; i < end; i += 1) {
      if (this.slew !== 0) {
        this.delay += this.slew;
        if ((this.slew > 0 && this.delay >= this.targetDelay) || (this.slew < 0 && this.delay <= this.targetDelay)) {
          this.delay = this.targetDelay; this.slew = 0;
        }
      }
      let r = this.write - this.delay;
      if (r < 0) r += size;
      const i0 = Math.floor(r); const f = r - i0;
      const x = buf[i0 % size] * (1 - f) + buf[(i0 + 1) % size] * f;
      this.lp += this.c * (x - this.lp);
      buf[this.write] = this.lp * this.loss;
      this.write = (this.write + 1) % size;

      if (this.out !== this.outTarget) {
        this.out += this.outTarget < this.out ? -this.outStep : this.outStep;
        if ((this.outTarget === 0 && this.out <= 0) || (this.outTarget === 1 && this.out >= 1)) {
          this.out = this.outTarget;
          if (this.outTarget === 0) {
            if (this.queued) { this._excite(this.queued); output[i] = 0; continue; }
            this.active = false; buf.fill(0); this.lp = 0;
            for (let j = i; j < end; j += 1) output[j] = 0;
            return;
          }
        }
      }
      const y = x * this.out;
      output[i] = y;
      const a = y < 0 ? -y : y;
      this.env = a > this.env ? a : this.env * 0.99985;
    }
    if (this.env < 1e-5 && this.outTarget !== 0) { this.active = false; buf.fill(0); this.lp = 0; }
  }
}

// Render one pluck to a Float32Array (fallback path and tests).
export function renderPluck(freq, velocity, params, sampleRate, seconds, seed = 7) {
  const s = new KSString(sampleRate, seed);
  s.pluck(freq, velocity, params);
  const out = new Float32Array(Math.ceil(seconds * sampleRate));
  s.process(out);
  return out;
}

// ---- AudioWorklet registration (a no-op on the main thread) ----
if (typeof AudioWorkletProcessor !== 'undefined' && typeof registerProcessor === 'function') {
  class KSStringProcessor extends AudioWorkletProcessor {
    constructor(options) {
      super();
      const lane = (options && options.processorOptions && options.processorOptions.lane) || 0;
      this.string = new KSString(sampleRate, 101 + lane * 7919);
      this.events = [];
      this.port.onmessage = (e) => {
        // Mute and teardown also cancel every pluck still waiting for its
        // moment, so a strum in flight cannot sound after the hand is down.
        if (e.data.type === 'kill' || e.data.type === 'damp') this.events.length = 0;
        this.events.push(e.data);
        this.events.sort((a, b) => (a.frame || 0) - (b.frame || 0));
      };
    }

    _apply(m) {
      const s = this.string;
      if (m.type === 'pluck') s.pluck(m.freq, m.velocity, m.params);
      else if (m.type === 'retune') s.retune(m.freq, m.slew);
      else if (m.type === 'damp') s.damp(m.seconds);
      else if (m.type === 'kill') s.kill();
    }

    process(inputs, outputs) {
      const out = outputs[0][0];
      const frames = out.length;
      const blockStart = currentFrame;
      let pos = 0;
      while (this.events.length && (this.events[0].frame || 0) < blockStart + frames) {
        const m = this.events.shift();
        const at = Math.max(0, Math.min(frames, (m.frame || 0) - blockStart));
        if (at > pos) { this.string.process(out, pos, at); pos = at; }
        this._apply(m);
      }
      if (pos < frames) this.string.process(out, pos, frames);
      return true;
    }
  }
  registerProcessor('ks-string', KSStringProcessor);
}
