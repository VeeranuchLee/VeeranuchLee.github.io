// Play-along songs for the Toy Piano room.
//
// These are deliberately NOT PIECES. The catalogue is the curated listening
// collection with composers and rooms; these are toy-keyboard arrangements —
// single-line melodies a child plays one key at a time.
//
// THE PIANO GROWS (owner, 2026-10-03; plan in BIG-PIANO-PLAN.md). Each song
// declares `keyboard`: 'small' (8 white keys, C4–C5), 'medium' (that octave
// with its 5 black keys) or 'big' (two octaves, C4–C6, with black keys), and
// the room draws exactly that piano — growing to it with an animation. The
// declared size must be the SMALLEST that holds every note, so the youngest
// children's songs keep the eight big keys. Flats are written as flats (B♭4
// lands on the black key A♯4); a song is never respelt to suit the key list.
//
// Real notes, not squeezed ones: songs whose toy version had been transposed
// or re-arranged only to fit eight keys now play the catalogue's own melody in
// the catalogue's key (moved up a whole octave when the catalogue dips below
// C4 — never single notes folded). Each moved song says so above its entry.
//
// Durations are beats (quarter note = 1), the same convention as the
// catalogue, so `tools/check-scores.mjs` can validate this file with the same
// gate that guards the pieces — plus the check that every pitch is a key of
// the song's declared keyboard. A wrong transcription discovered later is the
// Für-Elise failure again, so each song carries its provenance inline, and
// `verified: true` means the notes were checked one by one against a named
// public-domain score text, never from memory.
//
// The `art` pictures are the song's tile on the SELECT page, generated on
// 2026-08-27 with ChatGPT/DALL·E through the owner's account (the sanctioned
// browser preparation route), in one soft storybook watercolor style, one
// subject per song, no text in any of them — the players are pre-readers.
// Every render was visually reviewed before being resized to 640px WebP.
// Full prompts and the download log: raw-downloads/2026-08-27-song-tiles/PROMPTS.md.
// The nine big-piano additions were generated on 2026-10-03 with Codex built-in
// image generation in the same watercolor brief and reviewed at full size; prompts,
// accepted-source mapping and PASS verdicts are recorded in the task record
// coordination/tasks/2026-10-03-1756-codex-bigpiano-tiles.md.

export const PLAYALONG_SONGS = [
  {
    id: 'hot-cross-buns',
    title: 'Hot Cross Buns',
    emoji: '🍞',
    art: 'assets/songs/hot-cross-buns.webp',
    tempo: 100,
    keyboard: 'small',
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
    keyboard: 'small',
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
    keyboard: 'small',
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
  // Frère Jacques — MOVED TO ITS REAL NOTES 2026-10-03 (owner: "Should some current songs move to
  // their real notes? -> yes"). Note for note the catalogue melody `frere-jacques` (the tune this book plays
  // when listening), in the catalogue's key, one octave up: the toy version turned "ding dang dong" upside-down (sol above) to stay on C4–C5; the catalogue sings sol below, C major G3–A4, so the whole tune moves up one octave (G4–A5), nothing folded.
  {
    id: 'frere-jacques',
    title: 'Frère Jacques',
    emoji: '⏰',
    art: 'assets/songs/frere-jacques.webp',
    tempo: 100,
    keyboard: 'big',
    verified: false,
    source: 'traditional (public domain), own transcription, cross-checked 2026-08-27; play-along = catalogue melody +1 octave (2026-10-03)',
    notes: [
      { n: 'C5', d: 1 }, { n: 'D5', d: 1 }, { n: 'E5', d: 1 }, { n: 'C5', d: 1 },
      { n: 'C5', d: 1 }, { n: 'D5', d: 1 }, { n: 'E5', d: 1 }, { n: 'C5', d: 1 },
      { n: 'E5', d: 1 }, { n: 'F5', d: 1 }, { n: 'G5', d: 2 }, { n: 'E5', d: 1 },
      { n: 'F5', d: 1 }, { n: 'G5', d: 2 }, { n: 'G5', d: 0.5 }, { n: 'A5', d: 0.5 },
      { n: 'G5', d: 0.5 }, { n: 'F5', d: 0.5 }, { n: 'E5', d: 1 }, { n: 'C5', d: 1 },
      { n: 'G5', d: 0.5 }, { n: 'A5', d: 0.5 }, { n: 'G5', d: 0.5 }, { n: 'F5', d: 0.5 },
      { n: 'E5', d: 1 }, { n: 'C5', d: 1 }, { n: 'C5', d: 1 }, { n: 'G4', d: 1 },
      { n: 'C5', d: 2 }, { n: 'C5', d: 1 }, { n: 'G4', d: 1 }, { n: 'C5', d: 2 }
    ]
  },
  {
    id: 'row-row-row',
    title: 'Row, Row, Row Your Boat',
    emoji: '🚣',
    art: 'assets/songs/row-row-row.webp',
    tempo: 92,
    keyboard: 'small',
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
    keyboard: 'small',
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
    keyboard: 'small',
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
  // Ode to Joy — the FULL 16-bar theme (owner 2026-10-03: "Ode to Joy (full)"), replacing the toy's
  // first two phrases. G major, as printed in the cited hymn setting; D4–D5 needs the big piano.
  // Checked note by note against Mutopia ode.ly (soprano, read with a parser) and against the
  // catalogue's C-major full theme, which it matches interval for interval. Beethoven's own bar-12
  // anticipation (the last phrase entering a beat early, tied) is the hymn form here, unsyncopated.
  {
    id: 'ode-to-joy',
    title: 'Ode to Joy',
    emoji: '🎼',
    art: 'assets/songs/ode-to-joy.webp',
    tempo: 100,
    keyboard: 'big',
    verified: true,
    source: 'Beethoven, Symphony No. 9 Op. 125, finale, “Ode to Joy” theme — hymn-tune form; checked against Mutopia Project “Ode to Joy” (ode.ly, Mutopia-2009/08/05-528, public domain), soprano line',
    notes: [
      { n: 'B4', d: 1 }, { n: 'B4', d: 1 }, { n: 'C5', d: 1 }, { n: 'D5', d: 1 },
      { n: 'D5', d: 1 }, { n: 'C5', d: 1 }, { n: 'B4', d: 1 }, { n: 'A4', d: 1 },
      { n: 'G4', d: 1 }, { n: 'G4', d: 1 }, { n: 'A4', d: 1 }, { n: 'B4', d: 1 },
      { n: 'B4', d: 1.5 }, { n: 'A4', d: 0.5 }, { n: 'A4', d: 2 }, { n: 'B4', d: 1 },
      { n: 'B4', d: 1 }, { n: 'C5', d: 1 }, { n: 'D5', d: 1 }, { n: 'D5', d: 1 },
      { n: 'C5', d: 1 }, { n: 'B4', d: 1 }, { n: 'A4', d: 1 }, { n: 'G4', d: 1 },
      { n: 'G4', d: 1 }, { n: 'A4', d: 1 }, { n: 'B4', d: 1 }, { n: 'A4', d: 1.5 },
      { n: 'G4', d: 0.5 }, { n: 'G4', d: 2 }, { n: 'A4', d: 1 }, { n: 'A4', d: 1 },
      { n: 'B4', d: 1 }, { n: 'G4', d: 1 }, { n: 'A4', d: 1 }, { n: 'B4', d: 0.5 },
      { n: 'C5', d: 0.5 }, { n: 'B4', d: 1 }, { n: 'G4', d: 1 }, { n: 'A4', d: 1 },
      { n: 'B4', d: 0.5 }, { n: 'C5', d: 0.5 }, { n: 'B4', d: 1 }, { n: 'A4', d: 1 },
      { n: 'G4', d: 1 }, { n: 'A4', d: 1 }, { n: 'D4', d: 2 }, { n: 'B4', d: 1 },
      { n: 'B4', d: 1 }, { n: 'C5', d: 1 }, { n: 'D5', d: 1 }, { n: 'D5', d: 1 },
      { n: 'C5', d: 1 }, { n: 'B4', d: 1 }, { n: 'A4', d: 1 }, { n: 'G4', d: 1 },
      { n: 'G4', d: 1 }, { n: 'A4', d: 1 }, { n: 'B4', d: 1 }, { n: 'A4', d: 1.5 },
      { n: 'G4', d: 0.5 }, { n: 'G4', d: 2 }
    ]
  },
  // Three Blind Mice — derived from catalogue melody three-blind-mice, 2026-09-29
  {
    id: 'three-blind-mice',
    title: 'Three Blind Mice',
    art: 'assets/bubbles/three-blind-mice.webp',
    emoji: '🐭',
    tempo: 100,
    keyboard: 'small',
    source: 'Traditional English tune family, complete C-major verse; own transcription',
    notes: [
      { n: 'E4', d: 1 },
      { n: 'D4', d: 0.5 },
      { n: 'C4', d: 1.5 },
      { n: 'E4', d: 1 },
      { n: 'D4', d: 0.5 },
      { n: 'C4', d: 1.5 },
      { n: 'G4', d: 0.5 },
      { n: 'G4', d: 0.5 },
      { n: 'F4', d: 0.5 },
      { n: 'F4', d: 0.5 },
      { n: 'E4', d: 2 },
      { n: 'G4', d: 0.5 },
      { n: 'G4', d: 0.5 },
      { n: 'F4', d: 0.5 },
      { n: 'F4', d: 0.5 },
      { n: 'E4', d: 2 },
      { n: 'G4', d: 0.5 },
      { n: 'A4', d: 0.5 },
      { n: 'G4', d: 0.5 },
      { n: 'F4', d: 0.5 },
      { n: 'E4', d: 0.5 },
      { n: 'D4', d: 0.5 },
      { n: 'C4', d: 0.5 },
      { n: 'E4', d: 0.5 },
      { n: 'G4', d: 0.5 },
      { n: 'A4', d: 0.5 },
      { n: 'G4', d: 0.5 },
      { n: 'F4', d: 0.5 },
      { n: 'E4', d: 0.5 },
      { n: 'D4', d: 0.5 },
      { n: 'C4', d: 2 }
    ]
  },

  // BINGO — derived from catalogue melody bingo (corrected 2026-09-29 from published scores), kept in G major: it spans D4–C5, the toy octave exactly, with F#4 its one black key. Not transposed to C: a white-key version would need G3 or F5, and octave-folding single notes is ruled out (owner 2026-09-14).
  //
  // Down a perfect fifth (−7 semitones) takes G major to C major with every pitch
  // a white key. Two notes have to move an octave to stay on the toy's single
  // octave of keys, and both moves are the arranger's, not the tune's:
  //   • the pickup "There" lands on G4 rather than the G3 below the toy;
  //   • the closing "Bin-go was his name-O" (F#4 D4 E4 F#4 | G4 in G major,
  //     so B4 G4 A4 B4 | C5 in C) is lifted an octave, because B3 is off the
  //     bottom of the keyboard. All four notes of that figure move together, so
  //     the figure's own intervals are unchanged, and the song ends rising into
  //     the toy's top C, which is how the closing phrase is sung.
  // The 1-beat pickup is the first note, exactly as in the catalogue, so the
  // child plays "There" before the bar.
  {
    id: 'bingo',
    title: 'BINGO',
    art: 'assets/bubbles/bingo.webp',
    emoji: '🐕',
    tempo: 112,
    keyboard: 'medium',
    source: 'Traditional children’s song, first complete verse, every letter sung; transcribed 2026-09-29 from three published scores (see curation/2026-09-29-bingo-transcription.md)',
    notes: [
      { n: 'D4', d: 1 },
      { n: 'G4', d: 1 },
      { n: 'G4', d: 1 },
      { n: 'D4', d: 1 },
      { n: 'D4', d: 1 },
      { n: 'E4', d: 1 },
      { n: 'E4', d: 1 },
      { n: 'D4', d: 1 },
      { n: 'D4', d: 1 },
      { n: 'G4', d: 1 },
      { n: 'G4', d: 1 },
      { n: 'A4', d: 1 },
      { n: 'A4', d: 1 },
      { n: 'B4', d: 2 },
      { n: 'G4', d: 2 },
      { n: 'B4', d: 2 },
      { n: 'B4', d: 2 },
      { n: 'C5', d: 1 },
      { n: 'C5', d: 1 },
      { n: 'C5', d: 2 },
      { n: 'A4', d: 2 },
      { n: 'A4', d: 2 },
      { n: 'B4', d: 1 },
      { n: 'B4', d: 1 },
      { n: 'B4', d: 2 },
      { n: 'G4', d: 2 },
      { n: 'G4', d: 2 },
      { n: 'A4', d: 1 },
      { n: 'A4', d: 1 },
      { n: 'A4', d: 1 },
      { n: 'G4', d: 1 },
      { n: 'F#4', d: 1 },
      { n: 'D4', d: 1 },
      { n: 'E4', d: 1 },
      { n: 'F#4', d: 1 },
      { n: 'G4', d: 2 },
      { n: 'G4', d: 1 }
    ]
  },

  // The Farmer in the Dell — MOVED TO ITS REAL NOTES 2026-10-03 (owner: "Should some current songs move to
  // their real notes? -> yes"). Note for note the catalogue melody `farmer-in-dell` (the tune this book plays
  // when listening), in the catalogue's key, one octave up: the toy version was transposed +5 to F; the catalogue is C major G3–G4, so the whole tune moves up one octave (G4–G5).
  {
    id: 'farmer-in-dell',
    title: 'The Farmer in the Dell',
    emoji: '👨‍🌾',
    art: 'assets/bubbles/farmer-in-dell.webp',
    tempo: 108,
    keyboard: 'big',
    verified: false,
    source: 'Traditional playground song, one complete C-major verse (the farmer only, not the wife–child–nurse chain); own transcription; play-along = catalogue melody +1 octave (2026-10-03)',
    notes: [
      { n: 'G5', d: 1 }, { n: 'G5', d: 1 }, { n: 'G5', d: 1 }, { n: 'G5', d: 1 },
      { n: 'E5', d: 1 }, { n: 'C5', d: 1 }, { n: 'G5', d: 1 }, { n: 'G5', d: 1 },
      { n: 'G5', d: 1 }, { n: 'G5', d: 1 }, { n: 'E5', d: 1 }, { n: 'C5', d: 1 },
      { n: 'C5', d: 1 }, { n: 'C5', d: 1 }, { n: 'C5', d: 1 }, { n: 'C5', d: 1 },
      { n: 'D5', d: 1 }, { n: 'C5', d: 1 }, { n: 'B4', d: 1 }, { n: 'A4', d: 1 },
      { n: 'G4', d: 1 }, { n: 'G4', d: 1 }, { n: 'D5', d: 1 }, { n: 'D5', d: 1 },
      { n: 'C5', d: 2 }
    ]
  },

  // Mulberry Bush — derived from catalogue melody mulberry-bush, 2026-09-29
  {
    id: 'mulberry-bush',
    title: 'Mulberry Bush',
    art: 'assets/bubbles/mulberry-bush.webp',
    emoji: '🌳',
    tempo: 108,
    keyboard: 'small',
    source: 'Traditional English tune family, complete C-major verse (the same family as The Wheels on the Bus); own transcription',
    notes: [
      { n: 'C4', d: 1 },
      { n: 'C4', d: 1 },
      { n: 'C4', d: 1 },
      { n: 'C4', d: 1 },
      { n: 'C4', d: 1 },
      { n: 'C4', d: 1 },
      { n: 'E4', d: 1 },
      { n: 'G4', d: 1 },
      { n: 'A4', d: 1 },
      { n: 'A4', d: 1 },
      { n: 'A4', d: 2 },
      { n: 'G4', d: 2 },
      { n: 'F4', d: 1 },
      { n: 'F4', d: 1 },
      { n: 'F4', d: 1 },
      { n: 'F4', d: 1 },
      { n: 'F4', d: 1 },
      { n: 'F4', d: 1 },
      { n: 'A4', d: 2 },
      { n: 'C4', d: 1 },
      { n: 'C4', d: 1 },
      { n: 'C4', d: 1 },
      { n: 'C4', d: 1 },
      { n: 'C4', d: 1 },
      { n: 'C4', d: 1 },
      { n: 'E4', d: 1 },
      { n: 'G4', d: 1 },
      { n: 'G4', d: 1 },
      { n: 'F4', d: 1 },
      { n: 'E4', d: 1 },
      { n: 'D4', d: 1 },
      { n: 'C4', d: 2 }
    ]
  },

  // This Old Man — derived from catalogue melody this-old-man, 2026-09-29
  {
    id: 'this-old-man',
    title: 'This Old Man',
    art: 'assets/bubbles/this-old-man.webp',
    emoji: '👴',
    tempo: 108,
    keyboard: 'small',
    source: 'Traditional English counting song, one complete C-major verse (played one); own transcription',
    notes: [
      { n: 'G4', d: 1 },
      { n: 'E4', d: 1 },
      { n: 'G4', d: 2 },
      { n: 'G4', d: 1 },
      { n: 'E4', d: 1 },
      { n: 'G4', d: 2 },
      { n: 'A4', d: 1 },
      { n: 'G4', d: 1 },
      { n: 'F4', d: 1 },
      { n: 'E4', d: 1 },
      { n: 'D4', d: 1 },
      { n: 'C4', d: 1 },
      { n: 'D4', d: 1 },
      { n: 'E4', d: 1 },
      { n: 'G4', d: 1 },
      { n: 'G4', d: 1 },
      { n: 'D4', d: 2 },
      { n: 'E4', d: 1 },
      { n: 'D4', d: 1 },
      { n: 'C4', d: 2 }
    ]
  },

  // Skip to My Lou — derived from catalogue melody skip-to-my-lou, 2026-09-29
  {
    id: 'skip-to-my-lou',
    title: 'Skip to My Lou',
    art: 'assets/bubbles/skip-to-my-lou.webp',
    emoji: '💃',
    tempo: 120,
    keyboard: 'small',
    source: 'Traditional American play-party song, one complete C-major verse; own transcription',
    notes: [
      { n: 'C4', d: 1 },
      { n: 'C4', d: 1 },
      { n: 'E4', d: 1 },
      { n: 'G4', d: 1 },
      { n: 'A4', d: 1 },
      { n: 'G4', d: 1 },
      { n: 'E4', d: 1 },
      { n: 'C4', d: 1 },
      { n: 'C4', d: 1 },
      { n: 'C4', d: 1 },
      { n: 'E4', d: 1 },
      { n: 'G4', d: 1 },
      { n: 'A4', d: 1 },
      { n: 'G4', d: 1 },
      { n: 'E4', d: 1 },
      { n: 'C4', d: 1 },
      { n: 'C4', d: 1 },
      { n: 'C4', d: 1 },
      { n: 'E4', d: 1 },
      { n: 'G4', d: 1 },
      { n: 'A4', d: 1 },
      { n: 'G4', d: 1 },
      { n: 'E4', d: 1 },
      { n: 'C4', d: 1 },
      { n: 'G4', d: 1 },
      { n: 'G4', d: 1 },
      { n: 'F4', d: 1 },
      { n: 'E4', d: 1 },
      { n: 'D4', d: 1 },
      { n: 'C4', d: 3 }
    ]
  },

  // When the Saints — derived from catalogue melody when-saints-go-marching, 2026-09-29
  {
    id: 'when-saints-go-marching',
    title: 'When the Saints',
    art: 'assets/bubbles/when-saints-go-marching.webp',
    emoji: '🎺',
    tempo: 112,
    keyboard: 'small',
    source: 'Traditional American song, familiar C-major chorus (not a Dixieland / jazz arrangement); own transcription',
    notes: [
      { n: 'C4', d: 1 },
      { n: 'E4', d: 1 },
      { n: 'F4', d: 1 },
      { n: 'G4', d: 3 },
      { n: null, d: 1 },
      { n: 'C4', d: 1 },
      { n: 'E4', d: 1 },
      { n: 'F4', d: 1 },
      { n: 'G4', d: 3 },
      { n: null, d: 1 },
      { n: 'C4', d: 1 },
      { n: 'E4', d: 1 },
      { n: 'F4', d: 1 },
      { n: 'G4', d: 2 },
      { n: 'E4', d: 1 },
      { n: 'C4', d: 1 },
      { n: 'E4', d: 1 },
      { n: 'D4', d: 3 },
      { n: null, d: 1 },
      { n: 'E4', d: 1 },
      { n: 'E4', d: 1 },
      { n: 'D4', d: 1 },
      { n: 'C4', d: 2 },
      { n: 'E4', d: 1 },
      { n: 'G4', d: 2 },
      { n: 'G4', d: 1 },
      { n: 'F4', d: 3 },
      { n: null, d: 1 },
      { n: 'C4', d: 1 },
      { n: 'E4', d: 1 },
      { n: 'F4', d: 1 },
      { n: 'G4', d: 2 },
      { n: 'E4', d: 1 },
      { n: 'C4', d: 1 },
      { n: 'D4', d: 1 },
      { n: 'C4', d: 3 }
    ]
  },

  // Rock-a-bye Baby — derived from catalogue melody rock-a-bye-baby, 2026-09-29
  {
    id: 'rock-a-bye-baby',
    title: 'Rock-a-bye Baby',
    art: 'assets/bubbles/rock-a-bye-baby.webp',
    emoji: '🍼',
    tempo: 84,
    keyboard: 'small',
    source: 'Traditional / historical lullaby, complete C-major verse in 3; own transcription',
    notes: [
      { n: 'C4', d: 1 },
      { n: 'C4', d: 1 },
      { n: 'E4', d: 1 },
      { n: 'G4', d: 1 },
      { n: 'G4', d: 1 },
      { n: 'E4', d: 1 },
      { n: 'C4', d: 1 },
      { n: 'D4', d: 1 },
      { n: 'E4', d: 1 },
      { n: 'D4', d: 3 },
      { n: 'C4', d: 1 },
      { n: 'C4', d: 1 },
      { n: 'E4', d: 1 },
      { n: 'G4', d: 1 },
      { n: 'G4', d: 1 },
      { n: 'E4', d: 1 },
      { n: 'G4', d: 1 },
      { n: 'F4', d: 1 },
      { n: 'D4', d: 1 },
      { n: 'C4', d: 3 },
      { n: 'C4', d: 1 },
      { n: 'C4', d: 1 },
      { n: 'E4', d: 1 },
      { n: 'G4', d: 1 },
      { n: 'G4', d: 1 },
      { n: 'E4', d: 1 },
      { n: 'C4', d: 1 },
      { n: 'D4', d: 1 },
      { n: 'E4', d: 1 },
      { n: 'D4', d: 3 },
      { n: 'C4', d: 1 },
      { n: 'C4', d: 1 },
      { n: 'E4', d: 1 },
      { n: 'G4', d: 1 },
      { n: 'G4', d: 1 },
      { n: 'E4', d: 1 },
      { n: 'G4', d: 1 },
      { n: 'F4', d: 1 },
      { n: 'D4', d: 1 },
      { n: 'C4', d: 3 }
    ]
  },

  // Amazing Grace — MOVED TO ITS REAL NOTES 2026-10-03 (owner: "Should some current songs move to
  // their real notes? -> yes"). Note for note the catalogue melody `amazing-grace-new-britain` (the tune this book plays
  // when listening), in the catalogue's key: the toy version was transposed −2 to F; the catalogue is G major D4–D5 and fits the big piano as it is.
  {
    id: 'amazing-grace-new-britain',
    title: 'Amazing Grace',
    emoji: '🙏',
    art: 'assets/bubbles/amazing-grace-new-britain.webp',
    tempo: 72,
    keyboard: 'big',
    verified: false,
    source: 'Hymn tune New Britain (not a later gospel arrangement), first stanza in G major, 3/4; own transcription; play-along = catalogue melody (2026-10-03)',
    notes: [
      { n: 'D4', d: 1 }, { n: 'G4', d: 2 }, { n: 'B4', d: 1 }, { n: 'A4', d: 2 },
      { n: 'G4', d: 1 }, { n: 'B4', d: 2 }, { n: 'A4', d: 1 }, { n: 'G4', d: 2 },
      { n: 'E4', d: 1 }, { n: 'D4', d: 3 }, { n: 'D4', d: 2 }, { n: 'G4', d: 1 },
      { n: 'B4', d: 2 }, { n: 'A4', d: 1 }, { n: 'A4', d: 3 }, { n: 'B4', d: 2 },
      { n: 'D5', d: 1 }, { n: 'D5', d: 2 }, { n: 'B4', d: 1 }, { n: 'G4', d: 2 },
      { n: 'B4', d: 1 }, { n: 'A4', d: 2 }, { n: 'G4', d: 1 }, { n: 'E4', d: 2 },
      { n: 'D4', d: 1 }, { n: 'D4', d: 2 }, { n: 'G4', d: 1 }, { n: 'B4', d: 2 },
      { n: 'A4', d: 1 }, { n: 'G4', d: 3 }
    ]
  },

  // Sakura — derived from catalogue melody sakura-sakura, 2026-09-29
  {
    id: 'sakura-sakura',
    title: 'Sakura',
    art: 'assets/bubbles/sakura-sakura.webp',
    emoji: '🌸',
    tempo: 72,
    keyboard: 'small',
    source: 'Japanese traditional sakura melody, in-scale pentatonic in A, one complete verse; own transcription of the familiar school version',
    notes: [
      { n: 'A4', d: 1 },
      { n: 'A4', d: 1 },
      { n: 'A4', d: 1.5 },
      { n: 'F4', d: 0.5 },
      { n: 'E4', d: 1 },
      { n: 'F4', d: 1 },
      { n: 'A4', d: 1.5 },
      { n: 'F4', d: 0.5 },
      { n: 'E4', d: 2 },
      { n: 'E4', d: 1 },
      { n: 'F4', d: 1 },
      { n: 'A4', d: 1 },
      { n: 'B4', d: 1 },
      { n: 'C5', d: 2 },
      { n: 'B4', d: 1 },
      { n: 'A4', d: 1 },
      { n: 'F4', d: 1 },
      { n: 'E4', d: 2 },
      { n: 'A4', d: 1 },
      { n: 'A4', d: 1 },
      { n: 'A4', d: 1.5 },
      { n: 'F4', d: 0.5 },
      { n: 'E4', d: 1 },
      { n: 'F4', d: 1 },
      { n: 'A4', d: 1.5 },
      { n: 'F4', d: 0.5 },
      { n: 'E4', d: 2 }
    ]
  },

  // Arirang — MOVED TO ITS REAL NOTES 2026-10-03 (owner: "Should some current songs move to
  // their real notes? -> yes"). Note for note the catalogue melody `arirang` (the tune this book plays
  // when listening), in the catalogue's key: the toy version was transposed −7 to C; the catalogue (G4–E5) fits the big piano as it is.
  {
    id: 'arirang',
    title: 'Arirang',
    emoji: '🏔️',
    art: 'assets/bubbles/arirang.webp',
    tempo: 76,
    keyboard: 'big',
    verified: false,
    source: 'Named variant: Gyeonggi (standard) Arirang, C-major pentatonic verse; own transcription. Not Jindo or Jeongseon Arirang.; play-along = catalogue melody (2026-10-03)',
    notes: [
      { n: 'G4', d: 1 }, { n: 'A4', d: 1 }, { n: 'C5', d: 2 }, { n: 'D5', d: 1 },
      { n: 'E5', d: 1 }, { n: 'D5', d: 2 }, { n: 'C5', d: 1 }, { n: 'A4', d: 1 },
      { n: 'G4', d: 2 }, { n: 'A4', d: 1 }, { n: 'C5', d: 1 }, { n: 'D5', d: 2 },
      { n: 'C5', d: 1 }, { n: 'A4', d: 1 }, { n: 'G4', d: 2 }, { n: 'G4', d: 1 },
      { n: 'A4', d: 1 }, { n: 'C5', d: 2 }, { n: 'D5', d: 1 }, { n: 'E5', d: 1 },
      { n: 'D5', d: 2 }, { n: 'C5', d: 1 }, { n: 'A4', d: 1 }, { n: 'G4', d: 3 }
    ]
  },

  // Burung Kakak Tua — derived from catalogue melody burung-kakak-tua, 2026-09-29
  {
    id: 'burung-kakak-tua',
    title: 'Burung Kakak Tua',
    art: 'assets/bubbles/burung-kakak-tua.webp',
    emoji: '🦜',
    tempo: 100,
    keyboard: 'small',
    source: 'Indonesian/Maluku traditional children\'s song, complete C-major verse; own transcription',
    notes: [
      { n: 'G4', d: 1 },
      { n: 'E4', d: 1 },
      { n: 'C4', d: 1 },
      { n: 'G4', d: 1 },
      { n: 'E4', d: 1 },
      { n: 'C4', d: 1 },
      { n: 'D4', d: 1 },
      { n: 'E4', d: 1 },
      { n: 'D4', d: 1 },
      { n: 'C4', d: 2 },
      { n: 'G4', d: 1 },
      { n: 'E4', d: 1 },
      { n: 'C4', d: 1 },
      { n: 'G4', d: 1 },
      { n: 'E4', d: 1 },
      { n: 'C4', d: 1 },
      { n: 'D4', d: 1 },
      { n: 'E4', d: 1 },
      { n: 'D4', d: 1 },
      { n: 'C4', d: 2 },
      { n: 'C4', d: 1 },
      { n: 'D4', d: 1 },
      { n: 'E4', d: 1 },
      { n: 'G4', d: 1 },
      { n: 'A4', d: 1 },
      { n: 'G4', d: 1 },
      { n: 'E4', d: 1 },
      { n: 'C4', d: 1 },
      { n: 'D4', d: 1 },
      { n: 'E4', d: 1 },
      { n: 'D4', d: 1 },
      { n: 'C4', d: 2 }
    ]
  },

  // Raghupati Raghava — MOVED TO ITS REAL NOTES 2026-10-03 (owner: "Should some current songs move to
  // their real notes? -> yes"). Note for note the catalogue melody `raghupati-raghava` (the tune this book plays
  // when listening), in the catalogue's key, one octave up: the toy version was transposed +7; the catalogue is C major G3–F4, so the whole tune moves up one octave (G4–F5).
  {
    id: 'raghupati-raghava',
    title: 'Raghupati Raghava',
    emoji: '🕉️',
    art: 'assets/bubbles/raghupati-raghava.webp',
    tempo: 84,
    keyboard: 'big',
    verified: false,
    source: 'Indian devotional song tradition, complete C-major first stanza of the familiar bhajan; own transcription, not a film arrangement; play-along = catalogue melody +1 octave (2026-10-03)',
    notes: [
      { n: 'C5', d: 1 }, { n: 'D5', d: 1 }, { n: 'E5', d: 1 }, { n: 'F5', d: 1 },
      { n: 'E5', d: 1 }, { n: 'D5', d: 1 }, { n: 'C5', d: 2 }, { n: 'D5', d: 1 },
      { n: 'E5', d: 1 }, { n: 'D5', d: 1 }, { n: 'C5', d: 1 }, { n: 'A4', d: 1 },
      { n: 'G4', d: 2 }, { n: 'G4', d: 1 }, { n: 'A4', d: 1 }, { n: 'C5', d: 1 },
      { n: 'D5', d: 1 }, { n: 'E5', d: 1 }, { n: 'D5', d: 1 }, { n: 'C5', d: 2 },
      { n: 'C5', d: 1 }, { n: 'D5', d: 1 }, { n: 'E5', d: 1 }, { n: 'F5', d: 1 },
      { n: 'E5', d: 1 }, { n: 'D5', d: 1 }, { n: 'C5', d: 2 }
    ]
  },

  // Kalinka — derived from catalogue melody kalinka, 2026-09-29
  {
    id: 'kalinka',
    title: 'Kalinka',
    art: 'assets/bubbles/kalinka.webp',
    emoji: '❄️',
    tempo: 132,
    keyboard: 'small',
    source: 'Ivan Larionov, Kalinka (1860), the familiar fast chorus in A minor; own transcription, not a later choir showpiece',
    notes: [
      { n: 'A4', d: 0.5 },
      { n: 'A4', d: 0.5 },
      { n: 'A4', d: 0.5 },
      { n: 'F4', d: 0.5 },
      { n: 'A4', d: 0.5 },
      { n: 'B4', d: 0.5 },
      { n: 'A4', d: 0.5 },
      { n: 'F4', d: 0.5 },
      { n: 'E4', d: 1 },
      { n: 'A4', d: 0.5 },
      { n: 'A4', d: 0.5 },
      { n: 'A4', d: 0.5 },
      { n: 'F4', d: 0.5 },
      { n: 'A4', d: 0.5 },
      { n: 'B4', d: 0.5 },
      { n: 'A4', d: 0.5 },
      { n: 'F4', d: 0.5 },
      { n: 'E4', d: 1 },
      { n: 'E4', d: 0.5 },
      { n: 'F4', d: 0.5 },
      { n: 'G4', d: 0.5 },
      { n: 'A4', d: 0.5 },
      { n: 'B4', d: 0.5 },
      { n: 'A4', d: 0.5 },
      { n: 'G4', d: 0.5 },
      { n: 'F4', d: 0.5 },
      { n: 'E4', d: 1 },
      { n: 'A4', d: 0.5 },
      { n: 'A4', d: 0.5 },
      { n: 'A4', d: 0.5 },
      { n: 'F4', d: 0.5 },
      { n: 'A4', d: 0.5 },
      { n: 'B4', d: 0.5 },
      { n: 'A4', d: 0.5 },
      { n: 'F4', d: 0.5 },
      { n: 'E4', d: 1 }
    ]
  },

  // Shchedryk — MOVED TO ITS REAL NOTES 2026-10-03 (owner: "Should some current songs move to
  // their real notes? -> yes"). Note for note the catalogue melody `shchedryk` (the tune this book plays
  // when listening), in the catalogue's key, one octave up: the toy version was transposed +5; the catalogue is E minor G3–G4, so the whole tune moves up one octave (G4–G5, F♯ on its black key).
  {
    id: 'shchedryk',
    title: 'Shchedryk',
    emoji: '🔔',
    art: 'assets/bubbles/shchedryk.webp',
    tempo: 100,
    keyboard: 'big',
    verified: false,
    source: 'Mykola Leontovych, Shchedryk (Ukraine, 1916), soprano/folk line of the original New Year chant in E minor; own transcription. NOT the later English Carol of the Bells arrangement (Wilhousky), whose descending-fourth ostinato is a different piece of writing.; play-along = catalogue melody +1 octave (2026-10-03)',
    notes: [
      { n: 'E5', d: 0.5 }, { n: 'E5', d: 0.5 }, { n: 'E5', d: 0.5 }, { n: 'F#5', d: 0.5 },
      { n: 'G5', d: 0.5 }, { n: 'F#5', d: 0.5 }, { n: 'E5', d: 0.5 }, { n: 'D5', d: 0.5 },
      { n: 'E5', d: 0.5 }, { n: 'F#5', d: 0.5 }, { n: 'D5', d: 1 }, { n: 'B4', d: 1 },
      { n: 'E5', d: 0.5 }, { n: 'E5', d: 0.5 }, { n: 'E5', d: 0.5 }, { n: 'F#5', d: 0.5 },
      { n: 'G5', d: 0.5 }, { n: 'F#5', d: 0.5 }, { n: 'E5', d: 0.5 }, { n: 'D5', d: 0.5 },
      { n: 'E5', d: 0.5 }, { n: 'F#5', d: 0.5 }, { n: 'D5', d: 1 }, { n: 'B4', d: 1 },
      { n: 'C5', d: 0.5 }, { n: 'B4', d: 0.5 }, { n: 'A4', d: 0.5 }, { n: 'G4', d: 0.5 },
      { n: 'A4', d: 0.5 }, { n: 'B4', d: 0.5 }, { n: 'E5', d: 1 }, { n: 'E5', d: 0.5 },
      { n: 'E5', d: 0.5 }, { n: 'E5', d: 0.5 }, { n: 'F#5', d: 0.5 }, { n: 'G5', d: 0.5 },
      { n: 'F#5', d: 0.5 }, { n: 'E5', d: 0.5 }, { n: 'D5', d: 0.5 }, { n: 'E5', d: 2 }
    ]
  },

  // Nkosi Sikelel' iAfrika — MOVED TO ITS REAL NOTES 2026-10-03 (owner: "Should some current songs move to
  // their real notes? -> yes"). Note for note the catalogue melody `nkosi-sikelel-iafrika` (the tune this book plays
  // when listening), in the catalogue's key: the toy version was transposed −5 to C; the catalogue is F major F4–D5 (B♭ on its black key) and fits as it is.
  {
    id: 'nkosi-sikelel-iafrika',
    title: 'Nkosi Sikelel\' iAfrika',
    emoji: '🌍',
    art: 'assets/bubbles/nkosi-sikelel-iafrika.webp',
    tempo: 80,
    keyboard: 'big',
    verified: false,
    source: 'Enoch Sontonga, Nkosi Sikelel\' iAfrika (1897 hymn), first stanza melody in F; own transcription. Not a later national-anthem orchestration.; play-along = catalogue melody (2026-10-03)',
    notes: [
      { n: 'F4', d: 1 }, { n: 'A4', d: 1 }, { n: 'C5', d: 2 }, { n: 'D5', d: 1 },
      { n: 'C5', d: 1 }, { n: 'A4', d: 2 }, { n: 'F4', d: 1 }, { n: 'G4', d: 1 },
      { n: 'A4', d: 2 }, { n: 'Bb4', d: 1 }, { n: 'A4', d: 1 }, { n: 'G4', d: 2 },
      { n: 'F4', d: 1 }, { n: 'A4', d: 1 }, { n: 'C5', d: 2 }, { n: 'D5', d: 1 },
      { n: 'C5', d: 1 }, { n: 'A4', d: 2 }, { n: 'G4', d: 1 }, { n: 'A4', d: 1 },
      { n: 'F4', d: 3 }
    ]
  },

  // El Cóndor Pasa — derived from catalogue melody el-condor-pasa, 2026-09-29
  {
    id: 'el-condor-pasa',
    title: 'El Cóndor Pasa',
    art: 'assets/bubbles/el-condor-pasa.webp',
    emoji: '🦅',
    tempo: 72,
    keyboard: 'small',
    source: 'Daniel Alomía Robles, El Cóndor Pasa (1913), Andean pentatonic flute-line reduction in E minor; own transcription. NOT the later Simon & Garfunkel song/arrangement.',
    notes: [
      { n: 'E4', d: 2 },
      { n: 'G4', d: 1 },
      { n: 'A4', d: 1 },
      { n: 'B4', d: 2 },
      { n: 'A4', d: 1 },
      { n: 'G4', d: 1 },
      { n: 'E4', d: 3 },
      { n: 'E4', d: 2 },
      { n: 'G4', d: 1 },
      { n: 'A4', d: 1 },
      { n: 'C5', d: 2 },
      { n: 'B4', d: 1 },
      { n: 'A4', d: 1 },
      { n: 'G4', d: 3 },
      { n: 'A4', d: 2 },
      { n: 'B4', d: 1 },
      { n: 'A4', d: 1 },
      { n: 'G4', d: 2 },
      { n: 'E4', d: 1 },
      { n: 'D4', d: 1 },
      { n: 'E4', d: 3 },
      { n: 'E4', d: 2 },
      { n: 'G4', d: 1 },
      { n: 'A4', d: 1 },
      { n: 'B4', d: 2 },
      { n: 'A4', d: 1 },
      { n: 'G4', d: 1 },
      { n: 'E4', d: 3 }
    ]
  },

  // Jolly Good Fellow — derived from catalogue melody jolly-good-fellow, 2026-09-29
  {
    id: 'jolly-good-fellow',
    title: 'Jolly Good Fellow',
    art: 'assets/bubbles/jolly-good-fellow.webp',
    emoji: '🎉',
    tempo: 108,
    keyboard: 'small',
    source: 'Traditional tune family (Malbrough / For He\'s a Jolly Good Fellow / The Bear Went Over the Mountain), complete C-major verse including which nobody can deny; own transcription. One melody object.',
    notes: [
      { n: 'C4', d: 0.5 },
      { n: 'C4', d: 0.5 },
      { n: 'C4', d: 0.5 },
      { n: 'E4', d: 0.5 },
      { n: 'G4', d: 1 },
      { n: 'G4', d: 0.5 },
      { n: 'E4', d: 0.5 },
      { n: 'C4', d: 0.5 },
      { n: 'C4', d: 0.5 },
      { n: 'C4', d: 1 },
      { n: 'C4', d: 0.5 },
      { n: 'C4', d: 0.5 },
      { n: 'C4', d: 0.5 },
      { n: 'E4', d: 0.5 },
      { n: 'G4', d: 1 },
      { n: 'G4', d: 0.5 },
      { n: 'E4', d: 0.5 },
      { n: 'C4', d: 1 },
      { n: 'D4', d: 1.5 },
      { n: 'G4', d: 0.5 },
      { n: 'G4', d: 0.5 },
      { n: 'G4', d: 0.5 },
      { n: 'E4', d: 0.5 },
      { n: 'C4', d: 1 },
      { n: 'G4', d: 0.5 },
      { n: 'G4', d: 0.5 },
      { n: 'G4', d: 0.5 },
      { n: 'E4', d: 0.5 },
      { n: 'C4', d: 1 },
      { n: 'C4', d: 0.5 },
      { n: 'C4', d: 0.5 },
      { n: 'C4', d: 0.5 },
      { n: 'E4', d: 0.5 },
      { n: 'G4', d: 1 },
      { n: 'G4', d: 0.5 },
      { n: 'E4', d: 0.5 },
      { n: 'C4', d: 1 },
      { n: 'D4', d: 0.5 },
      { n: 'C4', d: 1.5 }
    ]
  },

  // Jingle Bells — derived from catalogue melody jingle-bells, 2026-09-29
  {
    id: 'jingle-bells',
    title: 'Jingle Bells',
    art: 'assets/bubbles/jingle-bells.webp',
    emoji: '🛷',
    tempo: 112,
    keyboard: 'small',
    source: 'James Lord Pierpont, One Horse Open Sleigh (1857), C-major verse plus chorus; own transcription, not a pop medley',
    notes: [
      { n: 'E4', d: 1 },
      { n: 'E4', d: 1 },
      { n: 'E4', d: 2 },
      { n: 'E4', d: 1 },
      { n: 'E4', d: 1 },
      { n: 'E4', d: 2 },
      { n: 'E4', d: 1 },
      { n: 'G4', d: 1 },
      { n: 'C4', d: 1 },
      { n: 'D4', d: 1 },
      { n: 'E4', d: 4 },
      { n: 'F4', d: 1 },
      { n: 'F4', d: 1 },
      { n: 'F4', d: 1 },
      { n: 'F4', d: 1 },
      { n: 'F4', d: 1 },
      { n: 'E4', d: 1 },
      { n: 'E4', d: 1 },
      { n: 'E4', d: 0.5 },
      { n: 'E4', d: 0.5 },
      { n: 'E4', d: 1 },
      { n: 'D4', d: 1 },
      { n: 'D4', d: 1 },
      { n: 'E4', d: 1 },
      { n: 'D4', d: 2 },
      { n: 'G4', d: 2 },
      { n: 'E4', d: 1 },
      { n: 'E4', d: 1 },
      { n: 'E4', d: 2 },
      { n: 'E4', d: 1 },
      { n: 'E4', d: 1 },
      { n: 'E4', d: 2 },
      { n: 'E4', d: 1 },
      { n: 'G4', d: 1 },
      { n: 'C4', d: 1 },
      { n: 'D4', d: 1 },
      { n: 'E4', d: 4 },
      { n: 'F4', d: 1 },
      { n: 'F4', d: 1 },
      { n: 'F4', d: 1 },
      { n: 'F4', d: 1 },
      { n: 'F4', d: 1 },
      { n: 'E4', d: 1 },
      { n: 'E4', d: 1 },
      { n: 'E4', d: 0.5 },
      { n: 'E4', d: 0.5 },
      { n: 'G4', d: 1 },
      { n: 'G4', d: 1 },
      { n: 'F4', d: 1 },
      { n: 'D4', d: 1 },
      { n: 'C4', d: 4 }
    ]
  },

  // Joy to the World — derived from catalogue melody joy-to-world, 2026-09-29
  {
    id: 'joy-to-world',
    title: 'Joy to the World',
    art: 'assets/bubbles/joy-to-world.webp',
    emoji: '🌟',
    tempo: 100,
    keyboard: 'small',
    source: 'Lowell Mason, Antioch, setting of Isaac Watts (1839), first stanza in C major; own transcription, not a later praise-band arrangement',
    notes: [
      { n: 'C5', d: 1 },
      { n: 'B4', d: 1 },
      { n: 'A4', d: 1 },
      { n: 'G4', d: 2 },
      { n: 'F4', d: 1 },
      { n: 'E4', d: 1 },
      { n: 'D4', d: 1 },
      { n: 'C4', d: 2 },
      { n: 'G4', d: 1 },
      { n: 'A4', d: 1 },
      { n: 'A4', d: 1 },
      { n: 'B4', d: 1 },
      { n: 'B4', d: 1 },
      { n: 'C5', d: 2 },
      { n: 'C5', d: 0.5 },
      { n: 'C5', d: 0.5 },
      { n: 'B4', d: 0.5 },
      { n: 'A4', d: 0.5 },
      { n: 'G4', d: 1 },
      { n: 'G4', d: 0.5 },
      { n: 'F4', d: 0.5 },
      { n: 'E4', d: 1 },
      { n: 'C5', d: 0.5 },
      { n: 'C5', d: 0.5 },
      { n: 'B4', d: 0.5 },
      { n: 'A4', d: 0.5 },
      { n: 'G4', d: 1 },
      { n: 'G4', d: 0.5 },
      { n: 'F4', d: 0.5 },
      { n: 'E4', d: 1 },
      { n: 'E4', d: 1 },
      { n: 'E4', d: 1 },
      { n: 'E4', d: 1 },
      { n: 'E4', d: 0.5 },
      { n: 'F4', d: 0.5 },
      { n: 'G4', d: 2 },
      { n: null, d: 0.5 },
      { n: 'F4', d: 0.5 },
      { n: 'E4', d: 1 },
      { n: 'D4', d: 1 },
      { n: 'C4', d: 1 },
      { n: 'C5', d: 1 },
      { n: 'G4', d: 1 },
      { n: 'A4', d: 1 },
      { n: 'B4', d: 1 },
      { n: 'C5', d: 2 }
    ]
  },

  // Deck the Hall — derived from catalogue melody deck-the-hall, 2026-09-29
  {
    id: 'deck-the-hall',
    title: 'Deck the Hall',
    art: 'assets/bubbles/deck-the-hall.webp',
    emoji: '🎄',
    tempo: 112,
    keyboard: 'small',
    source: 'Welsh tune Nos Galan / Deck the Hall, complete C-major verse with fa-la-la refrain; own transcription, not a later pop carol',
    notes: [
      { n: 'C5', d: 1 },
      { n: 'B4', d: 0.5 },
      { n: 'A4', d: 0.5 },
      { n: 'G4', d: 1 },
      { n: 'F4', d: 1 },
      { n: 'E4', d: 1 },
      { n: 'D4', d: 1 },
      { n: 'C4', d: 1 },
      { n: 'G4', d: 1 },
      { n: 'A4', d: 1 },
      { n: 'A4', d: 1 },
      { n: 'B4', d: 1 },
      { n: 'B4', d: 1 },
      { n: 'C5', d: 2 },
      { n: 'C5', d: 1 },
      { n: 'B4', d: 0.5 },
      { n: 'A4', d: 0.5 },
      { n: 'G4', d: 1 },
      { n: 'F4', d: 1 },
      { n: 'E4', d: 1 },
      { n: 'D4', d: 1 },
      { n: 'C4', d: 1 },
      { n: 'G4', d: 1 },
      { n: 'A4', d: 1 },
      { n: 'A4', d: 1 },
      { n: 'B4', d: 1 },
      { n: 'B4', d: 1 },
      { n: 'C5', d: 2 },
      { n: 'G4', d: 1 },
      { n: 'G4', d: 1 },
      { n: 'G4', d: 0.5 },
      { n: 'G4', d: 0.5 },
      { n: 'G4', d: 0.5 },
      { n: 'G4', d: 0.5 },
      { n: 'G4', d: 0.5 },
      { n: 'A4', d: 0.5 },
      { n: 'B4', d: 0.5 },
      { n: 'C5', d: 0.5 },
      { n: 'G4', d: 1 },
      { n: 'E4', d: 1 },
      { n: 'C4', d: 1 },
      { n: 'C5', d: 1 },
      { n: 'B4', d: 0.5 },
      { n: 'A4', d: 0.5 },
      { n: 'G4', d: 1 },
      { n: 'F4', d: 1 },
      { n: 'E4', d: 1 },
      { n: 'D4', d: 1 },
      { n: 'C4', d: 1 },
      { n: 'G4', d: 1 },
      { n: 'A4', d: 1 },
      { n: 'A4', d: 1 },
      { n: 'B4', d: 1 },
      { n: 'B4', d: 1 },
      { n: 'C5', d: 2 }
    ]
  },

  // The First Noel — derived from catalogue melody first-noel, 2026-09-29
  {
    id: 'first-noel',
    title: 'The First Noel',
    art: 'assets/bubbles/first-noel.webp',
    emoji: '⭐',
    tempo: 84,
    keyboard: 'small',
    source: 'English traditional carol, first stanza plus Noel refrain in C major, 3/4; own transcription',
    notes: [
      { n: 'E4', d: 1 },
      { n: 'D4', d: 1 },
      { n: 'C4', d: 1 },
      { n: 'D4', d: 1 },
      { n: 'E4', d: 1 },
      { n: 'F4', d: 1 },
      { n: 'G4', d: 2 },
      { n: 'A4', d: 1 },
      { n: 'B4', d: 1 },
      { n: 'A4', d: 1 },
      { n: 'G4', d: 1 },
      { n: 'F4', d: 1 },
      { n: 'E4', d: 1 },
      { n: 'D4', d: 1 },
      { n: 'C4', d: 2 },
      { n: 'D4', d: 1 },
      { n: 'E4', d: 1 },
      { n: 'F4', d: 1 },
      { n: 'G4', d: 1 },
      { n: 'A4', d: 1 },
      { n: 'B4', d: 1 },
      { n: 'C5', d: 1 },
      { n: 'B4', d: 2 },
      { n: 'A4', d: 1 },
      { n: 'G4', d: 3 },
      { n: 'G4', d: 2 },
      { n: 'C5', d: 1 },
      { n: 'B4', d: 2 },
      { n: 'A4', d: 1 },
      { n: 'G4', d: 2 },
      { n: 'A4', d: 1 },
      { n: 'B4', d: 2 },
      { n: 'C5', d: 1 },
      { n: 'B4', d: 2 },
      { n: 'A4', d: 1 },
      { n: 'G4', d: 3 },
      { n: 'A4', d: 2 },
      { n: 'G4', d: 1 },
      { n: 'F4', d: 2 },
      { n: 'E4', d: 1 },
      { n: 'D4', d: 2 },
      { n: 'C4', d: 1 },
      { n: 'D4', d: 1 },
      { n: 'E4', d: 1 },
      { n: 'F4', d: 1 },
      { n: 'G4', d: 3 }
    ]
  },

  // Für Elise — main theme: pickup + bars 1–8 (first ending), right hand, ornament-free.
  // Checked note by note (parser) against Mutopia fur_Elise_WoO59.ly, after Breitkopf & Härtel 1888.
  {
    id: 'fur-elise',
    title: 'Für Elise',
    emoji: '✉️',
    art: 'assets/songs/fur-elise.webp',
    tempo: 66,
    keyboard: 'big',
    verified: true,
    source: 'Beethoven, Bagatelle in A minor WoO 59 “Für Elise”, bars 0–8; checked against Mutopia Project fur_Elise_WoO59.ly (Mutopia-2015/08/18-931, source Breitkopf & Härtel 1888, public domain)',
    notes: [
      { n: 'E5', d: 0.25 }, { n: 'D#5', d: 0.25 }, { n: 'E5', d: 0.25 }, { n: 'D#5', d: 0.25 },
      { n: 'E5', d: 0.25 }, { n: 'B4', d: 0.25 }, { n: 'D5', d: 0.25 }, { n: 'C5', d: 0.25 },
      { n: 'A4', d: 0.5 }, { n: null, d: 0.25 }, { n: 'C4', d: 0.25 }, { n: 'E4', d: 0.25 },
      { n: 'A4', d: 0.25 }, { n: 'B4', d: 0.5 }, { n: null, d: 0.25 }, { n: 'E4', d: 0.25 },
      { n: 'G#4', d: 0.25 }, { n: 'B4', d: 0.25 }, { n: 'C5', d: 0.5 }, { n: null, d: 0.25 },
      { n: 'E4', d: 0.25 }, { n: 'E5', d: 0.25 }, { n: 'D#5', d: 0.25 }, { n: 'E5', d: 0.25 },
      { n: 'D#5', d: 0.25 }, { n: 'E5', d: 0.25 }, { n: 'B4', d: 0.25 }, { n: 'D5', d: 0.25 },
      { n: 'C5', d: 0.25 }, { n: 'A4', d: 0.5 }, { n: null, d: 0.25 }, { n: 'C4', d: 0.25 },
      { n: 'E4', d: 0.25 }, { n: 'A4', d: 0.25 }, { n: 'B4', d: 0.5 }, { n: null, d: 0.25 },
      { n: 'E4', d: 0.25 }, { n: 'C5', d: 0.25 }, { n: 'B4', d: 0.25 }, { n: 'A4', d: 1 }
    ]
  },

  // Minuet in G — bars 1–16 (the first strain), right hand; the mordent and grace note are left out.
  // Checked note by note (parser) against Mutopia anna-magdalena-04.ly, after the Bach-Gesellschaft edition.
  {
    id: 'minuet-in-g',
    title: 'Minuet in G',
    emoji: '💃',
    art: 'assets/songs/minuet-in-g.webp',
    tempo: 112,
    keyboard: 'big',
    verified: true,
    source: 'Christian Petzold (attr. J. S. Bach), Minuet in G BWV Anh. 114, bars 1–16; checked against Mutopia Project anna-magdalena-04.ly (Mutopia-2017/01/19-75, source Bach-Gesellschaft, public domain)',
    notes: [
      { n: 'D5', d: 1 }, { n: 'G4', d: 0.5 }, { n: 'A4', d: 0.5 }, { n: 'B4', d: 0.5 },
      { n: 'C5', d: 0.5 }, { n: 'D5', d: 1 }, { n: 'G4', d: 1 }, { n: 'G4', d: 1 },
      { n: 'E5', d: 1 }, { n: 'C5', d: 0.5 }, { n: 'D5', d: 0.5 }, { n: 'E5', d: 0.5 },
      { n: 'F#5', d: 0.5 }, { n: 'G5', d: 1 }, { n: 'G4', d: 1 }, { n: 'G4', d: 1 },
      { n: 'C5', d: 1 }, { n: 'D5', d: 0.5 }, { n: 'C5', d: 0.5 }, { n: 'B4', d: 0.5 },
      { n: 'A4', d: 0.5 }, { n: 'B4', d: 1 }, { n: 'C5', d: 0.5 }, { n: 'B4', d: 0.5 },
      { n: 'A4', d: 0.5 }, { n: 'G4', d: 0.5 }, { n: 'F#4', d: 1 }, { n: 'G4', d: 0.5 },
      { n: 'A4', d: 0.5 }, { n: 'B4', d: 0.5 }, { n: 'G4', d: 0.5 }, { n: 'A4', d: 3 },
      { n: 'D5', d: 1 }, { n: 'G4', d: 0.5 }, { n: 'A4', d: 0.5 }, { n: 'B4', d: 0.5 },
      { n: 'C5', d: 0.5 }, { n: 'D5', d: 1 }, { n: 'G4', d: 1 }, { n: 'G4', d: 1 },
      { n: 'E5', d: 1 }, { n: 'C5', d: 0.5 }, { n: 'D5', d: 0.5 }, { n: 'E5', d: 0.5 },
      { n: 'F#5', d: 0.5 }, { n: 'G5', d: 1 }, { n: 'G4', d: 1 }, { n: 'G4', d: 1 },
      { n: 'C5', d: 1 }, { n: 'D5', d: 0.5 }, { n: 'C5', d: 0.5 }, { n: 'B4', d: 0.5 },
      { n: 'A4', d: 0.5 }, { n: 'B4', d: 1 }, { n: 'C5', d: 0.5 }, { n: 'B4', d: 0.5 },
      { n: 'A4', d: 0.5 }, { n: 'G4', d: 0.5 }, { n: 'A4', d: 1 }, { n: 'B4', d: 0.5 },
      { n: 'A4', d: 0.5 }, { n: 'G4', d: 0.5 }, { n: 'F#4', d: 0.5 }, { n: 'G4', d: 3 }
    ]
  },

  // Morning Mood — the flute's opening, bars 1–4, one octave down (the written octave, E5–C♯6, runs
  // past the big piano's top C). Grace notes left out. Verified 2026-10-03 against the
  // Schirmer 1898 piano solo (see music-book/qa/bigpiano-verify-2026-10-03.md). The score's last note is
  // a quarter followed by an eighth rest; the rest is dropped.
  {
    id: 'morning-mood',
    title: 'Morning Mood',
    emoji: '🌅',
    art: 'assets/songs/morning-mood.webp',
    tempo: 72,
    keyboard: 'big',
    verified: true,
    source: 'Grieg, Peer Gynt Suite No. 1 Op. 46 No. 1, Morgenstimmung, flute bars 1–4, octave down; checked against the piano solo ed. Louis Oesterle, G. Schirmer 1898 (University of Toronto scan, archive.org 31761045200615; public domain), corroborated by the no.wikipedia LilyPond excerpt',
    notes: [
      { n: 'B4', d: 0.5 }, { n: 'G#4', d: 0.5 }, { n: 'F#4', d: 0.5 }, { n: 'E4', d: 0.5 },
      { n: 'F#4', d: 0.5 }, { n: 'G#4', d: 0.5 }, { n: 'B4', d: 0.5 }, { n: 'G#4', d: 0.5 },
      { n: 'F#4', d: 0.5 }, { n: 'E4', d: 0.5 }, { n: 'F#4', d: 0.25 }, { n: 'G#4', d: 0.25 },
      { n: 'F#4', d: 0.25 }, { n: 'G#4', d: 0.25 }, { n: 'B4', d: 0.5 }, { n: 'G#4', d: 0.5 },
      { n: 'B4', d: 0.5 }, { n: 'C#5', d: 0.5 }, { n: 'G#4', d: 0.5 }, { n: 'C#5', d: 0.5 },
      { n: 'B4', d: 0.5 }, { n: 'G#4', d: 0.5 }, { n: 'F#4', d: 0.5 }, { n: 'E4', d: 1 }
    ]
  },

  // Swan Lake — the oboe theme, bars 2–5, B minor. Read from the Jurgenson full score scan (2026-10-03,
  // bars 2–4 note for note; bar 5 is B4 2.5 beats then E5 D5 C#5). STILL verified: false: it was read
  // from a scan, and page 224 of the Jurgenson scan awaits a human check before this is flipped.
  {
    id: 'swan-lake',
    title: 'Swan Lake',
    emoji: '🦢',
    art: 'assets/songs/swan-lake.webp',
    tempo: 72,
    keyboard: 'big',
    verified: false,
    source: 'Tchaikovsky, Swan Lake Op. 20, Act 2 Scène (No. 10), oboe bars 2–5 in B minor; read from the Jurgenson full score, plate B.B. 59 (IMSLP scan, pp. 223–224; public domain) — page 224 awaits a human check',
    notes: [
      { n: 'F#5', d: 2 }, { n: 'B4', d: 0.5 }, { n: 'C#5', d: 0.5 }, { n: 'D5', d: 0.5 },
      { n: 'E5', d: 0.5 }, { n: 'F#5', d: 1.5 }, { n: 'D5', d: 0.5 }, { n: 'F#5', d: 1.5 },
      { n: 'D5', d: 0.5 }, { n: 'F#5', d: 1.5 }, { n: 'B4', d: 0.5 }, { n: 'D5', d: 0.5 },
      { n: 'B4', d: 0.5 }, { n: 'G4', d: 0.5 }, { n: 'D5', d: 0.5 }, { n: 'B4', d: 2.5 },
      { n: 'E5', d: 0.5 }, { n: 'D5', d: 0.5 }, { n: 'C#5', d: 0.5 }
    ]
  },

  // Canon in D — Violin I's first entry, bars 3–6 (sixteen quarter notes over the ground). Bars 7–8
  // drop to B3, below the big piano, so the excerpt stops at bar 6. Verified 2026-10-03 (WIMA edition and
  // an engraved text agree). The final E4 is held 2 beats here as an ending hold; the score has 1 beat
  // running into bar 7.
  {
    id: 'canon-in-d',
    title: 'Canon in D',
    emoji: '⛵',
    art: 'assets/songs/canon-in-d.webp',
    tempo: 72,
    keyboard: 'big',
    verified: true,
    source: 'Pachelbel, Canon and Gigue in D P.37, Violin I bars 3–6; checked against the Violin I part, ed. Elaine Fine (WIMA.32b8, IMSLP; modern edition) and the en.wikipedia LilyPond excerpt; final E4 is an arranger\'s ending hold',
    notes: [
      { n: 'F#5', d: 1 }, { n: 'E5', d: 1 }, { n: 'D5', d: 1 }, { n: 'C#5', d: 1 },
      { n: 'B4', d: 1 }, { n: 'A4', d: 1 }, { n: 'B4', d: 1 }, { n: 'C#5', d: 1 },
      { n: 'D5', d: 1 }, { n: 'C#5', d: 1 }, { n: 'B4', d: 1 }, { n: 'A4', d: 1 },
      { n: 'G4', d: 1 }, { n: 'F#4', d: 1 }, { n: 'G4', d: 1 }, { n: 'E4', d: 2 }
    ]
  },

  // Eine kleine Nachtmusik — the opening, bars 1–4, Violin I, one octave down (written G5–D6).
  // The final bar's closing rest is dropped. Verified 2026-10-03 against the Mutopia
  // LilyPond source of the Breitkopf & Härtel 1883 Alte Mozart-Ausgabe.
  {
    id: 'eine-kleine-nachtmusik',
    title: 'Eine kleine Nachtmusik',
    emoji: '🌙',
    art: 'assets/songs/eine-kleine-nachtmusik.webp',
    tempo: 120,
    keyboard: 'big',
    verified: true,
    source: 'Mozart, Serenade No. 13 K. 525, I. Allegro, Violin I bars 1–4, octave down; checked against Mutopia MozartWA/KV525 (Mutopia-2018/08/04-2230, from Breitkopf & Härtel 1883, Alte Mozart-Ausgabe; public domain)',
    notes: [
      { n: 'G4', d: 1 }, { n: null, d: 0.5 }, { n: 'D4', d: 0.5 }, { n: 'G4', d: 1 },
      { n: null, d: 0.5 }, { n: 'D4', d: 0.5 }, { n: 'G4', d: 0.5 }, { n: 'D4', d: 0.5 },
      { n: 'G4', d: 0.5 }, { n: 'B4', d: 0.5 }, { n: 'D5', d: 1 }, { n: null, d: 1 },
      { n: 'C5', d: 1 }, { n: null, d: 0.5 }, { n: 'A4', d: 0.5 }, { n: 'C5', d: 1 },
      { n: null, d: 0.5 }, { n: 'A4', d: 0.5 }, { n: 'C5', d: 0.5 }, { n: 'A4', d: 0.5 },
      { n: 'F#4', d: 0.5 }, { n: 'A4', d: 0.5 }, { n: 'D4', d: 1 }
    ]
  },

  // The Entertainer — the A strain: pickup + bars 5–20 (first ending). Where the right hand doubles
  // the tune in octaves, the line takes the LOWER note of the octave (the tune as hummed). Checked note
  // by note (parser) against Mutopia entertainer.ly, a reproduction of the original 1902 edition.
  {
    id: 'entertainer',
    title: 'The Entertainer',
    emoji: '🎩',
    art: 'assets/songs/the-entertainer.webp',
    tempo: 80,
    keyboard: 'big',
    verified: true,
    source: 'Scott Joplin, The Entertainer (1902), A strain bars 4(pickup)–20; checked against Mutopia Project entertainer.ly (Mutopia-2016/11/25-263, source: reproduction of original edition 1902, public domain)',
    notes: [
      { n: 'D4', d: 0.25 }, { n: 'D#4', d: 0.25 }, { n: 'E4', d: 0.25 }, { n: 'C5', d: 0.5 },
      { n: 'E4', d: 0.25 }, { n: 'C5', d: 0.5 }, { n: 'E4', d: 0.25 }, { n: 'C5', d: 1.5 },
      { n: 'C5', d: 0.25 }, { n: 'D5', d: 0.25 }, { n: 'D#5', d: 0.25 }, { n: 'E5', d: 0.25 },
      { n: 'C5', d: 0.25 }, { n: 'D5', d: 0.25 }, { n: 'E5', d: 0.5 }, { n: 'B4', d: 0.25 },
      { n: 'D5', d: 0.5 }, { n: 'C5', d: 1.5 }, { n: 'D4', d: 0.25 }, { n: 'D#4', d: 0.25 },
      { n: 'E4', d: 0.25 }, { n: 'C5', d: 0.5 }, { n: 'E4', d: 0.25 }, { n: 'C5', d: 0.5 },
      { n: 'E4', d: 0.25 }, { n: 'C5', d: 1.75 }, { n: 'A4', d: 0.25 }, { n: 'G4', d: 0.25 },
      { n: 'F#4', d: 0.25 }, { n: 'A4', d: 0.25 }, { n: 'C5', d: 0.25 }, { n: 'E5', d: 0.5 },
      { n: 'D5', d: 0.25 }, { n: 'C5', d: 0.25 }, { n: 'A4', d: 0.25 }, { n: 'D5', d: 1.5 },
      { n: 'D4', d: 0.25 }, { n: 'D#4', d: 0.25 }, { n: 'E4', d: 0.25 }, { n: 'C5', d: 0.5 },
      { n: 'E4', d: 0.25 }, { n: 'C5', d: 0.5 }, { n: 'E4', d: 0.25 }, { n: 'C5', d: 1.5 },
      { n: 'C5', d: 0.25 }, { n: 'D5', d: 0.25 }, { n: 'D#5', d: 0.25 }, { n: 'E5', d: 0.25 },
      { n: 'C5', d: 0.25 }, { n: 'D5', d: 0.25 }, { n: 'E5', d: 0.5 }, { n: 'B4', d: 0.25 },
      { n: 'D5', d: 0.5 }, { n: 'C5', d: 1.5 }, { n: 'C5', d: 0.25 }, { n: 'D5', d: 0.25 },
      { n: 'E5', d: 0.25 }, { n: 'C5', d: 0.25 }, { n: 'D5', d: 0.25 }, { n: 'E5', d: 0.5 },
      { n: 'C5', d: 0.25 }, { n: 'D5', d: 0.25 }, { n: 'C5', d: 0.25 }, { n: 'E5', d: 0.25 },
      { n: 'C5', d: 0.25 }, { n: 'D5', d: 0.25 }, { n: 'E5', d: 0.5 }, { n: 'C5', d: 0.25 },
      { n: 'D5', d: 0.25 }, { n: 'C5', d: 0.25 }, { n: 'E5', d: 0.25 }, { n: 'C5', d: 0.25 },
      { n: 'D5', d: 0.25 }, { n: 'E5', d: 0.5 }, { n: 'B4', d: 0.25 }, { n: 'D5', d: 0.5 },
      { n: 'C5', d: 1.5 }
    ]
  },

  // Can-Can — the first eight-bar phrase of the galop tune, in C. Verified 2026-10-03 against the Bote & Bock
  // vocal score (plate 10779, pp. 122–123; IMSLP PMLP24816), chorus "Galopp schliesset nun den Ball".
  // The score is in G; this is TRANSPOSED DOWN A FIFTH (G → C) for the small keyboard. The voice's
  // "Ga-" pickup (D4) is omitted.
  {
    id: 'can-can',
    title: 'Can-Can',
    emoji: '🐔',
    art: 'assets/songs/can-can.webp',
    tempo: 104,
    keyboard: 'small',
    verified: true,
    source: 'Offenbach, Orpheus in der Unterwelt, “Galop infernal”, chorus first phrase; checked against the Bote & Bock vocal score, plate 10779, pp. 122–123 (IMSLP PMLP24816; public domain); transposed down a fifth from G to C, pickup omitted',
    notes: [
      { n: 'C4', d: 2 }, { n: 'D4', d: 0.5 }, { n: 'F4', d: 0.5 }, { n: 'E4', d: 0.5 },
      { n: 'D4', d: 0.5 }, { n: 'G4', d: 1 }, { n: 'G4', d: 1 }, { n: 'G4', d: 0.5 },
      { n: 'A4', d: 0.5 }, { n: 'E4', d: 0.5 }, { n: 'F4', d: 0.5 }, { n: 'D4', d: 1 },
      { n: 'D4', d: 1 }, { n: 'D4', d: 0.5 }, { n: 'F4', d: 0.5 }, { n: 'E4', d: 0.5 },
      { n: 'D4', d: 0.5 }, { n: 'C4', d: 0.5 }, { n: 'C5', d: 0.5 }, { n: 'B4', d: 0.5 },
      { n: 'A4', d: 0.5 }, { n: 'G4', d: 0.5 }, { n: 'F4', d: 0.5 }, { n: 'E4', d: 0.5 },
      { n: 'D4', d: 0.5 }, { n: 'C4', d: 2 }
    ]
  },

  // Brahms' Lullaby — the complete verse, pickup + 16 bars, voice line, in E-flat as printed. Flats
  // are written as flats; B♭/E♭/A♭ land on their black keys. The appoggiatura (bar 15) and the
  // after-grace (bar 18) are left out. Checked note by note (parser) against OpenScore Lieder
  // lc5701612.mscx, transcribed from the Simrock first edition on IMSLP; agrees with Wikipedia's excerpt.
  {
    id: 'brahms-lullaby',
    title: 'Brahms\' Lullaby',
    emoji: '👶',
    art: 'assets/songs/brahms-lullaby.webp',
    tempo: 76,
    keyboard: 'big',
    verified: true,
    source: 'Brahms, Wiegenlied Op. 49 No. 4, voice, complete first verse; checked against OpenScore Lieder corpus lc5701612.mscx (CC0; transcribed from the Simrock edition scanned on IMSLP); re-checked 2026-10-03',
    notes: [
      { n: 'G4', d: 0.5 }, { n: 'G4', d: 0.5 }, { n: 'Bb4', d: 1.5 }, { n: 'G4', d: 0.5 },
      { n: 'G4', d: 1 }, { n: 'Bb4', d: 1 }, { n: null, d: 1 }, { n: 'G4', d: 0.5 },
      { n: 'Bb4', d: 0.5 }, { n: 'Eb5', d: 1 }, { n: 'D5', d: 1.5 }, { n: 'C5', d: 0.5 },
      { n: 'C5', d: 1 }, { n: 'Bb4', d: 1 }, { n: 'F4', d: 0.5 }, { n: 'G4', d: 0.5 },
      { n: 'Ab4', d: 1 }, { n: 'F4', d: 1 }, { n: 'F4', d: 0.5 }, { n: 'G4', d: 0.5 },
      { n: 'Ab4', d: 1 }, { n: null, d: 1 }, { n: 'F4', d: 0.5 }, { n: 'Ab4', d: 0.5 },
      { n: 'D5', d: 0.5 }, { n: 'C5', d: 0.5 }, { n: 'Bb4', d: 1 }, { n: 'D5', d: 1 },
      { n: 'Eb5', d: 1 }, { n: null, d: 1 }, { n: 'Eb4', d: 0.5 }, { n: 'Eb4', d: 0.5 },
      { n: 'Eb5', d: 2 }, { n: 'C5', d: 0.5 }, { n: 'Ab4', d: 0.5 }, { n: 'Bb4', d: 2 },
      { n: 'G4', d: 0.5 }, { n: 'Eb4', d: 0.5 }, { n: 'Ab4', d: 1 }, { n: 'Bb4', d: 1 },
      { n: 'C5', d: 1 }, { n: 'Bb4', d: 2 }, { n: 'Eb4', d: 0.5 }, { n: 'Eb4', d: 0.5 },
      { n: 'Eb5', d: 2 }, { n: 'C5', d: 0.5 }, { n: 'Ab4', d: 0.5 }, { n: 'Bb4', d: 2 },
      { n: 'G4', d: 0.5 }, { n: 'Eb4', d: 0.5 }, { n: 'Ab4', d: 1 }, { n: 'G4', d: 1 },
      { n: 'F4', d: 1 }, { n: 'Eb4', d: 2 }
    ]
  },
];

export function playalongSongById(id) {
  return PLAYALONG_SONGS.find((s) => s.id === id);
}

// Map each catalogue piece id to its toy-keyboard play-along id.
// Rooms use this to decide which songs appear when the Toy Piano door is
// opened from inside that room.
export const CATALOGUE_TO_PLAYALONG = {
  'hot-cross-buns': 'hot-cross-buns',
  'mary-had-little-lamb': 'mary-had-a-little-lamb',
  'twinkle': 'twinkle',
  'frere-jacques': 'frere-jacques',
  'row-row-row-your-boat': 'row-row-row',
  'london-bridge': 'london-bridge',
  'old-macdonald': 'old-macdonald',
  'three-blind-mice': 'three-blind-mice',
  bingo: 'bingo',
  'farmer-in-dell': 'farmer-in-dell',
  'mulberry-bush': 'mulberry-bush',
  'this-old-man': 'this-old-man',
  'skip-to-my-lou': 'skip-to-my-lou',
  'when-saints-go-marching': 'when-saints-go-marching',
  'rock-a-bye-baby': 'rock-a-bye-baby',
  'amazing-grace-new-britain': 'amazing-grace-new-britain',
  'sakura-sakura': 'sakura-sakura',
  'arirang': 'arirang',
  'burung-kakak-tua': 'burung-kakak-tua',
  'raghupati-raghava': 'raghupati-raghava',
  'kalinka': 'kalinka',
  'shchedryk': 'shchedryk',
  'nkosi-sikelel-iafrika': 'nkosi-sikelel-iafrika',
  'el-condor-pasa': 'el-condor-pasa',
  'jolly-good-fellow': 'jolly-good-fellow',
  'jingle-bells': 'jingle-bells',
  'joy-to-world': 'joy-to-world',
  'deck-the-hall': 'deck-the-hall',
  'first-noel': 'first-noel',
  'ode-to-joy': 'ode-to-joy',
  // 2026-10-03: the classical pieces the big piano opened up, under their
  // catalogue ids, so a room's Toy Piano door also offers them.
  'fur-elise': 'fur-elise',
  'swan-lake-theme': 'swan-lake',
  'pachelbel-canon-d': 'canon-in-d',
  'mozart-eine-kleine-nachtmusik-1': 'eine-kleine-nachtmusik',
  'joplin-entertainer': 'entertainer',
  'brahms-lullaby': 'brahms-lullaby',
  'grieg-morning-mood': 'morning-mood'
};
