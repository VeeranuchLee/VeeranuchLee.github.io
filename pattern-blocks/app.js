/* Pattern Blocks — standalone app bootstrap.
 *
 * The toy itself lives in pattern-blocks.js (mount/destroy, no knowledge of
 * how it was started). This file is the app boundary the shelf architecture
 * settled on 2026-08-28: each toy is its own app, and the only thing this
 * bootstrap provides is the topbar sound toggle and the mount call. There is
 * no shared toy runtime, no registry, no dynamic mounting — a shelf links here.
 *
 * Sound policy (AUDIO-DIRECTION.md, decided 2026-08-20): interaction sounds
 * are SYNTHESISED AT RUNTIME in WebAudio, never shipped as files. Every
 * tone below is an oscillator envelope. The one exception is the calm
 * background bed (assets/audio/music-bed.m4a), reused byte-identical from the
 * Music hub on the owner's request, 2026-10-20 (see assets/audio/provenance.json).
 */
(function () {
  'use strict';

  var soundBtn = document.getElementById('toy-sound');
  var backLink = document.getElementById('toy-back');

  /* --- Sound engine (WebAudio, synthesised, mutable) ------------------------ */
  var sound = (function () {
    var KEY = 'toybox.sound';
    var ctx = null;
    var enabled = localStorage.getItem(KEY) !== 'off';

    function ac() {
      if (!ctx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
      }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    }
    if (typeof AudioWake !== "undefined") AudioWake.attach(function () { return ctx; }, function () { ctx = null; });

    function tone(freq0, freq1, dur, type, vol, when) {
      var c = ac();
      if (!c) return;
      var t = c.currentTime + (when || 0);
      var o = c.createOscillator();
      var g = c.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq0, t);
      if (freq1 && freq1 !== freq0) o.frequency.exponentialRampToValueAtTime(freq1, t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol || 0.18, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(c.destination);
      o.start(t);
      o.stop(t + dur + 0.02);
    }

    var SOUNDS = {
      tap:     function () { tone(740, 620, 0.06, 'sine', 0.10); },
      place:   function () { tone(240, 200, 0.09, 'triangle', 0.22); },
      snap:    function () { tone(1180, 1180, 0.035, 'sine', 0.16);
                             tone(1560, 1560, 0.04, 'sine', 0.12, 0.045); },
      rotate:  function () { tone(520, 660, 0.07, 'sine', 0.12); },
      delete:  function () { tone(420, 170, 0.11, 'sine', 0.16); },
      clear:   function () { tone(520, 150, 0.28, 'sine', 0.14); },
      success: function () { tone(523, 523, 0.12, 'triangle', 0.18);
                             tone(659, 659, 0.12, 'triangle', 0.18, 0.11);
                             tone(784, 784, 0.2, 'triangle', 0.2, 0.22); },
    };

    return {
      play: function (name) {
        if (!enabled) return;
        if (typeof music !== 'undefined') music.duck();
        var fn = SOUNDS[name];
        if (fn) fn();
      },
      get enabled() { return enabled; },
      toggle: function () {
        enabled = !enabled;
        localStorage.setItem(KEY, enabled ? 'on' : 'off');
        if (enabled) SOUNDS.tap();
        return enabled;
      },
    };
  })();

  function syncSoundBtn() {
    soundBtn.setAttribute('aria-pressed', String(sound.enabled));
    soundBtn.classList.toggle('is-off', !sound.enabled);
  }
  soundBtn.addEventListener('click', function () { sound.toggle(); syncSoundBtn(); });
  syncSoundBtn();


  /* --- Calm background bed ---------------------------------------------------
   * Starts softly on the first tap (iOS autoplay rule), loops (the file carries
   * its own seamless loop), sits under the interaction sounds, dips briefly when
   * one plays, pauses while the page is hidden, and remembers its own switch. */
  var music = (function () {
    var KEY = 'toybox.pb.music', SRC = './assets/audio/music-bed.m4a';
    var FULL = 0.22, DUCKED = 0.12, RAMP_MS = 900, STEP_MS = 50;
    var el = null, ramp = 0, duckTimer = 0, armed = false, gotGesture = false, on = true;
    try { on = localStorage.getItem(KEY) !== 'off'; } catch (_) {}
    function target() { return duckTimer ? DUCKED : FULL; }
    function fadeTo(v, thenPause) {
      if (!el) return;
      if (ramp) clearInterval(ramp);
      var from = el.volume, steps = Math.max(1, Math.round(RAMP_MS / STEP_MS)), i = 0;
      ramp = setInterval(function () {
        i++;
        el.volume = Math.max(0, Math.min(1, from + (v - from) * (i / steps)));
        if (i >= steps) { clearInterval(ramp); ramp = 0; if (thenPause) el.pause(); }
      }, STEP_MS);
    }
    function apply() {
      if (!on || document.hidden || !gotGesture) {
        if (el && !el.paused) fadeTo(0, true);
        return;
      }
      if (!el) {
        try { el = new Audio(SRC); } catch (_) { return; }
        el.loop = true; el.preload = 'auto'; el.volume = 0;
      }
      if (ramp) { clearInterval(ramp); ramp = 0; }
      var p;
      try { p = el.play(); } catch (_) { return; }
      if (p && p.then) p.then(function () { fadeTo(target(), false); }, function () { arm(); });
      else fadeTo(target(), false);
    }
    function arm() {
      if (armed) return;
      armed = true;
      var go = function () {
        window.removeEventListener('pointerdown', go, true);
        armed = false; gotGesture = true; apply();
      };
      window.addEventListener('pointerdown', go, true);
    }
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { if (el && !el.paused) { if (ramp) clearInterval(ramp); ramp = 0; el.pause(); } }
      else apply();
    });
    arm();
    return {
      get on() { return on; },
      toggle: function () {
        on = !on;
        try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch (_) {}
        gotGesture = true; apply();
        return on;
      },
      duck: function () {
        if (!el || el.paused) return;
        if (duckTimer) clearTimeout(duckTimer);
        duckTimer = setTimeout(function () { duckTimer = 0; if (el && !el.paused) fadeTo(FULL, false); }, 700);
        if (el.volume > DUCKED) { if (ramp) clearInterval(ramp); ramp = 0; el.volume = DUCKED; }
      },
      state: function () { return { on: on, exists: !!el, playing: !!(el && !el.paused), volume: el ? +el.volume.toFixed(3) : null }; }
    };
  })();
  window.__pbMusic = music;

  var musicBtn = document.getElementById('toy-music');
  function syncMusicBtn() {
    musicBtn.setAttribute('aria-pressed', String(music.on));
    musicBtn.classList.toggle('is-off', !music.on);
  }
  musicBtn.addEventListener('click', function () { music.toggle(); syncMusicBtn(); });
  syncMusicBtn();

  /* The back arrow is a plain link; the tap sound is just politeness on the way. */
  backLink.addEventListener('click', function () { sound.play('tap'); });

  /* --- Start the toy ---------------------------------------------------------- */
  window.PatternBlocks.mount(document.getElementById('toy-root'), { sound: sound });
})();
