// Every sound is synthesised in WebAudio at the moment it plays (AUDIO-DIRECTION.md
// decision 6): no audio files ship. A chime on wear, a shimmer on colour, a sparkle sweep
// on surprise, a camera click and a ~3 s fanfare at show time. No music bed (10a).

let ctx = null;
let master = null;
let enabled = true;

function ensure() {
  if (!enabled) return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
      const comp = ctx.createDynamicsCompressor();
      master = ctx.createGain();
      master.gain.value = 0.55;
      master.connect(comp);
      comp.connect(ctx.destination);
    } catch (e) { ctx = null; return null; }
  }
  if (ctx.state === 'suspended') { try { ctx.resume(); } catch (e) { /* woken by AudioWake */ } }
  return ctx;
}

export function context() { return ctx; }
export function rebuild() { ctx = null; master = null; }
export function setEnabled(on) { enabled = !!on; if (!on && ctx) { try { ctx.suspend(); } catch (e) { /* ignore */ } } }
export function isEnabled() { return enabled; }

function tone(freq, t0, dur, { type = 'sine', gain = 0.18, attack = 0.006, to = null } = {}) {
  const a = ensure();
  if (!a) return;
  const t = a.currentTime + t0;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master);
  o.start(t); o.stop(t + dur + 0.05);
}

function bell(freq, t0, dur = 0.7, gain = 0.14) {
  tone(freq, t0, dur, { type: 'sine', gain });
  tone(freq * 2.01, t0, dur * 0.6, { type: 'sine', gain: gain * 0.35 });
  tone(freq * 3.0, t0, dur * 0.3, { type: 'triangle', gain: gain * 0.12 });
}

function noise(t0, dur, { gain = 0.2, freq = 3000, q = 1, type = 'bandpass' } = {}) {
  const a = ensure();
  if (!a) return;
  const len = Math.max(1, Math.floor(a.sampleRate * dur));
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = a.createGain();
  const t = a.currentTime + t0;
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f); f.connect(g); g.connect(master);
  src.start(t);
}

const C6 = 1046.5, E6 = 1318.5, G6 = 1568, C7 = 2093;

export const sfx = {
  tap() { tone(880, 0, 0.09, { type: 'triangle', gain: 0.08 }); },
  wear() { bell(C6, 0); bell(E6, 0.07); bell(G6, 0.14, 0.9); },
  remove() { bell(G6, 0, 0.4, 0.1); bell(E6, 0.09, 0.5, 0.1); },
  same() { bell(E6, 0, 0.5, 0.1); bell(G6, 0.06, 0.5, 0.08); },
  shimmer() { for (let i = 0; i < 7; i++) tone(1800 + i * 260 + Math.random() * 120, i * 0.028, 0.22, { gain: 0.05 }); },
  pattern() { for (let i = 0; i < 5; i++) tone(1400 + i * 300, i * 0.04, 0.25, { type: 'triangle', gain: 0.05 }); },
  twirl() { tone(620, 0, 0.55, { type: 'sine', gain: 0.08, to: 1500 }); bell(G6, 0.3, 0.8, 0.1); bell(C7, 0.42, 0.9, 0.08); },
  sweep() {
    const notes = [C6, 1174.7, E6, G6, 1760, C7, 2349.3, 2637];
    notes.forEach((f, i) => bell(f, i * 0.06, 0.6, 0.08));
    noise(0, 0.6, { gain: 0.06, freq: 6000, q: 0.7 });
  },
  doll() { bell(E6, 0, 0.6, 0.1); bell(C7, 0.08, 0.7, 0.07); },
  undo() { tone(700, 0, 0.18, { type: 'triangle', gain: 0.09, to: 480 }); },
  click() { noise(0, 0.06, { gain: 0.45, freq: 3500, q: 0.8 }); noise(0.07, 0.05, { gain: 0.3, freq: 2200, q: 0.8 }); tone(160, 0, 0.08, { gain: 0.12 }); },
  whoosh() { noise(0, 0.35, { gain: 0.08, freq: 1800, q: 0.6 }); },
  fanfare() {
    // ~3 s: a bright triplet pickup, a held chord, and bells over it
    const brass = (f, t, d, g = 0.07) => {
      tone(f, t, d, { type: 'sawtooth', gain: g, attack: 0.03 });
      tone(f * 1.003, t, d, { type: 'square', gain: g * 0.35, attack: 0.03 });
    };
    brass(523.25, 0, 0.22); brass(659.25, 0.18, 0.22); brass(783.99, 0.36, 0.22);
    brass(1046.5, 0.56, 1.9, 0.08); brass(659.25, 0.56, 1.9, 0.05); brass(783.99, 0.56, 1.9, 0.05); brass(261.63, 0.56, 1.9, 0.06);
    [C6, E6, G6, C7, G6, C7, 2637, 3136].forEach((f, i) => bell(f, 0.7 + i * 0.16, 0.9, 0.06));
    bell(C7, 2.3, 1.0, 0.08);
  },
  hold() { tone(660, 0, 0.12, { type: 'triangle', gain: 0.06 }); },
};

// Plays one named sound. Returns false when sound is off or the browser refused.
export function play(name) {
  if (!enabled) return false;
  try { sfx[name](); return true; } catch (e) { return false; }
}
