// Composers and pieces.
//
// Note durations are in BEATS, and each score carries its own tempo in BPM.
// A rest is a note with `n: null`. This differs from the salvaged data in
// math-app/classical-music.html, which used raw seconds — beats survive a
// tempo change and a slow-mode button, seconds do not.
//
// `verified` on a score means: someone checked these pitches against the tune,
// not merely that it plays without crashing. Do not flip it to true in bulk.

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
  }
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
    playbackMode: 'excerpt',
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
    playbackMode: 'excerpt',
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
    playbackMode: 'excerpt',
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
    playbackMode: 'excerpt',
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
    playbackMode: 'excerpt',
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
      tempo: 100,
      // SALVAGED, NOT YET VERIFIED. These pitches came across from
      // math-app/classical-music.html unchanged. They are diatonic with no
      // accidentals at all, which is suspicious for this theme, and they have
      // not been checked against a public-domain score. Do not feature this
      // piece or call it correct until someone has.
      verified: false,
      notes: [
        { n: 'B3', d: 1.5 }, { n: 'A3', d: 0.75 }, { n: 'B3', d: 0.75 },
        { n: 'E4', d: 2.25 }, { n: 'D4', d: 0.75 }, { n: 'C4', d: 0.75 }, { n: 'B3', d: 0.75 },
        { n: 'A3', d: 2.25 }, { n: 'B3', d: 0.75 }, { n: 'C4', d: 0.75 },
        { n: 'D4', d: 1.5 }, { n: 'E4', d: 0.75 }, { n: 'D4', d: 0.75 }, { n: 'C4', d: 1.5 }
      ]
    },
    info: {
      shortDescription: 'The swan music from Tchaikovsky’s ballet.',
      listenFor: 'The melody keeps sinking back down, like something gliding.',
      whyItMatters: 'Audiences disliked Swan Lake at first. It is now one of the most performed ballets anywhere.',
      guideDialogue: [
        { speaker: 'curious', line: 'This one sounds sad.' },
        { speaker: 'knowing', line: 'It is a spell being cast. The princess is turning into a swan.' }
      ]
    },
    copyright: { status: 'public-domain', verified: true, sourceType: 'public-domain-composition', transcription: 'salvaged-unverified' }
  }
];

export function piecesFor(composerId) {
  return PIECES.filter((piece) => piece.composerId === composerId);
}

export function composerById(id) {
  return COMPOSERS.find((composer) => composer.id === id);
}
