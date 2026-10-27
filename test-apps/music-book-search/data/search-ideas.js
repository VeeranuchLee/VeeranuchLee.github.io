// Curated search ideas for the Music Book's search panel (owner, 2026-10-27:
// "able to type the song name or idea. For example, I want to be able to search
// for Christmas songs and get to choose to go to individual page").
//
// A child's word for WHY they want a song rarely appears in any title, so each
// idea maps its words — the idea and its synonyms — straight to the songs they
// mean. Curation rules, both enforced by tools/test-search.mjs:
//   - every pieceId exists in data/catalogue.js AND lives in a room
//     (data/rooms.js): a result openSongFromIndex() cannot open is not a result;
//   - every idea offers at least two songs: one song is a destination, not a
//     choice, and the owner asked to "get to choose".
//
// Titles are searched separately (app/search.js), so an idea does not need to
// repeat songs whose names already carry the word — "Jingle Bells" stays out of
// the Christmas idea because it lives in Celebration Square, and searching its
// name finds it. That also keeps "christmas" answering with exactly the Winter
// Lanterns songs, which is what the owner's example asks for.

export const IDEAS = [
  {
    idea: 'Christmas',
    words: ['christmas', 'xmas', 'carol', 'carols', 'noel', 'winter', 'santa', 'holiday', 'holidays', 'festive'],
    pieces: ['silent-night', 'o-tannenbaum', 'deck-the-hall', 'we-wish-merry-christmas', 'first-noel']
  },
  {
    idea: 'Lullaby',
    words: ['lullaby', 'lullabies', 'sleep', 'sleepy', 'bedtime', 'night', 'dream', 'dreaming'],
    pieces: ['brahms-lullaby', 'rock-a-bye-baby', 'schumann-traumerei', 'silent-night']
  },
  {
    idea: 'Dance',
    words: ['dance', 'dancing', 'dancer', 'waltz', 'march', 'marching', 'polka'],
    pieces: ['brahms-hungarian-dance-5', 'brahms-waltz-op39-no15', 'dvorak-slavonic-dance-8', 'grieg-anitras-dance', 'tchaikovsky-waltz-flowers', 'tchaikovsky-nutcracker-march', 'mendelssohn-wedding-march', 'strauss-blue-danube']
  },
  {
    idea: 'Birthday',
    words: ['birthday', 'party', 'celebrate', 'celebration'],
    pieces: ['happy-birthday', 'jolly-good-fellow']
  },
  {
    idea: 'Animals',
    words: ['animal', 'animals', 'bird', 'birds', 'fish', 'farm', 'farmyard'],
    pieces: ['old-macdonald', 'bingo', 'three-blind-mice', 'farmer-in-dell', 'burung-kakak-tua', 'schubert-die-forelle', 'saint-saens-the-swan', 'rimsky-flight-bumblebee', 'mussorgsky-unhatched-chicks']
  },
  {
    idea: 'Rain',
    words: ['rain', 'rainy', 'weather', 'storm', 'stormy', 'thunder'],
    pieces: ['chopin-raindrop-prelude', 'vivaldi-summer-storm']
  },
  {
    idea: 'Water',
    words: ['sea', 'water', 'ocean', 'lake', 'river'],
    pieces: ['handel-water-music-hornpipe', 'saint-saens-aquarium', 'swan-lake-theme']
  },
  {
    idea: 'Happy',
    words: ['happy', 'joy', 'joyful', 'cheerful', 'glad', 'smile'],
    pieces: ['ode-to-joy', 'happy-birthday', 'schumann-happy-farmer', 'jolly-good-fellow']
  },
  {
    idea: 'Calm',
    words: ['sad', 'calm', 'quiet', 'slow', 'gentle', 'peaceful'],
    pieces: ['satie-gymnopedie-1', 'chopin-nocturne-op9-no2', 'dvorak-new-world-largo', 'schumann-traumerei']
  },
  {
    idea: 'Spring',
    words: ['spring'],
    pieces: ['vivaldi-spring-1', 'mendelssohn-spring-song']
  },
  {
    idea: 'Flowers',
    words: ['flower', 'flowers', 'blossom'],
    pieces: ['sakura-sakura', 'mo-li-hua', 'tchaikovsky-waltz-flowers']
  }
];

// The chips offered when nothing matched (the owner's example set, 2026-10-27).
export const SUGGESTED_IDEAS = ['Christmas', 'Lullaby', 'Dance', 'Animals', 'Rain', 'Happy'];
