/* Writing Book — sound.
 *
 * TWO LAYERS, and they are not the same kind of thing.
 *
 * 1. EFFECTS are synthesised here in WebAudio and ship as zero bytes. Repo
 *    decision 2026-08-20: letter tap, successful stroke, word completion and
 *    sticker reveal are never rendered audio files. Do not generate them.
 *
 * 2. VOICE is rendered offline from a manifest and played back as files. See
 *    AUDIO-DIRECTION.md — every shipped clip is AI-generated, and no
 *    child-facing code may call the ElevenLabs API. This file therefore only
 *    ever fetches a static path.
 *
 *    *** Do not reach for speechSynthesis. *** An OS voice is banned by
 *    AUDIO-DIRECTION.md, and it is the obvious-looking shortcut here, so it is
 *    named explicitly: the prototype runs silent-voiced until the manifest in
 *    audio/manifest.json is rendered. Missing clips are a no-op, never an error
 *    and never a message to the child.
 *
 * CONCEPT.md §24: no harsh error sounds. The retry sound is lower and softer
 * than the success sound, never a buzzer.
 */
(function (global) {
  'use strict';

  var ctx = null;
  var master = null;
  var levels = { effects: 0.5, voice: 1.0 };
  var missing = {};   // paths already known to be unrendered; asked for once only

  function audio() {
    if (ctx) return ctx;
    var Ctor = global.AudioContext || global.webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = levels.effects;
    master.connect(ctx.destination);
    return ctx;
  }

  /* iPad will not make a sound until a gesture has unlocked the context. */
  function unlock() {
    var c = audio();
    if (c && c.state === 'suspended') c.resume();
  }

  /* One soft note. Sine waves and long releases only — nothing with an edge. */
  function note(freq, startAt, duration, gain, type) {
    var c = audio();
    if (!c) return;
    var osc = c.createOscillator();
    var env = c.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, c.currentTime + startAt);
    env.gain.setValueAtTime(0.0001, c.currentTime + startAt);
    env.gain.exponentialRampToValueAtTime(gain, c.currentTime + startAt + 0.02);
    env.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + startAt + duration);
    osc.connect(env);
    env.connect(master);
    osc.start(c.currentTime + startAt);
    osc.stop(c.currentTime + startAt + duration + 0.05);
  }

  var EFFECTS = {
    /* finger touches the paper */
    tap: function () { note(660, 0, 0.07, 0.10, 'triangle'); },

    /* a stroke was accepted — two notes up */
    strokeGood: function () {
      note(784, 0, 0.16, 0.16);
      note(1047, 0.07, 0.22, 0.13);
    },

    /* a stroke needs another go. Lower, quieter, and it resolves rather than
       stops dead, so it reads as "again" and not as "wrong". */
    strokeRetry: function () {
      note(392, 0, 0.18, 0.09, 'sine');
      note(349, 0.09, 0.26, 0.07, 'sine');
    },

    /* a whole letter is finished */
    letterDone: function () {
      note(880, 0, 0.18, 0.13);
      note(1109, 0.08, 0.24, 0.10);
    },

    /* a whole word is finished */
    wordDone: function () {
      [659, 784, 988, 1319].forEach(function (f, i) {
        note(f, i * 0.085, 0.34, 0.14 - i * 0.015);
      });
    },

    /* the sticker turns over */
    stickerReveal: function () {
      [1047, 1319, 1568, 2093].forEach(function (f, i) {
        note(f, i * 0.06, 0.5, 0.09);
      });
    },

    /* the page is complete */
    pageDone: function () {
      [523, 659, 784, 1047, 1319].forEach(function (f, i) {
        note(f, i * 0.1, 0.6, 0.13);
      });
    }
  };

  function play(name) {
    unlock();
    var fx = EFFECTS[name];
    if (fx) fx();
  }

  /* ---- voice ---------------------------------------------------------- */

  var cache = {};

  function clip(path) {
    if (missing[path]) return null;
    if (!cache[path]) {
      var el = new Audio(path);
      el.preload = 'auto';
      el.addEventListener('error', function () { missing[path] = true; });
      cache[path] = el;
    }
    return cache[path];
  }

  /* Play a rendered clip if it exists. Silence is the correct behaviour when it
     does not — the child is never told a file is missing. */
  function say(path) {
    var el = clip(path);
    if (!el) return Promise.resolve(false);
    el.volume = levels.voice;
    try { el.currentTime = 0; } catch (e) { /* not loaded yet */ }
    var started = el.play();
    if (!started || !started.catch) return Promise.resolve(true);
    return started.then(function () { return true; }).catch(function () {
      missing[path] = true;
      return false;
    });
  }

  var VOICE = {
    word: function (slug) { return say('audio/words/' + slug + '.m4a'); },
    spell: function (slug) { return say('audio/spell/' + slug + '.m4a'); },
    letter: function (ch) { return say('audio/letters/' + ch.toLowerCase() + '.m4a'); },
    cue: function (name) {
      return say('audio/cues/' + name.toLowerCase().replace(/[^a-z]+/g, '-') + '.m4a');
    }
  };

  global.WritingSound = {
    play: play,
    voice: VOICE,
    unlock: unlock,
    setLevel: function (kind, value) {
      levels[kind] = value;
      if (kind === 'effects' && master) master.gain.value = value;
    }
  };
})(window);
