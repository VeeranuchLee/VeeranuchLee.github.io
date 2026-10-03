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

export function speakLearnMore(clipId) {
  stopLearnMore();
  if (!clipId || typeof Audio === 'undefined') return false;
  audio = new Audio(`audio/learnmore/${clipId}.m4a`);
  if (engine) {
    engine.connectVoice(audio);
    engine.duck('voice', true);
  }
  const release = () => {
    if (engine) engine.duck('voice', false);
    audio = null;
  };
  audio.addEventListener('ended', release, { once: true });
  audio.addEventListener('error', release, { once: true });
  audio.play().catch(release);
  return true;
}
