// Toy Guitar — the five physical toys: what each one carries besides its
// strings. Pure data; no DOM, no audio.
//
// Owner, 2026-10-07 (briefs/2026-10-07-pass2-keyboard-parity.md): every guitar
// is its own physical toy with its own controls, play-surface proportions and
// four themed support pads, parallel to Toy Keyboard's First Piano and
// Princess pads. Amp-style effects are a SEPARATE layer that only Electric and
// Rock expose. The sound of the strings themselves lives in
// audio/guitar-models.js; the percussion recipes in audio/percussion.js.
//
// A toy is:
//   word      the short name under the ribbon chip
//   label     the full name (ribbon aria-label)
//   pads      exactly four one-shot support sounds, in the owner's order.
//             `id` is global and stable (a take stores it), `word` is the
//             child-facing name, `icon` names a drawing in ui/pad-icons.js
//   tones     an optional toy-specific sound switch (null = none). The first
//             entry is the guitar's own base sound
//   strumBar  First Guitar's big strum button (strums the real six strings)
//   effects   amp effects this toy exposes: [] on the acoustic toys
//   layout    play-surface proportions for lib/geometry.makeLayout
//   horn      how far (fraction of the body length) the body reaches back
//             beside the neck, so the side compartments stop short of it

export const TOY_ORDER = ['first', 'classical', 'acoustic', 'electric', 'rock'];

export const EFFECTS = {
  drive: { word: 'Drive', label: 'Overdrive' },
  heavy: { word: 'Heavy', label: 'Heavy distortion' },
  echo: { word: 'Echo', label: 'Echo' },
  wah: { word: 'Wah', label: 'Wah' }
};

export const TOYS = {
  first: {
    word: 'First', label: 'First Guitar',
    pads: [
      { id: 'first-kick', word: 'Kick', icon: 'kick' },
      { id: 'first-clap', word: 'Clap', icon: 'clap' },
      { id: 'first-shaker', word: 'Shaker', icon: 'shaker' },
      { id: 'first-bell', word: 'Bell', icon: 'bell' }
    ],
    tones: null,
    strumBar: true,
    effects: [],
    // chunky: the widest strings and the shortest headstock
    layout: { headFrac: 0.06, bodyFrac: 0.28, nut: [0.092, 56, 70], bridge: [0.11, 64, 84] },
    horn: 0.02
  },
  classical: {
    word: 'Classical', label: 'Classical Guitar',
    pads: [
      { id: 'classical-cajon', word: 'Cajón', icon: 'cajon' },
      { id: 'classical-shaker', word: 'Shaker', icon: 'egg' },
      { id: 'classical-clap', word: 'Hand Clap', icon: 'clap' },
      { id: 'classical-triangle', word: 'Triangle', icon: 'triangle' }
    ],
    // where the right hand plucks: over the soundhole (soft) or by the bridge (bright)
    tones: [
      { id: 'soft', word: 'Soft', icon: 'moon' },
      { id: 'bright', word: 'Bright', icon: 'sun', string: { bright: 4.8, pos: 0.07 }, filter: { type: 'peaking', frequency: 2600, q: 0.9, gain: 4 } }
    ],
    strumBar: false,
    effects: [],
    // a classical neck is wide and flat; long slotted headstock; big lower bout
    layout: { headFrac: 0.08, bodyFrac: 0.28, nut: [0.088, 56, 68], bridge: [0.104, 62, 80] },
    horn: 0.02
  },
  acoustic: {
    word: 'Acoustic', label: 'Acoustic Guitar',
    pads: [
      { id: 'acoustic-kick', word: 'Kick', icon: 'stomp' },
      { id: 'acoustic-snare', word: 'Soft Snare', icon: 'brush' },
      { id: 'acoustic-shaker', word: 'Shaker', icon: 'shaker' },
      { id: 'acoustic-tambourine', word: 'Tambourine', icon: 'tambourine' }
    ],
    // a hard plastic pick, or the soft side of the thumb
    tones: [
      { id: 'pick', word: 'Pick', icon: 'pick' },
      { id: 'fingers', word: 'Fingers', icon: 'thumb', string: { pick: 0.26, bright: 6.2, pos: 0.2 }, filter: { type: 'lowpass', frequency: 3800, q: 0.7 } }
    ],
    strumBar: false,
    effects: [],
    // dreadnought: the biggest body of the five
    layout: { headFrac: 0.07, bodyFrac: 0.29, nut: [0.085, 54, 66], bridge: [0.104, 60, 80] },
    horn: 0.02
  },
  electric: {
    word: 'Electric', label: 'Electric Guitar',
    pads: [
      { id: 'electric-kick', word: 'Kick', icon: 'kick' },
      { id: 'electric-snare', word: 'Snare', icon: 'snare' },
      { id: 'electric-hihat', word: 'Hi-Hat', icon: 'hihat' },
      { id: 'electric-tom', word: 'Tom', icon: 'tom' }
    ],
    // the three-way pickup switch, in words a child can hear
    tones: [
      { id: 'clean', word: 'Clean', icon: 'pickup2' },
      { id: 'warm', word: 'Warm', icon: 'pickup1', filter: { type: 'lowpass', frequency: 2300, q: 0.8 } },
      { id: 'twang', word: 'Twang', icon: 'pickup3', string: { pos: 0.05 }, filter: { type: 'peaking', frequency: 3000, q: 1.1, gain: 6 } }
    ],
    strumBar: false,
    effects: ['drive', 'echo'],
    // slim fast neck, long scale, small body with horns
    layout: { headFrac: 0.07, bodyFrac: 0.25, nut: [0.08, 52, 62], bridge: [0.098, 58, 76] },
    horn: 0.22
  },
  rock: {
    word: 'Rock', label: 'Rock Guitar',
    pads: [
      { id: 'rock-kick', word: 'Kick', icon: 'kick' },
      { id: 'rock-snare', word: 'Snare', icon: 'snare' },
      { id: 'rock-hihat', word: 'Hi-Hat', icon: 'hihat' },
      { id: 'rock-crash', word: 'Crash', icon: 'crash' }
    ],
    tones: null,
    strumBar: false,
    effects: ['heavy', 'echo', 'wah'],
    // slim neck, pointed V body, angular headstock
    layout: { headFrac: 0.08, bodyFrac: 0.26, nut: [0.08, 52, 62], bridge: [0.098, 58, 76] },
    horn: 0.16
  }
};

export function toyById(id) { return TOYS[id] || TOYS.first; }

export function padsFor(id) { return toyById(id).pads.slice(); }

export function allPadIds() { return TOY_ORDER.flatMap((id) => TOYS[id].pads.map((p) => p.id)); }

// Which toy owns a pad id ("rock-crash" -> "rock"), or null.
export function padOwner(padId) { return TOY_ORDER.find((id) => TOYS[id].pads.some((p) => p.id === padId)) || null; }

export function toneById(toyId, toneId) {
  const tones = toyById(toyId).tones;
  if (!tones) return null;
  return tones.find((t) => t.id === toneId) || tones[0];
}

export function hasEffect(toyId, fx) { return toyById(toyId).effects.includes(fx); }

// The settings a toy starts from, and a validator for saved/played-back ones.
export function defaultSettings(toyId) {
  const toy = toyById(toyId);
  const fx = {};
  toy.effects.forEach((name) => { fx[name] = false; });
  return { tone: toy.tones ? toy.tones[0].id : null, fx };
}

export function cleanSettings(toyId, saved) {
  const out = defaultSettings(toyId);
  if (!saved || typeof saved !== 'object') return out;
  if (out.tone !== null && typeof saved.tone === 'string') out.tone = toneById(toyId, saved.tone).id;
  if (saved.fx && typeof saved.fx === 'object') {
    Object.keys(out.fx).forEach((name) => { if (typeof saved.fx[name] === 'boolean') out.fx[name] = saved.fx[name]; });
  }
  return out;
}
