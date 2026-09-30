// Per-piece song explanations. Part of CG-315
// (music-book/SONG-EXPLANATIONS-SPEC.md, "Pipeline").
//
// WHY A SEPARATE FILE RATHER THAN A FIELD ON EACH PIECE (spec section 3 offered
// either shape). `data/catalogue.js` (53 pieces) and `data/classical-themes.js` (67
// pieces) are large, hand-authored files that already carry a catalogue-overlap
// invariant enforced by tools/build-rooms.mjs (splitSources()). Explanations are
// written in batches of ~15 over many future sessions (see the spec's Pipeline
// section) by writers who should not need to re-open and diff two thousand-line
// catalogue files per batch, and a keyed file diffs cleanly batch by batch. Neither
// PIECES nor CLASSICAL_PIECES is read for an `explanation` field anywhere in
// tools/build-rooms.mjs, so this file changes nothing about the generated
// data/rooms.js. Recorded in music-book/work_progress_and_other_discussion.md.
//
// SHAPE (owner decision 2026-09-25, "song info -> let's just use the fact and not
// feel. however, add other knowledge (not specific to each song) when possible.
// make button -> pop up text and voice." — supersedes the feel+facts two-button
// shape of spec section 3 v2; the 2026-09-24 "can we have both? separate button"
// shape is recorded in the discussion log and the spec's superseded sections):
//
//   EXPLANATIONS[pieceId] = {
//     facts: {
//       text: ..., audio: null, status: 'draft'|'reviewed'|'owner-ok',
//       sources: [...],                          // every claim, each verified: true
//       knowledge: ['glossary-id', ...]          // 0-2 ids into data/music-knowledge.js
//     }
//   }
//
// `facts` is the checkable layer: who/when/why/a surprising true thing, never a
// composer biography recap (the composer's own info-square already carries that —
// see data/catalogue.js COMPOSERS[].summary — so a facts entry adds something new).
// Every claim in `facts.text` must have a matching entry in `facts.sources`, and
// `verified: true` is required to pass the lint. The ten pilot entries below were
// checked against Wikipedia/Britannica/Library of Congress via live web search during
// this task (see the task record and PR for the exact queries); `verified: true`
// reflects that check, not a placeholder.
//
// `knowledge` references the shared, song-agnostic glossary in data/music-knowledge.js
// (what a round is, what a concerto is, when the Baroque era ran) — extra background
// "not specific to each song", as the owner asked, to the same checkable standard:
// every referenced card is sourced and verified, and no card is an orphan. A piece
// carries 0-2 ids (jingle-bells deliberately references none; a shared id such as
// `folk-song` legitimately backs several pieces).
//
// `audio` is null for every pilot entry — no ElevenLabs render happened in this task
// (AUDIO-DIRECTION.md; rendering is a later, owner-approved, one-batch step per the
// spec's Pipeline section).

export const EXPLANATIONS = {
  twinkle: {
    facts: {
      text: 'The tune began as a French song called ‘Ah, vous dirai-je, Maman,’ printed in 1761 with no known composer. English poet Jane Taylor wrote the ‘Twinkle, Twinkle’ words in 1806, and the two were paired together later.',
      audio: null,
      status: 'reviewed',
      sources: [
        { claim: 'melody first published 1761 as ‘Ah, vous dirai-je, Maman’, composer unknown', source: 'https://www.britannica.com/topic/Ah-vous-dirai-je-Maman', verified: true },
        { claim: 'Jane Taylor wrote the ‘Twinkle, Twinkle, Little Star’ poem, published 1806', source: 'https://en.wikipedia.org/wiki/Twinkle,_Twinkle,_Little_Star', verified: true }
      ],
      knowledge: ['nursery-rhyme']
    }
  },

  'jingle-bells': {
    facts: {
      text: 'James Lord Pierpont wrote this song in 1857. He first called it ‘The One Horse Open Sleigh,’ and it only got its now-familiar name when it was published again two years later.',
      audio: null,
      status: 'reviewed',
      sources: [
        { claim: 'James Lord Pierpont wrote the song, published 1857 as ‘The One Horse Open Sleigh’, retitled ‘Jingle Bells’ on reissue', source: 'https://en.wikipedia.org/wiki/Jingle_Bells', verified: true }
      ],
      knowledge: []
    }
  },

  'frere-jacques': {
    facts: {
      text: 'This French round is at least two hundred years old, and nobody knows for certain who wrote it. It is about a sleepy friar who needs waking to ring the morning bells.',
      audio: null,
      status: 'reviewed',
      sources: [
        { claim: 'French round dating to the 17th-18th century, earliest printed version 1780, authorship uncertain', source: 'https://en.wikipedia.org/wiki/Fr%C3%A8re_Jacques', verified: true }
      ],
      knowledge: ['round']
    }
  },

  'ode-to-joy': {
    facts: {
      text: 'Beethoven finished this symphony after he had gone completely deaf. At its first performance he could not hear the audience cheering, so someone turned him around to see them clapping.',
      audio: null,
      status: 'reviewed',
      sources: [
        { claim: 'Beethoven was completely deaf by the time the Ninth Symphony premiered in 1824', source: 'https://en.wikipedia.org/wiki/Symphony_No._9_(Beethoven)', verified: true },
        { claim: 'Beethoven could not hear the applause and had to be alerted / turned to see it', source: 'https://www.cbsnews.com/news/the-defiance-of-ludwig-van-beethoven-and-his-ode-to-joy/', verified: true }
      ],
      knowledge: ['symphony', 'romantic-era']
    }
  },

  'moonlight-sonata': {
    facts: {
      text: 'Beethoven did not name this piece ‘Moonlight’ himself. Years later, a poet said it reminded him of moonlight on a lake, and the name stayed ever since.',
      audio: null,
      status: 'reviewed',
      sources: [
        { claim: 'the ‘Moonlight’ nickname came from poet Ludwig Rellstab, not Beethoven, years after it was written', source: 'https://en.wikipedia.org/wiki/Piano_Sonata_No._14_(Beethoven)', verified: true }
      ],
      knowledge: ['sonata', 'classical-era']
    }
  },

  'vivaldi-summer-storm': {
    facts: {
      text: 'Vivaldi printed this music together with a poem describing thunder and lightning in a summer storm. It was published in 1725 as part of a set called The Four Seasons.',
      audio: null,
      status: 'reviewed',
      sources: [
        { claim: 'The Four Seasons was published in 1725 with accompanying descriptive sonnets (poems)', source: 'https://en.wikipedia.org/wiki/The_Four_Seasons_(Vivaldi)', verified: true }
      ],
      knowledge: ['concerto', 'baroque-era']
    }
  },

  'silent-night': {
    facts: {
      text: 'This carol was first sung on Christmas Eve in 1818, in a small Austrian village called Oberndorf. Franz Gruber wrote the tune, and it was played on just a guitar.',
      audio: null,
      status: 'reviewed',
      sources: [
        { claim: 'first performed 24 December 1818 at St Nicholas Church, Oberndorf, Austria; music by Franz Gruber, words by Joseph Mohr; accompanied by guitar', source: 'https://en.wikipedia.org/wiki/Silent_Night', verified: true }
      ],
      knowledge: ['carol']
    }
  },

  'amazing-grace-new-britain': {
    facts: {
      text: 'John Newton wrote these words in 1772, when he was a church minister in the English town of Olney. As a young man he had worked in the slave trade, and later in life he spoke out to help end it.',
      audio: null,
      status: 'reviewed',
      sources: [
        { claim: 'John Newton wrote the words in 1772 as curate of Olney; published with William Cowper in Olney Hymns (1779)', source: 'https://www.loc.gov/collections/amazing-grace/articles-and-essays/creation-of-amazing-grace/', verified: true },
        { claim: 'Newton worked in the Atlantic slave trade as a young man and later supported its abolition, publishing Thoughts upon the African Slave Trade (1788)', source: 'https://en.wikipedia.org/wiki/John_Newton', verified: true }
      ],
      knowledge: ['hymn']
    }
  },

  greensleeves: {
    facts: {
      text: 'Many people say King Henry VIII wrote this song for a woman he loved. That story cannot be true — the song was not printed until decades after he died.',
      audio: null,
      status: 'reviewed',
      sources: [
        { claim: 'the Henry VIII authorship story is a myth; earliest known publication is 1580, after his 1547 death', source: 'https://www.classicfm.com/discover-music/greensleeves-did-henry-viii-write-song/', verified: true }
      ],
      knowledge: ['folk-song']
    }
  },

  'hava-nagila': {
    facts: {
      text: 'This tune began as a wordless melody sung in a Jewish community in Eastern Europe. A researcher named Abraham Idelsohn wrote it down in Jerusalem in 1918, and it became a song sung at celebrations everywhere.',
      audio: null,
      status: 'reviewed',
      sources: [
        { claim: 'began as a Hasidic wordless nigun, transcribed by Abraham Zvi Idelsohn in Jerusalem, set to words around 1918', source: 'https://en.wikipedia.org/wiki/Hava_Nagila', verified: true }
      ],
      knowledge: ['folk-song', 'folk-dance']
    }
  }
};