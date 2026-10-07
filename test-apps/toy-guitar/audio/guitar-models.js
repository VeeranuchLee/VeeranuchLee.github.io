// Toy Guitar — the five guitar models: sound parameters and physical identity.
//
// All five share ONE plucked-string engine (audio/ks-worklet.js) and differ by
// parameters and by the signal chain after the strings, so the sound is a
// property of the instrument rather than a different recording:
//   string  — KS loop: t60 (seconds to fade 60 dB at the fundamental), bright
//             (loop low-pass as a multiple of the pitch: higher = metallic),
//             pick (excitation softness 0..1) and pos (pick position 0..0.5)
//   body    — resonance / pickup filters after the strings
//   amp     — drive (waveshaper) and cabinet, for the electrics
//   gain    — model level, balanced offline so no guitar jumps out
//   bendMax — cents a held note can be bent (0 = this guitar cannot bend)
// `shape` names the drawing in ui/draw-guitar.js; models differ in outline,
// headstock, bridge, soundhole/pickups and string look, not only colour.

export const MODELS = [
  {
    id: 'first', name: 'First Guitar', blurb: 'Chunky and friendly',
    shape: 'first',
    string: { t60: 1.5, bright: 4.2, pick: 0.32, pos: 0.2 },
    body: [
      { type: 'peaking', frequency: 120, q: 0.9, gain: 5 },
      { type: 'peaking', frequency: 260, q: 1.0, gain: 3 },
      { type: 'lowpass', frequency: 2800, q: 0.7 }
    ],
    amp: null, gain: 0.41, bendMax: 0,
    palette: { body: '#ef7d57', rim: '#b8472c', neck: '#f1c27a', plate: '#fff0c8', string: '#fff7e0', accent: '#2f9aa3' }
  },
  {
    id: 'classical', name: 'Classical Guitar', blurb: 'Soft nylon strings',
    shape: 'classical',
    string: { t60: 2.6, bright: 3.4, pick: 0.2, pos: 0.16 },
    body: [
      { type: 'peaking', frequency: 100, q: 1.0, gain: 5 },
      { type: 'peaking', frequency: 200, q: 1.0, gain: 3.5 },
      { type: 'lowpass', frequency: 2400, q: 0.6 }
    ],
    amp: null, gain: 0.5, bendMax: 0,
    palette: { body: '#c98a50', rim: '#7a4a25', neck: '#5a3a24', plate: '#f4dfb9', string: '#f4ecd6', accent: '#e8c46a' }
  },
  {
    id: 'acoustic', name: 'Acoustic Guitar', blurb: 'Bright steel strings',
    shape: 'acoustic',
    string: { t60: 3.4, bright: 9.5, pick: 0.62, pos: 0.12 },
    body: [
      { type: 'peaking', frequency: 105, q: 1.0, gain: 6 },
      { type: 'peaking', frequency: 240, q: 1.1, gain: 4 },
      { type: 'peaking', frequency: 3200, q: 0.8, gain: 2.5 },
      { type: 'lowpass', frequency: 7000, q: 0.7 }
    ],
    amp: null, gain: 0.39, bendMax: 100,
    palette: { body: '#e0a24a', rim: '#6c3c24', neck: '#8b5a34', plate: '#3a2418', string: '#e9f0f2', accent: '#fff2c4' }
  },
  {
    id: 'electric', name: 'Electric Guitar', blurb: 'Clean pickups and amp',
    shape: 'electric',
    string: { t60: 4.2, bright: 7, pick: 0.55, pos: 0.1 },
    body: [
      { type: 'highpass', frequency: 80, q: 0.7 },
      { type: 'peaking', frequency: 900, q: 1.2, gain: 3 },
      { type: 'peaking', frequency: 2600, q: 1.0, gain: 2 },
      { type: 'lowpass', frequency: 5200, q: 0.75 }
    ],
    amp: { drive: 1.4, cab: [{ type: 'lowpass', frequency: 6200, q: 0.7 }] },
    gain: 0.29, bendMax: 200,
    palette: { body: '#35b7c9', rim: '#14606c', neck: '#e8c98a', plate: '#f4f1e6', string: '#e8f0f2', accent: '#ffd23f' }
  },
  {
    id: 'rock', name: 'Rock Guitar', blurb: 'Loud, crunchy and long',
    shape: 'rock',
    string: { t60: 6.5, bright: 8, pick: 0.7, pos: 0.07 },
    body: [
      { type: 'highpass', frequency: 90, q: 0.7 },
      { type: 'peaking', frequency: 700, q: 1.0, gain: 4 },
      { type: 'peaking', frequency: 2200, q: 1.0, gain: 3 }
    ],
    amp: {
      drive: 7,
      pre: [{ type: 'highpass', frequency: 140, q: 0.7 }],
      cab: [{ type: 'peaking', frequency: 2400, q: 0.9, gain: 3 }, { type: 'lowpass', frequency: 4200, q: 0.8 }],
      compress: { threshold: -22, ratio: 6, attack: 0.004, release: 0.2 }
    },
    gain: 0.158, bendMax: 200,
    palette: { body: '#2c2a33', rim: '#e0324b', neck: '#3a2a22', plate: '#e0324b', string: '#d8dde6', accent: '#ffb02e' }
  }
];

export function modelById(id) { return MODELS.find((m) => m.id === id) || MODELS[0]; }

// Longer strings sustain longer: scale t60 by lane (0 = low E).
export function stringParams(model, lane) {
  const s = model.string;
  return { t60: s.t60 * (1.25 - 0.1 * lane), bright: s.bright, pick: s.pick, pos: s.pos };
}
