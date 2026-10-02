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
                   headword files on disk actually are: every one of the 2,022 non-homograph
                   headwords maps onto exactly one of them and no file is left over.
                   (2,028 files in all -- those 2,020 plus the 8 sense clips below.)

     bow / close / tear / wind  ->  audio/words/<sense>.m4a
                   e.g. audio/words/bow.ribbon-knot.m4a. Their two senses are pronounced
                   differently (/baʊ/ vs /bəʊ/, /kləʊz/ vs /kləʊs/, /tɪə/ vs /teə/,
                   /wɪnd/ vs /waɪnd/), so a headword clip would teach one sense the wrong
                   word. tools/render-dictionary-words.py names this exact filename shape
                   ("audio/words/<sense>.m4a  4 homograph exceptions"); it skipped them on
                   2026-09-18 and rendered all eight on 2026-09-22, so every one of these
                   cards now speaks. AUDIO-DIRECTION.md decision 11 keys them by sense. The
                   sense ids are the ones assets/words/ already uses for their pictures.

   THE EXCEPTIONS

     UNRENDERED lists every card that has no clip yet, with the reason. clipFor() returns
     null for them and the card shows NO speaker -- a speaker that could only fail would be
     a control that does nothing, and a headword clip in its place would say the wrong
     word. When a clip is rendered, delete its line here; the coverage gate refuses an
     entry whose file already exists, so a stale exception cannot linger.

     The 30 concepts selected on 2026-10-01 are listed until their paid render step. The
     earlier 2,098 cards all speak; these additions honestly show no speaker meanwhile.

   Loaded by dictionary.html as a plain <script> (it defines window.WordAudio) and by
   Node as CommonJS. Shipped, so it is in .publish-manifest [ship] and the worker SHELL. */
(function (root) {
  'use strict';

  var DIR = 'audio/words/';

  /* Headwords whose senses are pronounced differently: keyed by sense, never by
     headword. Exactly render-dictionary-words.py's HOMOGRAPHS. It is NOT the manifest's
     `unrendered_homographs` -- that list is the ones still waiting, and it emptied on
     2026-09-22 when all eight senses were rendered while these four stay sense-keyed
     forever. The coverage gate asserts the real invariant: every headword here is either
     listed unrendered or has a clip for each of its senses, and every headword the
     manifest lists as unrendered appears here. */
  var SENSE_KEYED = ['bow', 'close', 'tear', 'wind'];

  var UNRENDERED = {
    'angry.feeling-cross': 'new card added 2026-10-01; word-audio render pending',
    'dinosaur.prehistoric-reptile': 'new card added 2026-10-01; word-audio render pending',
    'medicine.cure-for-illness': 'new card added 2026-10-01; word-audio render pending',
    'tummy.stomach-informal': 'new card added 2026-10-01; word-audio render pending',
    'plaster.small-sticking-bandage': 'new card added 2026-10-01; word-audio render pending',
    'bandage.protective-wrapping': 'new card added 2026-10-01; word-audio render pending',
    'candle.wax-light': 'new card added 2026-10-01; word-audio render pending',
    'fireworks.sky-display': 'new card added 2026-10-01; word-audio render pending',
    'wedding.marriage-celebration': 'new card added 2026-10-01; word-audio render pending',
    'decorate.make-pretty': 'new card added 2026-10-01; word-audio render pending',
    'celebration.happy-special-event': 'new card added 2026-10-01; word-audio render pending',
    'sunny.full-of-sunshine': 'new card added 2026-10-01; word-audio render pending',
    'rainy.with-lots-of-rain': 'new card added 2026-10-01; word-audio render pending',
    'windy.with-strong-wind': 'new card added 2026-10-01; word-audio render pending',
    'cloudy.covered-with-clouds': 'new card added 2026-10-01; word-audio render pending',
    'snowy.covered-with-snow': 'new card added 2026-10-01; word-audio render pending',
    'bell.ringing-instrument': 'new card added 2026-10-01; word-audio render pending',
    'playtime.school-break-time': 'new card added 2026-10-01; word-audio render pending',
    'board game.tabletop-game': 'new card added 2026-10-01; word-audio render pending',
    'hide-and-seek.classic-hiding-game': 'new card added 2026-10-01; word-audio render pending',
    'yo-yo.spinning-toy-on-string': 'new card added 2026-10-01; word-audio render pending',
    'bounce.spring-off-a-surface': 'new card added 2026-10-01; word-audio render pending',
    'alien.being-from-another-planet': 'new card added 2026-10-01; word-audio render pending',
    'vacuum cleaner.carpet-cleaning-machine': 'new card added 2026-10-01; word-audio render pending',
    'queue.stand-in-line': 'new card added 2026-10-01; word-audio render pending',
    'lost.cannot-find-way': 'new card added 2026-10-01; word-audio render pending',
    'X-ray.inside-body-photo': 'new card added 2026-10-01; word-audio render pending',
    'Christmas.december-festival': 'new card added 2026-10-01; word-audio render pending',
    'T-rex.giant-meat-eating-dinosaur': 'new card added 2026-10-01; word-audio render pending',
    'bunny.pet-rabbit-child-word': 'new card added 2026-10-01; word-audio render pending'
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
