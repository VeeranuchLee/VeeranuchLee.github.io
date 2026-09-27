import { LEARN_MORE_CORE_WORDS, LEARN_MORE_ROOM_CLIPS } from './learnmore-clips.js';

let engine = null;
let audio = null;

export function configureLearnMore(options = {}) {
  engine = options.engine ?? null;
}

export function roomClipId(room) {
  return LEARN_MORE_ROOM_CLIPS[room.number - 1] ?? null;
}

export function vocabClipId(label) {
  const id = `chip-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
  return LEARN_MORE_CORE_WORDS.has(id) ? id : null;
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
