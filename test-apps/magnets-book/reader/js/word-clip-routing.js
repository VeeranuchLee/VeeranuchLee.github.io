/* Select the shipped clip for a word the child taps.
 * English spelling is only an approximation of sound, so "the" uses the first letter
 * plus two deliberately small exception lists. Add an exception only when Reading Tree
 * actually needs one: silent-h words begin with a vowel sound; u-/o- words below begin
 * with /y/ or /w/. This keeps the rule visible and testable.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ReadingWordClips = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  var VOWEL_SOUND_EXCEPTIONS = ["heir", "honest", "honour", "hour"];
  var CONSONANT_SOUND_EXCEPTIONS = ["one", "once", "unicorn", "uniform", "unit", "united", "university", "use", "user", "usual"];

  function startsWithAny(word, prefixes) {
    return prefixes.some(function (prefix) { return word === prefix || word.indexOf(prefix) === 0; });
  }
  function beginsWithVowelSound(word) {
    var next = String(word || "").toLowerCase();
    if (!next) return false;
    if (startsWithAny(next, VOWEL_SOUND_EXCEPTIONS)) return true;
    if (startsWithAny(next, CONSONANT_SOUND_EXCEPTIONS)) return false;
    return /^[aeiou]/.test(next);
  }
  function clipKey(word, nextWord) {
    var current = String(word || "").toLowerCase();
    if (current === "the" && beginsWithVowelSound(nextWord)) return "the-vowel";
    return current;
  }
  return { beginsWithVowelSound: beginsWithVowelSound, clipKey: clipKey };
});
