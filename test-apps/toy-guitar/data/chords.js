// Toy Guitar chord library. Standard tuning is ordered from low E to high e;
// `null` means that string is muted. These tables are editorial data, not
// inferred from the Toy Piano melodies.

export const STANDARD_TUNING = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'];

export const CHORDS = {
  C:  { id: 'C',  root: 'C', quality: 'major', colour: '#e5484d', frets: [null, 3, 2, 0, 1, 0] },
  F:  { id: 'F',  root: 'F', quality: 'major', colour: '#4aa35a', frets: [null, null, 3, 2, 1, 1] },
  G:  { id: 'G',  root: 'G', quality: 'major', colour: '#3e9fd4', frets: [3, 2, 0, 0, 0, 3] },
  Am: { id: 'Am', root: 'A', quality: 'minor', colour: '#6b50c8', frets: [null, 0, 2, 2, 1, 0] },
  G7: { id: 'G7', root: 'G', quality: 'dominant7', colour: '#2a86bd', frets: [3, 2, 0, 0, 0, 1] },
  D7: { id: 'D7', root: 'D', quality: 'dominant7', colour: '#c66b1f', frets: [null, null, 0, 2, 1, 2] },
  E7: { id: 'E7', root: 'E', quality: 'dominant7', colour: '#cf9a12', frets: [0, 2, 0, 1, 0, 0] }
};

export const DEFAULT_CHORD_IDS = ['C', 'F', 'G', 'Am'];

const NOTE_INDEX = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5,
  'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function noteAtFret(note, fret) {
  const match = /^([A-G](?:#|b)?)(-?\d)$/.exec(note);
  if (!match || !Number.isInteger(fret) || fret < 0) throw new Error(`bad string/fret: ${note}/${fret}`);
  const midi = (Number(match[2]) + 1) * 12 + NOTE_INDEX[match[1]] + fret;
  return `${SHARP_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
}

export function chordNotes(chordId, tuning = STANDARD_TUNING) {
  const chord = CHORDS[chordId];
  if (!chord) throw new Error(`unknown guitar chord: ${chordId}`);
  return chord.frets.map((fret, string) => fret == null ? null : noteAtFret(tuning[string], fret));
}
