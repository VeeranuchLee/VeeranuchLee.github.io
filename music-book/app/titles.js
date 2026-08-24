// Speaking a piece's name.
//
// AUDIO-DIRECTION.md decision 7: titles are PRE-RENDERED clips under
// `music-book/audio/titles/`, not browser speechSynthesis. The reason is
// pronunciation — an English system voice says "fur ee-lyse" for Für Elise, and
// a book whose job is teaching a child what these pieces are called cannot
// teach them the wrong name.
//
// Clips are rendered offline from `audio/titles/manifest.json`. Until a clip
// exists the title box still works and still highlights; it simply stays quiet.
// It never falls back to speechSynthesis: a robot mispronouncing the name is
// worse than silence, and silence is honest about what is missing.

const cache = new Map();
let current = null;

export function titleClipPath(pieceId) {
  return `audio/titles/${pieceId}.m4a`;
}

export async function speakTitle(pieceId) {
  if (current) { current.pause(); current = null; }
  let audio = cache.get(pieceId);
  if (!audio) {
    audio = new Audio(titleClipPath(pieceId));
    audio.preload = 'none';
    cache.set(pieceId, audio);
  }
  try {
    audio.currentTime = 0;
    current = audio;
    await audio.play();
    return true;
  } catch (err) {
    // No clip rendered yet, or the file is missing. Deliberately silent.
    return false;
  }
}
