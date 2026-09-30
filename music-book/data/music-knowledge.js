// Shared, song-agnostic background knowledge for the song-info feature. Part of
// CG-315 (music-book/SONG-EXPLANATIONS-SPEC.md, "Pipeline").
//
// Owner decision 2026-09-25, in full: "song info -> let's just use the fact and not
// feel. however, add other knowledge (not specific to each song) when possible.
// make button -> pop up text and voice."
//
// The `feel` layer (what a piece "sounds like", tempo/contour/range) is retired; in
// its place each piece's facts entry may reference 0-2 of these glossary ids. A
// glossary card is deliberately NOT about one song: it explains a category (round,
// concerto) or an era (Baroque, Classical, Romantic) so the same card can back
// several pieces. jingle-bells deliberately references none — its story stands on
// its own facts.
//
// SHAPE:
//
//   MUSIC_KNOWLEDGE[id] = {
//     text:    'one or two short, child-facing sentences…',   // 1-2 sentences
//     sources: [{ claim, source, verified: true }, ...]        // every claim verified
//   }
//
// The same writing rules as `facts` apply (tools/check-explanations.mjs enforces
// them): checkable, no hedging, no build jargon, no device-TTS references, short
// (cap below), and every claim backed by a `verified: true` source entry.
//
// `about` in the three era cards is a deliberate precision word, not hedging: the
// sources give round dates ("about 1600 to about 1750", Britannica; "roughly
// between 1750 and 1820", Wikipedia; "c. 1800-1910", Wikipedia) and a child-facing
// card should not pretend history starts on an exact year. The lint's hedge list is
// about uncertainty in a claim, not about approximating calendar boundaries — the
// era cards use "about" precisely because the sources do.

export const MUSIC_KNOWLEDGE = {
  'nursery-rhyme': {
    text: 'A nursery rhyme is a short, simple song or poem for young children. Many are so old that nobody remembers who made them up first.',
    sources: [
      { claim: 'a nursery rhyme is a short song or poem for young children', source: 'https://www.britannica.com/art/nursery-rhyme', verified: true }
    ]
  },

  round: {
    text: 'A round is a song where two or more singers start the same tune at different times. They each keep going, and the parts fit together as one.',
    sources: [
      { claim: 'a round is a song in which two or more voices sing the same melody with entries at different times', source: 'https://en.wikipedia.org/wiki/Round_(music)', verified: true }
    ]
  },

  carol: {
    text: 'A carol is a song sung at Christmas. This one was written in a small village church, far from any famous stage.',
    sources: [
      { claim: 'a carol is a song of the Christmas season', source: 'https://www.britannica.com/art/carol', verified: true }
    ]
  },

  hymn: {
    text: 'A hymn is a song of praise sung in church. Many hymns are sung by the whole congregation together, not by one singer alone.',
    sources: [
      { claim: 'a hymn is a song of praise used in Christian worship', source: 'https://www.britannica.com/art/hymn', verified: true }
    ]
  },

  symphony: {
    text: 'A symphony is a long piece of music written for a whole orchestra, in several big sections called movements. This tune is part of one.',
    sources: [
      { claim: 'a symphony is a lengthy composition for orchestra, usually in several movements', source: 'https://www.britannica.com/art/symphony-music', verified: true }
    ]
  },

  sonata: {
    text: 'A sonata is a piece of music written for one instrument, or for one instrument with a piano. This tune opens a sonata for solo piano.',
    sources: [
      { claim: 'a sonata is a composition usually for a solo instrument or a small number of instruments', source: 'https://www.britannica.com/art/sonata', verified: true }
    ]
  },

  concerto: {
    text: 'A concerto is a piece where one solo instrument, such as a violin or a piano, plays against a whole orchestra. This tune is part of a violin concerto.',
    sources: [
      { claim: 'a concerto sets a solo instrument, often the piano or violin, against an orchestral ensemble', source: 'https://www.britannica.com/art/concerto-music', verified: true },
      { claim: 'the violin is a bowed string instrument used as a solo and orchestral instrument', source: 'https://www.britannica.com/art/violin', verified: true }
    ]
  },

  'folk-song': {
    text: 'A folk song is a song that ordinary people pass on by ear, from one family or village to the next. Many are so old that nobody remembers who wrote them.',
    sources: [
      { claim: 'folk music is passed down through families and communities and lives in oral tradition', source: 'https://www.britannica.com/art/folk-music', verified: true }
    ]
  },

  'folk-dance': {
    text: "A folk dance is a dance from the everyday life of a place or people, danced at celebrations. This tune began as a dance song.",
    sources: [
      { claim: "a folk dance is a vernacular dance form, typically recreational, that reflects a culture's past or present", source: 'https://www.britannica.com/art/folk-dance', verified: true }
    ]
  },

  'baroque-era': {
    text: 'The Baroque era is the time in music history from about 1600 to about 1750. Vivaldi wrote in this era.',
    sources: [
      { claim: 'the Baroque era in music runs from about 1600 to about 1750; Vivaldi is one of its composers', source: 'https://www.britannica.com/art/Baroque-music', verified: true }
    ]
  },

  'classical-era': {
    text: 'The Classical era is the time in music history from about 1750 to about 1820. Beethoven wrote this piece in 1801, near the end of that era.',
    sources: [
      { claim: 'the Classical era is roughly the period from 1750 to 1820', source: 'https://en.wikipedia.org/wiki/Classical_period_(music)', verified: true }
    ]
  },

  'romantic-era': {
    text: 'The Romantic era is the time in music history from about 1800 to about 1910. Beethoven\u2019s final symphony belongs to this era.',
    sources: [
      { claim: 'the Romantic era in music is about 1800 to 1910, the music of the nineteenth century', source: 'https://en.wikipedia.org/wiki/Romantic_music', verified: true }
    ]
  }
};