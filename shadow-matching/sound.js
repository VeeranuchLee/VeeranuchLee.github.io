/* Shadow Matching — the sound controller. The only thing in this app that makes a sound.
 *
 * WHAT IT SAYS. Six short cues, each about what just happened in the game and nothing else
 * (OLDER-KID-SPEC.md sections 9-12): correct, wrong, mismatch, hint, resolve, complete. No
 * music, no tap clicks. Every cue has a visible equivalent already on screen -- the green
 * border, the line under the picture, the finish screen -- so the game is whole with sound off.
 *
 * WHERE THE SOUNDS COME FROM. Nowhere: they are synthesised here, a few sine and triangle
 * tones through Web Audio. No file, no network request, no generator, nothing bought, so
 * there is no provenance to track and nothing for a worker to cache. The audio direction's
 * "all audio is AI-generated" rule is about voices and recordings; these are tones.
 *
 *   correct   two warm rising notes, E5 then A5 -- short, so it never holds up the next tap
 *   wrong     one soft low note, 330 Hz -- "look again", not a buzzer and not a fall
 *   mismatch  the same low note as wrong, quieter still -- Memory's "turn them back", not a
 *             miss; a child exploring a memory board is not wrong for not knowing yet
 *   hint      one very quiet high note with a slow start -- neither praise nor a miss
 *   resolve   one mellow middle note -- "here it is", deliberately NOT the success sound
 *   complete  C E G C, quick and small -- a little more than correct, far short of a fanfare
 *
 * iPAD. Safari starts every AudioContext suspended and only lets a page start one inside a
 * real user gesture. So nothing is created at load: the first pointerdown (touchend and
 * keydown too) creates the context, resumes it and plays one silent sample, synchronously,
 * inside that gesture. The listener stays, because iOS suspends ("interrupts") the context
 * again after the app goes to the background, and the next tap has to wake it.
 *
 * A cue asked for while the context is not running is DROPPED, not queued. Queued notes on a
 * suspended context all sound at once when it wakes -- a pile of stale cues the moment a child
 * taps again. Every cue also stops the one before it, so fast taps give one clean cue each,
 * never a chord of leftovers; stop() runs on every screen change and when the page is hidden,
 * so nothing sounds on after the child leaves.
 *
 * ANY FAILURE IS SILENCE. No Web Audio, a constructor that throws, storage that refuses --
 * each ends in a quiet game that plays exactly as before, never in an error.
 *
 * THE SETTING. On by default; the speaker button's choice is kept in localStorage under
 * `shadow-matching-sound` ("on" / "off") so a reload does not undo a child's mute.
 */
'use strict';

var Sound = (function () {
  var KEY = 'shadow-matching-sound';
  var Ctor = (typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)) || null;
  var ctx = null;
  var voices = [];
  var played = [];            /* the cues that actually sounded, newest last, for the harness */
  var enabled = true;
  try { enabled = window.localStorage.getItem(KEY) !== 'off'; } catch (e) { enabled = true; }

  function unlock() {
    if (!Ctor) return;
    try {
      if (!ctx) ctx = new Ctor();
      if (ctx.state !== 'running' && ctx.resume) {
        var p = ctx.resume();
        if (p && p.catch) p.catch(function () {});
      }
      /* The iOS unlock proper: a one-sample silent buffer started inside the gesture. */
      var src = ctx.createBufferSource();
      src.buffer = ctx.createBuffer(1, 1, 22050);
      src.connect(ctx.destination);
      src.start(0);
    } catch (e) {
      ctx = null; Ctor = null;           /* this device will not do Web Audio: stay silent */
    }
  }
  ['pointerdown', 'touchend', 'keydown'].forEach(function (type) {
    try { document.addEventListener(type, unlock, true); } catch (e) { /* no document */ }
  });
  try {
    document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); });
  } catch (e) { /* no document */ }

  function stop() {
    for (var i = 0; i < voices.length; i++) {
      try { voices[i].gain.gain.cancelScheduledValues(0); voices[i].osc.stop(0); } catch (e) { /* already ended */ }
    }
    voices = [];
  }

  /* notes: [frequency Hz, start offset s, duration s, peak gain, attack s, waveform] */
  function play(name, notes) {
    if (!enabled || !ctx) return false;
    if (ctx.state !== 'running') {       /* dropped, not queued -- see the note at the top */
      try { ctx.resume(); } catch (e) { /* ignore */ }
      return false;
    }
    stop();
    try {
      var t0 = ctx.currentTime + 0.005;
      notes.forEach(function (n) {
        var osc = ctx.createOscillator(), gain = ctx.createGain();
        var t = t0 + n[1], end = t + n[2];
        osc.type = n[5] || 'sine';
        osc.frequency.setValueAtTime(n[0], t);
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.linearRampToValueAtTime(n[3], t + (n[4] || 0.012));
        gain.gain.exponentialRampToValueAtTime(0.0001, end);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(t); osc.stop(end + 0.02);
        voices.push({ osc: osc, gain: gain });
      });
    } catch (e) {
      stop();
      return false;
    }
    played.push(name);
    if (played.length > 50) played.shift();
    return true;
  }

  return {
    correct:  function () { return play('correct',  [[659.3, 0, 0.16, 0.16, 0.01, 'triangle'], [880, 0.09, 0.22, 0.16, 0.01, 'triangle']]); },
    wrong:    function () { return play('wrong',    [[330, 0, 0.16, 0.10, 0.015, 'sine']]); },
    mismatch: function () { return play('mismatch', [[330, 0, 0.14, 0.045, 0.02, 'sine']]); },
    hint:     function () { return play('hint',     [[1046.5, 0, 0.36, 0.05, 0.06, 'sine']]); },
    resolve:  function () { return play('resolve',  [[523.3, 0, 0.34, 0.11, 0.02, 'sine']]); },
    complete: function () {
      return play('complete', [[523.3, 0, 0.14, 0.13, 0.01, 'triangle'], [659.3, 0.08, 0.14, 0.13, 0.01, 'triangle'],
                               [784, 0.16, 0.14, 0.13, 0.01, 'triangle'], [1046.5, 0.24, 0.36, 0.13, 0.01, 'triangle']]);
    },
    /* The confirmation when the speaker is turned back on: the quiet hint note, so the child
       hears that sound is back without it meaning anything about the game. */
    on:       function () { return play('on',       [[1046.5, 0, 0.2, 0.06, 0.02, 'sine']]); },
    stop: stop,
    available: function () { return !!Ctor; },
    isEnabled: function () { return enabled; },
    setEnabled: function (on) {
      enabled = !!on;
      if (!enabled) stop();
      try { window.localStorage.setItem(KEY, enabled ? 'on' : 'off'); } catch (e) { /* kept for this visit only */ }
      return enabled;
    },
    played: played,
    voices: function () { return voices.length; }
  };
})();
