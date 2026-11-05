(function (root) {
  "use strict";
  var context = null;
  var speechSources = [];
  var sequence = 0;

  function getContext() {
    if (!context) {
      var AudioContext = root.AudioContext || root.webkitAudioContext;
      if (!AudioContext) return null;
      context = new AudioContext();
    }
    if (context.state === "suspended") context.resume().catch(function () {});
    return context;
  }

  function chime() {
    var ctx = getContext();
    if (!ctx) return;
    var now = ctx.currentTime;
    var gain = ctx.createGain();
    var first = ctx.createOscillator();
    var second = ctx.createOscillator();
    first.type = "sine";
    second.type = "sine";
    first.frequency.setValueAtTime(620, now);
    second.frequency.setValueAtTime(880, now + .055);
    gain.gain.setValueAtTime(.0001, now);
    gain.gain.exponentialRampToValueAtTime(.055, now + .012);
    gain.gain.exponentialRampToValueAtTime(.0001, now + .2);
    first.connect(gain); second.connect(gain); gain.connect(ctx.destination);
    first.start(now); second.start(now + .055); first.stop(now + .16); second.stop(now + .2);
  }

  function stopSpeech() {
    speechSources.forEach(function (source) { try { source.stop(); } catch (error) {} });
    speechSources = [];
  }

  async function decode(url, ctx) {
    try {
      var response = await fetch(url);
      if (!response.ok) return null;
      return await ctx.decodeAudioData(await response.arrayBuffer());
    } catch (error) { return null; }
  }

  async function narrate(files) {
    var ctx = getContext();
    if (!ctx) return;
    var mine = ++sequence;
    stopSpeech();
    var buffers = await Promise.all(files.map(function (file) { return decode(file, ctx); }));
    if (mine !== sequence) return;
    var when = ctx.currentTime + .035;
    buffers.forEach(function (buffer) {
      if (!buffer) return;
      var source = ctx.createBufferSource();
      var gain = ctx.createGain();
      source.buffer = buffer;
      gain.gain.value = .92;
      source.connect(gain); gain.connect(ctx.destination);
      source.start(when);
      speechSources.push(source);
      when += buffer.duration + .09;
    });
  }

  root.LabAudio = { chime: chime, narrate: narrate, stop: stopSpeech };
})(window);
