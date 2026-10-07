// Toy Guitar — pitch table. Pure; no DOM, no audio.
//
// Standard tuning, string 6 (low E) to string 1 (high E). Throughout this
// app a string is addressed by its LANE INDEX 0..5 in physical order, so
// lane 0 is the low E (string 6) and lane 5 is the high E (string 1). A
// downward strum crosses lanes in increasing order.

export const STRING_COUNT = 6;
export const FRET_COUNT = 12;

export const OPEN_MIDI = Object.freeze([40, 45, 50, 55, 59, 64]); // E2 A2 D3 G3 B3 E4
export const OPEN_NAMES = Object.freeze(['E2', 'A2', 'D3', 'G3', 'B3', 'E4']);
export const STRING_LABELS = Object.freeze(['6 low E', '5 A', '4 D', '3 G', '2 B', '1 high E']);

const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function midiToFrequency(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }

export function midiToName(midi) {
  return NAMES[((midi % 12) + 12) % 12] + (Math.floor(midi / 12) - 1);
}

export function checkPosition(lane, fret) {
  if (!Number.isInteger(lane) || lane < 0 || lane >= STRING_COUNT) throw new RangeError(`no such string lane: ${lane}`);
  if (!Number.isInteger(fret) || fret < 0 || fret > FRET_COUNT) throw new RangeError(`no such fret: ${fret}`);
}

export function positionMidi(lane, fret) {
  checkPosition(lane, fret);
  return OPEN_MIDI[lane] + fret;
}

// Equal-tempered frequency of a lane/fret, with an optional bend in cents.
export function positionFrequency(lane, fret, bendCents = 0) {
  return midiToFrequency(positionMidi(lane, fret)) * Math.pow(2, bendCents / 1200);
}

export function positionName(lane, fret) { return midiToName(positionMidi(lane, fret)); }
