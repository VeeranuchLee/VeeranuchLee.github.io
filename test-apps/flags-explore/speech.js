// flags-app/speech.js — the interim narration layer.
//
// AUDIO-DIRECTION.md: every shipped audio *file* must be AI-generated, and a
// designed voice is the end state (decision 8: one designed voice per app).
// Until that voice exists this app speaks through browser speechSynthesis —
// the time-book precedent, "fully robot until the day it is fully voiced" —
// never through an API call from the child's app.
//
// The structure is deliberately the solar-system-game shape so the swap is a
// file addition, not a rewrite: speech flows through say(), and say() asks
// resolve(lineId) for a rendered clip first. clips.json + audioReady arrive
// with the designed-voice task; audioReady stays all-or-nothing — a
// half-rendered set stays robot rather than half-talking.

var FlagsSpeech = (function () {
  'use strict';

  // null until a rendered clip bank exists (see solar-system-game
  // narration/clips.json). resolve() returning null means "speak robot".
  var CLIPS = null;
  var AUDIO_READY = false;

  function resolve(lineId) {
    if (!AUDIO_READY || !CLIPS) return null;
    return CLIPS[lineId] || null;
  }

  var enabled = true;
  var queue = [];
  var speaking = false;
  // Bumped on every stop()/new utterance. A cancelled utterance may never
  // fire onend/onerror (known iOS behaviour), so its fallback net checks the
  // generation before finishing — a stale net must not desync a newer
  // utterance (the math app's stale-callback guard class).
  var generation = 0;

  function setEnabled(on) {
    enabled = !!on;
    if (!enabled) stop();
  }

  // One sentence per utterance, chained — never one speechSynthesis call
  // per sentence fired back to back (the 4-5 ms seam lesson from the math
  // app: browsers blend separate utterances into a run-on).
  function say(text, lineId) {
    if (!enabled || !text) return;
    queue.push({ text: String(text), lineId: lineId || null });
    pump();
  }

  function pump() {
    if (speaking || queue.length === 0) return;
    var item = queue.shift();

    var clipUrl = resolve(item.lineId);
    if (clipUrl) {
      speaking = true;
      var audio = new Audio(clipUrl);
      var audioGeneration = generation;
      audio.onended = audio.onerror = function () {
        if (audioGeneration !== generation) return;
        speaking = false;
        pump();
      };
      audio.play().catch(function () {
        if (audioGeneration !== generation) return;
        speaking = false;
        pump();
      });
      return;
    }

    if (!('speechSynthesis' in window)) return;
    speaking = true;
    generation += 1;
    var myGeneration = generation;

    var utterance = new SpeechSynthesisUtterance(item.text);
    utterance.rate = 0.92; // unhurried, for young listeners
    utterance.pitch = 1.05;
    utterance.volume = 1;

    // Prefer a plain English voice; which one exists is platform luck and
    // must not decide whether the app talks.
    var voices = window.speechSynthesis.getVoices() || [];
    var pick = null;
    for (var i = 0; i < voices.length; i++) {
      var lang = (voices[i].lang || '').toLowerCase();
      if (lang.indexOf('en') !== 0) continue;
      if (!pick) pick = voices[i];
      if (lang === 'en-us' || lang === 'en-gb') { pick = voices[i]; break; }
    }
    if (pick) utterance.voice = pick;

    var done = false;
    var net = null;
    var finish = function () {
      if (done || myGeneration !== generation) return;
      done = true;
      if (net) clearTimeout(net);
      speaking = false;
      pump();
    };
    utterance.onend = finish;
    utterance.onerror = finish;

    // iOS Safari sometimes never fires onend; the net is an estimated
    // duration, the same guard the math app uses.
    var fallbackMs = Math.max(1400, item.text.length * 90);
    net = setTimeout(finish, fallbackMs + 800);

    window.speechSynthesis.speak(utterance);
    // Speak-on-tap requires a warm synthesis engine on some iOS versions.
    try { window.speechSynthesis.resume(); } catch (e) { /* fine */ }
  }

  function stop() {
    queue.length = 0;
    generation += 1; // orphan any pending fallback net
    try { window.speechSynthesis.cancel(); } catch (e) { /* fine */ }
    speaking = false;
  }

  return {
    say: say,
    stop: stop,
    setEnabled: setEnabled,
    isEnabled: function () { return enabled; }
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = FlagsSpeech;
}
