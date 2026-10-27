// Display-only note following for the listening rooms.
// Pure model helpers live here so every play-along song can be checked in Node.

const NATURAL = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function midiForPitch(name) {
  const match = /^([A-G])(#|b)?(-?\d+)$/.exec(name || '');
  if (!match) return null;
  return (Number(match[3]) + 1) * 12 + NATURAL[match[1]] +
    (match[2] === '#' ? 1 : match[2] === 'b' ? -1 : 0);
}

export function keyForPitch(name) {
  const midi = midiForPitch(name);
  if (midi === null) return null;
  return `${SHARPS[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
}

export function noteLabel(name) {
  if (!name) return '';
  return name.replace('#', '♯').replace('b', '♭').replace(/-?\d+$/, '');
}

export function notesForFollowing(score) {
  if (Array.isArray(score?.notes)) return { trackId: 'melody', notes: score.notes };
  const tracks = Array.isArray(score?.tracks) ? score.tracks : [];
  const track = tracks.find((item) => item.id === 'melody') || tracks[0];
  return { trackId: track?.id || null, notes: track?.notes || [] };
}

export function stripTokens(notes) {
  return notes.map((note, index) => {
    const pitches = note?.n == null ? [] : (Array.isArray(note.n) ? note.n : [note.n]);
    return {
      index,
      rest: pitches.length === 0,
      pitches,
      keys: pitches.map(keyForPitch),
      label: pitches.map(noteLabel).join('·')
    };
  });
}

export function keyboardForNotes(notes) {
  const midis = notes.flatMap((note) => {
    const pitches = note?.n == null ? [] : (Array.isArray(note.n) ? note.n : [note.n]);
    return pitches.map(midiForPitch).filter((midi) => midi !== null);
  });
  if (!midis.length) return { whites: [], blacks: [] };

  // The whole 88-key piano, A0 to C8, as one long strip (owner 2026-10-27:
  // "Can we fit 88 on iPad screen? It can be long strip like.").
  const low = 21;
  const high = 108;

  const whites = [];
  const blacks = [];
  for (let midi = low; midi <= high; midi += 1) {
    const pitch = `${SHARPS[midi % 12]}${Math.floor(midi / 12) - 1}`;
    if (pitch.includes('#')) blacks.push({ pitch, midi });
    else whites.push({ pitch, midi });
  }
  return { whites, blacks };
}

export function followModel(score) {
  const { trackId, notes } = notesForFollowing(score);
  return { trackId, notes, tokens: stripTokens(notes), keyboard: keyboardForNotes(notes) };
}

// Select the exact scheduler slots belonging to the followed melody. The UI
// consumes these AudioContext times directly; no second tempo calculation and
// no animation-frame sampling is allowed to invent a parallel clock.
export function followSchedule(model, timeline) {
  if (!model?.trackId || !Array.isArray(timeline)) return [];
  return timeline
    .filter((slot) => slot.track === model.trackId)
    .sort((a, b) => a.at - b.at || a.index - b.index)
    .map((slot) => ({ index: slot.index, at: slot.at, until: slot.until }));
}
