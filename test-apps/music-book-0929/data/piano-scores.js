// Two-hand piano reductions of the catalogue's single-line themes.
//
// Not concert editions: the right hand is the recognizable melody already in
// the piece; the left hand is a root–fifth bass that follows a declared key
// and meter. `verified` stays false. DESIGN-HANDOFF.md full-piece mode.

const PC = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6,
  G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11, Cb: 11
};

const PC_NAME = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

function splitPitch(name) {
  const parsed = /^([A-G][#b]?)(-?\d)$/.exec(name);
  if (!parsed) throw new Error(`unreadable piano pitch: ${name}`);
  const pc = PC[parsed[1]];
  if (pc === undefined) throw new Error(`no pitch class for ${name}`);
  return { pc, oct: parseInt(parsed[2], 10) };
}

function pitch(pc, oct) {
  const n = ((pc % 12) + 12) % 12;
  return `${PC_NAME[n]}${oct}`;
}

function addSemitones(name, semitones) {
  const { pc, oct } = splitPitch(name);
  const abs = oct * 12 + pc + semitones;
  return pitch(((abs % 12) + 12) % 12, Math.floor(abs / 12));
}

function melodyBeats(notes) {
  return notes.reduce((total, note) => total + note.d, 0);
}

/** [tonic, mode, beatsPerBar] */
const KEYS = {
  'ode-to-joy': ['C', 'major', 4],
  'fur-elise': ['A', 'minor', 1.5],
  'moonlight-sonata': ['C#', 'minor', 4],
  'symphony-5-opening': ['C', 'minor', 4],
  twinkle: ['C', 'major', 4],
  'swan-lake-theme': ['B', 'minor', 4],
  'mary-had-little-lamb': ['C', 'major', 4],
  'frere-jacques': ['C', 'major', 4],
  'row-row-row-your-boat': ['C', 'major', 3],
  'old-macdonald': ['G', 'major', 4],
  bingo: ['G', 'major', 4],
  'london-bridge': ['C', 'major', 4],
  'pop-goes-weasel': ['C', 'major', 3],
  'three-blind-mice': ['C', 'major', 4],
  'hot-cross-buns': ['C', 'major', 4],
  'this-old-man': ['C', 'major', 4],
  'farmer-in-dell': ['C', 'major', 4],
  'mulberry-bush': ['C', 'major', 4],
  'rock-a-bye-baby': ['C', 'major', 3],
  'skip-to-my-lou': ['C', 'major', 4],
  'amazing-grace-new-britain': ['G', 'major', 3],
  'when-saints-go-marching': ['C', 'major', 4],
  'simple-gifts': ['C', 'major', 4],
  'my-bonnie': ['C', 'major', 3],
  'home-on-range': ['G', 'major', 3],
  'happy-birthday': ['C', 'major', 3],
  'jolly-good-fellow': ['C', 'major', 3],
  'jingle-bells': ['C', 'major', 4],
  'silent-night': ['C', 'major', 3],
  'o-tannenbaum': ['F', 'major', 3],
  'deck-the-hall': ['C', 'major', 4],
  'we-wish-merry-christmas': ['G', 'major', 3],
  'first-noel': ['C', 'major', 3],
  'joy-to-world': ['C', 'major', 4],
  'auld-lang-syne': ['F', 'major', 4],
  'sakura-sakura': ['A', 'minor', 4],
  arirang: ['C', 'major', 4],
  'mo-li-hua': ['C', 'major', 4],
  'rasa-sayang': ['C', 'major', 4],
  'burung-kakak-tua': ['C', 'major', 4],
  'leron-leron-sinta': ['C', 'major', 4],
  'lao-duang-duen': ['C', 'major', 4],
  'raghupati-raghava': ['C', 'major', 4],
  'uskudara-gider-iken': ['C', 'minor', 4],
  'hava-nagila': ['D', 'minor', 4],
  kalinka: ['A', 'minor', 4],
  shchedryk: ['E', 'minor', 4],
  'nkosi-sikelel-iafrika': ['F', 'major', 4],
  misirlou: ['E', 'minor', 4],
  'waltzing-matilda': ['F', 'major', 4],
  'el-condor-pasa': ['E', 'minor', 4],
  'la-bamba': ['C', 'major', 4],
  greensleeves: ['A', 'minor', 3],
  'bach-prelude-c-major-bwv-846': ['C', 'major', 4],
  'bach-air-orchestral-suite-3': ['D', 'major', 4],
  'bach-jesu-joy': ['G', 'major', 3],
  'bach-cello-suite-1-prelude': ['G', 'major', 4],
  'vivaldi-spring-1': ['E', 'major', 4],
  'vivaldi-summer-storm': ['G', 'minor', 4],
  'vivaldi-winter-1': ['F', 'minor', 4],
  'handel-hallelujah-chorus': ['D', 'major', 4],
  'handel-water-music-hornpipe': ['D', 'major', 4],
  'handel-royal-fireworks-rejouissance': ['D', 'major', 4],
  'pachelbel-canon-d': ['D', 'major', 4],
  'haydn-surprise-symphony-94-2': ['C', 'major', 4],
  'haydn-trumpet-concerto-3': ['Eb', 'major', 3],
  'mozart-eine-kleine-nachtmusik-1': ['G', 'major', 4],
  'mozart-rondo-alla-turca': ['A', 'minor', 4],
  'mozart-symphony-40-1': ['G', 'minor', 4],
  'mozart-piano-sonata-k545-1': ['C', 'major', 4],
  'mozart-ah-vous-dirai-je-variations': ['C', 'major', 4],
  'beethoven-symphony-7-2': ['A', 'minor', 4],
  'schubert-ave-maria': ['Bb', 'major', 4],
  'schubert-die-forelle': ['C', 'major', 4],
  'mendelssohn-wedding-march': ['C', 'major', 4],
  'mendelssohn-spring-song': ['A', 'major', 4],
  'mendelssohn-violin-concerto-opening': ['E', 'minor', 4],
  'chopin-nocturne-op9-no2': ['Eb', 'major', 3],
  'chopin-minute-waltz': ['Db', 'major', 3],
  'chopin-raindrop-prelude': ['Ab', 'major', 4],
  'chopin-fantaisie-impromptu': ['C#', 'minor', 4],
  'schumann-traumerei': ['F', 'major', 4],
  'schumann-happy-farmer': ['F', 'major', 4],
  'schumann-foreign-lands-people': ['G', 'major', 4],
  'brahms-lullaby': ['C', 'major', 3],
  'brahms-hungarian-dance-5': ['G', 'minor', 4],
  'brahms-waltz-op39-no15': ['Ab', 'major', 3],
  'tchaikovsky-sugar-plum-fairy': ['E', 'minor', 4],
  'tchaikovsky-waltz-flowers': ['D', 'major', 3],
  'tchaikovsky-nutcracker-march': ['C', 'major', 4],
  'tchaikovsky-trepak': ['G', 'major', 4],
  'tchaikovsky-piano-concerto-1-opening': ['Bb', 'minor', 4],
  'saint-saens-the-swan': ['G', 'major', 4],
  'saint-saens-aquarium': ['Ab', 'major', 4],
  'saint-saens-danse-macabre': ['G', 'minor', 4],
  'grieg-morning-mood': ['G', 'major', 4],
  'grieg-mountain-king': ['B', 'minor', 4],
  'grieg-anitras-dance': ['A', 'minor', 4],
  'dvorak-new-world-largo': ['C', 'major', 4],
  'dvorak-humoresque-7': ['C', 'major', 4],
  'dvorak-slavonic-dance-8': ['G', 'minor', 4],
  'mussorgsky-promenade': ['Bb', 'major', 4],
  'mussorgsky-unhatched-chicks': ['C', 'minor', 4],
  'mussorgsky-night-bald-mountain': ['D', 'minor', 4],
  'rimsky-flight-bumblebee': ['A', 'minor', 4],
  'rimsky-scheherazade-opening': ['E', 'minor', 4],
  'strauss-blue-danube': ['D', 'major', 3],
  'strauss-tritsch-tratsch-polka': ['G', 'major', 4],
  'bizet-habanera': ['D', 'minor', 4],
  'bizet-toreador-song': ['F', 'major', 4],
  'rossini-william-tell-finale': ['E', 'major', 4],
  'rossini-barber-seville-overture': ['E', 'major', 4],
  'debussy-clair-de-lune': ['Db', 'major', 4],
  'debussy-arabesque-1': ['E', 'major', 4],
  'debussy-little-shepherd': ['A', 'major', 4],
  'satie-gymnopedie-1': ['D', 'major', 3],
  'joplin-entertainer': ['C', 'major', 4],
  'joplin-maple-leaf-rag': ['Ab', 'major', 4],
  'holst-jupiter': ['F', 'major', 4],
  'holst-mars': ['G', 'minor', 5]
};

function leftHand(totalBeats, tonic, mode, beatsPerBar) {
  const I = pitch(PC[tonic] ?? 0, 3);
  const V = addSemitones(I, 7);
  const IV = addSemitones(I, 5);
  const cycle = mode === 'minor' ? [I, V, I, IV] : [I, V, I, V];
  const notes = [];
  let t = 0;
  let bar = 0;
  while (t < totalBeats - 1e-9) {
    const barLen = Math.min(beatsPerBar, totalBeats - t);
    const root = cycle[bar % 4];
    const fifth = addSemitones(root, 7);
    if (beatsPerBar === 3 && barLen >= 2) {
      notes.push({ n: root, d: 1 });
      notes.push({ n: [fifth, addSemitones(root, 12)], d: Math.min(1, barLen - 1) });
      if (barLen > 2) notes.push({ n: root, d: barLen - 2 });
    } else if (barLen >= 2) {
      const half = barLen / 2;
      notes.push({ n: root, d: half });
      notes.push({ n: [fifth, addSemitones(root, 12)], d: barLen - half });
    } else {
      notes.push({ n: root, d: barLen });
    }
    t += barLen;
    bar += 1;
  }
  return notes;
}

export function buildPianoScore(melodyScore, spec) {
  const [tonic, mode, beatsPerBar] = spec;
  const total = melodyBeats(melodyScore.notes);
  return {
    tempo: melodyScore.tempo,
    verified: false,
    sourceType: 'derived-piano-reduction',
    sourceReference: `Two-hand teaching reduction: right hand is the catalogue melody; left hand is a root–fifth bass in ${tonic} ${mode}, ${beatsPerBar} beats to the bar. Not a concert edition.`,
    tracks: [
      { id: 'right-hand', notes: melodyScore.notes, gain: 1 },
      { id: 'left-hand', notes: leftHand(total, tonic, mode, beatsPerBar), gain: 0.42 }
    ]
  };
}

export function attachPianoScores(pieces) {
  for (const piece of pieces) {
    const melody = piece.full || piece.excerpt;
    if (!melody || !Array.isArray(melody.notes) || !melody.notes.length) continue;
    const spec = KEYS[piece.id];
    if (!spec) throw new Error(`piano-scores: missing KEYS entry for ${piece.id}`);
    piece.piano = buildPianoScore(melody, spec);
  }
}
