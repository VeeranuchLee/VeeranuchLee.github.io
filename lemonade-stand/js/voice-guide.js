(function (root) {
  "use strict";

  var clipsPromise = null;
  var contextProvider = null;
  var decoded = new Map();
  var playing = [];
  var timers = [];
  var generation = 0;
  var muted = false;

  function clips() {
    if (!clipsPromise) {
      clipsPromise = fetch("./voice/manifest.json", { cache: "no-cache" })
        .then(function (response) { return response.ok ? response.json() : { clips: [] }; })
        .then(function (manifest) {
          var byId = new Map();
          (manifest.clips || []).forEach(function (clip) { byId.set(clip.id, clip); });
          return byId;
        })
        .catch(function () { return new Map(); });
    }
    return clipsPromise;
  }

  function stop() {
    generation += 1;
    timers.forEach(function (timer) { clearTimeout(timer); });
    timers = [];
    playing.forEach(function (source) { try { source.stop(); } catch (_) {} });
    playing = [];
  }

  function decode(clip, context) {
    var key = clip.path;
    if (!decoded.has(key)) {
      decoded.set(key, fetch("./" + key)
        .then(function (response) { if (!response.ok) throw new Error("missing clip"); return response.arrayBuffer(); })
        .then(function (bytes) { return context.decodeAudioData(bytes); })
        .catch(function () { return null; }));
    }
    return decoded.get(key);
  }

  /* A plan is an array of short sentences. Every sentence is all-or-nothing: if one
     fragment has not been rendered yet, the whole sentence stays silent instead of
     playing an orphaned number. Complete sentences are decoded first and then every
     AudioBufferSourceNode is scheduled immediately. Playback never depends on `onended`.
     Calling play again cancels the old plan before the new one can speak. */
  async function play(plan, options) {
    options = options || {};
    stop();
    if (muted || !contextProvider || !Array.isArray(plan) || !plan.length) return 0;
    var mine = generation;
    var context;
    try { context = contextProvider(); } catch (_) { return 0; }
    if (!context || context.state === "closed") return 0;
    try { if (context.state !== "running") await context.resume(); } catch (_) {}
    var byId = await clips();
    var sentences = await Promise.all(plan.map(async function (sentence) {
      var entries = (sentence.clips || []).map(function (id) { return byId.get(id); });
      if (!entries.length || entries.some(function (entry) { return !entry; })) return null;
      var buffers = await Promise.all(entries.map(function (entry) { return decode(entry, context); }));
      return buffers.some(function (buffer) { return !buffer; }) ? null : { cue: sentence.cue, buffers: buffers };
    }));
    if (mine !== generation || muted) return 0;

    var start = Math.max(context.currentTime + 0.04, context.currentTime);
    var at = start;
    sentences.filter(Boolean).forEach(function (sentence) {
      var cueAt = at;
      if (sentence.cue && typeof options.onCue === "function") {
        timers.push(setTimeout(function () {
          if (mine === generation) options.onCue(sentence.cue);
        }, Math.max(0, (cueAt - context.currentTime) * 1000)));
      }
      sentence.buffers.forEach(function (buffer) {
        var source = context.createBufferSource();
        source.buffer = buffer;
        source.connect(context.destination);
        source.start(at);
        playing.push(source);
        at += buffer.duration + 0.08;
      });
      at += 0.14;
    });
    var duration = Math.max(0, at - start);
    if (typeof options.onDone === "function") {
      timers.push(setTimeout(function () {
        if (mine === generation) options.onDone();
      }, duration * 1000 + 40));
    }
    return duration;
  }

  function rebuild() {
    stop();
    decoded = new Map();
  }

  root.LemonadeVoice = {
    setContextProvider: function (provider) { contextProvider = provider; },
    setMuted: function (value) { muted = !!value; if (muted) stop(); },
    play: play,
    stop: stop,
    rebuild: rebuild,
  };

  document.addEventListener("visibilitychange", function () { if (document.hidden) stop(); });
  root.addEventListener("pagehide", stop);
})(window);
