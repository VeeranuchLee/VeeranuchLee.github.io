/* Phrase tap policy seam shared by the browser reader and its Node gate.
   Owner decision 2026-10-18 (option 2 of the 2026-10-17 weak-form pilot): tapping a
   small weak-form word plays the short PHRASE from the page's own narration -- tap "a"
   in "a cat" and hear "a cat" -- because an isolated weak form is a fragment, not a word.

   This module owns only the arithmetic: which words qualify, where the slice starts and
   stops, and the padding around it. It touches no DOM and no audio, so the Node gate can
   exercise the exact computation the browser runs.

   A slice runs from the tapped word's timing start to the END of the following content
   word. Consecutive small words are absorbed ("of the water" tapped on "of" runs through
   "water") so the phrase never ends on another fragment. A sentence boundary inside the
   span, or no following word at all, returns null and the caller keeps today's isolated
   word clip. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ReadingPhraseTap = api;
}(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // The pilot's six listening words (a, the before a consonant, the before a vowel, to,
  // of, and) plus "an" from the survey table: the spellings whose citation clip and
  // in-sentence form differ most, and the set the owner decision names.
  var WEAK_FORMS = { a: true, an: true, the: true, to: true, of: true, and: true };

  // Padding around the raw word times so the cut never clicks: a little breath before
  // the weak word, a little ring-out after the content word, both inside the natural
  // inter-word gaps of the narration.
  var LEAD_IN = 0.060;   // seconds before the tapped word's start (clamped at 0)
  var TAIL = 0.080;      // seconds after the content word's end

  // Sentence terminators. A phrase never crosses one: the narration pause would make the
  // slice sound like two fragments glued together, which is what the owner rejected.
  var SENTENCE_END_RE = /[.!?]/;

  function isWeakForm(word) {
    return !!(word && typeof word === "string" && WEAK_FORMS.hasOwnProperty(word.toLowerCase()));
  }

  function num(v) { return typeof v === "number" && isFinite(v) && v >= 0 ? v : null; }

  // True when the narration text between word k-1 and word k ends a sentence.
  function boundaryBefore(words, k, text) {
    var prev = words[k - 1];
    var cur = words[k];
    if (!prev || !cur) return true;
    var a = num(prev.end_char), b = num(cur.start_char);
    if (a === null || b === null || b < a) return true;  // unreadable alignment: do not guess
    return SENTENCE_END_RE.test(text.slice(a, b));
  }

  /* timing: a page's timing JSON ({text, words:[{text,start,end,start_char,end_char}]})
     index:  the tapped word's index into timing.words (== its word button index)
     expect: the tapped button's data-word, lowercase; a mismatch means the timing does
             not describe the text on screen, so the answer is null
     duration (optional): the clip's duration, to clamp the tail inside real audio
     Returns null (fall back to the isolated word clip) or
     {start, end, from, to} -- padded playback times and the word index range to highlight. */
  function span(timing, index, expect, duration) {
    var words = timing && Array.isArray(timing.words) ? timing.words : null;
    var text = timing && typeof timing.text === "string" ? timing.text : null;
    if (!words || !text) return null;
    if (typeof index !== "number" || index !== Math.floor(index) || index < 0 || index >= words.length || words.length < 2) return null;
    if (!isWeakForm(words[index].text)) return null;
    if (expect != null && String(words[index].text).toLowerCase() !== String(expect).toLowerCase()) return null;

    var start = num(words[index].start);
    var ownEnd = num(words[index].end);
    if (start === null || ownEnd === null || ownEnd < start) return null;  // unreadable timing

    // Walk forward over further small words to the next content word, and refuse to
    // cross a sentence boundary anywhere in the span.
    var to = index;
    while (true) {
      if (to + 1 >= words.length) return null;                       // no following word
      if (boundaryBefore(words, to + 1, text)) return null;          // next word starts a new sentence
      to++;
      if (!isWeakForm(words[to].text)) break;
    }

    var end = num(words[to].end);
    if (end === null || end <= start) return null;

    var outStart = Math.max(0, start - LEAD_IN);
    var outEnd = end + TAIL;
    var dur = num(duration);
    if (dur !== null && outEnd > dur - 0.010) outEnd = dur - 0.010;
    if (outEnd <= outStart + 0.010) return null;                     // nothing audible left
    return { start: outStart, end: outEnd, from: index, to: to };
  }

  /* The clip URL plus a media fragment (owner QA fix 1, 2026-10-18): Safari and Chrome
     position playback at the fragment start themselves -- a currentTime set before any
     metadata exists is not honoured reliably -- and the end is advisory, the caller's
     monitor still ends the slice. Returns null when the slice is unusable. */
  function mediaFragment(asset, slice) {
    var s = slice && num(slice.start);
    var e = slice && num(slice.end);
    if (s === null || e === null || e <= s) return null;
    return String(asset || "") + "#t=" + s.toFixed(3) + "," + e.toFixed(3);
  }

  return {
    isWeakForm: isWeakForm,
    span: span,
    mediaFragment: mediaFragment,
    LEAD_IN: LEAD_IN,
    TAIL: TAIL
  };
}));
