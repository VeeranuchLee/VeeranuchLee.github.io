/* sentence-audio.js -- THE ONE SENTENCE-AUDIO RESOLVER for Our Dictionary.

   Owner spec, 2026-09-22: every card has TWO independent audio assets -- the word
   (word-audio.js, audio/words/) and its example sentence (this file, audio/sentences/).
   dictionary.html asks clipFor() below which sentence clip a card may play, and so does
   the gate (tools/check-sentence-audio.mjs), which require()s THIS FILE. The renderer
   (tools/render-dictionary-sentences.py) carries a Python port of pathFor(), and
   tools/test-render-sentences.py fails if the two ever disagree.

   IDENTITY IS THE SENSE, NOT THE TEXT

     sense  ->  audio/sentences/<sense>.m4a     e.g. audio/sentences/apple.fruit.m4a

   A sentence is mutable: the corrections layer (shared-data/dictionary/
   sentence-corrections.json) rewrites them, 101 times so far. A filename made from the
   text would change every time the text did, and the old clip would sit beside the new
   one with nothing to say which is current. The sense key is permanent (new-cards.json:
   "permanent unique concept key"), so the asset keeps one name for its whole life.

   WHAT THE CLIP SAYS IS RECORDED, NOT ASSUMED

     audio/sentences/rendered.json   { clips: { <sense>: { text, sha256 } } }

   An .m4a carries no record of the words it was rendered from. The ledger does: the
   renderer writes the EXACT text it sent and the sha256 of the bytes it produced, the
   moment each clip is made (the precedent is music-book/audio/titles/rendered.json,
   where three clips said the wrong song's name for a month because nothing recorded
   what they said). The page loads the ledger with the dictionary data.

   A CLIP PLAYS ONLY WHEN IT SAYS WHAT THE CARD SHOWS

     status(sense, text, ledger)
       'unrendered'  no ledger entry           -> clipFor() null, no sentence speaker
       'stale'       ledger text != card text  -> clipFor() null, no sentence speaker
       'ready'       ledger text == card text  -> clipFor() audio/sentences/<sense>.m4a

   Exact string equality, no trimming or case folding: the clip either says these
   characters or it is not this sentence. An edited sentence therefore stops its old clip
   from playing the moment the new text reaches data/dictionary.json, and the gate fails
   naming the sense until it is re-rendered or its clip retired.

   NO SPEAKER UNTIL THERE IS A CLIP. A sentence speaker that could only fail would be a
   control that does nothing, the thing the owner's standing rule forbids; the homograph
   cards had no word speaker until their clips were rendered, for the same reason. As of
   2026-09-22 no sentence clip is rendered, so no card shows one.

   FORMAT: .m4a (AAC, mono, 64 kbps), the same as the word clips. AUDIO-DIRECTION.md
   decision 5 makes AAC in .m4a the shipped format (MP3 is only the fallback if anything
   refuses AAC), and the word clips it sits beside are exactly this.

   Loaded by dictionary.html as a plain <script> (window.SentenceAudio) and by Node as
   CommonJS. Shipped, so it is in .publish-manifest [ship] and the worker SHELL. */
(function (root) {
  'use strict';

  var DIR = 'audio/sentences/';
  var EXT = '.m4a';
  var LEDGER = DIR + 'rendered.json';
  /* AUDIO-DIRECTION.md decision 11: Alice, the pinned dictionary voice. The gate refuses
     a ledger that names any other voice. */
  var VOICE_ID = 'Xb7hH8MSUJpSbSDYk0k2';

  function hasOwn(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }

  /* Where this sense's sentence clip lives, whether or not it has been rendered. */
  function pathFor(sense) {
    return DIR + String(sense) + EXT;
  }

  /* The ledger's record for a sense, or null. */
  function entryFor(sense, ledger) {
    var clips = ledger && ledger.clips;
    if (!clips || typeof clips !== 'object' || !hasOwn(clips, sense)) return null;
    return clips[sense] || null;
  }

  function status(sense, text, ledger) {
    var e = entryFor(sense, ledger);
    if (!e) return 'unrendered';
    return e.text === text ? 'ready' : 'stale';
  }

  /* The clip a card may play for its sentence, or null. Null means: show no speaker. */
  function clipFor(sense, text, ledger) {
    return status(sense, text, ledger) === 'ready' ? pathFor(sense) : null;
  }

  var api = {
    DIR: DIR,
    EXT: EXT,
    LEDGER: LEDGER,
    VOICE_ID: VOICE_ID,
    pathFor: pathFor,
    entryFor: entryFor,
    status: status,
    clipFor: clipFor
  };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SentenceAudio = api;
})(this);
