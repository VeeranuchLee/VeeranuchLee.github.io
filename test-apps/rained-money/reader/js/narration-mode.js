/* Small policy seam shared by the browser reader and its Node gate.
   A page clip is preferred; a missing reference, failed fetch, decode error, or playback
   rejection runs the existing isolated-word sequence instead. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ReadingNarration = api;
}(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  function play(page, playNatural, playWords) {
    var narration = page && page.narration;
    if (!narration || !narration.clip) return Promise.resolve(playWords());
    var result;
    // Call inside the original click stack: iPad Safari may reject media whose play()
    // is deferred to a microtask, even though the microtask originated at a tap.
    try { result = playNatural(narration); }
    catch (e) { return Promise.resolve(playWords()); }
    return Promise.resolve(result).then(function (ok) { return ok ? true : playWords(); }, playWords);
  }

  return { play: play };
}));
