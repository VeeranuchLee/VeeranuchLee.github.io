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
//
// The clips play THROUGH THE MIXER rather than straight to the output, which is
// decision 9's doing. A background bed that cannot hear the title clip coming
// will talk over it, and the one thing this feature exists to deliver is a name
// pronounced clearly. So each element is handed to the audio graph once and the
// background is pulled down for as long as a title is speaking.

const cache = new Map();
const routed = new Set();
let current = null;
let engine = null;
let soundOn = () => true;

/**
 * @param {object}   opts
 * @param {object}   opts.engine   the AudioEngine, for routing and ducking
 * @param {function} opts.soundOn  the Sound toggle; false means say nothing
 */
export function configureTitles(opts) {
  engine = opts.engine || null;
  if (opts.soundOn) soundOn = opts.soundOn;
}

export function titleClipPath(pieceId) {
  return `audio/titles/${pieceId}.m4a`;
}

function release(audio) {
  // Only the clip that is actually current may lift the duck. Interrupting one
  // title with another pauses the first, and a pause handler that released
  // unconditionally would let the background surge back up underneath the
  // title that just started.
  if (current !== audio) return;
  current = null;
  if (engine) engine.duck('voice', false);
}

export async function speakTitle(pieceId) {
  // Sound off means silent. The name plate still lights up when tapped, so the
  // tap is never dead — it just does not speak.
  if (!soundOn()) return false;

  const previous = current;
  current = null;
  if (previous) previous.pause();

  let audio = cache.get(pieceId);
  if (!audio) {
    audio = new Audio(titleClipPath(pieceId));
    audio.preload = 'none';
    // Wired once, at creation. Elements are cached and re-played, so wiring
    // them per tap would stack a listener a turn.
    audio.addEventListener('ended', () => release(audio));
    audio.addEventListener('pause', () => release(audio));
    cache.set(pieceId, audio);
  }
  if (engine && !routed.has(audio)) {
    // A media element takes exactly one source node in its lifetime, so this
    // happens once and is remembered. If the browser refuses, the element plays
    // on its own: an un-ducked title is a worse mix, a silent one is a bug.
    if (engine.connectVoice(audio)) routed.add(audio);
  }
  try {
    audio.currentTime = 0;
    current = audio;
    if (engine) engine.duck('voice', true);
    await audio.play();
    return true;
  } catch (err) {
    // No clip rendered yet, or the file is missing. Deliberately silent — but
    // the background has to come back up, or one missing clip leaves the whole
    // page quiet for as long as the child stays on it.
    release(audio);
    return false;
  }
}
