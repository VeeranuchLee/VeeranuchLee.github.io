// Speaking a song-info explanation: facts and knowledge-glossary lines.
//
// Owner decision 2026-09-25: "make button -> pop up text and voice." The voice
// layer is PRE-RENDERED ElevenLabs clips, never browser speechSynthesis and never
// a live API call (AUDIO-DIRECTION.md under-13 rule; see SONG-EXPLANATIONS-SPEC.md
// section 5). The app builds each clip's path by id from the piece, exactly like
// app/titles.js builds `audio/titles/<id>.m4a`:
//
//   audio/explain/<pieceId>-facts.m4a        the facts paragraph as one clip
//   audio/explain/knowledge-<glossaryId>.m4a one shared glossary card, rendered once
//
// No clip ships in this pilot pass (the render task is owner-approved and separate),
// so most or all of these paths are 404s for now. The button still works and the
// popup still shows the text; it simply stays quiet. It never falls back to
// speechSynthesis: a robot voice is worse than silence, and silence is honest about
// what is missing — the same rule titles.js states for names.
//
// The per-clip existence probe is deliberately absent. Awaiting a fetch before
// play() would spend the tap's user-activation on iPad Safari (the clip may then
// refuse to start), and a HEAD request is never answered by the offline cache.
// play() either starts or rejects; a rejection releases the duck and the passage
// ends silent.

const cache = new Map();
let current = null;
let engine = null;

export function configureExplain(options = {}) {
  engine = options.engine || null;
}

function explainPath(clipId) {
  return `audio/explain/${clipId}.m4a`;
}

export function explainClipPath(clipId) {
  return explainPath(clipId);
}

// Stop any in-flight explanation clip and release the voice duck. Called by the
// app when a popup closes, so narration never outlives the text that asked for it.
export function stopExplain() {
  if (current) {
    current.pause();
    current = null;
  }
  if (engine) engine.duck('voice', false);
}

export async function speakExplain(clipId) {
  if (current) { current.pause(); current = null; }
  let audio = cache.get(clipId);
  if (!audio) {
    audio = new Audio(explainPath(clipId));
    audio.preload = 'none';
    // No fallback file: a facts clip has exactly one spoken form. Offline, the
    // play() rejection below releases the duck so the music comes back.
    cache.set(clipId, audio);
  }
  try {
    audio.currentTime = 0;
    current = audio;
    if (engine) {
      engine.connectVoice(audio);
      engine.duck('voice', true);
    }
    audio.onended = () => {
      if (current === audio) current = null;
      if (engine) engine.duck('voice', false);
    };
    audio.onpause = () => {
      if (engine && audio.currentTime < audio.duration) engine.duck('voice', false);
    };
    await audio.play();
    return true;
  } catch (err) {
    // No clip rendered yet, or the file is missing. Release the duck unless a
    // pause handler already did (an interrupted play leaves currentTime at 0).
    if (engine && audio.paused) engine.duck('voice', false);
    return false;
  }
}