// Play-along songs for the Toy Piano room.
//
// These are deliberately NOT PIECES. The catalogue is the curated listening
// collection with composers and rooms; these are toy-keyboard arrangements —
// traditional children's melodies placed on one octave (C4–C5), diatonic, no
// accidentals, so every note lands on a colored key of the toy. The two
// classical entries reuse the catalogue's verified transcriptions, extended to
// their standard complete A-sections.
//
// Durations are beats (quarter note = 1), the same convention as the
// catalogue, so `tools/check-scores.mjs` can validate this file with the same
// gate that guards the pieces — plus a range check that keeps every pitch on
// the toy's eight keys. A wrong transcription discovered later is the
// Für-Elise failure again, so each song carries its provenance inline.
//
// The `art` pictures are the song's tile on the SELECT page, generated on
// 2026-08-27 with ChatGPT/DALL·E through the owner's account (the sanctioned
// browser preparation route), in one soft storybook watercolor style, one
// subject per song, no text in any of them — the players are pre-readers.
// Every render was visually reviewed before being resized to 640px WebP.
// Full prompts and the download log: raw-downloads/2026-08-27-song-tiles/PROMPTS.md.

export const PLAYALONG_SONGS = [
  {
    id: 'hot-cross-buns',
    title: 'Hot Cross Buns',
    emoji: '🍞',
    art: 'assets/songs/hot-cross-buns.webp',
    tempo: 100,
    // Traditional English street cry; the first song most method books teach.
    // Verified against standard beginner letter-note versions, 2026-08-27.
    source: 'traditional (public domain), own transcription, cross-checked 2026-08-27',
    notes: [
      { n: 'E4', d: 1 }, { n: 'D4', d: 1 }, { n: 'C4', d: 2 },
      { n: 'E4', d: 1 }, { n: 'D4', d: 1 }, { n: 'C4', d: 2 },
      { n: 'C4', d: 1 }, { n: 'C4', d: 1 }, { n: 'C4', d: 1 }, { n: 'C4', d: 1 },
      { n: 'D4', d: 1 }, { n: 'D4', d: 1 }, { n: 'D4', d: 1 }, { n: 'D4', d: 1 },
      { n: 'E4', d: 1 }, { n: 'D4', d: 1 }, { n: 'C4', d: 2 }
    ]
  },
  {
    id: 'mary-had-a-little-lamb',
    title: 'Mary Had a Little Lamb',
    emoji: '🐑',
    art: 'assets/songs/mary-had-a-little-lamb.webp',
    tempo: 108,
    // Lowell Mason's 1830 schoolroom melody (public domain). Verified against
    // standard beginner letter-note versions, 2026-08-27.
    source: 'traditional (public domain), own transcription, cross-checked 2026-08-27',
    notes: [
      { n: 'E4', d: 1 }, { n: 'D4', d: 1 }, { n: 'C4', d: 1 }, { n: 'D4', d: 1 },
      { n: 'E4', d: 1 }, { n: 'E4', d: 1 }, { n: 'E4', d: 2 },
      { n: 'D4', d: 1 }, { n: 'D4', d: 1 }, { n: 'D4', d: 2 },
      { n: 'E4', d: 1 }, { n: 'G4', d: 1 }, { n: 'G4', d: 2 },
      { n: 'E4', d: 1 }, { n: 'D4', d: 1 }, { n: 'C4', d: 1 }, { n: 'D4', d: 1 },
      { n: 'E4', d: 1 }, { n: 'E4', d: 1 }, { n: 'E4', d: 1 }, { n: 'E4', d: 1 },
      { n: 'E4', d: 1 }, { n: 'D4', d: 1 }, { n: 'D4', d: 1 }, { n: 'E4', d: 1 },
      { n: 'D4', d: 1 }, { n: 'C4', d: 4 }
    ]
  },
  {
    id: 'twinkle',
    title: 'Twinkle Twinkle Little Star',
    emoji: '⭐',
    art: 'assets/songs/twinkle.webp',
    tempo: 104,
    // First two phrases are the catalogue's verified `twinkle` excerpt, copied
    // note-for-note; the remaining four are the standard traditional
    // continuation (the melody every child already knows).
    source: 'first half from catalogue (verified 2026-08-21); remainder traditional, cross-checked 2026-08-27',
    notes: [
      { n: 'C4', d: 1 }, { n: 'C4', d: 1 }, { n: 'G4', d: 1 }, { n: 'G4', d: 1 },
      { n: 'A4', d: 1 }, { n: 'A4', d: 1 }, { n: 'G4', d: 2 },
      { n: 'F4', d: 1 }, { n: 'F4', d: 1 }, { n: 'E4', d: 1 }, { n: 'E4', d: 1 },
      { n: 'D4', d: 1 }, { n: 'D4', d: 1 }, { n: 'C4', d: 2 },
      { n: 'G4', d: 1 }, { n: 'G4', d: 1 }, { n: 'F4', d: 1 }, { n: 'F4', d: 1 },
      { n: 'E4', d: 1 }, { n: 'E4', d: 1 }, { n: 'D4', d: 2 },
      { n: 'G4', d: 1 }, { n: 'G4', d: 1 }, { n: 'F4', d: 1 }, { n: 'F4', d: 1 },
      { n: 'E4', d: 1 }, { n: 'E4', d: 1 }, { n: 'D4', d: 2 },
      { n: 'C4', d: 1 }, { n: 'C4', d: 1 }, { n: 'G4', d: 1 }, { n: 'G4', d: 1 },
      { n: 'A4', d: 1 }, { n: 'A4', d: 1 }, { n: 'G4', d: 2 },
      { n: 'F4', d: 1 }, { n: 'F4', d: 1 }, { n: 'E4', d: 1 }, { n: 'E4', d: 1 },
      { n: 'D4', d: 1 }, { n: 'D4', d: 1 }, { n: 'C4', d: 2 }
    ]
  },
  {
    id: 'frere-jacques',
    title: 'Frère Jacques',
    emoji: '⏰',
    art: 'assets/songs/frere-jacques.webp',
    tempo: 100,
    // Traditional French round (public domain). ARRANGED FOR THE TOY: the
    // traditional final phrase "ding dang dong" is do–sol–do with the sol
    // BELOW the do (C4–G3–C4), which falls off the toy's octave; here the
    // sol sits above (C4–G4–C4), the form toddler keyboard books use.
    // Verified against standard beginner letter-note versions, 2026-08-27.
    source: 'traditional (public domain), own transcription, cross-checked 2026-08-27; final phrase arranged to one octave',
    notes: [
      { n: 'C4', d: 1 }, { n: 'D4', d: 1 }, { n: 'E4', d: 1 }, { n: 'C4', d: 2 },
      { n: 'C4', d: 1 }, { n: 'D4', d: 1 }, { n: 'E4', d: 1 }, { n: 'C4', d: 2 },
      { n: 'E4', d: 1 }, { n: 'F4', d: 1 }, { n: 'G4', d: 2 },
      { n: 'E4', d: 1 }, { n: 'F4', d: 1 }, { n: 'G4', d: 2 },
      { n: 'G4', d: 0.5 }, { n: 'A4', d: 0.5 }, { n: 'G4', d: 0.5 }, { n: 'F4', d: 0.5 },
      { n: 'E4', d: 1 }, { n: 'C4', d: 2 },
      { n: 'G4', d: 0.5 }, { n: 'A4', d: 0.5 }, { n: 'G4', d: 0.5 }, { n: 'F4', d: 0.5 },
      { n: 'E4', d: 1 }, { n: 'C4', d: 2 },
      { n: 'C4', d: 1 }, { n: 'G4', d: 1 }, { n: 'C4', d: 2 },
      { n: 'C4', d: 1 }, { n: 'G4', d: 1 }, { n: 'C4', d: 2 }
    ]
  },
  {
    id: 'row-row-row',
    title: 'Row, Row, Row Your Boat',
    emoji: '🚣',
    art: 'assets/songs/row-row-row.webp',
    tempo: 92,
    // Traditional (public domain). Each phrase is six beats and the four
    // "merrily" figures descend as repeated-note arpeggios — high C, G, E, C —
    // landing exactly on the toy's octave. Verified against standard beginner
    // letter-note versions, 2026-08-27.
    source: 'traditional (public domain), own transcription, cross-checked 2026-08-27',
    notes: [
      { n: 'C4', d: 1 }, { n: 'C4', d: 1 }, { n: 'C4', d: 1 }, { n: 'D4', d: 1 }, { n: 'E4', d: 2 },
      { n: 'E4', d: 1 }, { n: 'D4', d: 1 }, { n: 'E4', d: 1 }, { n: 'F4', d: 1 }, { n: 'G4', d: 2 },
      { n: 'C5', d: 0.5 }, { n: 'C5', d: 0.5 }, { n: 'C5', d: 0.5 },
      { n: 'G4', d: 0.5 }, { n: 'G4', d: 0.5 }, { n: 'G4', d: 0.5 },
      { n: 'E4', d: 0.5 }, { n: 'E4', d: 0.5 }, { n: 'E4', d: 0.5 },
      { n: 'C4', d: 0.5 }, { n: 'C4', d: 0.5 }, { n: 'C4', d: 0.5 },
      { n: 'G4', d: 1 }, { n: 'F4', d: 1 }, { n: 'E4', d: 1 }, { n: 'D4', d: 1 }, { n: 'C4', d: 2 }
    ]
  },
  {
    id: 'london-bridge',
    title: 'London Bridge Is Falling Down',
    emoji: '🌉',
    art: 'assets/songs/london-bridge.webp',
    tempo: 104,
    // Traditional English rhyme (public domain). Verified against standard
    // beginner letter-note versions, 2026-08-27.
    source: 'traditional (public domain), own transcription, cross-checked 2026-08-27',
    notes: [
      { n: 'G4', d: 1 }, { n: 'A4', d: 1 }, { n: 'G4', d: 1 }, { n: 'F4', d: 1 },
      { n: 'E4', d: 1 }, { n: 'F4', d: 1 }, { n: 'G4', d: 2 },
      { n: 'D4', d: 1 }, { n: 'E4', d: 1 }, { n: 'F4', d: 2 },
      { n: 'E4', d: 1 }, { n: 'F4', d: 1 }, { n: 'G4', d: 2 },
      { n: 'G4', d: 1 }, { n: 'A4', d: 1 }, { n: 'G4', d: 1 }, { n: 'F4', d: 1 },
      { n: 'E4', d: 1 }, { n: 'F4', d: 1 }, { n: 'G4', d: 2 },
      { n: 'D4', d: 1 }, { n: 'G4', d: 1 }, { n: 'E4', d: 1 }, { n: 'C4', d: 2 }
    ]
  },
  {
    id: 'old-macdonald',
    title: 'Old MacDonald Had a Farm',
    emoji: '🐄',
    art: 'assets/songs/old-macdonald.webp',
    tempo: 108,
    // Traditional American farm song (public domain). Follows the simplified
    // beginner letter-note reading in which the animal sounds of the "moo moo"
    // middle sit on the tonic instead of alternating high and low — the form
    // toddler keyboard books print. Verified against standard beginner
    // letter-note versions, 2026-08-27.
    source: 'traditional (public domain), own transcription, cross-checked 2026-08-27; simplified animal-sound section',
    notes: [
      { n: 'G4', d: 1 }, { n: 'G4', d: 1 }, { n: 'G4', d: 1 }, { n: 'D4', d: 1 },
      { n: 'E4', d: 1 }, { n: 'E4', d: 1 }, { n: 'D4', d: 2 },
      { n: 'B4', d: 1 }, { n: 'B4', d: 1 }, { n: 'A4', d: 1 }, { n: 'A4', d: 1 },
      { n: 'G4', d: 2 }, { n: null, d: 2 },
      { n: 'D4', d: 1 }, { n: 'G4', d: 1 }, { n: 'G4', d: 1 }, { n: 'G4', d: 1 },
      { n: 'D4', d: 1 }, { n: 'E4', d: 1 }, { n: 'E4', d: 1 }, { n: 'D4', d: 2 },
      { n: 'B4', d: 1 }, { n: 'B4', d: 1 }, { n: 'A4', d: 1 }, { n: 'A4', d: 1 },
      { n: 'G4', d: 2 }, { n: null, d: 2 },
      { n: 'D4', d: 1 }, { n: 'D4', d: 1 }, { n: 'G4', d: 1 }, { n: 'G4', d: 1 }, { n: 'G4', d: 1 },
      { n: 'D4', d: 1 }, { n: 'D4', d: 1 }, { n: 'G4', d: 1 }, { n: 'G4', d: 1 }, { n: 'G4', d: 1 },
      { n: 'G4', d: 1 }, { n: 'G4', d: 1 }, { n: 'G4', d: 1 },
      { n: 'G4', d: 1 }, { n: 'G4', d: 1 }, { n: 'G4', d: 1 },
      { n: 'G4', d: 1 }, { n: 'G4', d: 1 }, { n: 'G4', d: 1 },
      { n: 'G4', d: 1 }, { n: 'G4', d: 1 }, { n: 'G4', d: 1 }, { n: 'G4', d: 1 }, { n: 'G4', d: 1 }, { n: 'G4', d: 1 },
      { n: 'G4', d: 1 }, { n: 'G4', d: 1 }, { n: 'G4', d: 1 }, { n: 'D4', d: 1 },
      { n: 'E4', d: 1 }, { n: 'E4', d: 1 }, { n: 'D4', d: 2 },
      { n: 'B4', d: 1 }, { n: 'B4', d: 1 }, { n: 'A4', d: 1 }, { n: 'A4', d: 1 },
      { n: 'G4', d: 2 }, { n: null, d: 2 }
    ]
  },
  {
    id: 'ode-to-joy',
    title: 'Ode to Joy',
    emoji: '🎼',
    art: 'assets/songs/ode-to-joy.webp',
    tempo: 120,
    // Beethoven, Symphony No. 9 (public domain). The first half is the
    // catalogue's verified `ode-to-joy` excerpt, copied note-for-note; the
    // second half is the standard completion of the A-section.
    source: 'first half from catalogue (verified 2026-08-21); remainder standard, cross-checked 2026-08-27',
    notes: [
      { n: 'E4', d: 1 }, { n: 'E4', d: 1 }, { n: 'F4', d: 1 }, { n: 'G4', d: 1 },
      { n: 'G4', d: 1 }, { n: 'F4', d: 1 }, { n: 'E4', d: 1 }, { n: 'D4', d: 1 },
      { n: 'C4', d: 1 }, { n: 'C4', d: 1 }, { n: 'D4', d: 1 }, { n: 'E4', d: 1 },
      { n: 'E4', d: 1.5 }, { n: 'D4', d: 0.5 }, { n: 'D4', d: 2 },
      { n: 'E4', d: 1 }, { n: 'E4', d: 1 }, { n: 'F4', d: 1 }, { n: 'G4', d: 1 },
      { n: 'G4', d: 1 }, { n: 'F4', d: 1 }, { n: 'E4', d: 1 }, { n: 'D4', d: 1 },
      { n: 'C4', d: 1 }, { n: 'C4', d: 1 }, { n: 'D4', d: 1 }, { n: 'E4', d: 1 },
      { n: 'D4', d: 1.5 }, { n: 'C4', d: 0.5 }, { n: 'C4', d: 2 }
    ]
  }
];

export function playalongSongById(id) {
  return PLAYALONG_SONGS.find((s) => s.id === id);
}
