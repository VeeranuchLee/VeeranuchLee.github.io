/* Celebration House — sound.
 *
 * Interaction sounds are synthesised in WebAudio and never shipped as files
 * (AUDIO-DIRECTION.md). Music is a per-area HOOK: each area of an event pack
 * names either { synth: {...} } — an original placeholder pattern played by
 * the little synth below — or { src: "music/x.m4a" } once a licensed,
 * provenance-recorded bed exists. Exactly one track is "current"; changing
 * area crossfades the old one out while the new one fades in, and the old
 * scheduler stops at once, so two tracks never keep playing together.
 */
(function (root) {
  "use strict";

  var ctx = null, sfxBus = null, musicBus = null;
  var settings = { musicOn: true, musicVol: 0.5, sfxVol: 0.7 };
  var current = null;   // { key, bus, timer, stop() }
  var wanted = null;    // the spec we should be playing once audio is allowed
  var FADE = 1.6;

  function ensure() {
    if (ctx && ctx.state !== "closed") return ctx;
    var AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC(); } catch (_) { return null; }
    sfxBus = ctx.createGain(); sfxBus.gain.value = settings.sfxVol; sfxBus.connect(ctx.destination);
    musicBus = ctx.createGain(); musicBus.gain.value = settings.musicOn ? settings.musicVol * 0.55 : 0; musicBus.connect(ctx.destination);
    current = null;
    return ctx;
  }

  if (root.AudioWake) root.AudioWake.attach(function () { return ctx; }, function () { ctx = null; current = null; });

  function env(g, t, a, peak, d) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }
  function tone(bus, type, f, t, a, peak, d, f2) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + a + d);
    env(g, t, a, peak, d);
    o.connect(g); g.connect(bus); o.start(t); o.stop(t + a + d + 0.05);
  }

  var SFX = {
    pop: function (t) { tone(sfxBus, "sine", 520, t, 0.005, 0.35, 0.12, 900); },
    tick: function (t) { tone(sfxBus, "triangle", 1200, t, 0.003, 0.12, 0.05); },
    swish: function (t) { tone(sfxBus, "sine", 700, t, 0.01, 0.2, 0.22, 180); },
    undo: function (t) { tone(sfxBus, "sine", 660, t, 0.005, 0.18, 0.1, 440); },
    chime: function (t) {
      [784, 988, 1175, 1568].forEach(function (f, i) { tone(sfxBus, "sine", f, t + i * 0.09, 0.005, 0.18, 0.9); });
    },
    dim: function (t) { [784, 587].forEach(function (f, i) { tone(sfxBus, "sine", f, t + i * 0.1, 0.005, 0.15, 0.5); }); },
    sparkle: function (t) {
      [1568, 2093, 2637].forEach(function (f, i) { tone(sfxBus, "sine", f, t + i * 0.05, 0.003, 0.08, 0.25); });
    }
  };

  function play(name) {
    if (!ensure() || !SFX[name]) return;
    try { SFX[name](ctx.currentTime + 0.01); } catch (_) {}
  }

  function midi(n) { return 440 * Math.pow(2, (n - 69) / 12); }

  var VOICE = {
    musicbox: function (bus, f, t) { tone(bus, "sine", f, t, 0.004, 0.22, 1.1); tone(bus, "sine", f * 2, t, 0.004, 0.05, 0.5); },
    bells: function (bus, f, t) { tone(bus, "sine", f, t, 0.004, 0.2, 2.2); tone(bus, "sine", f * 2.76, t, 0.004, 0.05, 0.9); },
    pad: function (bus, f, t) { tone(bus, "triangle", f / 2, t, 0.25, 0.09, 1.6); tone(bus, "sine", f, t, 0.02, 0.12, 1.0); }
  };

  function startSynth(spec, bus) {
    var notes = spec.notes || [], step = 60 / (spec.bpm || 80) / 2, voice = VOICE[spec.voice] || VOICE.musicbox;
    var i = 0, next = ctx.currentTime + 0.1;
    function pump() {
      if (!ctx) return;
      while (next < ctx.currentTime + 0.5) {
        var n = notes[i % notes.length];
        if (typeof n === "number") voice(bus, midi(n), next);
        i++; next += step;
      }
    }
    pump();
    var timer = setInterval(pump, 150);
    return function stop() { clearInterval(timer); };
  }

  function startFile(spec, bus) {
    var stopped = false, srcNode = null;
    fetch(spec.src).then(function (r) { return r.arrayBuffer(); })
      .then(function (b) { return ctx.decodeAudioData(b); })
      .then(function (buf) {
        if (stopped) return;
        srcNode = ctx.createBufferSource(); srcNode.buffer = buf; srcNode.loop = true;
        srcNode.connect(bus); srcNode.start();
      }).catch(function () {});
    return function stop() { stopped = true; try { if (srcNode) srcNode.stop(ctx.currentTime + FADE + 0.1); } catch (_) {} };
  }

  function switchTo(spec, key) {
    wanted = { spec: spec, key: key };
    if (!ensure() || ctx.state !== "running") return;   // will start after the first gesture
    if (current && current.key === key) return;
    var now = ctx.currentTime;
    if (current) {
      var old = current;
      old.stop();
      old.bus.gain.cancelScheduledValues(now);
      old.bus.gain.setValueAtTime(old.bus.gain.value, now);
      old.bus.gain.linearRampToValueAtTime(0, now + FADE);
      setTimeout(function () { try { old.bus.disconnect(); } catch (_) {} }, (FADE + 2.5) * 1000);
    }
    current = null;
    if (!spec) return;
    var bus = ctx.createGain();
    bus.gain.setValueAtTime(0, now);
    bus.gain.linearRampToValueAtTime(1, now + FADE);
    bus.connect(musicBus);
    var stop = spec.src ? startFile(spec, bus) : spec.synth ? startSynth(spec.synth, bus) : function () {};
    current = { key: key, bus: bus, stop: stop };
  }

  /* Called on every gesture: if a track is wanted but audio was locked, start it now. */
  function kick() {
    if (!ensure()) return;
    var p = ctx.state !== "running" ? ctx.resume() : null;
    var go = function () { if (wanted && (!current || current.key !== wanted.key)) switchTo(wanted.spec, wanted.key); };
    if (p && p.then) p.then(go).catch(function () {}); else go();
  }

  function setMusic(on, vol) {
    settings.musicOn = !!on;
    if (typeof vol === "number") settings.musicVol = vol;
    if (!ctx || !musicBus) return;
    var now = ctx.currentTime;
    musicBus.gain.cancelScheduledValues(now);
    musicBus.gain.setValueAtTime(musicBus.gain.value, now);
    musicBus.gain.linearRampToValueAtTime(settings.musicOn ? settings.musicVol * 0.55 : 0, now + 0.4);
  }

  function pause() { if (current) { current.stop(); current = null; } }

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) pause(); else if (wanted) kick();
  });

  root.CHAudio = {
    play: play, switchTo: switchTo, kick: kick, setMusic: setMusic,
    debug: function () { return { state: ctx && ctx.state, current: current && current.key, wanted: wanted && wanted.key }; }
  };
})(window);
