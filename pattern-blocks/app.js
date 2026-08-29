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
 * tone below is an oscillator envelope — there is no audio file anywhere in
 * this app, and nothing for a child's device to download or licence.
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

  /* The back arrow is a plain link; the tap sound is just politeness on the way. */
  backLink.addEventListener('click', function () { sound.play('tap'); });

  /* --- Start the toy ---------------------------------------------------------- */
  window.PatternBlocks.mount(document.getElementById('toy-root'), { sound: sound });
})();
