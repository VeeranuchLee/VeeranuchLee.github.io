/* word-audio.js -- THE ONE AUDIO RESOLVER for Our Dictionary.

   Every spoken dictionary card resolves its clip through clipFor() below, and so does
   the coverage gate (tools/check-audio-coverage.mjs), which require()s THIS FILE rather
   than re-implementing it. There is no second copy of the slug rule to drift.

   THE RULE, taken from the render, not guessed

     headword  ->  audio/words/<slug(headword)>.m4a
                   slug = lowercase, every run of non [a-z0-9] -> "-", trimmed of "-".
                   `air conditioner` -> air-conditioner, `T-shirt` -> t-shirt,
                   `Earth` -> earth. This is audio/words.manifest.json's `naming` field
                   ("lowercase kebab-case, one clip per headword ... Resolve a clip by
                   slugifying the headword, NOT by using it raw") and it is what the 2,020
                   files on disk actually are: every one of the 2,022 non-homograph
                   headwords maps onto exactly one of them and no file is left over.

     bow / close / tear / wind  ->  audio/words/<sense>.m4a
                   e.g. audio/words/bow.ribbon-knot.m4a. Their two senses are pronounced
                   differently (/baʊ/ vs /bəʊ/, /kləʊz/ vs /kləʊs/, /tɪə/ vs /teə/,
                   /wɪnd/ vs /waɪnd/), so a headword clip would teach one sense the wrong
                   word. tools/render-dictionary-words.py names this exact filename shape
                   ("audio/words/<sense>.m4a  4 homograph exceptions") and skipped them;
                   AUDIO-DIRECTION.md decision 11 keys them by sense. The sense ids are the
                   ones assets/words/ already uses for their pictures.

   THE EXCEPTIONS

     UNRENDERED lists every card that has no clip yet, with the reason. clipFor() returns
     null for them and the card shows NO speaker -- a speaker that could only fail would be
     a control that does nothing, and a headword clip in its place would say the wrong
     word. When a clip is rendered, delete its line here; the coverage gate refuses an
     entry whose file already exists, so a stale exception cannot linger.

   Loaded by dictionary.html as a plain <script> (it defines window.WordAudio) and by
   Node as CommonJS. Shipped, so it is in .publish-manifest [ship] and the worker SHELL. */
(function (root) {
  'use strict';

  var DIR = 'audio/words/';

  /* Headwords whose senses are pronounced differently: keyed by sense, never by
     headword. Exactly render-dictionary-words.py's HOMOGRAPHS and the manifest's
     `unrendered_homographs`; the coverage gate asserts all three agree. */
  var SENSE_KEYED = ['bow', 'close', 'tear', 'wind'];

  var WHY_HOMOGRAPH = 'homograph: this sense is said differently from the other one, ' +
    'so the headword clip would be the wrong word; its own clip is a separate paid render ' +
    '(render-dictionary-words.py skipped all four homographs on 2026-09-18)';

  var UNRENDERED = {
    'bow.bend-in-greeting': WHY_HOMOGRAPH,
    'bow.ribbon-knot': WHY_HOMOGRAPH,
    'close.make-not-open': WHY_HOMOGRAPH,
    'close.nearby': WHY_HOMOGRAPH,
    'tear.eye-drop': WHY_HOMOGRAPH,
    'tear.pull-apart': WHY_HOMOGRAPH,
    'wind.moving-air': WHY_HOMOGRAPH,
    'wind.wrap-around': WHY_HOMOGRAPH
  };

  function slug(word) {
    return String(word).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  /* Where this card's clip lives, whether or not it has been rendered yet. */
  function pathFor(word, sense) {
    return DIR + (SENSE_KEYED.indexOf(word) > -1 ? sense : slug(word)) + '.m4a';
  }

  /* The clip a card plays, or null when the card is a documented exception. */
  function clipFor(word, sense) {
    return Object.prototype.hasOwnProperty.call(UNRENDERED, sense) ? null : pathFor(word, sense);
  }

  var api = {
    DIR: DIR,
    SENSE_KEYED: SENSE_KEYED.slice(),
    UNRENDERED: UNRENDERED,
    slug: slug,
    pathFor: pathFor,
    clipFor: clipFor
  };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.WordAudio = api;
})(this);
