/* spelling.js -- shared spelling rules for Our Dictionary and its Node checks.

   A spelling sequence always says the existing sense-aware whole-word clip first, then
   walks the printed headword from left to right. ASCII letters use one reusable Alice
   clip each; capitals map to the same clip. Spaces and hyphens are visible pauses and
   are never spoken. No browser or operating-system speech is used as a fallback. */
(function (root) {
  'use strict';

  var LETTER_DIR = 'audio/letters/';
  var PAUSE_MS = 260;
  var MISSING_LETTER_MS = 520;

  function steps(word) {
    return Array.prototype.map.call(String(word), function (character, index) {
      var lower = character.toLowerCase();
      if (/^[a-z]$/.test(lower)) {
        return { character: character, index: index, kind: 'letter', clip: LETTER_DIR + lower + '.m4a' };
      }
      if (character === ' ' || character === '-') {
        return { character: character, index: index, kind: 'pause', clip: null };
      }
      return { character: character, index: index, kind: 'unsupported', clip: null };
    });
  }

  var api = {
    LETTER_DIR: LETTER_DIR,
    PAUSE_MS: PAUSE_MS,
    MISSING_LETTER_MS: MISSING_LETTER_MS,
    steps: steps
  };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Spelling = api;
})(this);
