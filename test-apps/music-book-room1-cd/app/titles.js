// Speaking a piece's name.
//
// AUDIO-DIRECTION.md decision 7: titles are PRE-RENDERED clips, not browser
// speechSynthesis. The reason is pronunciation — an English system voice says
// "fur ee-lyse" for Für Elise, and a book whose job is teaching a child what
// these pieces are called cannot teach them the wrong name.
//
// Whole-sentence clips live under `audio/titles/sentences/` and are preferred.
// Name-only clips stay under `audio/titles/` as a fallback. Until a clip exists
// the title box still works and still highlights; it simply stays quiet.
// It never falls back to speechSynthesis: a robot mispronouncing the name is
// worse than silence, and silence is honest about what is missing.

const cache = new Map();
let current = null;
let engine = null;

export function configureTitles(options = {}) {
  engine = options.engine || null;
}

// Every id has a sentence clip, composers included: since 2026-09-24 they say
// "This composer is called <name>." (composer-traditional: "These are
// traditional songs."). tools/check-title-clips.mjs fails if any id lacks one.
function sentencePath(pieceId) {
  return `audio/titles/sentences/${pieceId}.m4a`;
}

function namePath(pieceId) {
  return `audio/titles/${pieceId}.m4a`;
}

export function titleClipPath(pieceId) {
  // Public API: prefer the sentence clip.
  return sentencePath(pieceId);
}

export async function speakTitle(pieceId) {
  if (current) { current.pause(); current = null; }
  let audio = cache.get(pieceId);
  if (!audio) {
    // Play the sentence clip directly. No existence probe first: awaiting a
    // fetch before play() spends the tap's user-activation on iPad Safari (the
    // clip may then refuse to start), and a HEAD request is never answered by
    // the offline cache. If the sentence clip fails to load, switch once to the
    // legacy name clip and play that instead.
    const sentence = sentencePath(pieceId);
    const fallback = namePath(pieceId);
    audio = new Audio(sentence);
    audio.preload = 'none';
    if (sentence !== fallback) {
      audio.addEventListener('error', function onErr() {
        audio.removeEventListener('error', onErr);
        audio.src = fallback;
        // Offline, the name clip fails too: release the duck so the music comes back.
        audio.play().catch(() => { if (engine) engine.duck('voice', false); });
      });
    }
    cache.set(pieceId, audio);
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
    // When the sentence clip fails to load, its play() rejects AFTER the error
    // listener above has already started the name clip. Releasing the duck then
    // would play the fallback under full-volume music, so only release it when
    // nothing is playing.
    if (engine && audio.paused) engine.duck('voice', false);
    // No clip rendered yet, or the file is missing. Deliberately silent.
    return false;
  }
}
