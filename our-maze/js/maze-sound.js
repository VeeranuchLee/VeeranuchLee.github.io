/*
 * Our Maze — interaction sounds, synthesised in WebAudio.
 *
 * AUDIO-DIRECTION.md: interaction sounds are synthesised at runtime and never shipped
 * as files. No narration, no samples. Every cue is a few oscillator notes through one
 * gain envelope, so there is nothing to load and nothing to license.
 *
 * The context is created on the first user gesture (iOS Safari refuses to start one
 * otherwise) and a missing or broken WebAudio simply means silence: the game never
 * depends on a sound playing.
 */
(function (root) {
  "use strict";
  var ctx = null;
  var muted = false;
  try { muted = root.localStorage && root.localStorage.getItem("our-maze-muted") === "1"; } catch (e) { muted = false; }

  function audio() {
    if (ctx) return ctx;
    var AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC(); } catch (e) { ctx = null; }
    return ctx;
  }

  // One note: type, start frequency, optional end frequency, start offset, length, peak gain.
  function note(type, f0, f1, at, len, peak) {
    var c = audio();
    if (!c || muted) return;
    try {
      if (c.state === "suspended" && c.resume) c.resume();
      var t = c.currentTime + (at || 0);
      var o = c.createOscillator();
      var g = c.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f0, t);
      if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + len);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + len);
      o.connect(g); g.connect(c.destination);
      o.start(t); o.stop(t + len + 0.02);
    } catch (e) { /* silence is an acceptable failure */ }
  }

  var MazeSound = {
    unlock: function () { var c = audio(); if (c && c.state === "suspended" && c.resume) c.resume(); },
    // A soft wooden tick for each accepted step; pitch wanders a little so a long slide
    // does not sound like a metronome.
    step: function (n) { note("triangle", 620 + ((n || 0) % 4) * 40, 0, 0, 0.07, 0.10); },
    // A gentle low "bonk" for a wall: felt, not scolded.
    bump: function () { note("sine", 190, 120, 0, 0.16, 0.16); },
    pick: function () { note("triangle", 523, 0, 0, 0.09, 0.10); note("triangle", 784, 0, 0.06, 0.12, 0.08); },
    // The finish: a rising four-note arpeggio and a sparkle on top.
    win: function () {
      [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) { note("triangle", f, 0, i * 0.11, 0.32, 0.13); });
      note("sine", 2093, 0, 0.46, 0.4, 0.05);
      note("sine", 2637, 0, 0.56, 0.35, 0.04);
    },
    isMuted: function () { return muted; },
    setMuted: function (m) {
      muted = !!m;
      try { root.localStorage && root.localStorage.setItem("our-maze-muted", muted ? "1" : "0"); } catch (e) { /* per-viewer convenience only */ }
    },
    // True when this device can make a sound at all; the speaker button hides otherwise
    // (a mute button on a silent device is a control that does nothing).
    available: function () { return !!(root.AudioContext || root.webkitAudioContext); },
  };
  root.MazeSound = MazeSound;
})(typeof self !== "undefined" ? self : this);
