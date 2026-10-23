/*
 * Read & Write — the ONE place audio ids and paths are derived (read-write-app/SPEC.md, "Audio IDs").
 *
 * Nothing in the app, the data check or the render manifest writes an audio path by hand: every
 * component asks this file. Fix a sentence's text in lessons.json and its clip keeps the same id,
 * so re-rendering never touches lesson logic.
 *
 *   sentence         audio/lessons/d{NN}-{sid}.m4a           d01-s3
 *   question prompt  audio/lessons/d{NN}-{qid}.m4a           d01-q1
 *   choice           audio/lessons/d{NN}-{qid}-{cid}.m4a     d01-q1-a
 *   hint             audio/lessons/d{NN}-{qid}-hint.m4a      d01-q1-hint
 *   writing prompt   audio/lessons/d{NN}-write.m4a
 *   copy model       audio/lessons/d{NN}-model.m4a           (copy tasks only)
 *   vocab word       audio/words/{word}.m4a                  lowercased, spaces -> "-" (Word Book's form)
 *   vocab meaning    audio/lessons/d{NN}-v{n}.m4a            n = 1-based position (optional clip)
 *
 * "Read to Me" has no clip of its own: it plays the sentence clips in order.
 * Loaded as a plain <script> (window.RWAudioIds) and by node tools via require().
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.RWAudioIds = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var EXT = ".m4a";

  function dd(lesson) {
    var n = typeof lesson === "object" ? lesson.id : lesson;
    n = parseInt(n, 10);
    return "d" + (n < 10 ? "0" : "") + n;
  }
  function lessonClip(stem) { return { id: stem, path: "audio/lessons/" + stem + EXT }; }
  function wordSlug(word) { return String(word).trim().toLowerCase().replace(/\s+/g, "-"); }

  function sentence(lesson, s) { return lessonClip(dd(lesson) + "-" + (s.id || s)); }
  function question(lesson, q) { return lessonClip(dd(lesson) + "-" + (q.id || q)); }
  function choice(lesson, q, c) { return lessonClip(dd(lesson) + "-" + (q.id || q) + "-" + (c.id || c)); }
  function hint(lesson, q) { return lessonClip(dd(lesson) + "-" + (q.id || q) + "-hint"); }
  function writePrompt(lesson) { return lessonClip(dd(lesson) + "-write"); }
  function model(lesson) { return lessonClip(dd(lesson) + "-model"); }
  function word(w) {
    var slug = wordSlug(typeof w === "object" ? w.word : w);
    return { id: "word-" + slug, path: "audio/words/" + slug + EXT };
  }
  function meaning(lesson, n) { return lessonClip(dd(lesson) + "-v" + n); }

  /* Every clip one lesson can play, with the text a renderer would send. `optional` clips are the
     ones the SPEC marks optional (vocabulary meanings); everything else is required for a finished
     lesson. Order is the order a child meets them. */
  function forLesson(lesson) {
    var out = [];
    function add(clip, kind, text, optional) {
      out.push({ id: clip.id, path: clip.path, kind: kind, text: text, optional: !!optional, day: lesson.id });
    }
    (lesson.sentences || []).forEach(function (s) { add(sentence(lesson, s), "sentence", s.text); });
    (lesson.vocabulary || []).forEach(function (v, i) {
      add(word(v), "word", v.word);
      if (v.meaning) add(meaning(lesson, i + 1), "meaning", v.meaning, true);
    });
    (lesson.questions || []).forEach(function (q) {
      add(question(lesson, q), "question", q.prompt);
      (q.choices || []).forEach(function (c) { add(choice(lesson, q, c), "choice", c.text); });
      if (q.hint) add(hint(lesson, q), "hint", q.hint);
    });
    var w = lesson.writing || {};
    if (w.prompt) add(writePrompt(lesson), "write", w.prompt);
    if (w.type === "copy" && w.model) add(model(lesson), "model", w.model);
    return out;
  }

  return {
    dd: dd,
    wordSlug: wordSlug,
    sentence: sentence,
    question: question,
    choice: choice,
    hint: hint,
    writePrompt: writePrompt,
    model: model,
    word: word,
    meaning: meaning,
    forLesson: forLesson
  };
});
