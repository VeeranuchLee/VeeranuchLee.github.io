// Instrument timbres — and the companions that carry them.
//
// **The companion IS the instrument.** Choosing the violin at the start of a
// journey means every piece in that journey is played by the violin timbre.
// That is why there is no per-song instrument picker: the choice is made once,
// it means something, and it stays. To hear the collection another way, the
// child goes back to the beginning and picks another friend.
//
// Timbres are synthesised at runtime — AUDIO-DIRECTION.md decision 6. No asset
// fields here beyond the character portrait, which is a picture, not a sound.
//
// Gains were measured, not guessed: rendered through an OfflineAudioContext and
// balanced to a common peak so switching companions never reads as "broken".

export const INSTRUMENTS = [
  {
    id: 'music-box',
    name: 'Music Box',
    icon: '✨',
    tagline: 'Sparkly and magical',
    greeting: "Wind me up and listen.",
    art: 'assets/companions/music-box.webp',
    engine: 'web-audio',
    timbre: {
      gain: 0.3,
      oscillators: [
        { type: 'sine', ratio: 1, gain: 1.0 },
        { type: 'sine', ratio: 3.0, gain: 0.34 },
        { type: 'sine', ratio: 5.4, gain: 0.17 },
        { type: 'sine', ratio: 7.1, gain: 0.08 }
      ],
      envelope: { attack: 0.002, decay: 1.9, sustain: 0, release: 0.4 },
      filter: { type: 'highpass', frequency: 260 },
      reverb: { mix: 0.28 }
    }
  },
  {
    id: 'glockenspiel',
    name: 'Glockenspiel',
    icon: '🔔',
    tagline: 'Bright and bell-like',
    greeting: "Every note is a little bell.",
    art: 'assets/companions/glockenspiel.webp',
    engine: 'web-audio',
    timbre: {
      gain: 0.33,
      oscillators: [
        { type: 'sine', ratio: 1, gain: 1.0 },
        { type: 'sine', ratio: 4.2, gain: 0.42 },
        { type: 'sine', ratio: 9.6, gain: 0.14 }
      ],
      envelope: { attack: 0.001, decay: 1.4, sustain: 0, release: 0.3 },
      filter: { type: 'highpass', frequency: 400 },
      reverb: { mix: 0.32 }
    }
  },
  {
    id: 'xylophone',
    name: 'Xylophone',
    icon: '🎵',
    tagline: 'Playful and joyful',
    greeting: "Let's go on a musical adventure!",
    art: 'assets/companions/xylophone.webp',
    engine: 'web-audio',
    timbre: {
      gain: 0.72,
      oscillators: [
        { type: 'triangle', ratio: 1, gain: 1.0 },
        { type: 'sine', ratio: 3.0, gain: 0.30 },
        { type: 'sine', ratio: 6.8, gain: 0.10 }
      ],
      envelope: { attack: 0.001, decay: 0.55, sustain: 0, release: 0.2 },
      filter: { type: 'bandpass', frequency: 1400, Q: 0.7 },
      reverb: { mix: 0.16 }
    }
  },
  {
    id: 'piano',
    name: 'Piano',
    icon: '🎹',
    tagline: 'Warm and grand',
    greeting: "I know every song by heart.",
    art: 'assets/companions/piano.webp',
    engine: 'web-audio',
    timbre: {
      gain: 0.42,
      oscillators: [
        { type: 'triangle', ratio: 1, gain: 1.0 },
        { type: 'sine', ratio: 2, gain: 0.32 },
        { type: 'sine', ratio: 3, gain: 0.13 },
        { type: 'sine', ratio: 4, gain: 0.05 }
      ],
      envelope: { attack: 0.005, decay: 2.2, sustain: 0, release: 0.3 },
      filter: { type: 'lowpass', frequency: 3800 },
      reverb: { mix: 0.18 }
    }
  },
  {
    id: 'flute',
    name: 'Flute',
    icon: '🪈',
    tagline: 'Light and airy',
    greeting: "Let us float through a tune.",
    art: 'assets/companions/flute.webp',
    engine: 'web-audio',
    timbre: {
      gain: 0.3,
      oscillators: [
        { type: 'sine', ratio: 1, gain: 1.0 },
        { type: 'sine', ratio: 2, gain: 0.12 },
        { type: 'triangle', ratio: 1, gain: 0.06, detune: 7 }
      ],
      envelope: { attack: 0.06, decay: 0.12, sustain: 0.85, release: 0.18 },
      filter: { type: 'lowpass', frequency: 2600 },
      reverb: { mix: 0.24 }
    }
  },
  {
    id: 'violin',
    name: 'Violin',
    icon: '🎻',
    tagline: 'Sweet and singing',
    greeting: "I'll play for you!",
    art: 'assets/companions/violin.webp',
    engine: 'web-audio',
    timbre: {
      gain: 0.52,
      oscillators: [
        { type: 'sawtooth', ratio: 1, gain: 0.55 },
        { type: 'sawtooth', ratio: 1, gain: 0.40, detune: -8 },
        { type: 'sine', ratio: 2, gain: 0.10 }
      ],
      envelope: { attack: 0.11, decay: 0.2, sustain: 0.8, release: 0.35 },
      filter: { type: 'lowpass', frequency: 2000 },
      reverb: { mix: 0.30 }
    }
  }
];

// Presentation order on the landing page — the order the owner's mockup uses,
// which reads from the most familiar instrument to the least. The INSTRUMENTS
// array stays in synthesis-build order, which is a different concern.
const COMPANION_ORDER = ['piano', 'flute', 'violin', 'music-box', 'glockenspiel', 'xylophone'];

export const COMPANIONS = COMPANION_ORDER.map((id) => INSTRUMENTS.find((i) => i.id === id));
export const DEFAULT_COMPANION_ID = 'piano';

export function companionById(id) {
  return INSTRUMENTS.find((c) => c.id === id) || INSTRUMENTS[0];
}
