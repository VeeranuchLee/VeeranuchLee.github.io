// Toy Guitar — the support pads' sounds. Every one is synthesised at runtime
// from oscillators and one shared noise buffer (AUDIO-DIRECTION.md: no
// samples, no files). The recipes follow Toy Keyboard's drum voices
// (toy-keyboard-app/voices.js) and its idea of a drum: one shot, struck,
// heard and gone. Each guitar has its OWN four recipes, themed to the
// instrument (owner, 2026-10-07): a toy kick is not a stomp box and is not a
// rock kick, so no two guitars share a pad sound even where they share a word.
//
// Unlike the keyboard's fire-and-forget drums, every hit here is a VOICE on
// a shared pad bus with a handle, so a guitar switch, Mute, or stopping a
// playback can silence a crash cymbal still ringing (no stuck sound, the
// same rule as the strings).
//
//   recipe(ctx, out, t, noise) -> seconds the shot lasts after t
//
// `out` is that voice's own gain node; everything a recipe makes ends there.

const RECIPES = {};
const reg = (id, fn) => { RECIPES[id] = fn; };

// ---------- building blocks ----------
function env(ctx, t, peak, attack, decay, node) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  if (node) g.connect(node);
  return g;
}
function osc(ctx, type, f0, f1, t, glide, dur, dest) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + glide);
  o.connect(dest); o.start(t); o.stop(t + dur);
  return o;
}
function filt(ctx, type, f, q, dest, gain) {
  const b = ctx.createBiquadFilter();
  b.type = type; b.frequency.value = f; b.Q.value = q ?? 0.7;
  if (gain != null) b.gain.value = gain;
  b.connect(dest);
  return b;
}
function noiseShot(ctx, noise, t, dur, dest) {
  const n = ctx.createBufferSource();
  n.buffer = noise; n.loop = true;
  n.connect(dest);
  n.start(t, Math.random() * 1.5); n.stop(t + dur);
  return n;
}
// a body thump: a sine dropping in pitch
function thump(ctx, out, t, { f0, f1, glide, peak, decay, type = 'sine' }) {
  const g = env(ctx, t, peak, 0.004, decay, out);
  osc(ctx, type, f0, f1, t, glide, decay + 0.05, g);
  return decay + 0.05;
}
// a burst of filtered noise
function hiss(ctx, out, t, noise, { type, f, q, peak, attack = 0.002, decay, at = 0 }) {
  const g = env(ctx, t + at, peak, attack, decay, out);
  noiseShot(ctx, noise, t + at, attack + decay + 0.03, filt(ctx, type, f, q, g));
  return at + attack + decay + 0.03;
}
// struck metal: inharmonic sine partials, the high ones dying first
function ring(ctx, out, t, base, partials, level) {
  let end = 0;
  partials.forEach(([mult, g0, tail]) => {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(g0 * level, t + 0.003);
    g.gain.setTargetAtTime(0.0001, t + 0.01, tail);
    g.connect(out);
    osc(ctx, 'sine', base * mult, 0, t, 0, tail * 6 + 0.05, g);
    end = Math.max(end, tail * 6 + 0.05);
  });
  return end;
}
// metallic cymbal source: six detuned squares (the classic drum-machine cymbal)
function metal(ctx, out, t, dur, freqs = [205, 304, 369, 522, 540, 800]) {
  freqs.forEach((hz) => osc(ctx, 'square', hz, 0, t, 0, dur, out));
}
// a clap: a few bursts of band-passed noise a few milliseconds apart
function clap(ctx, out, t, noise, { f, q, offsets, tail, peak }) {
  let end = 0;
  offsets.forEach((off, i) => {
    const last = i === offsets.length - 1;
    end = Math.max(end, hiss(ctx, out, t, noise, { type: 'bandpass', f, q, peak: last ? peak : peak * 0.6, decay: last ? tail : 0.03, at: off }));
  });
  return end;
}
// a shaker: soft-attack grains of high noise
function shake(ctx, out, t, noise, { grains, f, peak, decay }) {
  let end = 0;
  grains.forEach((at, i) => {
    end = Math.max(end, hiss(ctx, out, t, noise, { type: 'bandpass', f, q: 0.9, peak: peak * (i ? 0.75 : 1), attack: 0.018, decay, at }));
  });
  return end;
}

// ---------- First Guitar: chunky, friendly, never sharp ----------
reg('first-kick', (ctx, out, t) => thump(ctx, out, t, { f0: 130, f1: 55, glide: 0.11, peak: 0.85, decay: 0.34 }));
reg('first-clap', (ctx, out, t, noise) => clap(ctx, out, t, noise, { f: 1250, q: 1.3, offsets: [0, 0.012, 0.024], tail: 0.14, peak: 0.42 }));
reg('first-shaker', (ctx, out, t, noise) => shake(ctx, out, t, noise, { grains: [0, 0.11], f: 6200, peak: 0.34, decay: 0.07 }));
reg('first-bell', (ctx, out, t) => ring(ctx, out, t, 1046.5, [[1, 0.5, 0.22], [2.76, 0.14, 0.09], [5.4, 0.05, 0.05]], 0.6));

// ---------- Classical: a cajón, an egg shaker, real hands, a triangle ----------
reg('classical-cajon', (ctx, out, t, noise) => {
  const a = thump(ctx, out, t, { f0: 105, f1: 72, glide: 0.08, peak: 0.8, decay: 0.3 });
  const b = hiss(ctx, out, t, noise, { type: 'lowpass', f: 900, q: 0.8, peak: 0.28, decay: 0.07 }); // the wooden slap
  return Math.max(a, b);
});
reg('classical-shaker', (ctx, out, t, noise) => shake(ctx, out, t, noise, { grains: [0], f: 5200, peak: 0.32, decay: 0.12 }));
reg('classical-clap', (ctx, out, t, noise) => clap(ctx, out, t, noise, { f: 900, q: 1, offsets: [0, 0.008], tail: 0.11, peak: 0.45 }));
reg('classical-triangle', (ctx, out, t) => ring(ctx, out, t, 1760, [[1, 0.32, 0.38], [2.83, 0.16, 0.3], [5.12, 0.1, 0.22], [7.9, 0.05, 0.16]], 0.55));

// ---------- Acoustic: a stomp box, a brushed snare, a shaker, a tambourine ----------
reg('acoustic-kick', (ctx, out, t, noise) => {
  const a = thump(ctx, out, t, { f0: 92, f1: 46, glide: 0.07, peak: 0.85, decay: 0.26 });
  const b = hiss(ctx, out, t, noise, { type: 'bandpass', f: 320, q: 1.4, peak: 0.35, decay: 0.06 }); // the wooden box
  return Math.max(a, b);
});
reg('acoustic-snare', (ctx, out, t, noise) => {
  const a = hiss(ctx, out, t, noise, { type: 'bandpass', f: 2600, q: 0.7, peak: 0.36, attack: 0.012, decay: 0.2 });
  const g = env(ctx, t, 0.16, 0.004, 0.09, out); osc(ctx, 'triangle', 210, 170, t, 0.08, 0.14, g);
  return Math.max(a, 0.14);
});
reg('acoustic-shaker', (ctx, out, t, noise) => shake(ctx, out, t, noise, { grains: [0, 0.085], f: 7000, peak: 0.3, decay: 0.06 }));
reg('acoustic-tambourine', (ctx, out, t, noise) => {
  let end = 0;
  [0, 0.05].forEach((at, i) => {
    end = Math.max(end, hiss(ctx, out, t, noise, { type: 'highpass', f: 7000, q: 0.7, peak: i ? 0.2 : 0.3, decay: 0.2, at }));
    const g = env(ctx, t + at, i ? 0.035 : 0.05, 0.002, 0.22, out);
    metal(ctx, filt(ctx, 'highpass', 5000, 0.7, g), t + at, 0.3, [2350, 3180, 4120, 5230]);
  });
  return Math.max(end, 0.4);
});

// ---------- Electric: a drum machine on the amp ----------
reg('electric-kick', (ctx, out, t) => thump(ctx, out, t, { f0: 160, f1: 46, glide: 0.1, peak: 0.95, decay: 0.45 }));
reg('electric-snare', (ctx, out, t, noise) => {
  const a = hiss(ctx, out, t, noise, { type: 'highpass', f: 1200, q: 0.7, peak: 0.42, decay: 0.18 });
  const g = env(ctx, t, 0.3, 0.002, 0.12, out); osc(ctx, 'triangle', 196, 150, t, 0.1, 0.16, g);
  return Math.max(a, 0.16);
});
reg('electric-hihat', (ctx, out, t, noise) => {
  const g = env(ctx, t, 0.14, 0.001, 0.05, out);
  metal(ctx, filt(ctx, 'highpass', 7000, 0.7, g), t, 0.09);
  return Math.max(0.09, hiss(ctx, out, t, noise, { type: 'highpass', f: 8000, q: 0.7, peak: 0.16, decay: 0.045 }));
});
reg('electric-tom', (ctx, out, t) => thump(ctx, out, t, { f0: 220, f1: 110, glide: 0.2, peak: 0.7, decay: 0.34 }));

// ---------- Rock: a loud kit behind a stack ----------
reg('rock-kick', (ctx, out, t, noise) => {
  const a = thump(ctx, out, t, { f0: 190, f1: 50, glide: 0.06, peak: 1, decay: 0.32 });
  const b = hiss(ctx, out, t, noise, { type: 'highpass', f: 3000, q: 0.7, peak: 0.22, decay: 0.012 }); // beater click
  return Math.max(a, b);
});
reg('rock-snare', (ctx, out, t, noise) => {
  const a = hiss(ctx, out, t, noise, { type: 'highpass', f: 900, q: 0.7, peak: 0.55, decay: 0.26 });
  const g = env(ctx, t, 0.36, 0.002, 0.13, out); osc(ctx, 'triangle', 185, 140, t, 0.1, 0.17, g);
  return Math.max(a, 0.17);
});
reg('rock-hihat', (ctx, out, t, noise) => {
  const g = env(ctx, t, 0.16, 0.001, 0.07, out);
  metal(ctx, filt(ctx, 'highpass', 6500, 0.7, g), t, 0.11);
  return Math.max(0.11, hiss(ctx, out, t, noise, { type: 'highpass', f: 7500, q: 0.7, peak: 0.2, decay: 0.06 }));
});
reg('rock-crash', (ctx, out, t, noise) => {
  const a = hiss(ctx, out, t, noise, { type: 'highpass', f: 4200, q: 0.6, peak: 0.36, attack: 0.003, decay: 1.5 });
  const g = env(ctx, t, 0.1, 0.002, 1.3, out);
  metal(ctx, filt(ctx, 'bandpass', 8000, 0.6, g), t, 1.4);
  return Math.max(a, 1.4);
});

export const PAD_SOUNDS = Object.freeze(Object.keys(RECIPES));
export function hasPadSound(id) { return Object.prototype.hasOwnProperty.call(RECIPES, id); }

// Pad level per guitar, balanced against that guitar's strings by ear and by
// the analyser: never louder than a firm strum.
const LEVEL = { first: 0.7, classical: 0.7, acoustic: 0.72, electric: 0.62, rock: 0.62 };
// Per-pad trims, measured on the output analyser (2026-10-07) so a kick is
// about one and a half firm strums and a shaker or hi-hat about half of one;
// noise-based pads read quiet on RMS and need lifting, sine kicks the reverse.
const TRIM = {
  'first-kick': 0.46, 'first-clap': 3, 'first-shaker': 1.4, 'first-bell': 0.55,
  'classical-cajon': 0.48, 'classical-shaker': 1.3, 'classical-clap': 3, 'classical-triangle': 0.75,
  'acoustic-kick': 0.45, 'acoustic-snare': 1.5, 'acoustic-shaker': 1.7, 'acoustic-tambourine': 1,
  'electric-kick': 0.43, 'electric-snare': 0.9, 'electric-hihat': 2.2, 'electric-tom': 0.5,
  'rock-kick': 0.5, 'rock-snare': 0.85, 'rock-hihat': 1.5, 'rock-crash': 0.9
};

export class PadKit {
  constructor(shell) {
    this.shell = shell; this.ctx = shell.ctx;
    this.bus = this.ctx.createGain(); this.bus.gain.value = 1;
    this.bus.connect(shell.input);
    this.voices = new Set();
    const len = Math.floor(this.ctx.sampleRate * 2);
    this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i += 1) d[i] = Math.random() * 2 - 1;
  }

  // One strike. `when` is seconds from now. Returns false for an unknown id.
  hit(id, velocity = 1, when = 0) {
    const recipe = RECIPES[id];
    if (!recipe) return false;
    const ctx = this.ctx; const t = ctx.currentTime + Math.max(0, when) + 0.002;
    const out = ctx.createGain();
    out.gain.value = Math.max(0.05, Math.min(1, velocity)) * (LEVEL[id.split('-')[0]] ?? 0.65) * (TRIM[id] ?? 1);
    out.connect(this.bus);
    const life = recipe(ctx, out, t, this.noise);
    const voice = { out, timer: 0 };
    voice.timer = setTimeout(() => this._drop(voice), (Math.max(0, when) + life + 0.2) * 1000);
    this.voices.add(voice);
    return true;
  }

  _drop(voice) {
    if (!this.voices.delete(voice)) return;
    clearTimeout(voice.timer);
    try { voice.out.disconnect(); } catch (e) { /* gone */ }
  }

  get active() { return this.voices.size; }

  // Silence every pad voice still ringing (Mute, a guitar switch, Stop).
  stopAll(seconds = 0.03) {
    const t = this.ctx.currentTime;
    this.voices.forEach((voice) => {
      try {
        voice.out.gain.cancelScheduledValues(t);
        voice.out.gain.setValueAtTime(voice.out.gain.value, t);
        voice.out.gain.linearRampToValueAtTime(0, t + seconds);
      } catch (e) { /* closed */ }
      clearTimeout(voice.timer);
      const out = voice.out;
      setTimeout(() => { try { out.disconnect(); } catch (e) { /* gone */ } }, seconds * 1000 + 40);
    });
    this.voices.clear();
  }

  dispose() { this.stopAll(0.01); setTimeout(() => { try { this.bus.disconnect(); } catch (e) { /* gone */ } }, 80); }
}
