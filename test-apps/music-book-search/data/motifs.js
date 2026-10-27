// The tune each page sings — AUDIO-DIRECTION.md decision 12.
//
// The rule is two-sided and the two sides live apart on purpose:
//
//     page/theme  -> determines melody/composition   (this file)
//     companion   -> determines instrument/timbre    (data/instruments.js)
//
// So a motif here is written as pitches and durations only. It carries no
// timbre, no oscillator, no filter: it is handed to whichever companion the
// child chose and comes out in that companion's voice. Writing an instrument
// into a motif would break the promise the landing page makes.
//
// Durations are in beats, tempo is in beats per minute, `level` is the motif's
// share of the bed bus (the mix under everything else), `breath` is the rest
// in beats between phrases, and `rest` is the longer silence before the whole
// motif comes round again. A page tune that never stops is a page tune a child
// stops hearing.
//
// Coverage is deliberate rather than complete. Both menus, all six wings and
// eight rooms have their own motif; the other sixteen rooms fall back to their
// wing's tune, which is a real tune about the right subject, not a stub. See
// `motifFor` at the bottom for the fallback order.

// ── the two menus ────────────────────────────────────────────────────────────

// Page 1, choosing a companion. This one is special: the phrases pass between
// all six companions in turn so the child hears every voice before choosing.
// It is the only motif in the book played by more than one instrument, and the
// reason is that the page's subject IS the six instruments.
export const PARADE = {
  tempo: 78,
  level: 0.62,
  breath: 1,
  rest: 3,
  phrases: [
    [{ n: 'C5', d: 1 }, { n: 'B4', d: 0.5 }, { n: 'A4', d: 0.5 }, { n: 'G4', d: 2 }],
    [{ n: 'A4', d: 1 }, { n: 'G4', d: 0.5 }, { n: 'F4', d: 0.5 }, { n: 'E4', d: 2 }],
    [{ n: 'F4', d: 1 }, { n: 'G4', d: 1 }, { n: 'A4', d: 1 }, { n: 'G4', d: 1 }],
    [{ n: 'E4', d: 1 }, { n: 'F4', d: 0.5 }, { n: 'G4', d: 0.5 }, { n: 'C5', d: 2 }],
    [{ n: 'D5', d: 1 }, { n: 'C5', d: 0.5 }, { n: 'B4', d: 0.5 }, { n: 'A4', d: 2 }],
    [{ n: 'G4', d: 1 }, { n: 'E4', d: 1 }, { n: 'D4', d: 0.5 }, { n: 'C4', d: 1.5 }]
  ]
};

// Page 2, the Music World: six doors and a whole book behind them. An opening
// gesture — up the triad, out to the sixth, home.
const WORLD = {
  tempo: 66,
  level: 0.4,
  breath: 1,
  rest: 4,
  phrases: [
    [{ n: 'C4', d: 1 }, { n: 'E4', d: 1 }, { n: 'G4', d: 1 }, { n: 'A4', d: 2 }],
    [{ n: 'G4', d: 1.5 }, { n: 'F4', d: 0.5 }, { n: 'E4', d: 1 }, { n: 'C4', d: 2 }]
  ]
};

// ── the six wings ────────────────────────────────────────────────────────────

const WING_MOTIFS = {
  // Songs a child already knows: stepwise, singable, nothing surprising.
  'songs-we-already-carry': {
    tempo: 84, level: 0.38, breath: 1, rest: 4,
    phrases: [
      [{ n: 'G4', d: 1 }, { n: 'A4', d: 1 }, { n: 'G4', d: 1 }, { n: 'E4', d: 1 }],
      [{ n: 'C4', d: 1 }, { n: 'D4', d: 1 }, { n: 'E4', d: 2 }]
    ]
  },
  // The world singing: pentatonic, no leading note, no pull towards one home.
  'the-world-sings': {
    tempo: 72, level: 0.36, breath: 1.5, rest: 5,
    phrases: [
      [{ n: 'D4', d: 1 }, { n: 'F4', d: 1 }, { n: 'G4', d: 2 }],
      [{ n: 'A4', d: 1 }, { n: 'G4', d: 1 }, { n: 'F4', d: 1 }, { n: 'D4', d: 2 }],
      [{ n: 'C5', d: 1.5 }, { n: 'A4', d: 0.5 }, { n: 'G4', d: 2 }]
    ]
  },
  // Shared days: a lifted, dancing dotted figure. People together, moving.
  'music-for-shared-days': {
    tempo: 108, level: 0.36, breath: 1, rest: 4,
    phrases: [
      [{ n: 'G4', d: 0.75 }, { n: 'G4', d: 0.25 }, { n: 'C5', d: 1 }, { n: 'B4', d: 0.5 }, { n: 'G4', d: 1.5 }],
      [{ n: 'A4', d: 0.75 }, { n: 'B4', d: 0.25 }, { n: 'C5', d: 1 }, { n: 'G4', d: 2 }]
    ]
  },
  // The time corridor: a walking sequence, the same shape a step lower each
  // time. Construction you can hear, which is what the wing is about.
  'the-time-corridor': {
    tempo: 92, level: 0.34, breath: 0.5, rest: 4,
    phrases: [
      [{ n: 'G4', d: 0.5 }, { n: 'F4', d: 0.5 }, { n: 'E4', d: 0.5 }, { n: 'D4', d: 0.5 }, { n: 'E4', d: 1 }],
      [{ n: 'F4', d: 0.5 }, { n: 'E4', d: 0.5 }, { n: 'D4', d: 0.5 }, { n: 'C4', d: 0.5 }, { n: 'D4', d: 1 }],
      [{ n: 'E4', d: 0.5 }, { n: 'D4', d: 0.5 }, { n: 'C4', d: 1 }, { n: 'G3', d: 2 }]
    ]
  },
  // The Romantic century: singing line, a wide reach up, a sigh back down.
  'the-romantic-century': {
    tempo: 62, level: 0.34, breath: 1.5, rest: 5,
    phrases: [
      [{ n: 'E4', d: 1 }, { n: 'C5', d: 2 }, { n: 'B4', d: 1 }],
      [{ n: 'A4', d: 1.5 }, { n: 'G4', d: 0.5 }, { n: 'F4', d: 1 }, { n: 'E4', d: 2 }],
      [{ n: 'D4', d: 1 }, { n: 'F4', d: 1 }, { n: 'E4', d: 3 }]
    ]
  },
  // A new century: fourths and a whole-tone step, nothing settling on a home
  // note. Unfamiliar on purpose, still friendly.
  'cities-colour-new-pulse': {
    tempo: 76, level: 0.34, breath: 1, rest: 5,
    phrases: [
      [{ n: 'D4', d: 1 }, { n: 'G4', d: 1 }, { n: 'C5', d: 2 }],
      [{ n: 'B4', d: 0.5 }, { n: 'A4', d: 0.5 }, { n: 'G4', d: 1 }, { n: 'D4', d: 2 }],
      [{ n: 'E4', d: 1 }, { n: 'F#4', d: 1 }, { n: 'G#4', d: 2 }]
    ]
  }
};

// ── rooms with a tune of their own ───────────────────────────────────────────

const ROOM_MOTIFS = {
  // A detective asks. The phrase climbs and stops on the leading note, so it
  // sounds like a question that has not been answered yet.
  'melody-detective-workshop': {
    tempo: 80, level: 0.34, breath: 1.5, rest: 4,
    phrases: [
      [{ n: 'C4', d: 0.5 }, { n: 'E4', d: 0.5 }, { n: 'G4', d: 1 }, { n: 'B4', d: 2 }],
      [{ n: 'A4', d: 0.5 }, { n: 'F4', d: 0.5 }, { n: 'D4', d: 1 }, { n: 'B3', d: 2 }]
    ]
  },
  // The room is about patterns, so the motif states a shape and then says it
  // again one step higher. The tune demonstrates its own subject.
  'playground-of-patterns': {
    tempo: 100, level: 0.36, breath: 0.5, rest: 3.5,
    phrases: [
      [{ n: 'C4', d: 0.5 }, { n: 'D4', d: 0.5 }, { n: 'E4', d: 0.5 }, { n: 'C4', d: 1.5 }],
      [{ n: 'D4', d: 0.5 }, { n: 'E4', d: 0.5 }, { n: 'F4', d: 0.5 }, { n: 'D4', d: 1.5 }],
      [{ n: 'E4', d: 0.5 }, { n: 'F4', d: 0.5 }, { n: 'G4', d: 0.5 }, { n: 'E4', d: 1.5 }]
    ]
  },
  // Steps and marches: even feet, and a short run-up into the downbeat.
  'steps-beats-marches': {
    tempo: 112, level: 0.36, breath: 1, rest: 3,
    phrases: [
      [{ n: 'G3', d: 0.5 }, { n: 'C4', d: 1 }, { n: 'C4', d: 1 }, { n: 'E4', d: 1 }, { n: 'C4', d: 1 }],
      [{ n: 'G4', d: 1 }, { n: 'E4', d: 1 }, { n: 'C4', d: 2 }]
    ]
  },
  // A courtyard: pentatonic, and a long low note at the end of each phrase for
  // the gong that would be there.
  'southeast-asian-courtyard': {
    tempo: 58, level: 0.32, breath: 2, rest: 5,
    phrases: [
      [{ n: 'F4', d: 1 }, { n: 'G4', d: 1 }, { n: 'Bb4', d: 1 }, { n: 'C5', d: 2 }],
      [{ n: 'Bb4', d: 1 }, { n: 'G4', d: 1 }, { n: 'F4', d: 1 }, { n: 'C4', d: 3 }]
    ]
  },
  // A square on a festival day: a fanfare, straight off the triad.
  'celebration-square': {
    tempo: 116, level: 0.36, breath: 1, rest: 3.5,
    phrases: [
      [{ n: 'C4', d: 0.5 }, { n: 'G4', d: 0.5 }, { n: 'C5', d: 1 }, { n: 'G4', d: 0.5 }, { n: 'C5', d: 1.5 }],
      [{ n: 'E5', d: 1 }, { n: 'D5', d: 0.5 }, { n: 'C5', d: 0.5 }, { n: 'G4', d: 2 }]
    ]
  },
  // Lanterns in the cold: high, slow, mostly silence. The long rests are the
  // motif as much as the notes are.
  'winter-lanterns': {
    tempo: 52, level: 0.3, breath: 2.5, rest: 6,
    phrases: [
      [{ n: 'E5', d: 2 }, { n: 'D5', d: 1 }, { n: 'B4', d: 3 }],
      [{ n: 'A4', d: 2 }, { n: 'B4', d: 1 }, { n: 'E4', d: 3 }]
    ]
  },
  // A Baroque workshop: a descending sequence that falls through the circle of
  // fifths and lands, which is the pattern the room is there to show.
  'baroque-pattern-workshop': {
    tempo: 96, level: 0.34, breath: 0.5, rest: 4,
    phrases: [
      [{ n: 'D5', d: 0.5 }, { n: 'C5', d: 0.5 }, { n: 'B4', d: 0.5 }, { n: 'A4', d: 0.5 }, { n: 'G4', d: 1 }],
      [{ n: 'B4', d: 0.5 }, { n: 'A4', d: 0.5 }, { n: 'G4', d: 0.5 }, { n: 'F#4', d: 0.5 }, { n: 'E4', d: 1 }],
      [{ n: 'G4', d: 0.5 }, { n: 'F#4', d: 0.5 }, { n: 'G4', d: 1 }, { n: 'C4', d: 2 }]
    ]
  },
  // A waltz, because the room is a ballet kingdom and three beats is the point.
  'ballet-kingdom': {
    tempo: 132, level: 0.34, breath: 0, rest: 4.5,
    phrases: [
      [{ n: 'G4', d: 1 }, { n: 'B4', d: 1 }, { n: 'D5', d: 1 }, { n: 'C5', d: 2 }, { n: 'B4', d: 1 }],
      [{ n: 'A4', d: 1 }, { n: 'C5', d: 1 }, { n: 'E5', d: 1 }, { n: 'D5', d: 3 }]
    ]
  }
};

/**
 * The tune for a page.
 *
 * Fallback order, and it never returns nothing for a real page: a room's own
 * motif, then its wing's, then the world theme. `landing` is handled by the
 * caller because it is the one page played by six instruments rather than one.
 *
 * @param {string} view     'landing' | 'world' | 'wing' | 'room'
 * @param {object} where    { wingId, roomId }
 * @param {function} wingOfRoom  roomId -> wingId, so this file needs no copy of rooms.js
 */
export function motifFor(view, where = {}, wingOfRoom = () => null) {
  if (view === 'landing') return PARADE;
  if (view === 'room') {
    const own = ROOM_MOTIFS[where.roomId];
    if (own) return own;
    const wing = WING_MOTIFS[wingOfRoom(where.roomId) || where.wingId];
    if (wing) return wing;
    return WORLD;
  }
  if (view === 'wing') return WING_MOTIFS[where.wingId] || WORLD;
  return WORLD;
}

// Exported for the data check, which asserts every wing has a motif and that
// every note in every motif is a name `noteToFrequency` can read.
export const MOTIFS = { PARADE, WORLD, WING_MOTIFS, ROOM_MOTIFS };
