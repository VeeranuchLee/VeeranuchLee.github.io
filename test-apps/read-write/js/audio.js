/*
 * Read & Write — clip player. Pre-rendered files only: no speechSynthesis, no network voice, ever.
 *
 * Pattern from reading-app/reader/reader.js (verified on iPad): WebAudio, created and resumed on the
 * first tap, gives reliable back-to-back playback on iPad Safari for "Read to Me"; a single reused
 * <audio> element is the fallback where WebAudio is missing. Clips are fetched ahead of time
 * (preload) so a missing clip is known BEFORE a child taps its speaker: every control carrying
 * data-clip="<path>" is marked .no-audio and quietly greyed out. Nothing else changes.
 */
(function () {
  "use strict";

  var Ctx = window.AudioContext || window.webkitAudioContext;
  var ctx = null;
  var cache = {};        // path -> Promise<AudioBuffer | ArrayBuffer | null>
  var missing = {};      // path -> true once a fetch has failed
  var current = null;    // playing source / element
  var fallback = null;
  var run = 0;           // bumps on every stop; stale callbacks compare against it
  var listeners = [];

  function unlock() {
    if (!Ctx) return;
    if (!ctx) {
      try { ctx = new Ctx(); } catch (e) { ctx = null; return; }
      // iOS: a silent one-sample buffer played inside the gesture fully unlocks output.
      try {
        var b = ctx.createBuffer(1, 1, 22050);
        var s = ctx.createBufferSource();
        s.buffer = b; s.connect(ctx.destination); s.start(0);
      } catch (e) { /* harmless */ }
    }
    if (ctx.state === "suspended" && ctx.resume) { try { ctx.resume(); } catch (e) { /* ignore */ } }
  }

  function decode(bytes) {
    return new Promise(function (ok, bad) {
      try { ctx.decodeAudioData(bytes.slice(0), ok, bad); } catch (e) { bad(e); }
    }).catch(function () { return null; });
  }

  function markMissing(path) {
    if (missing[path]) return;
    missing[path] = true;
    paint(document);
    listeners.forEach(function (fn) { try { fn(path); } catch (e) { /* ignore */ } });
  }

  function load(path) {
    if (!path) return Promise.resolve(null);
    if (missing[path]) return Promise.resolve(null);
    if (!cache[path]) {
      cache[path] = fetch(path)
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
        .then(function (bytes) { return ctx ? decode(bytes) : bytes; })
        .then(function (b) { if (!b) throw new Error("undecodable"); return b; })
        .catch(function () { delete cache[path]; markMissing(path); return null; });
    }
    return cache[path].then(function (b) {
      if (b && ctx && !(b instanceof AudioBuffer)) {
        var p = decode(b).then(function (buf) { if (!buf) markMissing(path); return buf; });
        cache[path] = p;
        return p;
      }
      return b;
    });
  }

  function preload(paths) { (paths || []).forEach(function (p) { load(p); }); }

  function stop() {
    run++;
    if (current) {
      try { if (current.stop) current.stop(); else current.pause(); } catch (e) { /* ended */ }
      current = null;
    }
  }

  /* Play one clip. Resolves true when it played to the end, false when it could not play or was
     stopped. Never throws. */
  function play(path, myRun) {
    if (myRun === undefined) { stop(); myRun = run; }
    if (!path || missing[path]) return Promise.resolve(false);
    if (ctx) {
      return load(path).then(function (buf) {
        if (myRun !== run || !buf || !(buf instanceof AudioBuffer)) return false;
        return new Promise(function (done) {
          var src;
          try {
            src = ctx.createBufferSource();
            src.buffer = buf;
            src.connect(ctx.destination);
            src.onended = function () { if (current === src) current = null; done(myRun === run); };
            current = src;
            src.start(0);
          } catch (e) { done(false); }
        });
      });
    }
    return new Promise(function (done) {
      if (!fallback) fallback = new Audio();
      var a = fallback;
      a.onended = function () { current = null; done(myRun === run); };
      a.onerror = function () { current = null; markMissing(path); done(false); };
      a.src = path;
      current = a;
      var p = a.play();
      if (p && p.catch) p.catch(function () { done(false); });
    });
  }

  /* Play several clips in order. onEach(index) fires as each one starts (also for a missing one,
     which is skipped after a short beat so highlighting still walks the passage). */
  function sequence(paths, onEach, gapMs) {
    stop();
    var myRun = run;
    var i = 0;
    return new Promise(function (done) {
      function next() {
        if (myRun !== run) return done(false);
        if (i >= paths.length) return done(true);
        var idx = i++;
        if (onEach) onEach(idx);
        play(paths[idx], myRun).then(function (ok) {
          if (myRun !== run) return done(false);
          setTimeout(next, ok ? (gapMs || 260) : 120);
        });
      }
      next();
    });
  }

  function isMissing(path) { return !!missing[path]; }
  function currentRun() { return run; }

  /* Grey out every control whose clip is known to be missing. */
  function paint(scope) {
    var nodes = (scope || document).querySelectorAll("[data-clip]");
    for (var k = 0; k < nodes.length; k++) {
      var n = nodes[k];
      var paths = n.getAttribute("data-clip").split(" ").filter(Boolean);
      var none = paths.length > 0 && paths.every(function (p) { return missing[p]; });
      n.classList.toggle("no-audio", none);
      if (n.tagName === "BUTTON" && n.classList.contains("spk")) n.setAttribute("aria-disabled", none ? "true" : "false");
    }
  }

  function onMissing(fn) { listeners.push(fn); }

  /* A small happy two-note chime for a right answer. Synthesised in WebAudio, never a file
     (AUDIO-DIRECTION.md: interaction sounds ship no audio file). Silent without a context. */
  function chime() {
    if (!ctx) return;
    try {
      var t = ctx.currentTime + 0.01;
      [[659.25, 0], [987.77, 0.12]].forEach(function (n) {
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.type = "sine"; o.frequency.value = n[0];
        g.gain.setValueAtTime(0.0001, t + n[1]);
        g.gain.exponentialRampToValueAtTime(0.18, t + n[1] + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + n[1] + 0.5);
        o.connect(g); g.connect(ctx.destination);
        o.start(t + n[1]); o.stop(t + n[1] + 0.55);
      });
    } catch (e) { /* no sound is fine */ }
  }

  document.addEventListener("visibilitychange", function () { if (document.hidden) stop(); });

  window.RWAudio = {
    unlock: unlock, load: load, preload: preload, play: play, sequence: sequence,
    chime: chime, stop: stop, isMissing: isMissing, paint: paint, onMissing: onMissing, run: currentRun
  };
})();
