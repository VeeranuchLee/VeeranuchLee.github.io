// Room 1 — "Melody Detective Workshop" as a Read Together chapter.
//
// The spec is `curation/ROOM-01-READ-TOGETHER.md`; this is its child-facing
// half, kept as data for the same reason `data/rooms.js` is: every word a child
// reads has to be re-wordable, translatable, and speakable without touching a
// renderer. `app/read-together.js` draws it and owns no copy of its own.
//
// If a second room ever gets a chapter, this file should be compiled out of the
// private curation the way `tools/build-rooms.mjs` compiles `data/rooms.js`.
// One hand-authored chapter does not yet earn a compiler.
//
// WHAT IS DELIBERATELY NOT HERE. No contour, no note count, no step direction,
// no round entry point, no "pop" timestamp. Every one of those is derived from
// the score in `data/catalogue.js` at run time, because a teaching claim that is
// typed in by hand is a claim nobody re-checks when the score changes. The only
// musical facts written down here are prose the owner can read and argue with.

export const ROOM_01_CHAPTER = {
  roomId: 'melody-detective-workshop',

  // The chapter marker: page orientation, not a score, streak, or track count.
  markers: ['The doorway', 'Meet the sounds', 'Compare and discover', 'The map bridge'],

  spreads: [
    // ── A ────────────────────────────────────────────────────────────────────
    {
      id: 'A',
      scene: 'doorway',
      title: 'The Doorway',
      // The room's own question, from data/rooms.js. Repeated here only so the
      // renderer never has to reach across two data shapes mid-render.
      opening: 'How can you recognise a tune even when its words or pictures change?',
      dialogue: {
        open: [
          { who: 'curious', line: 'Three names — but I can only see one tune.' },
          { who: 'knowing', line: 'Then let us listen before we read the label.' }
        ],
        done: [
          { who: 'knowing', line: 'The name on the tag changed. The path the tune walks did not.' }
        ]
      },
      invite: {
        hotspot: 'lens',
        label: 'Look closely',
        pieceId: 'twinkle',
        // The excerpt is the only source-verified score in this room. The full
        // ABA verse exists but is verified: false, so the chapter's opening
        // demonstration does not lean on it.
        which: 'excerpt'
      },
      // One shared melodic path, three identities. The tabs change the name and
      // the charm; they never change the score, because being the same tune is
      // the whole lesson.
      labels: [
        { id: 'twinkle', text: 'Twinkle, Twinkle', charm: '★' },
        { id: 'baa', text: 'Baa, Baa, Black Sheep', charm: '❋' },
        {
          id: 'abc',
          text: 'The ABC Song',
          charm: '▧',
          // Honest about the one place the family is NOT identical. The app plays
          // the shared pitch path; the alphabet song fits more syllables into it.
          // Claiming exact rhythmic identity here would be teaching a wrong fact
          // to the one child in the room who knows the song best.
          note: 'The alphabet song walks these same notes — but L-M-N-O-P has to hurry to fit all the letters in.'
        }
      ],
      requires: { labelsTried: 2 }
    },

    // ── B ────────────────────────────────────────────────────────────────────
    {
      id: 'B',
      scene: 'lane',
      title: 'Meet the Sounds',
      opening: 'A tune with no label. Can you still tell which one it is?',
      dialogue: {
        open: [
          { who: 'curious', line: 'Can a tune leave footprints?' },
          { who: 'knowing', line: 'Listen for where the path goes — up, down, or back again.' }
        ],
        done: [
          // Checked against the encoded scores, not assumed. London Bridge is
          // G G A G F E F G: level, up, and only then down. Three Blind Mice is
          // E D C: down from its very first step. Saying "both begin by moving
          // down" would be false of one of them.
          { who: 'knowing', line: 'Both paths walk downhill. They do not set off from the same step, or at the same speed.' }
        ]
      },
      stations: [
        {
          id: 'bridge',
          pieceId: 'london-bridge',
          which: 'melody',
          label: 'London Bridge',
          note: 'This one holds still, steps up once, and then walks down.'
        },
        {
          id: 'lanterns',
          pieceId: 'three-blind-mice',
          which: 'melody',
          label: 'Three Blind Mice',
          note: 'This one walks down straight away — three steps, and then the same three again.'
        }
      ],
      requires: { stationsHeard: 2 }
    },

    // ── C ────────────────────────────────────────────────────────────────────
    {
      id: 'C',
      scene: 'machines',
      title: 'Compare and Discover',
      opening: 'Two machines. One keeps a secret; one lets an echo in.',
      dialogue: {
        open: [
          { who: 'curious', line: 'I know something is coming…' },
          { who: 'knowing', line: 'Wind it up and wait for it.' }
        ],
        done: [
          { who: 'knowing', line: 'A round: one melody, set off twice, starting at different moments.' }
        ]
      },
      stations: [
        {
          id: 'crank',
          pieceId: 'pop-goes-weasel',
          which: 'melody',
          label: 'The wind-up box',
          note: 'It saves its surprise for the very end.',
          // The lid opens on the score's own highest note, found at run time.
          // An animator guessing a timestamp is how a "surprise" ends up landing
          // half a beat after the sound.
          popsOnHighestNote: true
        },
        {
          id: 'turntable',
          pieceId: 'frere-jacques',
          which: 'melody',
          label: 'The echo turntable',
          // An observation, not an instruction. A station's note is only shown
          // once that station has been heard, so a line telling the child to
          // listen first arrived after they already had — and once the round
          // played, it sat above the round's own note and contradicted it.
          // Checked against the encoded score: the melody is four phrases and
          // every one of them is played twice, back to back (C D E C / C D E C,
          // E F G / E F G, G A G F E C / G A G F E C, C G C / C G C). Phrases
          // repeating is the small version of what the round then does to the
          // whole tune.
          note: 'Every little part of it happens twice in a row.'
        }
      ],
      // The round is real audio, not two ribbons drawn over one performance:
      // the same score is scheduled twice, the second entry late by whole
      // sections. `app/read-together.js` derives the section length from the
      // score rather than reading a number from here.
      round: {
        stationId: 'turntable',
        tab: 'Let the echo join',
        note: 'Now the same tune sets off twice.'
      },
      requires: { stationsHeard: 2, roundHeard: true }
    },

    // ── D ────────────────────────────────────────────────────────────────────
    {
      id: 'D',
      scene: 'mapdesk',
      title: 'The Map Bridge',
      opening: 'What did you notice?',
      dialogue: {
        open: [
          { who: 'curious', line: 'So a title can change, and the tune still gives itself away.' },
          { who: 'knowing', line: 'Listen for its shape: where it moves, what repeats, and when it surprises you.' }
        ],
        done: [
          { who: 'knowing', line: 'Take that with you. It works on every tune in this book.' }
        ]
      },
      card: {
        line: 'Listen for the shape before the title.',
        cues: [
          { id: 'same', text: 'Same tune, new name', pieceIds: ['twinkle'] },
          { id: 'down', text: 'A path that walks down', pieceIds: ['london-bridge', 'three-blind-mice'] },
          { id: 'surprise', text: 'A surprise saved for the end', pieceIds: ['pop-goes-weasel'] },
          { id: 'round', text: 'One tune, starting twice', pieceIds: ['frere-jacques'] }
        ]
      },
      // Every Room 1 piece returns as evidence. Nothing plays on entry.
      tokens: [
        { pieceId: 'twinkle', text: 'Twinkle, Twinkle', which: 'excerpt' },
        { pieceId: 'london-bridge', text: 'London Bridge', which: 'melody' },
        { pieceId: 'three-blind-mice', text: 'Three Blind Mice', which: 'melody' },
        { pieceId: 'pop-goes-weasel', text: 'Pop Goes the Weasel', which: 'melody' },
        { pieceId: 'frere-jacques', text: 'Frère Jacques', which: 'melody' }
      ],
      requires: { cardPlaced: true }
    }
  ]
};

export const CHAPTERS = { [ROOM_01_CHAPTER.roomId]: ROOM_01_CHAPTER };
export const chapterFor = (roomId) => CHAPTERS[roomId] ?? null;
