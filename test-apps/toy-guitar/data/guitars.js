import { STANDARD_TUNING } from './chords.js';

// PR1 begins with the Classical/Nylon construction. More models are records in
// this table; the engine does not branch on model names.
export const GUITARS = [
  {
    id: 'nylon', name: 'Classical Guitar', kind: 'acoustic',
    palette: { body: '#b9824d', accent: '#f4dfb9', string: '#ead9ae' },
    strings: {
      tuning: STANDARD_TUNING,
      detune: [-2.2, -1.2, -0.4, 0.5, 1.3, 2.1],
      ks: { pick: 0.38, damping: 0.9962, decay: 2.5, seconds: 2.7 }
    },
    body: [
      { type: 'peaking', frequency: 100, q: 1.0, gain: 4 },
      { type: 'peaking', frequency: 200, q: 1.0, gain: 3 },
      { type: 'lowpass', frequency: 3200, q: 0.7 }
    ],
    amp: null,
    voicing: 'full',
    reverb: 0.18,
    gain: 0.30
  },
  {
    id: 'steel', name: 'Acoustic Steel-String', kind: 'dreadnought',
    palette: { body: '#d6a14e', accent: '#6c3c24', string: '#eef4f6' },
    strings: {
      tuning: STANDARD_TUNING,
      detune: [-2.0, -1.1, -0.3, 0.6, 1.4, 2.2],
      ks: { pick: 0.72, damping: 0.9970, decay: 2.3, seconds: 2.8 }
    },
    body: [
      { type: 'peaking', frequency: 110, q: 0.9, gain: 5 },
      { type: 'peaking', frequency: 240, q: 1.1, gain: 4 },
      { type: 'peaking', frequency: 3000, q: 0.8, gain: 2 },
      { type: 'lowpass', frequency: 4500, q: 0.7 }
    ],
    amp: null,
    voicing: 'full',
    reverb: 0.21,
    gain: 0.19
  },
  {
    id: 'clean', name: 'Clean Electric', kind: 'solid-electric',
    palette: { body: '#65a9b5', accent: '#f4e9c8', string: '#e8f0f2' },
    strings: {
      tuning: STANDARD_TUNING,
      detune: [-1.8, -1.0, -0.2, 0.5, 1.2, 1.9],
      ks: { pick: 0.58, damping: 0.9978, decay: 3.1, seconds: 3.2 }
    },
    body: [
      { type: 'highpass', frequency: 75, q: 0.7 },
      { type: 'peaking', frequency: 800, q: 1.2, gain: 2.5 },
      { type: 'lowpass', frequency: 4800, q: 0.75 }
    ],
    amp: null,
    voicing: 'full',
    reverb: 0.12,
    gain: 0.22
  }
];

export function guitarById(id) {
  return GUITARS.find((guitar) => guitar.id === id) || GUITARS[0];
}
