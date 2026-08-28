// Composers and pieces.
//
// Note durations are in BEATS, and each score carries its own tempo in BPM.
// A rest is a note with `n: null`. This differs from the salvaged data in
// math-app/classical-music.html, which used raw seconds — beats survive a
// tempo change and a slow-mode button, seconds do not.
//
// `verified` on a score means: someone checked these pitches against the tune,
// not merely that it plays without crashing. Do not flip it to true in bulk.

import { CLASSICAL_COMPOSERS, CLASSICAL_PIECES } from './classical-themes.js';
import { attachPianoScores } from './piano-scores.js';

export const COMPOSERS = [
  {
    id: 'beethoven',
    portrait: 'assets/portraits/beethoven.webp',
    name: 'Ludwig van Beethoven',
    shortName: 'Beethoven',
    birthYear: 1770,
    deathYear: 1827,
    country: 'Germany',
    period: 'Classical into Romantic',
    knownFor: 'Nine symphonies and some of the most famous piano music ever written.',
    summary: 'Beethoven kept writing music after he went deaf. He could not hear his own late pieces — he felt them.',
    importance: 3
  },
  {
    id: 'mozart',
    portrait: null,
    name: 'Wolfgang Amadeus Mozart',
    shortName: 'Mozart',
    birthYear: 1756,
    deathYear: 1791,
    country: 'Austria',
    period: 'Classical',
    knownFor: 'Writing music from the age of five, and never seeming to run out of tunes.',
    summary: 'Mozart took a simple song everybody knew and turned it into twelve different pieces.',
    importance: 3
  },
  {
    id: 'tchaikovsky',
    portrait: null,
    name: 'Pyotr Ilyich Tchaikovsky',
    shortName: 'Tchaikovsky',
    birthYear: 1840,
    deathYear: 1893,
    country: 'Russia',
    period: 'Romantic',
    knownFor: 'Ballets full of tunes you already know: Swan Lake, The Nutcracker.',
    summary: 'Tchaikovsky wrote music for dancers, so almost every melody has a step hidden in it.',
    importance: 3
  },
  {
    id: 'traditional',
    portrait: null,
    name: 'Traditional songs',
    shortName: 'Traditional',
    birthYear: null,
    deathYear: null,
    country: 'Many countries',
    period: 'Songs people have sung for a long time',
    knownFor: 'Tunes almost every child already knows, even if nobody remembers who wrote them.',
    summary: 'These songs were passed from parent to child. They belong to everyone.',
    importance: 3
  },
  ...CLASSICAL_COMPOSERS
];

export const PIECES = [
  {
    id: 'ode-to-joy',
    art: 'assets/bubbles/ode-to-joy.webp',
    composerId: 'beethoven',
    title: 'Ode to Joy',
    alternateTitles: [],
    year: 1824,
    importanceLevel: 3,
    featured: true,
    playbackMode: 'full',
    excerpt: {
      tempo: 120,
      verified: true,
      notes: [
        { n: 'E4', d: 1 }, { n: 'E4', d: 1 }, { n: 'F4', d: 1 }, { n: 'G4', d: 1 },
        { n: 'G4', d: 1 }, { n: 'F4', d: 1 }, { n: 'E4', d: 1 }, { n: 'D4', d: 1 },
        { n: 'C4', d: 1 }, { n: 'C4', d: 1 }, { n: 'D4', d: 1 }, { n: 'E4', d: 1 },
        { n: 'E4', d: 1.5 }, { n: 'D4', d: 0.5 }, { n: 'D4', d: 2 }
      ]
    },
    // Complete hymn theme (AABA), same C-major teaching key as the verified
    // excerpt. Own transcription of the choral melody from Beethoven Symphony
    // No. 9, finale; PD composition. Not yet checked bar-for-bar against a
    // named edition, so verified stays false.
    full: {
      tempo: 120,
      verified: false,
      sourceType: 'public-domain-score',
      sourceReference: 'Beethoven Symphony No. 9, Op. 125, finale — “Ode to Joy” hymn theme, C-major teaching transposition of the D-major original; own transcription',
      notes: [
        { n: 'E4', d: 1 }, { n: 'E4', d: 1 }, { n: 'F4', d: 1 }, { n: 'G4', d: 1 },
        { n: 'G4', d: 1 }, { n: 'F4', d: 1 }, { n: 'E4', d: 1 }, { n: 'D4', d: 1 },
        { n: 'C4', d: 1 }, { n: 'C4', d: 1 }, { n: 'D4', d: 1 }, { n: 'E4', d: 1 },
        { n: 'E4', d: 1.5 }, { n: 'D4', d: 0.5 }, { n: 'D4', d: 2 },
        { n: 'E4', d: 1 }, { n: 'E4', d: 1 }, { n: 'F4', d: 1 }, { n: 'G4', d: 1 },
        { n: 'G4', d: 1 }, { n: 'F4', d: 1 }, { n: 'E4', d: 1 }, { n: 'D4', d: 1 },
        { n: 'C4', d: 1 }, { n: 'C4', d: 1 }, { n: 'D4', d: 1 }, { n: 'E4', d: 1 },
        { n: 'D4', d: 1.5 }, { n: 'C4', d: 0.5 }, { n: 'C4', d: 2 },
        { n: 'D4', d: 1 }, { n: 'D4', d: 1 }, { n: 'E4', d: 1 }, { n: 'C4', d: 1 },
        { n: 'D4', d: 1 }, { n: 'E4', d: 0.5 }, { n: 'F4', d: 0.5 }, { n: 'E4', d: 1 }, { n: 'C4', d: 1 },
        { n: 'D4', d: 1 }, { n: 'E4', d: 0.5 }, { n: 'F4', d: 0.5 }, { n: 'E4', d: 1 }, { n: 'D4', d: 1 },
        { n: 'C4', d: 1 }, { n: 'D4', d: 1 }, { n: 'G4', d: 2 },
        { n: 'E4', d: 1 }, { n: 'E4', d: 1 }, { n: 'F4', d: 1 }, { n: 'G4', d: 1 },
        { n: 'G4', d: 1 }, { n: 'F4', d: 1 }, { n: 'E4', d: 1 }, { n: 'D4', d: 1 },
        { n: 'C4', d: 1 }, { n: 'C4', d: 1 }, { n: 'D4', d: 1 }, { n: 'E4', d: 1 },
        { n: 'D4', d: 1.5 }, { n: 'C4', d: 0.5 }, { n: 'C4', d: 2 }
      ]
    },
    info: {
      shortDescription: 'The tune at the end of Beethoven’s last symphony.',
      listenFor: 'The melody walks up and down like stairs. Almost every step is next door to the last one.',
      whyItMatters: 'It is the anthem of Europe, and one of the most sung tunes on earth.',
      guideDialogue: [
        { speaker: 'curious', line: 'It sounds like everyone is singing together.' },
        { speaker: 'knowing', line: 'They are. Beethoven put a choir in a symphony, which nobody had done before.' }
      ]
    },
    copyright: { status: 'public-domain', verified: true, sourceType: 'public-domain-composition', transcription: 'own' }
  },
  {
    id: 'fur-elise',
    art: 'assets/bubbles/fur-elise.webp',
    composerId: 'beethoven',
    title: 'Für Elise',
    alternateTitles: [],
    year: 1810,
    importanceLevel: 3,
    featured: true,
    playbackMode: 'both',
    excerpt: {
      tempo: 72,
      verified: true,
      notes: [
        { n: 'E5', d: 0.25 }, { n: 'D#5', d: 0.25 }, { n: 'E5', d: 0.25 }, { n: 'D#5', d: 0.25 },
        { n: 'E5', d: 0.25 }, { n: 'B4', d: 0.25 }, { n: 'D5', d: 0.25 }, { n: 'C5', d: 0.25 },
        { n: 'A4', d: 0.75 }, { n: null, d: 0.25 },
        { n: 'C4', d: 0.25 }, { n: 'E4', d: 0.25 }, { n: 'A4', d: 0.25 }, { n: 'B4', d: 0.75 },
        { n: null, d: 0.25 },
        { n: 'E4', d: 0.25 }, { n: 'G#4', d: 0.25 }, { n: 'B4', d: 0.25 }, { n: 'C5', d: 0.75 }
      ]
    },
    // Complete A section (second ending) plus the F-major B-section melody,
    // single line, ornaments reduced. Same sixteenth=0.25 grid as the verified
    // hook. Two-hand bagatelle and the stormy C section wait for multi-track.
    full: {
      tempo: 72,
      verified: false,
      sourceType: 'public-domain-score',
      sourceReference: 'Beethoven, Bagatelle in A minor WoO 59 (“Für Elise”), Nohl 1867 / PD reprints; own single-line transcription of mm. 1–8 and mm. 23–30',
      notes: [
        { n: 'E5', d: 0.25 }, { n: 'D#5', d: 0.25 }, { n: 'E5', d: 0.25 }, { n: 'D#5', d: 0.25 },
        { n: 'E5', d: 0.25 }, { n: 'B4', d: 0.25 }, { n: 'D5', d: 0.25 }, { n: 'C5', d: 0.25 },
        { n: 'A4', d: 0.75 }, { n: null, d: 0.25 },
        { n: 'C4', d: 0.25 }, { n: 'E4', d: 0.25 }, { n: 'A4', d: 0.25 }, { n: 'B4', d: 0.75 },
        { n: null, d: 0.25 },
        { n: 'E4', d: 0.25 }, { n: 'G#4', d: 0.25 }, { n: 'B4', d: 0.25 }, { n: 'C5', d: 0.75 },
        { n: null, d: 0.25 },
        { n: 'E5', d: 0.25 }, { n: 'D#5', d: 0.25 }, { n: 'E5', d: 0.25 }, { n: 'D#5', d: 0.25 },
        { n: 'E5', d: 0.25 }, { n: 'B4', d: 0.25 }, { n: 'D5', d: 0.25 }, { n: 'C5', d: 0.25 },
        { n: 'A4', d: 0.75 }, { n: null, d: 0.25 },
        { n: 'C4', d: 0.25 }, { n: 'E4', d: 0.25 }, { n: 'A4', d: 0.25 }, { n: 'B4', d: 0.75 },
        { n: null, d: 0.25 },
        { n: 'E4', d: 0.25 }, { n: 'C5', d: 0.25 }, { n: 'B4', d: 0.25 }, { n: 'A4', d: 0.75 },
        { n: null, d: 0.25 },
        { n: 'C5', d: 0.5 }, { n: 'C5', d: 0.5 }, { n: 'C5', d: 0.5 },
        { n: 'C5', d: 0.5 }, { n: 'C5', d: 0.5 }, { n: 'C5', d: 0.5 },
        { n: 'C5', d: 0.5 }, { n: 'D5', d: 0.5 }, { n: 'E5', d: 0.5 },
        { n: 'G5', d: 0.5 }, { n: 'F5', d: 0.25 }, { n: 'E5', d: 0.25 }, { n: 'D5', d: 0.25 }, { n: 'C5', d: 0.25 },
        { n: 'Bb4', d: 0.5 }, { n: 'A4', d: 0.5 }, { n: 'G4', d: 0.5 },
        { n: 'A4', d: 0.5 }, { n: 'Bb4', d: 0.5 }, { n: 'C5', d: 0.5 },
        { n: 'C5', d: 0.5 }, { n: 'D5', d: 0.5 }, { n: 'E5', d: 0.5 },
        { n: 'G5', d: 0.5 }, { n: 'F5', d: 0.5 }, { n: 'E5', d: 0.5 },
        { n: 'E5', d: 0.25 }, { n: 'D#5', d: 0.25 }, { n: 'E5', d: 0.25 }, { n: 'D#5', d: 0.25 },
        { n: 'E5', d: 0.25 }, { n: 'B4', d: 0.25 }, { n: 'D5', d: 0.25 }, { n: 'C5', d: 0.25 },
        { n: 'A4', d: 1.5 }
      ]
    },
    info: {
      shortDescription: 'A little piano piece found in a drawer after Beethoven died.',
      listenFor: 'The two notes at the very start rock back and forth, like something can’t decide.',
      whyItMatters: 'Almost everyone recognises the first few seconds, and almost nobody knows the rest of it.',
      guideDialogue: [
        { speaker: 'curious', line: 'Who was Elise?' },
        { speaker: 'knowing', line: 'Nobody knows. The handwriting was hard to read, so it might not even say Elise.' }
      ]
    },
    copyright: { status: 'public-domain', verified: true, sourceType: 'public-domain-composition', transcription: 'own' }
  },
  {
    id: 'moonlight-sonata',
    art: 'assets/bubbles/moonlight-sonata.webp',
    composerId: 'beethoven',
    title: 'Moonlight Sonata',
    alternateTitles: ['Piano Sonata No. 14'],
    year: 1801,
    importanceLevel: 3,
    featured: true,
    playbackMode: 'full',
    excerpt: {
      tempo: 54,
      verified: true,
      notes: [
        { n: 'G#3', d: 0.333 }, { n: 'C#4', d: 0.333 }, { n: 'E4', d: 0.334 },
        { n: 'G#3', d: 0.333 }, { n: 'C#4', d: 0.333 }, { n: 'E4', d: 0.334 },
        { n: 'G#3', d: 0.333 }, { n: 'C#4', d: 0.333 }, { n: 'E4', d: 0.334 },
        { n: 'G#3', d: 0.333 }, { n: 'C#4', d: 0.333 }, { n: 'E4', d: 0.334 },
        { n: 'A3', d: 0.333 },  { n: 'C#4', d: 0.333 }, { n: 'E4', d: 0.334 },
        { n: 'A3', d: 0.333 },  { n: 'C#4', d: 0.333 }, { n: 'E4', d: 0.334 },
        { n: 'A3', d: 0.333 },  { n: 'D4', d: 0.333 },  { n: 'F#4', d: 0.334 },
        { n: 'A3', d: 0.333 },  { n: 'D4', d: 0.333 },  { n: 'F#4', d: 0.334 },
        { n: 'G#3', d: 0.333 }, { n: 'C#4', d: 0.333 }, { n: 'E4', d: 0.334 },
        { n: 'G#3', d: 0.333 }, { n: 'B#3', d: 0.333 }, { n: 'F#4', d: 0.334 },
        { n: 'G#3', d: 0.333 }, { n: 'C#4', d: 0.333 }, { n: 'E4', d: 0.334 },
        { n: 'G#3', d: 1 }
      ]
    },
    // First period of the triplet texture (about eight bars), still one line.
    // Melody-above-arpeggio waits for multi-track. Same C# minor as the excerpt.
    full: {
      tempo: 54,
      verified: false,
      sourceType: 'public-domain-score',
      sourceReference: 'Beethoven Piano Sonata No. 14, Op. 27 No. 2, mvt. 1, opening ostinato mm. 1–8; own single-line transcription of the triplet figuration',
      notes: [
        { n: 'G#3', d: 0.333 }, { n: 'C#4', d: 0.333 }, { n: 'E4', d: 0.334 },
        { n: 'G#3', d: 0.333 }, { n: 'C#4', d: 0.333 }, { n: 'E4', d: 0.334 },
        { n: 'G#3', d: 0.333 }, { n: 'C#4', d: 0.333 }, { n: 'E4', d: 0.334 },
        { n: 'G#3', d: 0.333 }, { n: 'C#4', d: 0.333 }, { n: 'E4', d: 0.334 },
        { n: 'A3', d: 0.333 }, { n: 'C#4', d: 0.333 }, { n: 'E4', d: 0.334 },
        { n: 'A3', d: 0.333 }, { n: 'C#4', d: 0.333 }, { n: 'E4', d: 0.334 },
        { n: 'A3', d: 0.333 }, { n: 'D4', d: 0.333 }, { n: 'F#4', d: 0.334 },
        { n: 'A3', d: 0.333 }, { n: 'D4', d: 0.333 }, { n: 'F#4', d: 0.334 },
        { n: 'G#3', d: 0.333 }, { n: 'C#4', d: 0.333 }, { n: 'E4', d: 0.334 },
        { n: 'G#3', d: 0.333 }, { n: 'B#3', d: 0.333 }, { n: 'F#4', d: 0.334 },
        { n: 'G#3', d: 0.333 }, { n: 'C#4', d: 0.333 }, { n: 'E4', d: 0.334 },
        { n: 'G#3', d: 0.333 }, { n: 'C#4', d: 0.333 }, { n: 'E4', d: 0.334 },
        { n: 'G#3', d: 0.333 }, { n: 'C#4', d: 0.333 }, { n: 'E4', d: 0.334 },
        { n: 'G#3', d: 0.333 }, { n: 'C#4', d: 0.333 }, { n: 'E4', d: 0.334 },
        { n: 'G#3', d: 0.333 }, { n: 'C#4', d: 0.333 }, { n: 'E4', d: 0.334 },
        { n: 'G#3', d: 0.333 }, { n: 'C#4', d: 0.333 }, { n: 'E4', d: 0.334 },
        { n: 'G#3', d: 0.333 }, { n: 'C#4', d: 0.333 }, { n: 'E4', d: 0.334 },
        { n: 'G#3', d: 0.333 }, { n: 'C#4', d: 0.333 }, { n: 'E4', d: 0.334 },
        { n: 'G#3', d: 0.333 }, { n: 'C#4', d: 0.333 }, { n: 'E4', d: 0.334 },
        { n: 'G#3', d: 0.333 }, { n: 'C#4', d: 0.333 }, { n: 'E4', d: 0.334 },
        { n: 'A3', d: 0.333 }, { n: 'C#4', d: 0.333 }, { n: 'E4', d: 0.334 },
        { n: 'A3', d: 0.333 }, { n: 'C#4', d: 0.333 }, { n: 'E4', d: 0.334 },
        { n: 'A3', d: 0.333 }, { n: 'C#4', d: 0.333 }, { n: 'E4', d: 0.334 },
        { n: 'A3', d: 0.333 }, { n: 'C#4', d: 0.333 }, { n: 'E4', d: 0.334 },
        { n: 'G#3', d: 0.333 }, { n: 'C#4', d: 0.333 }, { n: 'E4', d: 0.334 },
        { n: 'G#3', d: 0.333 }, { n: 'B#3', d: 0.333 }, { n: 'F#4', d: 0.334 },
        { n: 'G#3', d: 0.333 }, { n: 'C#4', d: 0.333 }, { n: 'E4', d: 0.334 },
        { n: 'G#3', d: 1 }
      ]
    },
    info: {
      shortDescription: 'Quiet rippling music, like light on water.',
      listenFor: 'The same three notes climb over and over. Nothing hurries.',
      whyItMatters: 'Beethoven never called it Moonlight. A poet said it sounded like moonlight on a lake, and the name stuck.',
      guideDialogue: [
        { speaker: 'curious', line: 'It sounds like something is sleeping.' },
        { speaker: 'knowing', line: 'It almost never gets loud. That is why it feels like night.' }
      ]
    },
    copyright: { status: 'public-domain', verified: true, sourceType: 'public-domain-composition', transcription: 'own' }
  },
  {
    id: 'symphony-5-opening',
    art: 'assets/bubbles/symphony-5.webp',
    composerId: 'beethoven',
    title: 'Symphony No. 5 — opening',
    shortTitle: 'Symphony No. 5',
    alternateTitles: [],
    year: 1808,
    importanceLevel: 3,
    featured: true,
    playbackMode: 'full',
    excerpt: {
      tempo: 108,
      verified: true,
      notes: [
        { n: null, d: 0.5 },
        { n: 'G4', d: 0.5 }, { n: 'G4', d: 0.5 }, { n: 'G4', d: 0.5 }, { n: 'Eb4', d: 2.5 },
        { n: null, d: 0.5 },
        { n: 'F4', d: 0.5 }, { n: 'F4', d: 0.5 }, { n: 'F4', d: 0.5 }, { n: 'D4', d: 3 }
      ]
    },
    // Opening theme group: the two fermatas, then the motto sequenced onward.
    // Still an excerpt of the movement, not the whole Allegro. Eighth = 0.5
    // to match the verified hook.
    full: {
      tempo: 108,
      verified: false,
      sourceType: 'public-domain-score',
      sourceReference: 'Beethoven Symphony No. 5, Op. 67, mvt. 1, violin I opening (mm. 1–21 reduction); own single-line transcription',
      notes: [
        { n: null, d: 0.5 },
        { n: 'G4', d: 0.5 }, { n: 'G4', d: 0.5 }, { n: 'G4', d: 0.5 }, { n: 'Eb4', d: 2.5 },
        { n: null, d: 0.5 },
        { n: 'F4', d: 0.5 }, { n: 'F4', d: 0.5 }, { n: 'F4', d: 0.5 }, { n: 'D4', d: 2.5 },
        { n: null, d: 0.5 },
        { n: 'G4', d: 0.5 }, { n: 'G4', d: 0.5 }, { n: 'G4', d: 0.5 }, { n: 'F4', d: 1 },
        { n: 'Eb4', d: 0.5 }, { n: 'D4', d: 0.5 }, { n: 'C4', d: 0.5 }, { n: 'B3', d: 0.5 },
        { n: 'C4', d: 0.5 }, { n: 'D4', d: 0.5 }, { n: 'Eb4', d: 0.5 }, { n: 'F4', d: 0.5 },
        { n: null, d: 0.5 },
        { n: 'G4', d: 0.5 }, { n: 'G4', d: 0.5 }, { n: 'G4', d: 0.5 }, { n: 'Eb4', d: 2 },
        { n: null, d: 0.5 },
        { n: 'F4', d: 0.5 }, { n: 'F4', d: 0.5 }, { n: 'F4', d: 0.5 }, { n: 'D4', d: 2 },
        { n: 'C4', d: 0.5 }, { n: 'D4', d: 0.5 }, { n: 'Eb4', d: 0.5 }, { n: 'F4', d: 0.5 },
        { n: 'G4', d: 0.5 }, { n: 'Ab4', d: 0.5 }, { n: 'G4', d: 0.5 }, { n: 'F4', d: 0.5 },
        { n: 'Eb4', d: 0.5 }, { n: 'D4', d: 0.5 }, { n: 'C4', d: 2 }
      ]
    },
    info: {
      shortDescription: 'Four notes that open the most famous symphony there is.',
      listenFor: 'Short-short-short-LONG. Then the same shape again, lower down.',
      whyItMatters: 'Four notes, and the whole first movement is built out of them.',
      guideDialogue: [
        { speaker: 'curious', line: 'That is so short! Is that really the whole tune?' },
        { speaker: 'knowing', line: 'That is the whole idea. Beethoven builds half an hour of music out of those four notes.' }
      ]
    },
    copyright: { status: 'public-domain', verified: true, sourceType: 'public-domain-composition', transcription: 'own' }
  },
  {
    id: 'twinkle',
    art: null,
    composerId: 'mozart',
    title: 'Twinkle Twinkle Little Star',
    shortTitle: 'Twinkle Twinkle',
    alternateTitles: ['The ABC Song', 'Baa Baa Black Sheep', 'Ah! vous dirai-je, maman'],
    tuneFamilyId: 'twinkle-family',
    year: 1781,
    importanceLevel: 2,
    featured: true,
    playbackMode: 'full',
    excerpt: {
      tempo: 104,
      verified: true,
      notes: [
        { n: 'C4', d: 1 }, { n: 'C4', d: 1 }, { n: 'G4', d: 1 }, { n: 'G4', d: 1 },
        { n: 'A4', d: 1 }, { n: 'A4', d: 1 }, { n: 'G4', d: 2 },
        { n: 'F4', d: 1 }, { n: 'F4', d: 1 }, { n: 'E4', d: 1 }, { n: 'E4', d: 1 },
        { n: 'D4', d: 1 }, { n: 'D4', d: 1 }, { n: 'C4', d: 2 }
      ]
    },
    // Complete verse, ABA. The A strain is the verified excerpt; B is
    // “up above the world so high.” Traditional tune family, C major.
    full: {
      tempo: 104,
      verified: false,
      sourceType: 'traditional',
      sourceReference: 'Traditional Ah! vous dirai-je, maman / Twinkle tune family, C-major verse ABA; own transcription',
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
    info: {
      shortDescription: 'One tune with three names you already know.',
      listenFor: 'The big jump near the start, then a long slow walk back down.',
      whyItMatters: 'Twinkle Twinkle, the ABC song and Baa Baa Black Sheep are all this one melody.',
      guideDialogue: [
        { speaker: 'curious', line: 'Wait — that is the alphabet song!' },
        { speaker: 'knowing', line: 'Same tune, different words. Mozart wrote twelve versions of it.' }
      ]
    },
    copyright: { status: 'public-domain', verified: true, sourceType: 'traditional', transcription: 'own' }
  },
  {
    id: 'swan-lake-theme',
    art: null,
    composerId: 'tchaikovsky',
    title: 'Swan Lake — theme',
    shortTitle: 'Swan Lake',
    alternateTitles: [],
    year: 1876,
    importanceLevel: 3,
    featured: false,
    playbackMode: 'excerpt',
    excerpt: {
      tempo: 72,
      // Replaces the salvaged diatonic line from math-app/classical-music.html.
      // Own single-line transcription of the Act 2 Scène oboe melody in B minor.
      // Still not checked against a named PD edition — do not feature, do not
      // flip verified to true, because a wrong Swan Lake already shipped once.
      verified: false,
      sourceType: 'public-domain-score',
      sourceReference: 'Tchaikovsky, Swan Lake Op. 20, Act 2 Scène (Andante), oboe melody in B minor; own transcription pending check against a Jurgenson / IMSLP PD score',
      notes: [
        { n: 'D5', d: 1 }, { n: 'C#5', d: 0.5 }, { n: 'D5', d: 0.5 },
        { n: 'F#5', d: 1 }, { n: 'E5', d: 0.5 }, { n: 'D5', d: 0.5 },
        { n: 'C#5', d: 1 }, { n: 'B4', d: 0.5 }, { n: 'A#4', d: 0.5 }, { n: 'B4', d: 2 },
        { n: 'D5', d: 1 }, { n: 'C#5', d: 0.5 }, { n: 'D5', d: 0.5 },
        { n: 'F#5', d: 1 }, { n: 'E5', d: 0.5 }, { n: 'D5', d: 0.5 },
        { n: 'C#5', d: 1 }, { n: 'B4', d: 0.5 }, { n: 'A#4', d: 0.5 }, { n: 'B4', d: 2 },
        { n: 'E5', d: 1 }, { n: 'F#5', d: 0.5 }, { n: 'G5', d: 0.5 },
        { n: 'A5', d: 1 }, { n: 'B5', d: 0.5 }, { n: 'C#6', d: 0.5 },
        { n: 'D6', d: 1.5 }, { n: 'C#6', d: 0.5 }, { n: 'B5', d: 1 }, { n: 'C#6', d: 0.5 }, { n: 'D6', d: 0.5 },
        { n: 'E6', d: 1.5 }, { n: 'D6', d: 0.5 }, { n: 'C#6', d: 2 },
        { n: 'D6', d: 1.5 }, { n: 'C#6', d: 0.5 }, { n: 'B5', d: 2 }
      ]
    },
    info: {
      shortDescription: 'The swan music from Tchaikovsky’s ballet.',
      listenFor: 'A raised note near the start (the A-sharp) leans upward, then the line glides down.',
      whyItMatters: 'Audiences disliked Swan Lake at first. It is now one of the most performed ballets anywhere.',
      guideDialogue: [
        { speaker: 'curious', line: 'This one sounds sad.' },
        { speaker: 'knowing', line: 'It is a spell being cast. The princess is turning into a swan.' }
      ]
    },
    copyright: { status: 'public-domain', verified: true, sourceType: 'public-domain-composition', transcription: 'own-unverified' }
  },
  {
    id: 'mary-had-little-lamb',
    art: null,
    composerId: 'traditional',
    title: 'Mary Had a Little Lamb',
    alternateTitles: [],
    year: 1830,
    importanceLevel: 3,
    featured: true,
    playbackMode: 'full',
    tuneFamilyId: 'mary-had-little-lamb-family',
    full: {
      tempo: 100,
      verified: false,
      sourceType: 'traditional',
      sourceReference: 'Traditional / Lowell Mason setting lineage, familiar C-major verse; own transcription',
      notes: [
        { n: 'E4', d: 1 }, { n: 'D4', d: 1 }, { n: 'C4', d: 1 }, { n: 'D4', d: 1 },
        { n: 'E4', d: 1 }, { n: 'E4', d: 1 }, { n: 'E4', d: 2 },
        { n: 'D4', d: 1 }, { n: 'D4', d: 1 }, { n: 'D4', d: 2 },
        { n: 'E4', d: 1 }, { n: 'G4', d: 1 }, { n: 'G4', d: 2 },
        { n: 'E4', d: 1 }, { n: 'D4', d: 1 }, { n: 'C4', d: 1 }, { n: 'D4', d: 1 },
        { n: 'E4', d: 1 }, { n: 'E4', d: 1 }, { n: 'E4', d: 1 }, { n: 'E4', d: 1 },
        { n: 'D4', d: 1 }, { n: 'D4', d: 1 }, { n: 'E4', d: 1 }, { n: 'D4', d: 1 },
        { n: 'C4', d: 2 }
      ]
    },
    info: {
      shortDescription: 'A girl and a lamb who followed her to school.',
      listenFor: 'The tune walks down, then the same walk happens again on one note.',
      whyItMatters: 'It is one of the first songs many children learn, because it only uses a few neighbouring notes.',
      guideDialogue: [
        { speaker: 'curious', line: 'Did the lamb really go to school?' },
        { speaker: 'knowing', line: 'The song says it did. The teacher was not pleased.' }
      ]
    },
    copyright: { status: 'public-domain', verified: true, sourceType: 'traditional', transcription: 'own-unverified' }
  },
  {
    id: 'frere-jacques',
    art: null,
    composerId: 'traditional',
    title: 'Frère Jacques',
    shortTitle: 'Frère Jacques',
    alternateTitles: ['Are You Sleeping?'],
    year: null,
    importanceLevel: 3,
    featured: true,
    playbackMode: 'full',
    tuneFamilyId: 'frere-jacques-family',
    full: {
      tempo: 104,
      verified: false,
      sourceType: 'traditional',
      sourceReference: 'Traditional French tune family / Are You Sleeping?, one-voice C-major verse; own transcription. The round’s second voice is not stacked here.',
      notes: [
        { n: 'C4', d: 1 }, { n: 'D4', d: 1 }, { n: 'E4', d: 1 }, { n: 'C4', d: 1 },
        { n: 'C4', d: 1 }, { n: 'D4', d: 1 }, { n: 'E4', d: 1 }, { n: 'C4', d: 1 },
        { n: 'E4', d: 1 }, { n: 'F4', d: 1 }, { n: 'G4', d: 2 },
        { n: 'E4', d: 1 }, { n: 'F4', d: 1 }, { n: 'G4', d: 2 },
        { n: 'G4', d: 0.5 }, { n: 'A4', d: 0.5 }, { n: 'G4', d: 0.5 }, { n: 'F4', d: 0.5 },
        { n: 'E4', d: 1 }, { n: 'C4', d: 1 },
        { n: 'G4', d: 0.5 }, { n: 'A4', d: 0.5 }, { n: 'G4', d: 0.5 }, { n: 'F4', d: 0.5 },
        { n: 'E4', d: 1 }, { n: 'C4', d: 1 },
        { n: 'C4', d: 1 }, { n: 'G3', d: 1 }, { n: 'C4', d: 2 },
        { n: 'C4', d: 1 }, { n: 'G3', d: 1 }, { n: 'C4', d: 2 }
      ]
    },
    info: {
      shortDescription: 'A French song that can be sung as a round.',
      listenFor: 'Each little phrase happens twice, like an echo.',
      whyItMatters: 'The same tune is Are You Sleeping? in English. Later, two voices can start at different times and still fit.',
      guideDialogue: [
        { speaker: 'curious', line: 'It feels like it wants to start again before it has finished.' },
        { speaker: 'knowing', line: 'That is a round. One singer is always a step behind the other.' }
      ]
    },
    copyright: { status: 'public-domain', verified: true, sourceType: 'traditional', transcription: 'own-unverified' }
  },
  {
    id: 'row-row-row-your-boat',
    art: null,
    composerId: 'traditional',
    title: 'Row, Row, Row Your Boat',
    shortTitle: 'Row Your Boat',
    alternateTitles: [],
    year: null,
    importanceLevel: 3,
    featured: true,
    playbackMode: 'full',
    tuneFamilyId: 'row-row-row-family',
    full: {
      tempo: 90,
      verified: false,
      sourceType: 'traditional',
      sourceReference: 'Traditional children’s song, complete 6/8 verse in C major; own transcription. Eighth = 0.5.',
      notes: [
        { n: 'C4', d: 1.5 }, { n: 'C4', d: 1.5 },
        { n: 'C4', d: 1 }, { n: 'D4', d: 0.5 }, { n: 'E4', d: 1.5 },
        { n: 'E4', d: 1 }, { n: 'D4', d: 0.5 }, { n: 'E4', d: 1 }, { n: 'F4', d: 0.5 },
        { n: 'G4', d: 3 },
        { n: 'C5', d: 0.5 }, { n: 'C5', d: 0.5 }, { n: 'C5', d: 0.5 },
        { n: 'G4', d: 0.5 }, { n: 'G4', d: 0.5 }, { n: 'G4', d: 0.5 },
        { n: 'E4', d: 0.5 }, { n: 'E4', d: 0.5 }, { n: 'E4', d: 0.5 },
        { n: 'C4', d: 0.5 }, { n: 'C4', d: 0.5 }, { n: 'C4', d: 0.5 },
        { n: 'G4', d: 1 }, { n: 'F4', d: 0.5 }, { n: 'E4', d: 1 }, { n: 'D4', d: 0.5 },
        { n: 'C4', d: 3 }
      ]
    },
    info: {
      shortDescription: 'A rowing song that is also a round.',
      listenFor: 'The beat comes in threes, like oars dipping: long, long, then a little skip.',
      whyItMatters: 'Merrily, merrily is the same short note over and over, which is why it feels like splashing.',
      guideDialogue: [
        { speaker: 'curious', line: 'Why does it feel bouncy?' },
        { speaker: 'knowing', line: 'Because it is in three, like a boat rocking.' }
      ]
    },
    copyright: { status: 'public-domain', verified: true, sourceType: 'traditional', transcription: 'own-unverified' }
  },
  {
    id: 'old-macdonald',
    art: null,
    composerId: 'traditional',
    title: 'Old MacDonald Had a Farm',
    shortTitle: 'Old MacDonald',
    alternateTitles: [],
    year: null,
    importanceLevel: 3,
    featured: true,
    playbackMode: 'full',
    tuneFamilyId: 'old-macdonald-family',
    full: {
      tempo: 112,
      verified: false,
      sourceType: 'traditional',
      sourceReference: 'Traditional tune family, one complete C-major verse with a single animal (chick); own transcription',
      notes: [
        { n: 'G4', d: 1 }, { n: 'G4', d: 1 }, { n: 'G4', d: 1 }, { n: 'D4', d: 1 },
        { n: 'E4', d: 1 }, { n: 'E4', d: 1 }, { n: 'D4', d: 2 },
        { n: 'B4', d: 1 }, { n: 'B4', d: 1 }, { n: 'A4', d: 1 }, { n: 'A4', d: 1 },
        { n: 'G4', d: 2 },
        { n: 'D4', d: 1 }, { n: 'G4', d: 1 }, { n: 'G4', d: 1 }, { n: 'G4', d: 1 },
        { n: 'D4', d: 1 }, { n: 'E4', d: 1 }, { n: 'E4', d: 1 }, { n: 'D4', d: 2 },
        { n: 'B4', d: 1 }, { n: 'B4', d: 1 }, { n: 'A4', d: 1 }, { n: 'A4', d: 1 },
        { n: 'G4', d: 2 },
        { n: 'D4', d: 0.5 }, { n: 'D4', d: 0.5 }, { n: 'G4', d: 1 }, { n: 'G4', d: 1 }, { n: 'G4', d: 1 },
        { n: 'D4', d: 0.5 }, { n: 'D4', d: 0.5 }, { n: 'G4', d: 1 }, { n: 'G4', d: 1 }, { n: 'G4', d: 1 },
        { n: 'G4', d: 0.5 }, { n: 'G4', d: 0.5 }, { n: 'G4', d: 0.5 }, { n: 'G4', d: 0.5 },
        { n: 'G4', d: 0.5 }, { n: 'G4', d: 0.5 }, { n: 'G4', d: 0.5 }, { n: 'G4', d: 0.5 },
        { n: 'G4', d: 1 }, { n: 'G4', d: 1 }, { n: 'G4', d: 1 }, { n: 'D4', d: 1 },
        { n: 'E4', d: 1 }, { n: 'E4', d: 1 }, { n: 'D4', d: 2 },
        { n: 'B4', d: 1 }, { n: 'B4', d: 1 }, { n: 'A4', d: 1 }, { n: 'A4', d: 1 },
        { n: 'G4', d: 2 }
      ]
    },
    info: {
      shortDescription: 'A farm song that grows a new animal each time.',
      listenFor: 'E-I-E-I-O sits on a little jump up, then a walk back down.',
      whyItMatters: 'The verse is a machine: same tune, new animal, and the middle gets noisier.',
      guideDialogue: [
        { speaker: 'curious', line: 'Can we add a duck next?' },
        { speaker: 'knowing', line: 'Yes. The notes stay the same. Only the animal changes.' }
      ]
    },
    copyright: { status: 'public-domain', verified: true, sourceType: 'traditional', transcription: 'own-unverified' }
  },
  {
    id: 'bingo',
    art: null,
    composerId: 'traditional',
    title: 'BINGO',
    alternateTitles: [],
    year: null,
    importanceLevel: 2,
    featured: false,
    playbackMode: 'full',
    tuneFamilyId: 'bingo-family',
    full: {
      tempo: 112,
      verified: false,
      sourceType: 'traditional',
      sourceReference: 'Traditional children’s song, first complete verse in G major (letters still sung, not yet clapped away); own transcription',
      notes: [
        { n: 'G4', d: 1 }, { n: 'G4', d: 1 }, { n: 'G4', d: 1 },
        { n: 'D4', d: 1 }, { n: 'D4', d: 1 }, { n: 'D4', d: 1 },
        { n: 'E4', d: 1 }, { n: 'E4', d: 1 }, { n: 'E4', d: 1 }, { n: 'D4', d: 1 },
        { n: 'B4', d: 1 }, { n: 'B4', d: 1 }, { n: 'A4', d: 1 }, { n: 'A4', d: 1 },
        { n: 'G4', d: 2 },
        { n: 'G4', d: 1 }, { n: 'G4', d: 1 }, { n: 'G4', d: 2 },
        { n: 'G4', d: 1 }, { n: 'G4', d: 1 }, { n: 'G4', d: 2 },
        { n: 'G4', d: 1 }, { n: 'G4', d: 1 }, { n: 'G4', d: 2 },
        { n: 'D4', d: 1 }, { n: 'D4', d: 1 }, { n: 'D4', d: 2 },
        { n: 'E4', d: 1 }, { n: 'E4', d: 1 }, { n: 'D4', d: 2 },
        { n: 'G4', d: 1 }, { n: 'G4', d: 1 }, { n: 'G4', d: 2 },
        { n: 'G4', d: 1 }, { n: 'G4', d: 1 }, { n: 'G4', d: 2 },
        { n: 'G4', d: 1 }, { n: 'G4', d: 1 }, { n: 'G4', d: 2 },
        { n: 'D4', d: 1 }, { n: 'D4', d: 1 }, { n: 'D4', d: 2 },
        { n: 'E4', d: 1 }, { n: 'E4', d: 1 }, { n: 'D4', d: 2 },
        { n: 'G4', d: 1 }, { n: 'G4', d: 1 }, { n: 'G4', d: 2 },
        { n: 'G4', d: 1 }, { n: 'G4', d: 1 }, { n: 'G4', d: 2 },
        { n: 'G4', d: 1 }, { n: 'G4', d: 1 }, { n: 'G4', d: 2 },
        { n: 'D4', d: 1 }, { n: 'D4', d: 1 }, { n: 'D4', d: 2 },
        { n: 'E4', d: 1 }, { n: 'E4', d: 1 }, { n: 'D4', d: 2 },
        { n: 'B4', d: 1 }, { n: 'B4', d: 1 }, { n: 'A4', d: 1 }, { n: 'A4', d: 1 },
        { n: 'G4', d: 2 }
      ]
    },
    info: {
      shortDescription: 'A farmer’s dog whose name is spelled out loud.',
      listenFor: 'The spelled letters sit on the same three notes, over and over.',
      whyItMatters: 'Later verses clap a letter away. The first time through, every letter is still sung.',
      guideDialogue: [
        { speaker: 'curious', line: 'B-I-N-G-O!' },
        { speaker: 'knowing', line: 'That spelling is the whole middle of the song.' }
      ]
    },
    copyright: { status: 'public-domain', verified: true, sourceType: 'traditional', transcription: 'own-unverified' }
  },
  {
    id: 'london-bridge',
    art: null,
    composerId: 'traditional',
    title: 'London Bridge Is Falling Down',
    shortTitle: 'London Bridge',
    alternateTitles: [],
    year: null,
    importanceLevel: 3,
    featured: true,
    playbackMode: 'full',
    tuneFamilyId: 'london-bridge-family',
    full: {
      tempo: 108,
      verified: false,
      sourceType: 'traditional',
      sourceReference: 'Traditional English tune family, familiar C-major verse; own transcription',
      notes: [
        { n: 'G4', d: 1 }, { n: 'G4', d: 1 }, { n: 'A4', d: 1 }, { n: 'G4', d: 1 },
        { n: 'F4', d: 1 }, { n: 'E4', d: 1 }, { n: 'F4', d: 1 }, { n: 'G4', d: 2 },
        { n: 'D4', d: 1 }, { n: 'E4', d: 1 }, { n: 'F4', d: 2 },
        { n: 'E4', d: 1 }, { n: 'F4', d: 1 }, { n: 'G4', d: 2 },
        { n: 'G4', d: 1 }, { n: 'G4', d: 1 }, { n: 'A4', d: 1 }, { n: 'G4', d: 1 },
        { n: 'F4', d: 1 }, { n: 'E4', d: 1 }, { n: 'F4', d: 1 }, { n: 'G4', d: 2 },
        { n: 'D4', d: 2 }, { n: 'G4', d: 2 },
        { n: 'E4', d: 1 }, { n: 'C4', d: 3 }
      ]
    },
    info: {
      shortDescription: 'A playground song about a bridge that will not stay up.',
      listenFor: 'Falling down is a little stair of notes walking downward.',
      whyItMatters: 'Children have sung this while playing the same catching game for hundreds of years.',
      guideDialogue: [
        { speaker: 'curious', line: 'Does the real London Bridge fall down?' },
        { speaker: 'knowing', line: 'Not any more. The song is older than the bridge that stands there now.' }
      ]
    },
    copyright: { status: 'public-domain', verified: true, sourceType: 'traditional', transcription: 'own-unverified' }
  },
  {
    id: 'pop-goes-weasel',
    art: null,
    composerId: 'traditional',
    title: 'Pop Goes the Weasel',
    shortTitle: 'Pop Goes the Weasel',
    alternateTitles: [],
    year: null,
    importanceLevel: 3,
    featured: true,
    playbackMode: 'full',
    tuneFamilyId: 'pop-goes-weasel-family',
    full: {
      tempo: 100,
      verified: false,
      sourceType: 'traditional',
      sourceReference: 'Traditional English/American tune family, complete 6/8 verse in C major; own transcription. Eighth = 0.5.',
      notes: [
        { n: 'E4', d: 0.5 }, { n: 'G4', d: 0.5 }, { n: 'E4', d: 0.5 },
        { n: 'G4', d: 0.5 }, { n: 'E4', d: 0.5 }, { n: 'C4', d: 0.5 },
        { n: 'D4', d: 0.5 }, { n: 'F4', d: 0.5 }, { n: 'D4', d: 0.5 },
        { n: 'B3', d: 0.5 }, { n: 'D4', d: 0.5 }, { n: 'G3', d: 0.5 },
        { n: 'E4', d: 0.5 }, { n: 'G4', d: 0.5 }, { n: 'E4', d: 0.5 },
        { n: 'G4', d: 0.5 }, { n: 'E4', d: 0.5 }, { n: 'C4', d: 0.5 },
        { n: 'G4', d: 0.5 }, { n: 'B4', d: 0.5 }, { n: 'D5', d: 1 }, { n: 'C5', d: 1 }
      ]
    },
    info: {
      shortDescription: 'A jig that hides a surprise on the word Pop.',
      listenFor: 'The tune jogs along in threes, then jumps up on Pop.',
      whyItMatters: 'The pop is the point — a sudden high note after a lot of small ones.',
      guideDialogue: [
        { speaker: 'curious', line: 'I keep waiting for the pop!' },
        { speaker: 'knowing', line: 'That is the joke of the song. It makes you wait, then it jumps.' }
      ]
    },
    copyright: { status: 'public-domain', verified: true, sourceType: 'traditional', transcription: 'own-unverified' }
  },
  {
    id: 'three-blind-mice',
    art: null,
    composerId: 'traditional',
    title: 'Three Blind Mice',
    alternateTitles: [],
    year: null,
    importanceLevel: 2,
    featured: false,
    playbackMode: 'full',
    tuneFamilyId: 'three-blind-mice-family',
    full: {
      tempo: 100,
      verified: false,
      sourceType: 'traditional',
      sourceReference: 'Traditional English tune family, complete C-major verse; own transcription',
      notes: [
        { n: 'E4', d: 1 }, { n: 'D4', d: 0.5 }, { n: 'C4', d: 1.5 },
        { n: 'E4', d: 1 }, { n: 'D4', d: 0.5 }, { n: 'C4', d: 1.5 },
        { n: 'G4', d: 0.5 }, { n: 'G4', d: 0.5 }, { n: 'F4', d: 0.5 }, { n: 'F4', d: 0.5 },
        { n: 'E4', d: 2 },
        { n: 'G4', d: 0.5 }, { n: 'G4', d: 0.5 }, { n: 'F4', d: 0.5 }, { n: 'F4', d: 0.5 },
        { n: 'E4', d: 2 },
        { n: 'G4', d: 0.5 }, { n: 'A4', d: 0.5 }, { n: 'G4', d: 0.5 }, { n: 'F4', d: 0.5 },
        { n: 'E4', d: 0.5 }, { n: 'D4', d: 0.5 }, { n: 'C4', d: 0.5 }, { n: 'E4', d: 0.5 },
        { n: 'G4', d: 0.5 }, { n: 'A4', d: 0.5 }, { n: 'G4', d: 0.5 }, { n: 'F4', d: 0.5 },
        { n: 'E4', d: 0.5 }, { n: 'D4', d: 0.5 }, { n: 'C4', d: 2 }
      ]
    },
    info: {
      shortDescription: 'Three mice, a chase, and a tune that keeps coming back down.',
      listenFor: 'The opening is a tiny slide: three notes, then the same three notes again.',
      whyItMatters: 'It is an old English round. The first two bars are the whole idea.',
      guideDialogue: [
        { speaker: 'curious', line: 'It starts so small.' },
        { speaker: 'knowing', line: 'Then it runs. That is the chase in the middle of the song.' }
      ]
    },
    copyright: { status: 'public-domain', verified: true, sourceType: 'traditional', transcription: 'own-unverified' }
  },
  {
    id: 'hot-cross-buns',
    art: null,
    composerId: 'traditional',
    title: 'Hot Cross Buns',
    alternateTitles: [],
    year: null,
    importanceLevel: 2,
    featured: false,
    playbackMode: 'full',
    tuneFamilyId: 'hot-cross-buns-family',
    full: {
      tempo: 100,
      verified: false,
      sourceType: 'traditional',
      sourceReference: 'Traditional English street cry / children’s song, complete C-major verse; own transcription',
      notes: [
        { n: 'E4', d: 1 }, { n: 'D4', d: 1 }, { n: 'C4', d: 2 },
        { n: 'E4', d: 1 }, { n: 'D4', d: 1 }, { n: 'C4', d: 2 },
        { n: 'C4', d: 0.5 }, { n: 'C4', d: 0.5 }, { n: 'C4', d: 0.5 }, { n: 'C4', d: 0.5 },
        { n: 'D4', d: 0.5 }, { n: 'D4', d: 0.5 }, { n: 'D4', d: 0.5 }, { n: 'D4', d: 0.5 },
        { n: 'E4', d: 1 }, { n: 'D4', d: 1 }, { n: 'C4', d: 2 }
      ]
    },
    info: {
      shortDescription: 'A baker’s call that became a first-instrument song.',
      listenFor: 'Only three notes: the one in the middle, the one below, and the one below that.',
      whyItMatters: 'It is short on purpose. A child can play the whole thing after learning three pitches.',
      guideDialogue: [
        { speaker: 'curious', line: 'That was over so fast!' },
        { speaker: 'knowing', line: 'Street sellers had to shout it quickly, so the song stayed tiny.' }
      ]
    },
    copyright: { status: 'public-domain', verified: true, sourceType: 'traditional', transcription: 'own-unverified' }
  },
  {
    id: 'this-old-man',
    art: null,
    composerId: 'traditional',
    title: 'This Old Man',
    alternateTitles: [],
    year: null,
    importanceLevel: 2,
    featured: false,
    playbackMode: 'full',
    tuneFamilyId: 'this-old-man-family',
    full: {
      tempo: 108,
      verified: false,
      sourceType: 'traditional',
      sourceReference: 'Traditional English counting song, one complete C-major verse (played one); own transcription',
      notes: [
        { n: 'G4', d: 1 }, { n: 'E4', d: 1 }, { n: 'G4', d: 2 },
        { n: 'G4', d: 1 }, { n: 'E4', d: 1 }, { n: 'G4', d: 2 },
        { n: 'A4', d: 1 }, { n: 'G4', d: 1 }, { n: 'F4', d: 1 }, { n: 'E4', d: 1 },
        { n: 'D4', d: 1 }, { n: 'C4', d: 1 }, { n: 'D4', d: 1 }, { n: 'E4', d: 1 },
        { n: 'G4', d: 1 }, { n: 'G4', d: 1 }, { n: 'D4', d: 2 },
        { n: 'E4', d: 1 }, { n: 'D4', d: 1 }, { n: 'C4', d: 2 }
      ]
    },
    info: {
      shortDescription: 'A counting song that knocks knick-knack on a new thing each time.',
      listenFor: 'This old man he played one uses the same two notes, bouncing.',
      whyItMatters: 'The verses count up. The first one is the whole machine; later verses only change a word.',
      guideDialogue: [
        { speaker: 'curious', line: 'What is a knick-knack?' },
        { speaker: 'knowing', line: 'A little tap. The song is counting taps on thumbs, shoes, and knees.' }
      ]
    },
    copyright: { status: 'public-domain', verified: true, sourceType: 'traditional', transcription: 'own-unverified' }
  },
  {
    id: 'farmer-in-dell',
    art: null,
    composerId: 'traditional',
    title: 'The Farmer in the Dell',
    shortTitle: 'The Farmer in the Dell',
    alternateTitles: [],
    year: null,
    importanceLevel: 2,
    featured: false,
    playbackMode: 'full',
    tuneFamilyId: 'farmer-in-dell-family',
    full: {
      tempo: 108,
      verified: false,
      sourceType: 'traditional',
      sourceReference: 'Traditional playground song, one complete C-major verse (the farmer only, not the wife–child–nurse chain); own transcription',
      notes: [
        { n: 'G4', d: 1 }, { n: 'G4', d: 1 }, { n: 'G4', d: 1 }, { n: 'G4', d: 1 },
        { n: 'E4', d: 1 }, { n: 'C4', d: 1 },
        { n: 'G4', d: 1 }, { n: 'G4', d: 1 }, { n: 'G4', d: 1 }, { n: 'G4', d: 1 },
        { n: 'E4', d: 1 }, { n: 'C4', d: 1 },
        { n: 'C4', d: 1 }, { n: 'C4', d: 1 }, { n: 'C4', d: 1 }, { n: 'C4', d: 1 },
        { n: 'D4', d: 1 }, { n: 'C4', d: 1 }, { n: 'B3', d: 1 }, { n: 'A3', d: 1 },
        { n: 'G3', d: 1 }, { n: 'G3', d: 1 }, { n: 'D4', d: 1 }, { n: 'D4', d: 1 },
        { n: 'C4', d: 2 }
      ]
    },
    info: {
      shortDescription: 'A circle game that picks a farmer, then a wife, then a child.',
      listenFor: 'Hi-ho the derry-o walks down a little stair, then climbs back to the farmer.',
      whyItMatters: 'The first verse is the whole tune. Later verses only change who is chosen.',
      guideDialogue: [
        { speaker: 'curious', line: 'Why does it keep adding people?' },
        { speaker: 'knowing', line: 'It is a game. Each child pulled into the circle gets the next verse.' }
      ]
    },
    copyright: { status: 'public-domain', verified: true, sourceType: 'traditional', transcription: 'own-unverified' }
  },
  {
    id: 'mulberry-bush',
    art: null,
    composerId: 'traditional',
    title: 'Here We Go Round the Mulberry Bush',
    shortTitle: 'Mulberry Bush',
    alternateTitles: [],
    year: null,
    importanceLevel: 2,
    featured: false,
    playbackMode: 'full',
    tuneFamilyId: 'mulberry-bush-family',
    full: {
      tempo: 108,
      verified: false,
      sourceType: 'traditional',
      sourceReference: 'Traditional English tune family, complete C-major verse (the same family as The Wheels on the Bus); own transcription',
      notes: [
        { n: 'C4', d: 1 }, { n: 'C4', d: 1 }, { n: 'C4', d: 1 }, { n: 'C4', d: 1 },
        { n: 'C4', d: 1 }, { n: 'C4', d: 1 }, { n: 'E4', d: 1 }, { n: 'G4', d: 1 },
        { n: 'A4', d: 1 }, { n: 'A4', d: 1 }, { n: 'A4', d: 2 }, { n: 'G4', d: 2 },
        { n: 'F4', d: 1 }, { n: 'F4', d: 1 }, { n: 'F4', d: 1 }, { n: 'F4', d: 1 },
        { n: 'F4', d: 1 }, { n: 'F4', d: 1 }, { n: 'A4', d: 2 },
        { n: 'C4', d: 1 }, { n: 'C4', d: 1 }, { n: 'C4', d: 1 }, { n: 'C4', d: 1 },
        { n: 'C4', d: 1 }, { n: 'C4', d: 1 }, { n: 'E4', d: 1 }, { n: 'G4', d: 1 },
        { n: 'G4', d: 1 }, { n: 'F4', d: 1 }, { n: 'E4', d: 1 }, { n: 'D4', d: 1 },
        { n: 'C4', d: 2 }
      ]
    },
    info: {
      shortDescription: 'A circling song about the jobs of the day.',
      listenFor: 'This is the way we wash our clothes uses the same notes as the mulberry bush.',
      whyItMatters: 'The Wheels on the Bus is this tune with different words. One melody, many playgrounds.',
      guideDialogue: [
        { speaker: 'curious', line: 'That sounds like the bus song!' },
        { speaker: 'knowing', line: 'Same tune. The bush is older. The bus borrowed it.' }
      ]
    },
    copyright: { status: 'public-domain', verified: true, sourceType: 'traditional', transcription: 'own-unverified' }
  },
  {
    id: 'rock-a-bye-baby',
    art: null,
    composerId: 'traditional',
    title: 'Rock-a-bye Baby',
    alternateTitles: [],
    year: null,
    importanceLevel: 3,
    featured: true,
    playbackMode: 'full',
    tuneFamilyId: 'rock-a-bye-baby-family',
    full: {
      tempo: 84,
      verified: false,
      sourceType: 'traditional',
      sourceReference: 'Traditional / historical lullaby, complete C-major verse in 3; own transcription',
      notes: [
        { n: 'C4', d: 1 }, { n: 'C4', d: 1 }, { n: 'E4', d: 1 },
        { n: 'G4', d: 1 }, { n: 'G4', d: 1 }, { n: 'E4', d: 1 },
        { n: 'C4', d: 1 }, { n: 'D4', d: 1 }, { n: 'E4', d: 1 },
        { n: 'D4', d: 3 },
        { n: 'C4', d: 1 }, { n: 'C4', d: 1 }, { n: 'E4', d: 1 },
        { n: 'G4', d: 1 }, { n: 'G4', d: 1 }, { n: 'E4', d: 1 },
        { n: 'G4', d: 1 }, { n: 'F4', d: 1 }, { n: 'D4', d: 1 },
        { n: 'C4', d: 3 },
        { n: 'C4', d: 1 }, { n: 'C4', d: 1 }, { n: 'E4', d: 1 },
        { n: 'G4', d: 1 }, { n: 'G4', d: 1 }, { n: 'E4', d: 1 },
        { n: 'C4', d: 1 }, { n: 'D4', d: 1 }, { n: 'E4', d: 1 },
        { n: 'D4', d: 3 },
        { n: 'C4', d: 1 }, { n: 'C4', d: 1 }, { n: 'E4', d: 1 },
        { n: 'G4', d: 1 }, { n: 'G4', d: 1 }, { n: 'E4', d: 1 },
        { n: 'G4', d: 1 }, { n: 'F4', d: 1 }, { n: 'D4', d: 1 },
        { n: 'C4', d: 3 }
      ]
    },
    info: {
      shortDescription: 'A lullaby that rocks in three, like a cradle.',
      listenFor: 'The beat is a slow waltz. Nothing hurries.',
      whyItMatters: 'It is one of the oldest English-language cradle songs still sung to babies.',
      guideDialogue: [
        { speaker: 'curious', line: 'The tree sounds dangerous.' },
        { speaker: 'knowing', line: 'The rocking is the point. The bough is only a picture of the cradle moving.' }
      ]
    },
    copyright: { status: 'public-domain', verified: true, sourceType: 'traditional', transcription: 'own-unverified' }
  },
  {
    id: 'skip-to-my-lou',
    art: null,
    composerId: 'traditional',
    title: 'Skip to My Lou',
    alternateTitles: [],
    year: null,
    importanceLevel: 2,
    featured: false,
    playbackMode: 'full',
    tuneFamilyId: 'skip-to-my-lou-family',
    full: {
      tempo: 120,
      verified: false,
      sourceType: 'traditional',
      sourceReference: 'Traditional American play-party song, one complete C-major verse; own transcription',
      notes: [
        { n: 'C4', d: 1 }, { n: 'C4', d: 1 }, { n: 'E4', d: 1 }, { n: 'G4', d: 1 },
        { n: 'A4', d: 1 }, { n: 'G4', d: 1 }, { n: 'E4', d: 1 }, { n: 'C4', d: 1 },
        { n: 'C4', d: 1 }, { n: 'C4', d: 1 }, { n: 'E4', d: 1 }, { n: 'G4', d: 1 },
        { n: 'A4', d: 1 }, { n: 'G4', d: 1 }, { n: 'E4', d: 1 }, { n: 'C4', d: 1 },
        { n: 'C4', d: 1 }, { n: 'C4', d: 1 }, { n: 'E4', d: 1 }, { n: 'G4', d: 1 },
        { n: 'A4', d: 1 }, { n: 'G4', d: 1 }, { n: 'E4', d: 1 }, { n: 'C4', d: 1 },
        { n: 'G4', d: 1 }, { n: 'G4', d: 1 }, { n: 'F4', d: 1 }, { n: 'E4', d: 1 },
        { n: 'D4', d: 1 }, { n: 'C4', d: 3 }
      ]
    },
    info: {
      shortDescription: 'A skipping game for when someone needs a new partner.',
      listenFor: 'Skip, skip, skip to my lou sits on a little climb, then a slide back down.',
      whyItMatters: 'Lou is an old word for sweetheart. The song is a dance instruction.',
      guideDialogue: [
        { speaker: 'curious', line: 'What does lou mean?' },
        { speaker: 'knowing', line: 'Sweetheart. Skip to my lou means skip to my love.' }
      ]
    },
    copyright: { status: 'public-domain', verified: true, sourceType: 'traditional', transcription: 'own-unverified' }
  },
  {
    id: 'amazing-grace-new-britain',
    art: null,
    composerId: 'traditional',
    title: 'Amazing Grace',
    alternateTitles: ['New Britain'],
    year: 1779,
    importanceLevel: 3,
    featured: true,
    playbackMode: 'full',
    tuneFamilyId: 'amazing-grace-new-britain-family',
    full: {
      tempo: 72,
      verified: false,
      sourceType: 'traditional',
      sourceReference: 'Hymn tune New Britain (not a later gospel arrangement), first stanza in G major, 3/4; own transcription',
      notes: [
        { n: 'D4', d: 1 },
        { n: 'G4', d: 2 }, { n: 'B4', d: 1 },
        { n: 'A4', d: 2 }, { n: 'G4', d: 1 },
        { n: 'B4', d: 2 }, { n: 'A4', d: 1 },
        { n: 'G4', d: 2 }, { n: 'E4', d: 1 },
        { n: 'D4', d: 3 },
        { n: 'D4', d: 2 }, { n: 'G4', d: 1 },
        { n: 'B4', d: 2 }, { n: 'A4', d: 1 },
        { n: 'A4', d: 3 },
        { n: 'B4', d: 2 }, { n: 'D5', d: 1 },
        { n: 'D5', d: 2 }, { n: 'B4', d: 1 },
        { n: 'G4', d: 2 }, { n: 'B4', d: 1 },
        { n: 'A4', d: 2 }, { n: 'G4', d: 1 },
        { n: 'E4', d: 2 }, { n: 'D4', d: 1 },
        { n: 'D4', d: 2 }, { n: 'G4', d: 1 },
        { n: 'B4', d: 2 }, { n: 'A4', d: 1 },
        { n: 'G4', d: 3 }
      ]
    },
    info: {
      shortDescription: 'A hymn whose tune is called New Britain.',
      listenFor: 'The first notes rise, then fall. It feels like a breath in and a breath out.',
      whyItMatters: 'The words are old. The tune people sing today is New Britain, a folk hymn, not a pop arrangement.',
      guideDialogue: [
        { speaker: 'curious', line: 'It sounds like a church song.' },
        { speaker: 'knowing', line: 'It is. The tune is older than the famous words, and it is called New Britain.' }
      ]
    },
    copyright: { status: 'public-domain', verified: true, sourceType: 'traditional', transcription: 'own-unverified' }
  },
  {
    id: 'when-saints-go-marching',
    art: null,
    composerId: 'traditional',
    title: 'When the Saints Go Marching In',
    shortTitle: 'When the Saints',
    alternateTitles: [],
    year: null,
    importanceLevel: 3,
    featured: true,
    playbackMode: 'full',
    tuneFamilyId: 'when-saints-family',
    full: {
      tempo: 112,
      verified: false,
      sourceType: 'traditional',
      sourceReference: 'Traditional American song, familiar C-major chorus (not a Dixieland / jazz arrangement); own transcription',
      notes: [
        { n: 'C4', d: 1 }, { n: 'E4', d: 1 }, { n: 'F4', d: 1 }, { n: 'G4', d: 3 }, { n: null, d: 1 },
        { n: 'C4', d: 1 }, { n: 'E4', d: 1 }, { n: 'F4', d: 1 }, { n: 'G4', d: 3 }, { n: null, d: 1 },
        { n: 'C4', d: 1 }, { n: 'E4', d: 1 }, { n: 'F4', d: 1 }, { n: 'G4', d: 2 },
        { n: 'E4', d: 1 }, { n: 'C4', d: 1 }, { n: 'E4', d: 1 }, { n: 'D4', d: 3 }, { n: null, d: 1 },
        { n: 'E4', d: 1 }, { n: 'E4', d: 1 }, { n: 'D4', d: 1 }, { n: 'C4', d: 2 }, { n: 'E4', d: 1 },
        { n: 'G4', d: 2 }, { n: 'G4', d: 1 }, { n: 'F4', d: 3 }, { n: null, d: 1 },
        { n: 'C4', d: 1 }, { n: 'E4', d: 1 }, { n: 'F4', d: 1 }, { n: 'G4', d: 2 },
        { n: 'E4', d: 1 }, { n: 'C4', d: 1 }, { n: 'D4', d: 1 }, { n: 'C4', d: 3 }
      ]
    },
    info: {
      shortDescription: 'A marching song about a joyful procession.',
      listenFor: 'Three stepping notes, then a long one. The shape repeats, then it answers itself.',
      whyItMatters: 'People sing it at parades and funerals. The old tune is simple; later jazz versions add extra notes we are not using.',
      guideDialogue: [
        { speaker: 'curious', line: 'It wants me to march.' },
        { speaker: 'knowing', line: 'That is the point. The long notes are the feet coming down.' }
      ]
    },
    copyright: { status: 'public-domain', verified: true, sourceType: 'traditional', transcription: 'own-unverified' }
  },
  {
    id: 'simple-gifts',
    art: null,
    composerId: 'traditional',
    title: 'Simple Gifts',
    alternateTitles: [],
    year: 1848,
    importanceLevel: 2,
    featured: false,
    playbackMode: 'full',
    tuneFamilyId: 'simple-gifts-family',
    full: {
      tempo: 100,
      verified: false,
      sourceType: 'public-domain-score',
      sourceReference: 'Joseph Brackett, Simple Gifts (1848 Shaker song), C-major melody of the verse plus the turning refrain; own transcription',
      notes: [
        { n: 'C4', d: 1 }, { n: 'C4', d: 0.5 }, { n: 'D4', d: 0.5 },
        { n: 'E4', d: 1 }, { n: 'F4', d: 0.5 }, { n: 'E4', d: 0.5 },
        { n: 'D4', d: 1 }, { n: 'C4', d: 1 }, { n: 'A3', d: 1 }, { n: 'G3', d: 1 },
        { n: 'C4', d: 1 }, { n: 'C4', d: 0.5 }, { n: 'D4', d: 0.5 },
        { n: 'E4', d: 1 }, { n: 'F4', d: 0.5 }, { n: 'E4', d: 0.5 },
        { n: 'D4', d: 1 }, { n: 'C4', d: 1 }, { n: 'A3', d: 1 }, { n: 'G3', d: 1 },
        { n: 'E4', d: 1 }, { n: 'G4', d: 1 }, { n: 'G4', d: 1 }, { n: 'E4', d: 1 },
        { n: 'C4', d: 1 }, { n: 'E4', d: 1 }, { n: 'E4', d: 1 }, { n: 'C4', d: 1 },
        { n: 'D4', d: 1 }, { n: 'C4', d: 1 }, { n: 'A3', d: 1 }, { n: 'G3', d: 1 },
        { n: 'E4', d: 1 }, { n: 'G4', d: 1 }, { n: 'G4', d: 0.5 }, { n: 'A4', d: 0.5 },
        { n: 'G4', d: 1 }, { n: 'E4', d: 1 },
        { n: 'D4', d: 1 }, { n: 'C4', d: 1 }, { n: 'A3', d: 1 }, { n: 'G3', d: 1 },
        { n: 'C4', d: 2 }
      ]
    },
    info: {
      shortDescription: 'A Shaker dancing song about turning until you come round right.',
      listenFor: 'The second half climbs, then turns back on itself — that is the dance.',
      whyItMatters: 'Joseph Brackett wrote it in 1848 for a Shaker community. The gift in the title is simplicity.',
      guideDialogue: [
        { speaker: 'curious', line: 'Why do they turn?' },
        { speaker: 'knowing', line: 'The Shakers danced in turning patterns. The song is the dance counted in notes.' }
      ]
    },
    copyright: { status: 'public-domain', verified: true, sourceType: 'public-domain-composition', transcription: 'own-unverified' }
  },
  {
    id: 'my-bonnie',
    art: null,
    composerId: 'traditional',
    title: 'My Bonnie Lies over the Ocean',
    shortTitle: 'My Bonnie',
    alternateTitles: [],
    year: null,
    importanceLevel: 2,
    featured: false,
    playbackMode: 'full',
    tuneFamilyId: 'my-bonnie-family',
    full: {
      tempo: 90,
      verified: false,
      sourceType: 'traditional',
      sourceReference: 'Traditional Scottish song lineage, complete C-major verse plus Bring back chorus, 3/4; own transcription',
      notes: [
        { n: 'G4', d: 1 }, { n: 'E4', d: 1 }, { n: 'C4', d: 1 },
        { n: 'C4', d: 1 }, { n: 'D4', d: 1 }, { n: 'E4', d: 1 },
        { n: 'F4', d: 1 }, { n: 'A4', d: 1 }, { n: 'A4', d: 1 },
        { n: 'A4', d: 3 },
        { n: 'A4', d: 1 }, { n: 'F4', d: 1 }, { n: 'D4', d: 1 },
        { n: 'B3', d: 1 }, { n: 'C4', d: 1 }, { n: 'D4', d: 1 },
        { n: 'E4', d: 1 }, { n: 'G4', d: 1 }, { n: 'G4', d: 1 },
        { n: 'G4', d: 3 },
        { n: 'G4', d: 1 }, { n: 'E4', d: 1 }, { n: 'C4', d: 1 },
        { n: 'C4', d: 1 }, { n: 'D4', d: 1 }, { n: 'E4', d: 1 },
        { n: 'F4', d: 1 }, { n: 'A4', d: 1 }, { n: 'A4', d: 1 },
        { n: 'A4', d: 1 }, { n: 'B4', d: 1 }, { n: 'C5', d: 1 },
        { n: 'G4', d: 1 }, { n: 'C4', d: 1 }, { n: 'B4', d: 1 },
        { n: 'A4', d: 1 }, { n: 'G4', d: 1 }, { n: 'F4', d: 1 },
        { n: 'E4', d: 3 },
        { n: 'G4', d: 2 }, { n: 'E4', d: 1 }, { n: 'C4', d: 2 }, { n: 'E4', d: 1 },
        { n: 'G4', d: 1 }, { n: 'G4', d: 1 }, { n: 'A4', d: 1 }, { n: 'G4', d: 3 },
        { n: 'G4', d: 2 }, { n: 'F4', d: 1 }, { n: 'D4', d: 2 }, { n: 'F4', d: 1 },
        { n: 'A4', d: 1 }, { n: 'A4', d: 1 }, { n: 'B4', d: 1 }, { n: 'A4', d: 3 },
        { n: 'G4', d: 2 }, { n: 'E4', d: 1 }, { n: 'C4', d: 2 }, { n: 'E4', d: 1 },
        { n: 'G4', d: 1 }, { n: 'G4', d: 1 }, { n: 'A4', d: 1 }, { n: 'G4', d: 1 },
        { n: 'C4', d: 1 }, { n: 'B4', d: 1 },
        { n: 'A4', d: 1 }, { n: 'G4', d: 1 }, { n: 'F4', d: 1 },
        { n: 'E4', d: 3 }
      ]
    },
    info: {
      shortDescription: 'A Scottish song asking the sea to send someone home.',
      listenFor: 'The verse rocks in three. Bring back jumps up, then the same jump happens lower down.',
      whyItMatters: 'Bonnie means pretty, and here it is a person. Children stand and sit on the B sounds.',
      guideDialogue: [
        { speaker: 'curious', line: 'Who is Bonnie?' },
        { speaker: 'knowing', line: 'Someone loved, far away over the water. The song is a wish they would come back.' }
      ]
    },
    copyright: { status: 'public-domain', verified: true, sourceType: 'traditional', transcription: 'own-unverified' }
  },
  {
    id: 'home-on-range',
    art: null,
    composerId: 'traditional',
    title: 'Home on the Range',
    alternateTitles: [],
    year: 1873,
    importanceLevel: 2,
    featured: false,
    playbackMode: 'full',
    tuneFamilyId: 'home-on-range-family',
    full: {
      tempo: 80,
      verified: false,
      sourceType: 'public-domain-score',
      sourceReference: 'Daniel E. Kelley melody / Brewster M. Higley text (1870s), G-major verse plus Home, home on the range chorus, 3/4; own transcription, not a later pop arrangement',
      notes: [
        { n: 'D4', d: 1 },
        { n: 'G4', d: 2 }, { n: 'B4', d: 1 },
        { n: 'D5', d: 2 }, { n: 'D5', d: 1 },
        { n: 'E5', d: 2 }, { n: 'D5', d: 1 },
        { n: 'B4', d: 2 }, { n: 'G4', d: 1 },
        { n: 'A4', d: 3 },
        { n: 'B4', d: 2 }, { n: 'D5', d: 1 },
        { n: 'D5', d: 2 }, { n: 'B4', d: 1 },
        { n: 'A4', d: 2 }, { n: 'G4', d: 1 },
        { n: 'E4', d: 2 }, { n: 'D4', d: 1 },
        { n: 'G4', d: 3 },
        { n: 'D4', d: 2 }, { n: 'G4', d: 1 },
        { n: 'B4', d: 2 }, { n: 'D5', d: 1 },
        { n: 'E5', d: 2 }, { n: 'D5', d: 1 },
        { n: 'B4', d: 2 }, { n: 'G4', d: 1 },
        { n: 'A4', d: 3 },
        { n: 'B4', d: 2 }, { n: 'A4', d: 1 },
        { n: 'G4', d: 2 }, { n: 'E4', d: 1 },
        { n: 'D4', d: 2 }, { n: 'G4', d: 1 },
        { n: 'G4', d: 3 },
        { n: 'D5', d: 2 }, { n: 'D5', d: 1 },
        { n: 'E5', d: 2 }, { n: 'D5', d: 1 },
        { n: 'B4', d: 2 }, { n: 'G4', d: 1 },
        { n: 'A4', d: 3 },
        { n: 'B4', d: 2 }, { n: 'D5', d: 1 },
        { n: 'D5', d: 2 }, { n: 'B4', d: 1 },
        { n: 'A4', d: 2 }, { n: 'G4', d: 1 },
        { n: 'E4', d: 2 }, { n: 'D4', d: 1 },
        { n: 'D4', d: 2 }, { n: 'G4', d: 1 },
        { n: 'B4', d: 2 }, { n: 'D5', d: 1 },
        { n: 'E5', d: 2 }, { n: 'D5', d: 1 },
        { n: 'B4', d: 2 }, { n: 'G4', d: 1 },
        { n: 'A4', d: 3 },
        { n: 'B4', d: 2 }, { n: 'A4', d: 1 },
        { n: 'G4', d: 2 }, { n: 'E4', d: 1 },
        { n: 'D4', d: 2 }, { n: 'G4', d: 1 },
        { n: 'G4', d: 3 }
      ]
    },
    info: {
      shortDescription: 'A cowboy song about a wide, quiet place.',
      listenFor: 'The tune sits high on home, then walks down like a horizon.',
      whyItMatters: 'It became a song of the American West. The old melody is slow and open, not a pop rewrite.',
      guideDialogue: [
        { speaker: 'curious', line: 'What is an antelope doing in a song?' },
        { speaker: 'knowing', line: 'They really lived on those plains. The song is naming what the singer can see.' }
      ]
    },
    copyright: { status: 'public-domain', verified: true, sourceType: 'public-domain-composition', transcription: 'own-unverified' }
  },
  {
    id: 'happy-birthday',
    art: null,
    composerId: 'traditional',
    title: 'Happy Birthday to You',
    shortTitle: 'Happy Birthday',
    alternateTitles: [],
    year: 1893,
    importanceLevel: 3,
    featured: true,
    playbackMode: 'full',
    tuneFamilyId: 'happy-birthday-family',
    full: {
      tempo: 96,
      verified: false,
      sourceType: 'public-domain-score',
      sourceReference: 'Historical Happy Birthday / Good Morning to All melody (Hill), C major, complete song; own transcription. Composition treated as public-domain; not a modern arrangement.',
      notes: [
        { n: 'G4', d: 0.75 }, { n: 'G4', d: 0.25 }, { n: 'A4', d: 1 }, { n: 'G4', d: 1 }, { n: 'C5', d: 1 }, { n: 'B4', d: 2 },
        { n: 'G4', d: 0.75 }, { n: 'G4', d: 0.25 }, { n: 'A4', d: 1 }, { n: 'G4', d: 1 }, { n: 'D5', d: 1 }, { n: 'C5', d: 2 },
        { n: 'G4', d: 0.75 }, { n: 'G4', d: 0.25 }, { n: 'G5', d: 1 }, { n: 'E5', d: 1 }, { n: 'C5', d: 1 }, { n: 'B4', d: 1 }, { n: 'A4', d: 2 },
        { n: 'F5', d: 0.75 }, { n: 'F5', d: 0.25 }, { n: 'E5', d: 1 }, { n: 'C5', d: 1 }, { n: 'D5', d: 1 }, { n: 'C5', d: 2 }
      ]
    },
    info: {
      shortDescription: 'The birthday song almost every child already knows.',
      listenFor: 'Each line starts with two little notes, then a jump. The last jump is the biggest.',
      whyItMatters: 'It is the most sung English song there is. The whole tune is one short verse.',
      guideDialogue: [
        { speaker: 'curious', line: 'That is the cake song!' },
        { speaker: 'knowing', line: 'Yes. Four lines, and then the candles.' }
      ]
    },
    copyright: { status: 'public-domain', verified: true, sourceType: 'public-domain-composition', transcription: 'own-unverified' }
  },
  {
    id: 'jolly-good-fellow',
    art: null,
    composerId: 'traditional',
    title: 'For He\'s a Jolly Good Fellow',
    shortTitle: 'Jolly Good Fellow',
    alternateTitles: ['The Bear Went Over the Mountain'],
    year: null,
    importanceLevel: 2,
    featured: false,
    playbackMode: 'full',
    tuneFamilyId: 'jolly-good-fellow-family',
    full: {
      tempo: 108,
      verified: false,
      sourceType: 'traditional',
      sourceReference: 'Traditional tune family (Malbrough / For He\'s a Jolly Good Fellow / The Bear Went Over the Mountain), complete C-major verse including which nobody can deny; own transcription. One melody object.',
      notes: [
        { n: 'C4', d: 0.5 }, { n: 'C4', d: 0.5 }, { n: 'C4', d: 0.5 }, { n: 'E4', d: 0.5 }, { n: 'G4', d: 1 },
        { n: 'G4', d: 0.5 }, { n: 'E4', d: 0.5 }, { n: 'C4', d: 0.5 }, { n: 'C4', d: 0.5 }, { n: 'C4', d: 1 },
        { n: 'C4', d: 0.5 }, { n: 'C4', d: 0.5 }, { n: 'C4', d: 0.5 }, { n: 'E4', d: 0.5 }, { n: 'G4', d: 1 },
        { n: 'G4', d: 0.5 }, { n: 'E4', d: 0.5 }, { n: 'C4', d: 1 }, { n: 'D4', d: 1.5 },
        { n: 'G4', d: 0.5 }, { n: 'G4', d: 0.5 }, { n: 'G4', d: 0.5 }, { n: 'E4', d: 0.5 }, { n: 'C4', d: 1 },
        { n: 'G4', d: 0.5 }, { n: 'G4', d: 0.5 }, { n: 'G4', d: 0.5 }, { n: 'E4', d: 0.5 }, { n: 'C4', d: 1 },
        { n: 'C4', d: 0.5 }, { n: 'C4', d: 0.5 }, { n: 'C4', d: 0.5 }, { n: 'E4', d: 0.5 }, { n: 'G4', d: 1 },
        { n: 'G4', d: 0.5 }, { n: 'E4', d: 0.5 }, { n: 'C4', d: 1 }, { n: 'D4', d: 0.5 }, { n: 'C4', d: 1.5 }
      ]
    },
    info: {
      shortDescription: 'A cheer for someone, and also the song about a bear and a mountain.',
      listenFor: 'The middle part (which nobody can deny) sits higher, then the first tune comes back.',
      whyItMatters: 'The Bear Went Over the Mountain is this same melody with different words. One tune, two names.',
      guideDialogue: [
        { speaker: 'curious', line: 'I know this one about a bear!' },
        { speaker: 'knowing', line: 'Same notes. People borrowed the tune for parties and for the bear.' }
      ]
    },
    copyright: { status: 'public-domain', verified: true, sourceType: 'traditional', transcription: 'own-unverified' }
  },
  {
    id: 'jingle-bells',
    art: null,
    composerId: 'traditional',
    title: 'Jingle Bells',
    alternateTitles: [],
    year: 1857,
    importanceLevel: 3,
    featured: true,
    playbackMode: 'full',
    tuneFamilyId: 'jingle-bells-family',
    full: {
      tempo: 112,
      verified: false,
      sourceType: 'public-domain-score',
      sourceReference: 'James Lord Pierpont, One Horse Open Sleigh (1857), C-major verse plus chorus; own transcription, not a pop medley',
      notes: [
        { n: 'E4', d: 1 }, { n: 'E4', d: 1 }, { n: 'E4', d: 2 },
        { n: 'E4', d: 1 }, { n: 'E4', d: 1 }, { n: 'E4', d: 2 },
        { n: 'E4', d: 1 }, { n: 'G4', d: 1 }, { n: 'C4', d: 1 }, { n: 'D4', d: 1 }, { n: 'E4', d: 4 },
        { n: 'F4', d: 1 }, { n: 'F4', d: 1 }, { n: 'F4', d: 1 }, { n: 'F4', d: 1 },
        { n: 'F4', d: 1 }, { n: 'E4', d: 1 }, { n: 'E4', d: 1 }, { n: 'E4', d: 0.5 }, { n: 'E4', d: 0.5 },
        { n: 'E4', d: 1 }, { n: 'D4', d: 1 }, { n: 'D4', d: 1 }, { n: 'E4', d: 1 }, { n: 'D4', d: 2 }, { n: 'G4', d: 2 },
        { n: 'E4', d: 1 }, { n: 'E4', d: 1 }, { n: 'E4', d: 2 },
        { n: 'E4', d: 1 }, { n: 'E4', d: 1 }, { n: 'E4', d: 2 },
        { n: 'E4', d: 1 }, { n: 'G4', d: 1 }, { n: 'C4', d: 1 }, { n: 'D4', d: 1 }, { n: 'E4', d: 4 },
        { n: 'F4', d: 1 }, { n: 'F4', d: 1 }, { n: 'F4', d: 1 }, { n: 'F4', d: 1 },
        { n: 'F4', d: 1 }, { n: 'E4', d: 1 }, { n: 'E4', d: 1 }, { n: 'E4', d: 0.5 }, { n: 'E4', d: 0.5 },
        { n: 'G4', d: 1 }, { n: 'G4', d: 1 }, { n: 'F4', d: 1 }, { n: 'D4', d: 1 }, { n: 'C4', d: 4 }
      ]
    },
    info: {
      shortDescription: 'A sleighing song that became a winter song for everyone.',
      listenFor: 'Jingle bells is the same two notes, three times, like bells shaking.',
      whyItMatters: 'Pierpont wrote it about a sleigh ride, not about Christmas. The chorus is the part everyone shouts.',
      guideDialogue: [
        { speaker: 'curious', line: 'I can clap this one.' },
        { speaker: 'knowing', line: 'The short notes are the bells. The long one at the end is the last shake.' }
      ]
    },
    copyright: { status: 'public-domain', verified: true, sourceType: 'public-domain-composition', transcription: 'own-unverified' }
  },
  {
    id: 'silent-night',
    art: null,
    composerId: 'traditional',
    title: 'Silent Night',
    alternateTitles: ['Stille Nacht'],
    year: 1818,
    importanceLevel: 3,
    featured: true,
    playbackMode: 'full',
    tuneFamilyId: 'silent-night-family',
    full: {
      tempo: 72,
      verified: false,
      sourceType: 'public-domain-score',
      sourceReference: 'Franz Xaver Gruber / Joseph Mohr, Stille Nacht (1818), first stanza in C major; own transcription, not a later ballad arrangement',
      notes: [
        { n: 'G4', d: 1.5 }, { n: 'A4', d: 0.5 }, { n: 'G4', d: 1 }, { n: 'E4', d: 3 },
        { n: 'G4', d: 1.5 }, { n: 'A4', d: 0.5 }, { n: 'G4', d: 1 }, { n: 'E4', d: 3 },
        { n: 'D5', d: 2 }, { n: 'D5', d: 1 }, { n: 'B4', d: 3 },
        { n: 'C5', d: 2 }, { n: 'C5', d: 1 }, { n: 'G4', d: 3 },
        { n: 'A4', d: 2 }, { n: 'A4', d: 1 }, { n: 'C5', d: 1.5 }, { n: 'B4', d: 0.5 }, { n: 'A4', d: 1 },
        { n: 'G4', d: 1.5 }, { n: 'A4', d: 0.5 }, { n: 'G4', d: 1 }, { n: 'E4', d: 3 },
        { n: 'D5', d: 2 }, { n: 'D5', d: 1 }, { n: 'F5', d: 1.5 }, { n: 'D5', d: 0.5 }, { n: 'B4', d: 1 },
        { n: 'C5', d: 3 }, { n: 'E5', d: 3 },
        { n: 'C5', d: 1.5 }, { n: 'G4', d: 0.5 }, { n: 'E4', d: 1 },
        { n: 'G4', d: 1.5 }, { n: 'F4', d: 0.5 }, { n: 'D4', d: 1 },
        { n: 'C4', d: 6 }
      ]
    },
    info: {
      shortDescription: 'A quiet carol written for guitar on a Christmas Eve.',
      listenFor: 'The first phrase rocks: up a step, back, then a long low note.',
      whyItMatters: 'Gruber wrote it in 1818 when the church organ was broken. It is meant to stay gentle.',
      guideDialogue: [
        { speaker: 'curious', line: 'It sounds like whispering.' },
        { speaker: 'knowing', line: 'That is the idea. Silent night is a lullaby for a baby in a stable.' }
      ]
    },
    copyright: { status: 'public-domain', verified: true, sourceType: 'public-domain-composition', transcription: 'own-unverified' }
  },
  {
    id: 'o-tannenbaum',
    art: null,
    composerId: 'traditional',
    title: 'O Tannenbaum',
    shortTitle: 'O Tannenbaum',
    alternateTitles: ['O Christmas Tree'],
    year: null,
    importanceLevel: 3,
    featured: true,
    playbackMode: 'full',
    tuneFamilyId: 'o-tannenbaum-family',
    full: {
      tempo: 90,
      verified: false,
      sourceType: 'traditional',
      sourceReference: 'German traditional/historical tune family, complete C-major verse (O Tannenbaum / O Christmas Tree); own transcription',
      notes: [
        { n: 'C4', d: 1 }, { n: 'F4', d: 2 }, { n: 'F4', d: 1 }, { n: 'F4', d: 2 }, { n: 'G4', d: 1 },
        { n: 'A4', d: 2 }, { n: 'A4', d: 1 }, { n: 'A4', d: 3 },
        { n: 'G4', d: 1 }, { n: 'A4', d: 1 }, { n: 'Bb4', d: 1 }, { n: 'E4', d: 2 }, { n: 'G4', d: 1 },
        { n: 'F4', d: 3 },
        { n: 'C5', d: 1 }, { n: 'C5', d: 1 }, { n: 'A4', d: 1 }, { n: 'D5', d: 2 }, { n: 'C5', d: 1 },
        { n: 'C5', d: 1 }, { n: 'Bb4', d: 1 }, { n: 'Bb4', d: 3 },
        { n: 'Bb4', d: 1 }, { n: 'Bb4', d: 1 }, { n: 'G4', d: 1 }, { n: 'C5', d: 2 }, { n: 'Bb4', d: 1 },
        { n: 'Bb4', d: 1 }, { n: 'A4', d: 1 }, { n: 'A4', d: 3 },
        { n: 'C4', d: 1 }, { n: 'F4', d: 2 }, { n: 'F4', d: 1 }, { n: 'F4', d: 2 }, { n: 'G4', d: 1 },
        { n: 'A4', d: 2 }, { n: 'A4', d: 1 }, { n: 'A4', d: 3 },
        { n: 'G4', d: 1 }, { n: 'A4', d: 1 }, { n: 'Bb4', d: 1 }, { n: 'E4', d: 2 }, { n: 'G4', d: 1 },
        { n: 'F4', d: 3 }
      ]
    },
    info: {
      shortDescription: 'A German song to a fir tree that stays green all winter.',
      listenFor: 'The first line climbs and holds. The middle line answers higher up.',
      whyItMatters: 'O Christmas Tree is this same German tune. The tree is praised for keeping its needles.',
      guideDialogue: [
        { speaker: 'curious', line: 'Tannenbaum means Christmas tree?' },
        { speaker: 'knowing', line: 'It means fir tree. People sang it to the tree long before it stood in a sitting room.' }
      ]
    },
    copyright: { status: 'public-domain', verified: true, sourceType: 'traditional', transcription: 'own-unverified' }
  },
  {
    id: 'deck-the-hall',
    art: null,
    composerId: 'traditional',
    title: 'Deck the Hall',
    alternateTitles: ['Nos Galan'],
    year: null,
    importanceLevel: 3,
    featured: true,
    playbackMode: 'full',
    tuneFamilyId: 'deck-the-hall-family',
    full: {
      tempo: 112,
      verified: false,
      sourceType: 'traditional',
      sourceReference: 'Welsh tune Nos Galan / Deck the Hall, complete C-major verse with fa-la-la refrain; own transcription, not a later pop carol',
      notes: [
        { n: 'C5', d: 1 }, { n: 'B4', d: 0.5 }, { n: 'A4', d: 0.5 }, { n: 'G4', d: 1 }, { n: 'F4', d: 1 },
        { n: 'E4', d: 1 }, { n: 'D4', d: 1 }, { n: 'C4', d: 1 }, { n: 'G4', d: 1 },
        { n: 'A4', d: 1 }, { n: 'A4', d: 1 }, { n: 'B4', d: 1 }, { n: 'B4', d: 1 }, { n: 'C5', d: 2 },
        { n: 'C5', d: 1 }, { n: 'B4', d: 0.5 }, { n: 'A4', d: 0.5 }, { n: 'G4', d: 1 }, { n: 'F4', d: 1 },
        { n: 'E4', d: 1 }, { n: 'D4', d: 1 }, { n: 'C4', d: 1 }, { n: 'G4', d: 1 },
        { n: 'A4', d: 1 }, { n: 'A4', d: 1 }, { n: 'B4', d: 1 }, { n: 'B4', d: 1 }, { n: 'C5', d: 2 },
        { n: 'G4', d: 1 }, { n: 'G4', d: 1 }, { n: 'G4', d: 0.5 }, { n: 'G4', d: 0.5 }, { n: 'G4', d: 0.5 }, { n: 'G4', d: 0.5 },
        { n: 'G4', d: 0.5 }, { n: 'A4', d: 0.5 }, { n: 'B4', d: 0.5 }, { n: 'C5', d: 0.5 }, { n: 'G4', d: 1 }, { n: 'E4', d: 1 }, { n: 'C4', d: 1 },
        { n: 'C5', d: 1 }, { n: 'B4', d: 0.5 }, { n: 'A4', d: 0.5 }, { n: 'G4', d: 1 }, { n: 'F4', d: 1 },
        { n: 'E4', d: 1 }, { n: 'D4', d: 1 }, { n: 'C4', d: 1 }, { n: 'G4', d: 1 },
        { n: 'A4', d: 1 }, { n: 'A4', d: 1 }, { n: 'B4', d: 1 }, { n: 'B4', d: 1 }, { n: 'C5', d: 2 }
      ]
    },
    info: {
      shortDescription: 'A Welsh New Year tune that became a hall-decorating carol.',
      listenFor: 'Fa-la-la is a quick run of the same note, then a skip.',
      whyItMatters: 'The old Welsh name is Nos Galan. The English words came later. The tune is the same.',
      guideDialogue: [
        { speaker: 'curious', line: 'The fa-la-la bit is the fun part.' },
        { speaker: 'knowing', line: 'That is the refrain. The story words walk; the fa-la-la dances.' }
      ]
    },
    copyright: { status: 'public-domain', verified: true, sourceType: 'traditional', transcription: 'own-unverified' }
  },
  {
    id: 'we-wish-merry-christmas',
    art: null,
    composerId: 'traditional',
    title: 'We Wish You a Merry Christmas',
    shortTitle: 'We Wish You a Merry Christmas',
    alternateTitles: [],
    year: null,
    importanceLevel: 3,
    featured: true,
    playbackMode: 'full',
    tuneFamilyId: 'we-wish-merry-christmas-family',
    full: {
      tempo: 108,
      verified: false,
      sourceType: 'traditional',
      sourceReference: 'English traditional song, complete C-major verse (wish plus happy new year); own transcription',
      notes: [
        { n: 'D4', d: 1 },
        { n: 'G4', d: 1 }, { n: 'G4', d: 0.5 }, { n: 'A4', d: 0.5 }, { n: 'G4', d: 0.5 }, { n: 'F#4', d: 0.5 },
        { n: 'E4', d: 1 }, { n: 'E4', d: 1 },
        { n: 'E4', d: 1 }, { n: 'A4', d: 1 }, { n: 'A4', d: 0.5 }, { n: 'B4', d: 0.5 }, { n: 'A4', d: 0.5 }, { n: 'G4', d: 0.5 },
        { n: 'F#4', d: 1 }, { n: 'D4', d: 1 },
        { n: 'D4', d: 1 }, { n: 'B4', d: 1 }, { n: 'B4', d: 0.5 }, { n: 'C5', d: 0.5 }, { n: 'B4', d: 0.5 }, { n: 'A4', d: 0.5 },
        { n: 'G4', d: 1 }, { n: 'E4', d: 1 }, { n: 'D4', d: 0.5 }, { n: 'D4', d: 0.5 },
        { n: 'E4', d: 1 }, { n: 'A4', d: 1 }, { n: 'F#4', d: 1 }, { n: 'G4', d: 2 }
      ]
    },
    info: {
      shortDescription: 'A visiting song: we wish you well, and we will not leave yet.',
      listenFor: 'Each greeting climbs a little, then the last line lands on a long G.',
      whyItMatters: 'Later verses ask for figgy pudding. The first verse is the whole tune.',
      guideDialogue: [
        { speaker: 'curious', line: 'Why won\'t they go until they get some?' },
        { speaker: 'knowing', line: 'It is a joke from when singers went door to door and hoped for a treat.' }
      ]
    },
    copyright: { status: 'public-domain', verified: true, sourceType: 'traditional', transcription: 'own-unverified' }
  },
  {
    id: 'first-noel',
    art: null,
    composerId: 'traditional',
    title: 'The First Noel',
    shortTitle: 'The First Noel',
    alternateTitles: [],
    year: null,
    importanceLevel: 2,
    featured: false,
    playbackMode: 'full',
    tuneFamilyId: 'first-noel-family',
    full: {
      tempo: 84,
      verified: false,
      sourceType: 'traditional',
      sourceReference: 'English traditional carol, first stanza plus Noel refrain in C major, 3/4; own transcription',
      notes: [
        { n: 'E4', d: 1 }, { n: 'D4', d: 1 }, { n: 'C4', d: 1 },
        { n: 'D4', d: 1 }, { n: 'E4', d: 1 }, { n: 'F4', d: 1 },
        { n: 'G4', d: 2 }, { n: 'A4', d: 1 },
        { n: 'B4', d: 1 }, { n: 'A4', d: 1 }, { n: 'G4', d: 1 },
        { n: 'F4', d: 1 }, { n: 'E4', d: 1 }, { n: 'D4', d: 1 },
        { n: 'C4', d: 2 }, { n: 'D4', d: 1 },
        { n: 'E4', d: 1 }, { n: 'F4', d: 1 }, { n: 'G4', d: 1 },
        { n: 'A4', d: 1 }, { n: 'B4', d: 1 }, { n: 'C5', d: 1 },
        { n: 'B4', d: 2 }, { n: 'A4', d: 1 },
        { n: 'G4', d: 3 },
        { n: 'G4', d: 2 }, { n: 'C5', d: 1 },
        { n: 'B4', d: 2 }, { n: 'A4', d: 1 },
        { n: 'G4', d: 2 }, { n: 'A4', d: 1 },
        { n: 'B4', d: 2 }, { n: 'C5', d: 1 },
        { n: 'B4', d: 2 }, { n: 'A4', d: 1 },
        { n: 'G4', d: 3 },
        { n: 'A4', d: 2 }, { n: 'G4', d: 1 },
        { n: 'F4', d: 2 }, { n: 'E4', d: 1 },
        { n: 'D4', d: 2 }, { n: 'C4', d: 1 },
        { n: 'D4', d: 1 }, { n: 'E4', d: 1 }, { n: 'F4', d: 1 },
        { n: 'G4', d: 3 }
      ]
    },
    info: {
      shortDescription: 'An English shepherd carol whose refrain is only the word Noel.',
      listenFor: 'The verse walks up and down. Noel repeats the climb, higher.',
      whyItMatters: 'Noel is an old word for Christmas. The refrain is the news being called out.',
      guideDialogue: [
        { speaker: 'curious', line: 'Why do they keep singing Noel?' },
        { speaker: 'knowing', line: 'It is the announcement. The story is in the verse; the news is in the refrain.' }
      ]
    },
    copyright: { status: 'public-domain', verified: true, sourceType: 'traditional', transcription: 'own-unverified' }
  },
  {
    id: 'joy-to-world',
    art: null,
    composerId: 'traditional',
    title: 'Joy to the World',
    alternateTitles: [],
    year: 1839,
    importanceLevel: 3,
    featured: true,
    playbackMode: 'full',
    tuneFamilyId: 'joy-to-world-family',
    full: {
      tempo: 100,
      verified: false,
      sourceType: 'public-domain-score',
      sourceReference: 'Lowell Mason, Antioch, setting of Isaac Watts (1839), first stanza in C major; own transcription, not a later praise-band arrangement',
      notes: [
        { n: 'C5', d: 1 }, { n: 'B4', d: 1 }, { n: 'A4', d: 1 }, { n: 'G4', d: 2 }, { n: 'F4', d: 1 },
        { n: 'E4', d: 1 }, { n: 'D4', d: 1 }, { n: 'C4', d: 2 },
        { n: 'G4', d: 1 }, { n: 'A4', d: 1 }, { n: 'A4', d: 1 }, { n: 'B4', d: 1 }, { n: 'B4', d: 1 }, { n: 'C5', d: 2 },
        { n: 'C5', d: 0.5 }, { n: 'C5', d: 0.5 }, { n: 'B4', d: 0.5 }, { n: 'A4', d: 0.5 },
        { n: 'G4', d: 1 }, { n: 'G4', d: 0.5 }, { n: 'F4', d: 0.5 }, { n: 'E4', d: 1 },
        { n: 'C5', d: 0.5 }, { n: 'C5', d: 0.5 }, { n: 'B4', d: 0.5 }, { n: 'A4', d: 0.5 },
        { n: 'G4', d: 1 }, { n: 'G4', d: 0.5 }, { n: 'F4', d: 0.5 }, { n: 'E4', d: 1 },
        { n: 'E4', d: 1 }, { n: 'E4', d: 1 }, { n: 'E4', d: 1 }, { n: 'E4', d: 0.5 }, { n: 'F4', d: 0.5 }, { n: 'G4', d: 2 },
        { n: null, d: 0.5 }, { n: 'F4', d: 0.5 }, { n: 'E4', d: 1 }, { n: 'D4', d: 1 }, { n: 'C4', d: 1 },
        { n: 'C5', d: 1 }, { n: 'G4', d: 1 }, { n: 'A4', d: 1 }, { n: 'B4', d: 1 }, { n: 'C5', d: 2 }
      ]
    },
    info: {
      shortDescription: 'A joyful hymn that starts by walking down a scale.',
      listenFor: 'The first eight notes are a staircase going down. Then heaven and nature sing repeats a little pattern.',
      whyItMatters: 'Watts wrote the words. Mason made the tune people sing now, called Antioch.',
      guideDialogue: [
        { speaker: 'curious', line: 'It feels like running down stairs.' },
        { speaker: 'knowing', line: 'That opening scale is the joy. The repeats at the end are everyone joining in.' }
      ]
    },
    copyright: { status: 'public-domain', verified: true, sourceType: 'public-domain-composition', transcription: 'own-unverified' }
  },
  {
    id: 'auld-lang-syne',
    art: null,
    composerId: 'traditional',
    title: 'Auld Lang Syne',
    alternateTitles: [],
    year: null,
    importanceLevel: 3,
    featured: true,
    playbackMode: 'full',
    tuneFamilyId: 'auld-lang-syne-family',
    full: {
      tempo: 84,
      verified: false,
      sourceType: 'traditional',
      sourceReference: 'Scottish traditional/historical tune family, complete F-major verse plus For auld lang syne chorus; own transcription, not a pop New Year arrangement',
      notes: [
        { n: 'C4', d: 1 }, { n: 'F4', d: 1 }, { n: 'F4', d: 1 }, { n: 'F4', d: 1 }, { n: 'A4', d: 1 },
        { n: 'G4', d: 1 }, { n: 'F4', d: 1 }, { n: 'G4', d: 1 }, { n: 'A4', d: 1 }, { n: 'F4', d: 1 }, { n: 'A4', d: 1 }, { n: 'C5', d: 2 },
        { n: 'D5', d: 1 }, { n: 'D5', d: 1 }, { n: 'C5', d: 1 }, { n: 'A4', d: 1 }, { n: 'A4', d: 1 }, { n: 'F4', d: 1 },
        { n: 'G4', d: 1 }, { n: 'F4', d: 1 }, { n: 'D4', d: 1 }, { n: 'D4', d: 1 }, { n: 'C4', d: 2 },
        { n: 'C4', d: 1 }, { n: 'F4', d: 1 }, { n: 'F4', d: 1 }, { n: 'F4', d: 1 }, { n: 'A4', d: 1 },
        { n: 'G4', d: 1 }, { n: 'F4', d: 1 }, { n: 'G4', d: 1 }, { n: 'A4', d: 1 }, { n: 'F4', d: 1 }, { n: 'A4', d: 1 }, { n: 'C5', d: 2 },
        { n: 'D5', d: 1 }, { n: 'D5', d: 1 }, { n: 'C5', d: 1 }, { n: 'A4', d: 1 }, { n: 'A4', d: 1 }, { n: 'F4', d: 1 },
        { n: 'G4', d: 1 }, { n: 'A4', d: 1 }, { n: 'G4', d: 1 }, { n: 'F4', d: 3 },
        { n: 'D5', d: 1 }, { n: 'D5', d: 1 }, { n: 'C5', d: 1 }, { n: 'A4', d: 1 }, { n: 'A4', d: 1 }, { n: 'F4', d: 1 },
        { n: 'G4', d: 1 }, { n: 'F4', d: 1 }, { n: 'G4', d: 1 }, { n: 'A4', d: 1 }, { n: 'F4', d: 1 }, { n: 'A4', d: 1 }, { n: 'C5', d: 2 },
        { n: 'D5', d: 1 }, { n: 'D5', d: 1 }, { n: 'C5', d: 1 }, { n: 'A4', d: 1 }, { n: 'A4', d: 1 }, { n: 'F4', d: 1 },
        { n: 'G4', d: 1 }, { n: 'A4', d: 1 }, { n: 'G4', d: 1 }, { n: 'F4', d: 3 }
      ]
    },
    info: {
      shortDescription: 'A Scottish song for remembering old friends at the turn of the year.',
      listenFor: 'The tune is pentatonic — it skips some notes, which is why it feels open and old.',
      whyItMatters: 'Auld lang syne means old long since: times gone by. People hold hands and sing it when a year ends.',
      guideDialogue: [
        { speaker: 'curious', line: 'The words are hard to say.' },
        { speaker: 'knowing', line: 'They are Scots. The meaning is: should old friends be forgotten? The song says no.' }
      ]
    },
    copyright: { status: 'public-domain', verified: true, sourceType: 'traditional', transcription: 'own-unverified' }
  },
  {
    id: 'sakura-sakura',
    art: null,
    composerId: 'traditional',
    title: 'Sakura Sakura',
    shortTitle: 'Sakura',
    alternateTitles: [],
    year: null,
    importanceLevel: 3,
    featured: true,
    playbackMode: 'full',
    tuneFamilyId: 'sakura-sakura-family',
    full: {
      tempo: 72,
      verified: false,
      sourceType: 'traditional',
      sourceReference: 'Japanese traditional sakura melody, in-scale pentatonic in A, one complete verse; own transcription of the familiar school version',
      notes: [
        { n: 'A4', d: 1 }, { n: 'A4', d: 1 }, { n: 'A4', d: 1.5 }, { n: 'F4', d: 0.5 }, { n: 'E4', d: 1 },
        { n: 'F4', d: 1 }, { n: 'A4', d: 1.5 }, { n: 'F4', d: 0.5 }, { n: 'E4', d: 2 },
        { n: 'E4', d: 1 }, { n: 'F4', d: 1 }, { n: 'A4', d: 1 }, { n: 'B4', d: 1 }, { n: 'C5', d: 2 },
        { n: 'B4', d: 1 }, { n: 'A4', d: 1 }, { n: 'F4', d: 1 }, { n: 'E4', d: 2 },
        { n: 'A4', d: 1 }, { n: 'A4', d: 1 }, { n: 'A4', d: 1.5 }, { n: 'F4', d: 0.5 }, { n: 'E4', d: 1 },
        { n: 'F4', d: 1 }, { n: 'A4', d: 1.5 }, { n: 'F4', d: 0.5 }, { n: 'E4', d: 2 }
      ]
    },
    info: {
      shortDescription: 'A Japanese song about cherry blossoms.',
      listenFor: 'Only a few notes, close together. It never hurries, like petals falling.',
      whyItMatters: 'Sakura means cherry blossom. The tune uses a Japanese pentatonic scale, so some steps we expect in Western songs are missing.',
      guideDialogue: [
        { speaker: 'curious', line: 'It feels like it is floating.' },
        { speaker: 'knowing', line: 'The missing notes are why. The scale has five steps, not seven.' }
      ]
    },
    copyright: { status: 'public-domain', verified: true, sourceType: 'traditional', transcription: 'own-unverified' }
  },
  {
    id: 'arirang',
    art: null,
    composerId: 'traditional',
    title: 'Arirang',
    alternateTitles: [],
    year: null,
    importanceLevel: 3,
    featured: true,
    playbackMode: 'full',
    tuneFamilyId: 'arirang-family',
    full: {
      tempo: 76,
      verified: false,
      sourceType: 'traditional',
      sourceReference: 'Named variant: Gyeonggi (standard) Arirang, C-major pentatonic verse; own transcription. Not Jindo or Jeongseon Arirang.',
      notes: [
        { n: 'G4', d: 1 }, { n: 'A4', d: 1 }, { n: 'C5', d: 2 },
        { n: 'D5', d: 1 }, { n: 'E5', d: 1 }, { n: 'D5', d: 2 },
        { n: 'C5', d: 1 }, { n: 'A4', d: 1 }, { n: 'G4', d: 2 },
        { n: 'A4', d: 1 }, { n: 'C5', d: 1 }, { n: 'D5', d: 2 },
        { n: 'C5', d: 1 }, { n: 'A4', d: 1 }, { n: 'G4', d: 2 },
        { n: 'G4', d: 1 }, { n: 'A4', d: 1 }, { n: 'C5', d: 2 },
        { n: 'D5', d: 1 }, { n: 'E5', d: 1 }, { n: 'D5', d: 2 },
        { n: 'C5', d: 1 }, { n: 'A4', d: 1 }, { n: 'G4', d: 3 }
      ]
    },
    info: {
      shortDescription: 'A Korean folk song about a pass in the hills.',
      listenFor: 'The line rises over the pass, then walks back down.',
      whyItMatters: 'There are many Arirangs. This one is the Gyeonggi song most people outside Korea hear first. Other regions sing different tunes with the same name.',
      guideDialogue: [
        { speaker: 'curious', line: 'What is an arirang?' },
        { speaker: 'knowing', line: 'A mountain pass. The singer is saying goodbye and walking over it.' }
      ]
    },
    copyright: { status: 'public-domain', verified: true, sourceType: 'traditional', transcription: 'own-unverified' }
  },
  {
    id: 'mo-li-hua',
    art: null,
    composerId: 'traditional',
    title: 'Mo Li Hua',
    shortTitle: 'Mo Li Hua',
    alternateTitles: ['Jasmine Flower'],
    year: null,
    importanceLevel: 3,
    featured: true,
    playbackMode: 'full',
    tuneFamilyId: 'mo-li-hua-family',
    full: {
      tempo: 80,
      verified: false,
      sourceType: 'traditional',
      sourceReference: 'Chinese traditional Mo Li Hua (Jiangsu folk version commonly taught), pentatonic in C, complete first stanza; own transcription',
      notes: [
        { n: 'E4', d: 1 }, { n: 'G4', d: 1 }, { n: 'A4', d: 1.5 }, { n: 'C5', d: 0.5 },
        { n: 'A4', d: 1 }, { n: 'G4', d: 1 }, { n: 'E4', d: 1 }, { n: 'G4', d: 1 },
        { n: 'A4', d: 1 }, { n: 'G4', d: 1 }, { n: 'E4', d: 1 }, { n: 'D4', d: 1 }, { n: 'E4', d: 2 },
        { n: 'G4', d: 1 }, { n: 'A4', d: 1 }, { n: 'C5', d: 1.5 }, { n: 'D5', d: 0.5 },
        { n: 'C5', d: 1 }, { n: 'A4', d: 1 }, { n: 'G4', d: 2 },
        { n: 'E4', d: 1 }, { n: 'G4', d: 1 }, { n: 'A4', d: 1 }, { n: 'G4', d: 1 },
        { n: 'E4', d: 1 }, { n: 'D4', d: 1 }, { n: 'C4', d: 2 }
      ]
    },
    info: {
      shortDescription: 'A Chinese song comparing a person to a jasmine flower.',
      listenFor: 'The melody uses five notes. It climbs to the flower, then settles.',
      whyItMatters: 'Mo li hua means jasmine flower. It is one of the Chinese folk songs most often taught to children.',
      guideDialogue: [
        { speaker: 'curious', line: 'It smells like a garden even without words.' },
        { speaker: 'knowing', line: 'The song is a compliment. The flower stands for someone gentle and bright.' }
      ]
    },
    copyright: { status: 'public-domain', verified: true, sourceType: 'traditional', transcription: 'own-unverified' }
  },
  {
    id: 'rasa-sayang',
    art: null,
    composerId: 'traditional',
    title: 'Rasa Sayang',
    alternateTitles: [],
    year: null,
    importanceLevel: 2,
    featured: false,
    playbackMode: 'full',
    tuneFamilyId: 'rasa-sayang-family',
    full: {
      tempo: 108,
      verified: false,
      sourceType: 'traditional',
      sourceReference: 'Malay Archipelago traditional song, complete C-major refrain; own transcription of the familiar playground version',
      notes: [
        { n: 'G4', d: 1 }, { n: 'E4', d: 1 }, { n: 'G4', d: 1 }, { n: 'A4', d: 1 },
        { n: 'G4', d: 1 }, { n: 'E4', d: 1 }, { n: 'C4', d: 2 },
        { n: 'D4', d: 1 }, { n: 'E4', d: 1 }, { n: 'D4', d: 1 }, { n: 'C4', d: 1 },
        { n: 'D4', d: 1 }, { n: 'E4', d: 1 }, { n: 'G4', d: 2 },
        { n: 'G4', d: 1 }, { n: 'E4', d: 1 }, { n: 'G4', d: 1 }, { n: 'A4', d: 1 },
        { n: 'G4', d: 1 }, { n: 'E4', d: 1 }, { n: 'C4', d: 2 },
        { n: 'D4', d: 1 }, { n: 'E4', d: 1 }, { n: 'D4', d: 1 }, { n: 'C4', d: 1 },
        { n: 'A3', d: 1 }, { n: 'G3', d: 1 }, { n: 'C4', d: 2 }
      ]
    },
    info: {
      shortDescription: 'A Malay song whose title means a feeling of fondness.',
      listenFor: 'A little skip up, then a walk down home.',
      whyItMatters: 'Children sing it across Malaysia, Indonesia, and Singapore. The refrain is the whole engine; verses change the story.',
      guideDialogue: [
        { speaker: 'curious', line: 'It feels like clapping.' },
        { speaker: 'knowing', line: 'It is often a circle game. The notes bounce so the feet can bounce too.' }
      ]
    },
    copyright: { status: 'public-domain', verified: true, sourceType: 'traditional', transcription: 'own-unverified' }
  },
  {
    id: 'burung-kakak-tua',
    art: null,
    composerId: 'traditional',
    title: 'Burung Kakak Tua',
    shortTitle: 'Burung Kakak Tua',
    alternateTitles: [],
    year: null,
    importanceLevel: 2,
    featured: false,
    playbackMode: 'full',
    tuneFamilyId: 'burung-kakak-tua-family',
    full: {
      tempo: 100,
      verified: false,
      sourceType: 'traditional',
      sourceReference: 'Indonesian/Maluku traditional children\'s song, complete C-major verse; own transcription',
      notes: [
        { n: 'G4', d: 1 }, { n: 'E4', d: 1 }, { n: 'C4', d: 1 }, { n: 'G4', d: 1 },
        { n: 'E4', d: 1 }, { n: 'C4', d: 1 }, { n: 'D4', d: 1 }, { n: 'E4', d: 1 },
        { n: 'D4', d: 1 }, { n: 'C4', d: 2 },
        { n: 'G4', d: 1 }, { n: 'E4', d: 1 }, { n: 'C4', d: 1 }, { n: 'G4', d: 1 },
        { n: 'E4', d: 1 }, { n: 'C4', d: 1 }, { n: 'D4', d: 1 }, { n: 'E4', d: 1 },
        { n: 'D4', d: 1 }, { n: 'C4', d: 2 },
        { n: 'C4', d: 1 }, { n: 'D4', d: 1 }, { n: 'E4', d: 1 }, { n: 'G4', d: 1 },
        { n: 'A4', d: 1 }, { n: 'G4', d: 1 }, { n: 'E4', d: 1 }, { n: 'C4', d: 1 },
        { n: 'D4', d: 1 }, { n: 'E4', d: 1 }, { n: 'D4', d: 1 }, { n: 'C4', d: 2 }
      ]
    },
    info: {
      shortDescription: 'An Indonesian song about a cockatoo that can say hello.',
      listenFor: 'The bird-name part hops down: high, middle, low, then the same hop again.',
      whyItMatters: 'Kakak tua is a cockatoo. Children copy the bird as they sing.',
      guideDialogue: [
        { speaker: 'curious', line: 'Can a bird really talk in the song?' },
        { speaker: 'knowing', line: 'The cockatoo is famous for copying people. The song is playing with that.' }
      ]
    },
    copyright: { status: 'public-domain', verified: true, sourceType: 'traditional', transcription: 'own-unverified' }
  },
  {
    id: 'leron-leron-sinta',
    art: null,
    composerId: 'traditional',
    title: 'Leron, Leron Sinta',
    shortTitle: 'Leron Leron Sinta',
    alternateTitles: [],
    year: null,
    importanceLevel: 2,
    featured: false,
    playbackMode: 'full',
    tuneFamilyId: 'leron-leron-sinta-family',
    full: {
      tempo: 112,
      verified: false,
      sourceType: 'traditional',
      sourceReference: 'Filipino traditional song, complete C-major verse; own transcription of the familiar school melody',
      notes: [
        { n: 'G4', d: 1 }, { n: 'G4', d: 1 }, { n: 'G4', d: 1 }, { n: 'E4', d: 1 },
        { n: 'G4', d: 1 }, { n: 'A4', d: 1 }, { n: 'G4', d: 1 }, { n: 'E4', d: 1 },
        { n: 'D4', d: 1 }, { n: 'D4', d: 1 }, { n: 'E4', d: 1 }, { n: 'D4', d: 1 },
        { n: 'B3', d: 1 }, { n: 'C4', d: 2 },
        { n: 'G4', d: 1 }, { n: 'G4', d: 1 }, { n: 'G4', d: 1 }, { n: 'E4', d: 1 },
        { n: 'G4', d: 1 }, { n: 'A4', d: 1 }, { n: 'G4', d: 1 }, { n: 'E4', d: 1 },
        { n: 'D4', d: 1 }, { n: 'D4', d: 1 }, { n: 'E4', d: 1 }, { n: 'D4', d: 1 },
        { n: 'B3', d: 1 }, { n: 'C4', d: 2 }
      ]
    },
    info: {
      shortDescription: 'A Filipino harvesting song that turns into a love joke.',
      listenFor: 'Leron, Leron sits on one note three times, then drops.',
      whyItMatters: 'Sinta means sweetheart. The singer is up a papaya tree, and the branch is not as strong as the song hopes.',
      guideDialogue: [
        { speaker: 'curious', line: 'Did Leron fall?' },
        { speaker: 'knowing', line: 'In the song the branch breaks. That is the joke. The tune stays cheerful anyway.' }
      ]
    },
    copyright: { status: 'public-domain', verified: true, sourceType: 'traditional', transcription: 'own-unverified' }
  },
  {
    id: 'lao-duang-duen',
    art: null,
    composerId: 'traditional',
    title: 'Lao Duang Duen',
    shortTitle: 'Lao Duang Duen',
    alternateTitles: [],
    year: null,
    importanceLevel: 3,
    featured: true,
    playbackMode: 'full',
    tuneFamilyId: 'lao-duang-duen-family',
    full: {
      tempo: 72,
      verified: false,
      sourceType: 'traditional',
      sourceReference: 'Own simplified pentatonic reduction of the well-known Lao Duang Duen contour (Prince Benbadhanabongse / Thai classical song tradition). Not a contemporary pop arrangement. Authoritative Thai source check still owed.',
      notes: [
        { n: 'E4', d: 1 }, { n: 'G4', d: 1 }, { n: 'A4', d: 1.5 }, { n: 'C5', d: 0.5 },
        { n: 'A4', d: 1 }, { n: 'G4', d: 1 }, { n: 'E4', d: 2 },
        { n: 'G4', d: 1 }, { n: 'A4', d: 1 }, { n: 'C5', d: 1 }, { n: 'D5', d: 1 },
        { n: 'C5', d: 1 }, { n: 'A4', d: 1 }, { n: 'G4', d: 2 },
        { n: 'E4', d: 1 }, { n: 'G4', d: 1 }, { n: 'A4', d: 1 }, { n: 'G4', d: 1 },
        { n: 'E4', d: 1 }, { n: 'D4', d: 1 }, { n: 'C4', d: 2 },
        { n: 'E4', d: 1 }, { n: 'G4', d: 1 }, { n: 'A4', d: 1.5 }, { n: 'C5', d: 0.5 },
        { n: 'A4', d: 1 }, { n: 'G4', d: 1 }, { n: 'E4', d: 2 }
      ]
    },
    info: {
      shortDescription: 'A Thai song whose title names the moon.',
      listenFor: 'The line floats up to the moon, then drifts down. The steps are pentatonic.',
      whyItMatters: 'Duang duen is the moon. This is a simplified outline of a court song, waiting to be checked against a proper Thai source.',
      guideDialogue: [
        { speaker: 'curious', line: 'It feels close to the cherry-blossom song.' },
        { speaker: 'knowing', line: 'Both use five-note scales. The moon song is from Thailand; the cherry song is from Japan.' }
      ]
    },
    copyright: { status: 'public-domain', verified: true, sourceType: 'traditional', transcription: 'own-unverified' }
  },
  {
    id: 'raghupati-raghava',
    art: null,
    composerId: 'traditional',
    title: 'Raghupati Raghava Raja Ram',
    shortTitle: 'Raghupati Raghava',
    alternateTitles: [],
    year: null,
    importanceLevel: 2,
    featured: false,
    playbackMode: 'full',
    tuneFamilyId: 'raghupati-raghava-family',
    full: {
      tempo: 84,
      verified: false,
      sourceType: 'traditional',
      sourceReference: 'Indian devotional song tradition, complete C-major first stanza of the familiar bhajan; own transcription, not a film arrangement',
      notes: [
        { n: 'C4', d: 1 }, { n: 'D4', d: 1 }, { n: 'E4', d: 1 }, { n: 'F4', d: 1 },
        { n: 'E4', d: 1 }, { n: 'D4', d: 1 }, { n: 'C4', d: 2 },
        { n: 'D4', d: 1 }, { n: 'E4', d: 1 }, { n: 'D4', d: 1 }, { n: 'C4', d: 1 },
        { n: 'A3', d: 1 }, { n: 'G3', d: 2 },
        { n: 'G3', d: 1 }, { n: 'A3', d: 1 }, { n: 'C4', d: 1 }, { n: 'D4', d: 1 },
        { n: 'E4', d: 1 }, { n: 'D4', d: 1 }, { n: 'C4', d: 2 },
        { n: 'C4', d: 1 }, { n: 'D4', d: 1 }, { n: 'E4', d: 1 }, { n: 'F4', d: 1 },
        { n: 'E4', d: 1 }, { n: 'D4', d: 1 }, { n: 'C4', d: 2 }
      ]
    },
    info: {
      shortDescription: 'An Indian bhajan, a singing prayer, with a walking tune.',
      listenFor: 'The names climb four steps and come back down. It is easy to join.',
      whyItMatters: 'People have sung it in gatherings and on long walks. The first stanza is the whole machine.',
      guideDialogue: [
        { speaker: 'curious', line: 'It feels like walking.' },
        { speaker: 'knowing', line: 'Bhajans are often sung while walking. The steps in the tune match the steps of the feet.' }
      ]
    },
    copyright: { status: 'public-domain', verified: true, sourceType: 'traditional', transcription: 'own-unverified' }
  },
  {
    id: 'uskudara-gider-iken',
    art: null,
    composerId: 'traditional',
    title: 'Üsküdar\'a Gider İken',
    shortTitle: 'Kâtibim',
    alternateTitles: ['Kâtibim'],
    year: null,
    importanceLevel: 2,
    featured: false,
    playbackMode: 'full',
    tuneFamilyId: 'katibim-family',
    full: {
      tempo: 100,
      verified: false,
      sourceType: 'traditional',
      sourceReference: 'Ottoman/Türkiye traditional urban song (Kâtibim), complete familiar C-minor/Aeolian verse; own transcription',
      notes: [
        { n: 'G4', d: 1 }, { n: 'A4', d: 1 }, { n: 'Bb4', d: 1 }, { n: 'C5', d: 1 },
        { n: 'D5', d: 1 }, { n: 'C5', d: 1 }, { n: 'Bb4', d: 1 }, { n: 'A4', d: 1 },
        { n: 'G4', d: 2 },
        { n: 'G4', d: 1 }, { n: 'A4', d: 1 }, { n: 'Bb4', d: 1 }, { n: 'A4', d: 1 },
        { n: 'G4', d: 1 }, { n: 'F4', d: 1 }, { n: 'E4', d: 1 }, { n: 'D4', d: 1 },
        { n: 'C4', d: 2 },
        { n: 'C4', d: 1 }, { n: 'D4', d: 1 }, { n: 'Eb4', d: 1 }, { n: 'F4', d: 1 },
        { n: 'G4', d: 1 }, { n: 'F4', d: 1 }, { n: 'Eb4', d: 1 }, { n: 'D4', d: 1 },
        { n: 'C4', d: 2 }
      ]
    },
    info: {
      shortDescription: 'A Turkish city song about a clerk on the way to Üsküdar.',
      listenFor: 'The tune walks up the street, then comes back down the same stairs.',
      whyItMatters: 'Kâtibim means my clerk. Üsküdar is a district of Istanbul. It is a street song, not a hymn.',
      guideDialogue: [
        { speaker: 'curious', line: 'Is the clerk in a hurry?' },
        { speaker: 'knowing', line: 'The story is a little teasing. The notes stroll, they do not run.' }
      ]
    },
    copyright: { status: 'public-domain', verified: true, sourceType: 'traditional', transcription: 'own-unverified' }
  },
  {
    id: 'hava-nagila',
    art: null,
    composerId: 'traditional',
    title: 'Hava Nagila',
    alternateTitles: [],
    year: null,
    importanceLevel: 3,
    featured: true,
    playbackMode: 'full',
    tuneFamilyId: 'hava-nagila-family',
    full: {
      tempo: 120,
      verified: false,
      sourceType: 'traditional',
      sourceReference: 'Jewish / Eastern European song tradition, D Freygish first two strains of the familiar dance; own transcription, not a later pop chart',
      notes: [
        { n: 'D4', d: 0.5 }, { n: 'D4', d: 0.5 }, { n: 'F4', d: 1 }, { n: 'G4', d: 1 },
        { n: 'Ab4', d: 0.5 }, { n: 'G4', d: 0.5 }, { n: 'F4', d: 1 }, { n: 'D4', d: 2 },
        { n: 'D4', d: 0.5 }, { n: 'D4', d: 0.5 }, { n: 'F4', d: 1 }, { n: 'G4', d: 1 },
        { n: 'Ab4', d: 0.5 }, { n: 'G4', d: 0.5 }, { n: 'F4', d: 1 }, { n: 'D4', d: 2 },
        { n: 'A4', d: 1 }, { n: 'A4', d: 1 }, { n: 'C5', d: 1 }, { n: 'D5', d: 1 },
        { n: 'Eb5', d: 0.5 }, { n: 'D5', d: 0.5 }, { n: 'C5', d: 1 }, { n: 'A4', d: 2 },
        { n: 'A4', d: 1 }, { n: 'A4', d: 1 }, { n: 'C5', d: 1 }, { n: 'D5', d: 1 },
        { n: 'Eb5', d: 0.5 }, { n: 'D5', d: 0.5 }, { n: 'C5', d: 1 }, { n: 'A4', d: 2 },
        { n: 'D4', d: 0.5 }, { n: 'D4', d: 0.5 }, { n: 'F4', d: 1 }, { n: 'G4', d: 1 },
        { n: 'Ab4', d: 0.5 }, { n: 'G4', d: 0.5 }, { n: 'F4', d: 1 }, { n: 'D4', d: 2 }
      ]
    },
    info: {
      shortDescription: 'A Jewish celebration dance whose title means let us rejoice.',
      listenFor: 'The third note of the scale is flattened. That squeeze is the flavour of the dance.',
      whyItMatters: 'It is a hora tune: people hold hands and circle faster as it goes. These are the first two strains, not a DJ mix.',
      guideDialogue: [
        { speaker: 'curious', line: 'That note in the middle feels spicy.' },
        { speaker: 'knowing', line: 'It is a half-step that Western children\'s songs usually skip. The dance leans on it.' }
      ]
    },
    copyright: { status: 'public-domain', verified: true, sourceType: 'traditional', transcription: 'own-unverified' }
  },
  {
    id: 'kalinka',
    art: null,
    composerId: 'traditional',
    title: 'Kalinka',
    alternateTitles: [],
    year: 1860,
    importanceLevel: 3,
    featured: true,
    playbackMode: 'full',
    tuneFamilyId: 'kalinka-family',
    full: {
      tempo: 132,
      verified: false,
      sourceType: 'public-domain-score',
      sourceReference: 'Ivan Larionov, Kalinka (1860), the familiar fast chorus in A minor; own transcription, not a later choir showpiece',
      notes: [
        { n: 'A4', d: 0.5 }, { n: 'A4', d: 0.5 }, { n: 'A4', d: 0.5 }, { n: 'F4', d: 0.5 },
        { n: 'A4', d: 0.5 }, { n: 'B4', d: 0.5 }, { n: 'A4', d: 0.5 }, { n: 'F4', d: 0.5 }, { n: 'E4', d: 1 },
        { n: 'A4', d: 0.5 }, { n: 'A4', d: 0.5 }, { n: 'A4', d: 0.5 }, { n: 'F4', d: 0.5 },
        { n: 'A4', d: 0.5 }, { n: 'B4', d: 0.5 }, { n: 'A4', d: 0.5 }, { n: 'F4', d: 0.5 }, { n: 'E4', d: 1 },
        { n: 'E4', d: 0.5 }, { n: 'F4', d: 0.5 }, { n: 'G4', d: 0.5 }, { n: 'A4', d: 0.5 },
        { n: 'B4', d: 0.5 }, { n: 'A4', d: 0.5 }, { n: 'G4', d: 0.5 }, { n: 'F4', d: 0.5 }, { n: 'E4', d: 1 },
        { n: 'A4', d: 0.5 }, { n: 'A4', d: 0.5 }, { n: 'A4', d: 0.5 }, { n: 'F4', d: 0.5 },
        { n: 'A4', d: 0.5 }, { n: 'B4', d: 0.5 }, { n: 'A4', d: 0.5 }, { n: 'F4', d: 0.5 }, { n: 'E4', d: 1 }
      ]
    },
    info: {
      shortDescription: 'A Russian song named after a little snowball-berry bush.',
      listenFor: 'Kalinka repeats the same snap of notes, faster than a walking song.',
      whyItMatters: 'Larionov wrote it in 1860. The chorus is the part people clap; the slower verse is a different mood.',
      guideDialogue: [
        { speaker: 'curious', line: 'It wants to go faster.' },
        { speaker: 'knowing', line: 'That is the berry-bush chorus. Singers often speed up on purpose.' }
      ]
    },
    copyright: { status: 'public-domain', verified: true, sourceType: 'public-domain-composition', transcription: 'own-unverified' }
  },
  {
    id: 'shchedryk',
    art: null,
    composerId: 'traditional',
    title: 'Shchedryk',
    shortTitle: 'Shchedryk',
    alternateTitles: [],
    year: 1916,
    importanceLevel: 3,
    featured: true,
    playbackMode: 'full',
    tuneFamilyId: 'shchedryk-family',
    full: {
      tempo: 100,
      verified: false,
      sourceType: 'public-domain-score',
      sourceReference: 'Mykola Leontovych, Shchedryk (Ukraine, 1916), soprano/folk line of the original New Year chant in E minor; own transcription. NOT the later English Carol of the Bells arrangement (Wilhousky), whose descending-fourth ostinato is a different piece of writing.',
      notes: [
        { n: 'E4', d: 0.5 }, { n: 'E4', d: 0.5 }, { n: 'E4', d: 0.5 }, { n: 'F#4', d: 0.5 },
        { n: 'G4', d: 0.5 }, { n: 'F#4', d: 0.5 }, { n: 'E4', d: 0.5 }, { n: 'D4', d: 0.5 },
        { n: 'E4', d: 0.5 }, { n: 'F#4', d: 0.5 }, { n: 'D4', d: 1 }, { n: 'B3', d: 1 },
        { n: 'E4', d: 0.5 }, { n: 'E4', d: 0.5 }, { n: 'E4', d: 0.5 }, { n: 'F#4', d: 0.5 },
        { n: 'G4', d: 0.5 }, { n: 'F#4', d: 0.5 }, { n: 'E4', d: 0.5 }, { n: 'D4', d: 0.5 },
        { n: 'E4', d: 0.5 }, { n: 'F#4', d: 0.5 }, { n: 'D4', d: 1 }, { n: 'B3', d: 1 },
        { n: 'C4', d: 0.5 }, { n: 'B3', d: 0.5 }, { n: 'A3', d: 0.5 }, { n: 'G3', d: 0.5 },
        { n: 'A3', d: 0.5 }, { n: 'B3', d: 0.5 }, { n: 'E4', d: 1 },
        { n: 'E4', d: 0.5 }, { n: 'E4', d: 0.5 }, { n: 'E4', d: 0.5 }, { n: 'F#4', d: 0.5 },
        { n: 'G4', d: 0.5 }, { n: 'F#4', d: 0.5 }, { n: 'E4', d: 0.5 }, { n: 'D4', d: 0.5 },
        { n: 'E4', d: 2 }
      ]
    },
    info: {
      shortDescription: 'A Ukrainian New Year song about a swallow bringing good news.',
      listenFor: 'A tiny four-note cell turns around E. It is not the later Christmas song with falling bells.',
      whyItMatters: 'Leontovych wrote Shchedryk in 1916. Carol of the Bells is a later English rewrite with a different ostinato. This book uses the original swallow song.',
      guideDialogue: [
        { speaker: 'curious', line: 'I thought this was the bell carol.' },
        { speaker: 'knowing', line: 'That came later, in another language. This one is a swallow wishing a good year.' }
      ]
    },
    copyright: { status: 'public-domain', verified: true, sourceType: 'public-domain-composition', transcription: 'own-unverified' }
  },
  {
    id: 'nkosi-sikelel-iafrika',
    art: null,
    composerId: 'traditional',
    title: 'Nkosi Sikelel\' iAfrika',
    shortTitle: 'Nkosi Sikelel\' iAfrika',
    alternateTitles: [],
    year: 1897,
    importanceLevel: 3,
    featured: true,
    playbackMode: 'full',
    tuneFamilyId: 'nkosi-sikelel-iafrika-family',
    full: {
      tempo: 80,
      verified: false,
      sourceType: 'public-domain-score',
      sourceReference: 'Enoch Sontonga, Nkosi Sikelel\' iAfrika (1897 hymn), first stanza melody in F; own transcription. Not a later national-anthem orchestration.',
      notes: [
        { n: 'F4', d: 1 }, { n: 'A4', d: 1 }, { n: 'C5', d: 2 },
        { n: 'D5', d: 1 }, { n: 'C5', d: 1 }, { n: 'A4', d: 2 },
        { n: 'F4', d: 1 }, { n: 'G4', d: 1 }, { n: 'A4', d: 2 },
        { n: 'Bb4', d: 1 }, { n: 'A4', d: 1 }, { n: 'G4', d: 2 },
        { n: 'F4', d: 1 }, { n: 'A4', d: 1 }, { n: 'C5', d: 2 },
        { n: 'D5', d: 1 }, { n: 'C5', d: 1 }, { n: 'A4', d: 2 },
        { n: 'G4', d: 1 }, { n: 'A4', d: 1 }, { n: 'F4', d: 3 }
      ]
    },
    info: {
      shortDescription: 'A Southern African hymn asking a blessing on the land.',
      listenFor: 'The prayer rises on three notes, holds, then comes home.',
      whyItMatters: 'Sontonga wrote it in 1897 as a hymn. Later it was used as an anthem. This is the original singing line, not a brass-band version.',
      guideDialogue: [
        { speaker: 'curious', line: 'It sounds like a blessing.' },
        { speaker: 'knowing', line: 'Nkosi sikelel\' means God bless. Afrika is the land the hymn is blessing.' }
      ]
    },
    copyright: { status: 'public-domain', verified: true, sourceType: 'public-domain-composition', transcription: 'own-unverified' }
  },
  {
    id: 'misirlou',
    art: null,
    composerId: 'traditional',
    title: 'Misirlou',
    alternateTitles: [],
    year: null,
    importanceLevel: 3,
    featured: true,
    playbackMode: 'full',
    tuneFamilyId: 'misirlou-family',
    full: {
      tempo: 72,
      verified: false,
      sourceType: 'traditional',
      sourceReference: 'Eastern Mediterranean traditional melody, slow E Phrygian-dominant dance line; own transcription. NOT the later surf-rock arrangement.',
      notes: [
        { n: 'E4', d: 2 }, { n: 'F4', d: 1 }, { n: 'G#4', d: 1 }, { n: 'A4', d: 2 },
        { n: 'B4', d: 1 }, { n: 'A4', d: 1 }, { n: 'G#4', d: 2 }, { n: 'F4', d: 1 }, { n: 'E4', d: 3 },
        { n: 'E4', d: 2 }, { n: 'F4', d: 1 }, { n: 'G#4', d: 1 }, { n: 'A4', d: 2 },
        { n: 'C5', d: 1 }, { n: 'B4', d: 1 }, { n: 'A4', d: 2 }, { n: 'G#4', d: 1 }, { n: 'A4', d: 3 },
        { n: 'B4', d: 1 }, { n: 'C5', d: 1 }, { n: 'B4', d: 1 }, { n: 'A4', d: 1 },
        { n: 'G#4', d: 1 }, { n: 'F4', d: 1 }, { n: 'E4', d: 3 }
      ]
    },
    info: {
      shortDescription: 'A slow Eastern Mediterranean dance with a tight, spicy step in the scale.',
      listenFor: 'After E comes F, then a jump to G-sharp. That squeeze is the old dance, played slowly.',
      whyItMatters: 'A later guitar version made it famous as a fast surf tune. This book uses the older slow melody, not that arrangement.',
      guideDialogue: [
        { speaker: 'curious', line: 'It sounds like it is leaning forward.' },
        { speaker: 'knowing', line: 'The raised note pulls you toward the next step. That is the dance hidden in the scale.' }
      ]
    },
    copyright: { status: 'public-domain', verified: true, sourceType: 'traditional', transcription: 'own-unverified' }
  },
  {
    id: 'waltzing-matilda',
    art: null,
    composerId: 'traditional',
    title: 'Waltzing Matilda',
    shortTitle: 'Waltzing Matilda',
    alternateTitles: [],
    year: 1895,
    importanceLevel: 3,
    featured: true,
    playbackMode: 'full',
    tuneFamilyId: 'waltzing-matilda-family',
    full: {
      tempo: 104,
      verified: false,
      sourceType: 'traditional',
      sourceReference: 'Australian historical song (Paterson / Macpherson lineage), C-major first verse plus Waltzing Matilda chorus; own transcription',
      notes: [
        { n: 'C4', d: 1 }, { n: 'F4', d: 1 }, { n: 'A4', d: 1 }, { n: 'A4', d: 1 },
        { n: 'G4', d: 1 }, { n: 'F4', d: 1 }, { n: 'A4', d: 1 }, { n: 'C5', d: 1 },
        { n: 'D5', d: 1 }, { n: 'C5', d: 1 }, { n: 'A4', d: 1 }, { n: 'F4', d: 1 },
        { n: 'G4', d: 1 }, { n: 'F4', d: 1 }, { n: 'D4', d: 1 }, { n: 'C4', d: 1 },
        { n: 'C4', d: 1 }, { n: 'F4', d: 1 }, { n: 'A4', d: 1 }, { n: 'A4', d: 1 },
        { n: 'G4', d: 1 }, { n: 'F4', d: 1 }, { n: 'A4', d: 1 }, { n: 'C5', d: 1 },
        { n: 'D5', d: 1 }, { n: 'C5', d: 1 }, { n: 'A4', d: 1 }, { n: 'F4', d: 1 },
        { n: 'G4', d: 2 }, { n: 'F4', d: 2 },
        { n: 'C5', d: 1 }, { n: 'C5', d: 1 }, { n: 'A4', d: 1 }, { n: 'F4', d: 1 },
        { n: 'C5', d: 1 }, { n: 'C5', d: 1 }, { n: 'A4', d: 1 }, { n: 'F4', d: 1 },
        { n: 'D5', d: 1 }, { n: 'C5', d: 1 }, { n: 'A4', d: 1 }, { n: 'F4', d: 1 },
        { n: 'G4', d: 1 }, { n: 'F4', d: 1 }, { n: 'D4', d: 1 }, { n: 'C4', d: 1 },
        { n: 'C4', d: 1 }, { n: 'F4', d: 1 }, { n: 'A4', d: 1 }, { n: 'A4', d: 1 },
        { n: 'G4', d: 1 }, { n: 'F4', d: 1 }, { n: 'A4', d: 1 }, { n: 'C5', d: 1 },
        { n: 'D5', d: 1 }, { n: 'C5', d: 1 }, { n: 'A4', d: 1 }, { n: 'F4', d: 1 },
        { n: 'G4', d: 2 }, { n: 'F4', d: 2 }
      ]
    },
    info: {
      shortDescription: 'An Australian song about a traveller and a dancing swag.',
      listenFor: 'The chorus repeats the name Matilda on a little bounce of notes.',
      whyItMatters: 'Waltzing means walking with your bundle. Matilda is the swag, not a person. The first verse plus chorus is the song most children know.',
      guideDialogue: [
        { speaker: 'curious', line: 'Who is Matilda?' },
        { speaker: 'knowing', line: 'The bag on the traveller\'s back. Waltzing Matilda means walking with your bundle.' }
      ]
    },
    copyright: { status: 'public-domain', verified: true, sourceType: 'traditional', transcription: 'own-unverified' }
  },
  {
    id: 'el-condor-pasa',
    art: null,
    composerId: 'traditional',
    title: 'El Cóndor Pasa',
    shortTitle: 'El Cóndor Pasa',
    alternateTitles: [],
    year: 1913,
    importanceLevel: 3,
    featured: true,
    playbackMode: 'full',
    tuneFamilyId: 'el-condor-pasa-family',
    full: {
      tempo: 72,
      verified: false,
      sourceType: 'public-domain-score',
      sourceReference: 'Daniel Alomía Robles, El Cóndor Pasa (1913), Andean pentatonic flute-line reduction in E minor; own transcription. NOT the later Simon & Garfunkel song/arrangement.',
      notes: [
        { n: 'E4', d: 2 }, { n: 'G4', d: 1 }, { n: 'A4', d: 1 }, { n: 'B4', d: 2 },
        { n: 'A4', d: 1 }, { n: 'G4', d: 1 }, { n: 'E4', d: 3 },
        { n: 'E4', d: 2 }, { n: 'G4', d: 1 }, { n: 'A4', d: 1 }, { n: 'C5', d: 2 },
        { n: 'B4', d: 1 }, { n: 'A4', d: 1 }, { n: 'G4', d: 3 },
        { n: 'A4', d: 2 }, { n: 'B4', d: 1 }, { n: 'A4', d: 1 }, { n: 'G4', d: 2 },
        { n: 'E4', d: 1 }, { n: 'D4', d: 1 }, { n: 'E4', d: 3 },
        { n: 'E4', d: 2 }, { n: 'G4', d: 1 }, { n: 'A4', d: 1 }, { n: 'B4', d: 2 },
        { n: 'A4', d: 1 }, { n: 'G4', d: 1 }, { n: 'E4', d: 3 }
      ]
    },
    info: {
      shortDescription: 'A Peruvian melody named after the condor in the Andes.',
      listenFor: 'Five-note steps, like a wide wing-beat: up, glide, down.',
      whyItMatters: 'Robles wrote it in 1913. A later English pop song used this tune with new words. This book uses the old pentatonic line, not that song.',
      guideDialogue: [
        { speaker: 'curious', line: 'I think I have heard this with different words.' },
        { speaker: 'knowing', line: 'Those words came much later. The bird in the title is a condor over the mountains.' }
      ]
    },
    copyright: { status: 'public-domain', verified: true, sourceType: 'public-domain-composition', transcription: 'own-unverified' }
  },
  {
    id: 'la-bamba',
    art: null,
    composerId: 'traditional',
    title: 'La Bamba',
    alternateTitles: [],
    year: null,
    importanceLevel: 3,
    featured: true,
    playbackMode: 'full',
    tuneFamilyId: 'la-bamba-family',
    full: {
      tempo: 108,
      verified: false,
      sourceType: 'traditional',
      sourceReference: 'Mexican son jarocho traditional melody, complete familiar verse in C; own transcription. NOT the Ritchie Valens rock arrangement.',
      notes: [
        { n: 'G4', d: 0.5 }, { n: 'E4', d: 0.5 }, { n: 'G4', d: 1 }, { n: 'A4', d: 1 },
        { n: 'G4', d: 1 }, { n: 'E4', d: 1 }, { n: 'C4', d: 2 },
        { n: 'D4', d: 1 }, { n: 'E4', d: 1 }, { n: 'D4', d: 1 }, { n: 'C4', d: 1 },
        { n: 'D4', d: 1 }, { n: 'E4', d: 1 }, { n: 'G4', d: 2 },
        { n: 'G4', d: 0.5 }, { n: 'E4', d: 0.5 }, { n: 'G4', d: 1 }, { n: 'A4', d: 1 },
        { n: 'G4', d: 1 }, { n: 'E4', d: 1 }, { n: 'C4', d: 2 },
        { n: 'D4', d: 1 }, { n: 'E4', d: 1 }, { n: 'D4', d: 1 }, { n: 'C4', d: 1 },
        { n: 'A3', d: 1 }, { n: 'G3', d: 1 }, { n: 'C4', d: 2 }
      ]
    },
    info: {
      shortDescription: 'A Mexican dance song from Veracruz about needing a little grace to dance.',
      listenFor: 'Para bailar la bamba hops on G and E, then walks down.',
      whyItMatters: 'It is a son jarocho, a harp-and-jarana dance. A later rock record used this tune. This book uses the older singing line, not that record.',
      guideDialogue: [
        { speaker: 'curious', line: 'It wants me to dance.' },
        { speaker: 'knowing', line: 'The words say you need a little grace to dance the bamba. The notes already know the steps.' }
      ]
    },
    copyright: { status: 'public-domain', verified: true, sourceType: 'traditional', transcription: 'own-unverified' }
  },
  {
    id: 'greensleeves',
    art: null,
    composerId: 'traditional',
    title: 'Greensleeves',
    alternateTitles: ['What Child Is This?'],
    year: null,
    importanceLevel: 3,
    featured: true,
    playbackMode: 'full',
    tuneFamilyId: 'greensleeves-family',
    full: {
      tempo: 84,
      verified: false,
      sourceType: 'traditional',
      sourceReference: 'English historical tune family, A-minor 6/8 complete first strain plus Greensleeves-was-all-my-joy refrain; own transcription. Eighth = 0.5. What Child Is This? is the same tune family, not a second object.',
      notes: [
        { n: 'A4', d: 1 }, { n: 'C5', d: 1 }, { n: 'D5', d: 1 },
        { n: 'E5', d: 1.5 }, { n: 'F5', d: 0.5 }, { n: 'E5', d: 1 },
        { n: 'D5', d: 1 }, { n: 'B4', d: 1 }, { n: 'G4', d: 1 },
        { n: 'A4', d: 1 }, { n: 'B4', d: 1 }, { n: 'C5', d: 1 },
        { n: 'B4', d: 1 }, { n: 'G#4', d: 1 }, { n: 'E4', d: 1 },
        { n: 'A4', d: 1.5 }, { n: 'B4', d: 0.5 }, { n: 'C5', d: 1 },
        { n: 'B4', d: 1 }, { n: 'G#4', d: 1 }, { n: 'E4', d: 1 },
        { n: 'A4', d: 3 },
        { n: 'A4', d: 1 }, { n: 'C5', d: 1 }, { n: 'D5', d: 1 },
        { n: 'E5', d: 1.5 }, { n: 'F5', d: 0.5 }, { n: 'E5', d: 1 },
        { n: 'D5', d: 1 }, { n: 'B4', d: 1 }, { n: 'G4', d: 1 },
        { n: 'A4', d: 1 }, { n: 'B4', d: 1 }, { n: 'C5', d: 1 },
        { n: 'B4', d: 1 }, { n: 'G#4', d: 1 }, { n: 'E4', d: 1 },
        { n: 'A4', d: 1.5 }, { n: 'B4', d: 0.5 }, { n: 'C5', d: 1 },
        { n: 'B4', d: 1 }, { n: 'G#4', d: 1 }, { n: 'E4', d: 1 },
        { n: 'A4', d: 3 }
      ]
    },
    info: {
      shortDescription: 'An old English song in three, later given Christmas words as What Child Is This?',
      listenFor: 'The sixth note of the scale is raised (G-sharp). That is why the sad turn sounds old.',
      whyItMatters: 'What Child Is This? is this same melody with different words. One tune family, not two songs in the catalogue.',
      guideDialogue: [
        { speaker: 'curious', line: 'I think I have heard this at Christmas.' },
        { speaker: 'knowing', line: 'Those are later words. The old tune is Greensleeves, a love song in a minor key.' }
      ]
    },
    copyright: { status: 'public-domain', verified: true, sourceType: 'traditional', transcription: 'own-unverified' }
  },
  ...CLASSICAL_PIECES
];

attachPianoScores(PIECES);

export function piecesFor(composerId) {
  return PIECES.filter((piece) => piece.composerId === composerId);
}

export function composerById(id) {
  return COMPOSERS.find((composer) => composer.id === id);
}
