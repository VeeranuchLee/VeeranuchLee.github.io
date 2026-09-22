/* Keyboard — the record/play voice guidance player.
 *
 * OWNER REQUEST, 2026-09-21: "consider short voice guidance — 'Recording!',
 * 'Recording stopped.', 'Let's play it back.', 'Finished!', possibly guidance
 * when Record/Play is pressed in an invalid state."
 *
 * AUDIO-DIRECTION.md governs every choice here:
 *   - clips are PRE-RENDERED FILES (never speechSynthesis, never a runtime API
 *     call — the under-13 rule), rendered offline by tools/render-guidance.py;
 *   - the player is SILENT-TOLERANT: with no clips rendered yet (the voice is
 *     an owner decision, see the work log), every call is a no-op the state
 *     words carry on their own. A missing clip must never look broken.
 *
 * The pattern is music-book/app/titles.js: one HTMLAudioElement per clip,
 * preload none, cached, error-swallowing.
 */
(function () {
  "use strict";

  const KB = (window.KB = window.KB || {});
  const cache = new Map();
  const NAMES = ["recording", "stopped", "finished", "record-first"];

  KB.guidance = {
    /* play("recording") and friends. Deliberately not awaited and not queued:
       a new state word replaces an old one, and the same is true of its voice.
       The whole body is guarded: a harness with no Audio constructor (and any
       world with no clips) must leave the state words to carry on alone. */
    play(name) {
      if (NAMES.indexOf(name) < 0) return;
      try {
        let audio = cache.get(name);
        if (!audio) {
          audio = new Audio("./audio/guidance/" + name + ".m4a");
          audio.preload = "none";
          audio.volume = 0.9;
          audio.onerror = () => { /* silent-tolerant by design */ };
          cache.set(name, audio);
        }
        audio.pause();
        audio.currentTime = 0;
        audio.play().catch(() => { /* no clip, or no gesture yet: fine */ });
      } catch (e) { /* keep going */ }
    },
  };
})();
