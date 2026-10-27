import { LEARN_MORE_ROOM_SCRIPTS, LEARN_MORE_WORD_MEANINGS } from './learnmore-clips.js';

let engine = null;
let audio = null;

export function configureLearnMore(options = {}) {
  engine = options.engine ?? null;
}

export function roomClipId(room) {
  const id = `room-${String(room.number).padStart(2, '0')}`;
  return Object.hasOwn(LEARN_MORE_ROOM_SCRIPTS, id) ? id : null;
}

export function roomScript(room) { return LEARN_MORE_ROOM_SCRIPTS[roomClipId(room)] ?? null; }

export function vocabClipId(label) {
  const id = `chip-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
  return Object.hasOwn(LEARN_MORE_WORD_MEANINGS, id) ? id : null;
}

// Owner, 2026-10-04, verbatim: "i think we need to add more info to the info
// bar (on some page, because they currently look thin)". Twelve rooms showed
// one word card or none. Two kinds of already-recorded content fill them, and
// nothing here needs a new recording:
//  1. Words from the book's 30 rendered meanings that are true of THIS room's
//     songs even though the curation's room vocabulary does not list them
//     (that list mostly names words with no clip yet). Each entry is a claim
//     about the room's music — say which song makes it true before adding one.
//  2. A "True story" card for every song in the room that has an approved,
//     rendered fact (the same text and clip as the song's 💡 popup).
// Meaning lines for the curation's own unrecorded words are listed for the
// owner in the 2026-10-04 discussion-log entry; they appear on their own once
// rendered, as before.
export const ROOM_EXTRA_WORDS = {
  // My Bonnie ("Bring back") and Home on the Range ("Home, home on the range")
  'home-distance-belonging': ['verse', 'refrain'],
  // three flower songs, each its own tune and words
  'gardens-season-memory': ['melody', 'lyrics'],
  // Rasa Sayang's "Rasa sayang, hey!" comes back after every verse
  'southeast-asian-courtyard': ['melody', 'lyrics', 'refrain'],
  // the script: "each band can keep the tune and change the sound"
  'roads-prayer-city-sea': ['melody', 'arrangement', 'lyrics'],
  // Waltzing Matilda and La Bamba refrains; El Cóndor Pasa's later arrangements
  'when-song-means-home': ['melody', 'lyrics', 'refrain', 'arrangement'],
  // Jingle Bells and Auld Lang Syne: verses, then a chorus that returns
  'celebration-square': ['verse', 'refrain'],
  // "Fa la la" in Deck the Hall, "Noel, Noel" in The First Noel
  'winter-lanterns': ['verse', 'refrain'],
  // the Canon's eight-note bass repeats under everything
  'baroque-pattern-workshop': ['repeat'],
  'music-learns-to-sing': ['melody'],
  // Chopin's nocturne: a singing melody over a left-hand accompaniment
  'piano-diary': ['melody', 'accompaniment'],
  // Mountain King's short idea; Danse macabre is a waltz
  'when-music-storybook': ['motif', 'waltz'],
  // Bumblebee's runs; the Promenade comes back changed between pictures
  'pictures-legends-russian-colour': ['melody', 'scale', 'variation'],
  // the polka and the habanera are dances with their own rhythm
  'three-theatre-cities': ['dance', 'rhythm'],
  // Gymnopédie: a slow melody over a gentle accompaniment
  'painting-with-sound': ['melody', 'accompaniment'],
  // ragtime's left-hand bass and its rhythm; Jupiter against Mars
  'new-century-many-sounds': ['rhythm', 'bass line', 'contrast']
};

// Every word card a room's scroll shows, in order: its own voiced vocabulary,
// then its extra words, each clip once. Only words with a rendered meaning clip
// become cards — a card that cannot speak would be a silent control.
export function roomWordCards(room) {
  const seen = new Set();
  return [...room.keyVocabulary, ...(ROOM_EXTRA_WORDS[room.id] || [])]
    .map((label) => ({ label, clipId: vocabClipId(label) }))
    .filter((w) => w.clipId && !seen.has(w.clipId) && seen.add(w.clipId));
}

export function vocabMeaning(label) { return LEARN_MORE_WORD_MEANINGS[vocabClipId(label)] ?? null; }

// Return a fixed-position box inside the safe rectangle shared by the popup
// and viewport. The arrow follows the chip after the box is clamped.
export function placeMeaningBubble(anchor, bubble, popup, viewport, margin = 12) {
  const bounds = {
    left: Math.max(margin, popup.left + margin),
    top: Math.max(margin, popup.top + margin),
    right: Math.min(viewport.width - margin, popup.right - margin),
    bottom: Math.min(viewport.height - margin, popup.bottom - margin)
  };
  const width = Math.min(bubble.width, Math.max(0, bounds.right - bounds.left));
  const height = Math.min(bubble.height, Math.max(0, bounds.bottom - bounds.top));
  const below = anchor.bottom + margin;
  const above = anchor.top - margin - height;
  const side = below + height <= bounds.bottom || above < bounds.top ? 'below' : 'above';
  const top = Math.min(bounds.bottom - height, Math.max(bounds.top, side === 'below' ? below : above));
  const left = Math.min(bounds.right - width, Math.max(bounds.left, anchor.left + anchor.width / 2 - width / 2));
  const arrow = Math.min(width - 18, Math.max(18, anchor.left + anchor.width / 2 - left));
  return { left, top, width, height, arrow, side };
}

export function stopLearnMore() {
  if (audio) {
    audio.pause();
    audio.currentTime = 0;
    audio = null;
  }
  if (engine) engine.duck('voice', false);
}

// `onEnd` runs once when THIS clip finishes or fails — never for a clip that a
// later call already stopped, so a word tapped after another cannot be closed
// early by the first clip's ending.
// `src` lets the word scroll's "True story" cards play a song's existing facts
// clip (audio/explain/) through this same one-at-a-time player.
export function speakLearnMore(clipId, onEnd, src = null) {
  stopLearnMore();
  if (!clipId || typeof Audio === 'undefined') return false;
  const clip = new Audio(src || `audio/learnmore/${clipId}.m4a`);
  audio = clip;
  if (engine) {
    engine.connectVoice(clip);
    engine.duck('voice', true);
  }
  const release = () => {
    if (audio !== clip) return;
    if (engine) engine.duck('voice', false);
    audio = null;
    if (onEnd) onEnd();
  };
  clip.addEventListener('ended', release, { once: true });
  clip.addEventListener('error', release, { once: true });
  clip.play().catch(release);
  return true;
}
