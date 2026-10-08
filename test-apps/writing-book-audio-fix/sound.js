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

  /* One narration channel. Previously `cache` held one Audio element per path,
     so a word, letter, spelling, sentence or cue could all continue playing at
     once. The generation makes callbacks captured by an older request inert,
     even if a browser delivers one after pause() or a screen transition. */
  var voiceEl = null;
  var voiceGeneration = 0;
  var voiceTimers = [];
  var voiceListeners = [];

  function clearVoiceListeners() {
    if (!voiceEl) return;
    voiceListeners.forEach(function (pair) {
      voiceEl.removeEventListener(pair[0], pair[1]);
    });
    voiceListeners = [];
  }

  function clearVoiceTimers() {
    voiceTimers.forEach(function (timer) { global.clearTimeout(timer); });
    voiceTimers = [];
  }

  /* Screen-lifetime timers (question/word progression). Unlike narration timers
     these survive a new narration — tapping replay while a word is celebrating
     must not strand the child on a locked word — and die only when the screen
     is left (stop()). */
  var screenGeneration = 0;
  var screenTimers = [];

  function later(delay, callback) {
    var generation = screenGeneration;
    var timer = global.setTimeout(function () {
      var at = screenTimers.indexOf(timer);
      if (at !== -1) screenTimers.splice(at, 1);
      if (generation === screenGeneration) callback();
    }, delay);
    screenTimers.push(timer);
    return timer;
  }

  function leaveScreen() {
    screenGeneration++;
    screenTimers.forEach(function (timer) { global.clearTimeout(timer); });
    screenTimers = [];
    stopVoice();
  }

  function stopVoice() {
    voiceGeneration++;
    clearVoiceTimers();
    clearVoiceListeners();
    if (!voiceEl) return;
    voiceEl.pause();
    try { voiceEl.currentTime = 0; } catch (e) { /* metadata may not be loaded */ }
  }

  function listen(type, handler) {
    voiceEl.addEventListener(type, handler);
    voiceListeners.push([type, handler]);
  }

  /* A delayed action that belongs to the current narration/screen lifecycle.
     Starting another narration or leaving the screen clears it; the generation
     check is the second guard for a callback already queued by the event loop. */
  function after(delay, callback) {
    var generation = voiceGeneration;
    var timer = global.setTimeout(function () {
      var at = voiceTimers.indexOf(timer);
      if (at !== -1) voiceTimers.splice(at, 1);
      if (generation === voiceGeneration) callback();
    }, delay);
    voiceTimers.push(timer);
    return timer;
  }

  /* Play a rendered clip if it exists. Silence is the correct behaviour when it
     does not — the child is never told a file is missing. */
  function say(path) {
    stopVoice();
    if (global.document.hidden) return Promise.resolve(false);
    if (missing[path]) return Promise.resolve(false);
    if (!voiceEl) {
      voiceEl = new Audio();
      voiceEl.preload = 'auto';
    }
    var generation = voiceGeneration;
    voiceEl.src = path;
    voiceEl.volume = levels.voice;
    try { voiceEl.currentTime = 0; } catch (e) { /* not loaded yet */ }

    listen('error', function () {
      if (generation !== voiceGeneration) return;
      missing[path] = true;
      stopVoice();
    });
    listen('ended', function () {
      if (generation !== voiceGeneration) return;
      clearVoiceListeners();
    });

    var started = voiceEl.play();
    if (!started || !started.catch) return Promise.resolve(true);
    return started.then(function () {
      return generation === voiceGeneration;
    }).catch(function () {
      if (generation !== voiceGeneration) return false;
      missing[path] = true;
      stopVoice();
      return false;
    });
  }

  var VOICE = {
    word: function (slug) { return say('audio/words/' + slug + '.m4a'); },
    spell: function (slug) { return say('audio/spell/' + slug + '.m4a'); },
    letter: function (ch) { return say('audio/letters/' + ch.toLowerCase() + '.m4a'); },
    /* The word used in a sentence about its own picture. Separate from word() on
       purpose: tapping the card says the word, tapping the badge says the sentence,
       and a child who only wants the word should never have to sit through one. */
    sentence: function (slug) { return say('audio/sentence/' + slug + '.m4a'); },
    cue: function (name) {
      return say('audio/cues/' + name.toLowerCase().replace(/[^a-z]+/g, '-') + '.m4a');
    },
    stop: leaveScreen,
    after: after,
    later: later
  };

  global.addEventListener('pagehide', stopVoice);
  global.document.addEventListener('visibilitychange', function () {
    if (global.document.hidden) stopVoice();
  });

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
