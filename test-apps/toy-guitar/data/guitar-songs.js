// Reviewed separately from Toy Piano melodies. These are draft harmonisations
// for staging and owner review; `reviewed: false` keeps that status explicit.

export const GUITAR_SONGS = [
  {
    id: 'hot-cross-buns', title: 'Hot Cross Buns', key: 'C', tempo: 100,
    art: 'assets/songs/hot-cross-buns.webp',
    chords: ['C', 'G'], pattern: 'down-quarter',
    source: 'own two-chord harmonisation over this book\'s melody, 2026-10-05',
    reviewed: false,
    chart: [
      { c: 'C', beats: 4 }, { c: 'C', beats: 4 },
      { c: 'C', beats: 2 }, { c: 'G', beats: 1 }, { c: 'C', beats: 1 }
    ]
  },
  {
    id: 'row-row-row', title: 'Row Row Row Your Boat', key: 'C', tempo: 108,
    art: 'assets/songs/row-row-row.webp',
    chords: ['C', 'G'], pattern: 'down-quarter',
    source: 'own two-chord harmonisation over this book\'s melody, 2026-10-05',
    reviewed: false,
    chart: [
      { c: 'C', beats: 4 }, { c: 'C', beats: 4 }, { c: 'G', beats: 4 },
      { c: 'C', beats: 2 }, { c: 'C', beats: 2 }, { c: 'G', beats: 4 }, { c: 'C', beats: 4 }
    ]
  },
  {
    id: 'mary-had-a-little-lamb', title: 'Mary Had a Little Lamb', key: 'C', tempo: 108,
    art: 'assets/songs/mary-had-a-little-lamb.webp',
    chords: ['C', 'G'], pattern: 'down-quarter',
    source: 'own two-chord harmonisation over this book\'s melody, 2026-10-05',
    reviewed: false,
    chart: [
      { c: 'C', beats: 4 }, { c: 'C', beats: 4 }, { c: 'G', beats: 4 }, { c: 'C', beats: 4 }
    ]
  }
];

export function guitarSongById(id) {
  return GUITAR_SONGS.find((song) => song.id === id) || null;
}
