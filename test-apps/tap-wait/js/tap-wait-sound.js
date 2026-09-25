/*
 * Tap or Wait — interaction feedback, synthesised in WebAudio.
 * AUDIO-DIRECTION.md: no shipped effects, samples or narration. A missing AudioContext
 * is harmless; the visual feedback remains complete without sound.
 */
(function (root) {
  "use strict";
  var context = null;
  var muted = false;
  try { muted = root.localStorage && root.localStorage.getItem("tap-wait-muted") === "1"; } catch (e) { muted = false; }

  function getContext() {
    if (context) return context;
    var AudioCtor = root.AudioContext || root.webkitAudioContext;
    if (!AudioCtor) return null;
    try { context = new AudioCtor(); } catch (e) { context = null; }
    return context;
  }

  function note(type, from, to, at, length, volume) {
    var ctx = getContext();
    if (!ctx || muted) return;
    try {
      if (ctx.state === "suspended" && ctx.resume) ctx.resume();
      var start = ctx.currentTime + (at || 0);
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(from, start);
      if (to) osc.frequency.exponentialRampToValueAtTime(to, start + length);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(start); osc.stop(start + length + 0.03);
    } catch (e) { /* silence is an acceptable failure */ }
  }

  root.TapWaitSound = {
    unlock: function () {
      var ctx = getContext();
      if (ctx && ctx.state === "suspended" && ctx.resume) ctx.resume();
    },
    tap: function () { note("triangle", 440, 0, 0, .08, .08); },
    correct: function () {
      note("triangle", 523.25, 783.99, 0, .16, .11);
      note("sine", 1046.5, 0, .12, .24, .06);
    },
    wrong: function () { note("sine", 220, 165, 0, .16, .09); },
    missed: function () { note("sine", 196, 147, 0, .22, .055); },
    roundEnd: function () {
      [523.25, 659.25, 783.99].forEach(function (frequency, index) {
        note("triangle", frequency, 0, index * .12, .25, .1);
      });
    },
    isMuted: function () { return muted; },
    setMuted: function (value) {
      muted = !!value;
      try { root.localStorage && root.localStorage.setItem("tap-wait-muted", muted ? "1" : "0"); } catch (e) {}
    },
    available: function () { return !!(root.AudioContext || root.webkitAudioContext); }
  };
})(typeof self !== "undefined" ? self : this);
