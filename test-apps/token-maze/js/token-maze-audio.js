/*
 * Token Maze — sound. Every sound is synthesised at runtime with WebAudio
 * (AUDIO-DIRECTION.md decision 6): soft, short, pleasant; no audio files ship,
 * nothing is sampled, there is no speech. The context is created and resumed on
 * the first gesture, and every method is safe to call with no AudioContext at
 * all — sound is a garnish, never a dependency.
 */
(function (root) {
  "use strict";

  function TokenMazeAudio() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
  }

  TokenMazeAudio.prototype.unlock = function () {
    try {
      if (!this.ctx) {
        var Ctx = root.AudioContext || root.webkitAudioContext;
        if (!Ctx) return;
        this.ctx = new Ctx();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.5;
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === "suspended") this.ctx.resume().catch(function () {});
    } catch (e) { /* sound is optional */ }
  };

  TokenMazeAudio.prototype.setMuted = function (muted) { this.muted = !!muted; };

  TokenMazeAudio.prototype._tone = function (opts) {
    if (!this.ctx || this.muted) return;
    try {
      var o = opts || {};
      var freq = o.freq || 440, dur = o.dur || 0.15, type = o.type || "sine";
      var gain = o.gain || 0.14, delay = o.delay || 0, end = o.end || freq;
      var t0 = this.ctx.currentTime + delay;
      var osc = this.ctx.createOscillator();
      var g = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (end !== freq) osc.frequency.exponentialRampToValueAtTime(Math.max(40, end), t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(gain, t0 + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g);
      g.connect(this.master);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
    } catch (e) { /* one lost blip never matters */ }
  };

  TokenMazeAudio.prototype.ui = function () { this._tone({ freq: 660, dur: 0.07, type: "triangle", gain: 0.1 }); };
  TokenMazeAudio.prototype.step = function () { this._tone({ freq: 390, dur: 0.05, gain: 0.05 }); };
  TokenMazeAudio.prototype.eat = function (n) {
    var scale = [523.25, 587.33, 659.25, 783.99, 880];
    var f = scale[n % scale.length];
    this._tone({ freq: f, dur: 0.14, gain: 0.18 });
    this._tone({ freq: f * 2, dur: 0.1, gain: 0.05, delay: 0.02 });
  };
  TokenMazeAudio.prototype.blocked = function () { this._tone({ freq: 160, end: 120, dur: 0.12, gain: 0.13 }); };
  TokenMazeAudio.prototype.bump = function () {
    this._tone({ freq: 300, end: 150, dur: 0.28, gain: 0.2 });
    this._tone({ freq: 200, end: 110, dur: 0.22, type: "triangle", gain: 0.08, delay: 0.03 });
  };
  TokenMazeAudio.prototype.power = function () {
    var notes = [523.25, 659.25, 880, 1046.5];
    for (var i = 0; i < notes.length; i++)
      this._tone({ freq: notes[i], dur: 0.12, type: "triangle", gain: 0.13, delay: i * 0.07 });
  };
  TokenMazeAudio.prototype.fix = function () {
    this._tone({ freq: 880, dur: 0.1, gain: 0.13 });
    this._tone({ freq: 1174.66, dur: 0.16, gain: 0.11, delay: 0.09 });
  };
  TokenMazeAudio.prototype.win = function () {
    var notes = [523.25, 659.25, 783.99, 1046.5];
    for (var i = 0; i < notes.length; i++)
      this._tone({ freq: notes[i], dur: 0.16, type: "triangle", gain: 0.13, delay: i * 0.1 });
    this._tone({ freq: 1318.5, dur: 0.5, gain: 0.09, delay: 0.42 });
  };
  TokenMazeAudio.prototype.sticker = function () {
    this._tone({ freq: 1046.5, dur: 0.4, gain: 0.12 });
    this._tone({ freq: 1568, dur: 0.5, gain: 0.06, delay: 0.05 });
  };

  root.TokenMazeAudio = TokenMazeAudio;
})(typeof self !== "undefined" ? self : this);
