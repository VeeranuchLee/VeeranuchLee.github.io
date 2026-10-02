/*
 * Read & Write — progress, in localStorage key `cg.readWrite.v1`. Every access is wrapped: a private
 * window, blocked storage or a full quota must never stop a child finishing their day — the app just
 * forgets on reload.
 *
 * { v: 1, days: { "<id>": { steps: { read, words, questions, write }, answers: { <qid>: { tries, correct } },
 *                           writing: { done, image, at }, done, doneAt } } }
 */
(function () {
  "use strict";
  var KEY = "cg.readWrite.v1";
  var IMAGE_CAP = 160 * 1024;   // characters of data URL; ~120 KB of PNG
  var state = read();

  function blank() { return { v: 1, days: {} }; }
  function read() {
    try {
      var raw = window.localStorage.getItem(KEY);
      if (!raw) return blank();
      var s = JSON.parse(raw);
      if (!s || s.v !== 1 || typeof s.days !== "object") return blank();
      return s;
    } catch (e) { return blank(); }
  }
  function save() {
    try { window.localStorage.setItem(KEY, JSON.stringify(state)); return true; }
    catch (e) { return false; }
  }
  function day(id) {
    var k = String(id);
    if (!state.days[k]) state.days[k] = { steps: {}, answers: {}, writing: null, done: false };
    var d = state.days[k];
    d.steps = d.steps || {}; d.answers = d.answers || {};
    return d;
  }
  function peek(id) { return state.days[String(id)] || null; }

  window.RWStore = {
    KEY: KEY,
    peek: peek,
    isDone: function (id) { var d = peek(id); return !!(d && d.done); },
    doneCount: function (ids) { return ids.filter(function (id) { var d = peek(id); return d && d.done; }).length; },
    markStep: function (id, step) { day(id).steps[step] = true; save(); },
    answer: function (id, qid, tries, correct) {
      day(id).answers[qid] = { tries: tries, correct: !!correct }; save();
    },
    /* Saving the picture is best effort: if the image is too big or the quota is full, the day is
       still marked written and finished without it. Returns true if the image was kept. */
    writing: function (id, image) {
      var d = day(id);
      var keep = typeof image === "string" && image.length <= IMAGE_CAP ? image : null;
      d.writing = { done: true, image: keep, at: Date.now() };
      d.steps.write = true;
      if (save()) return !!keep;
      d.writing.image = null;
      save();
      return false;
    },
    finish: function (id) { var d = day(id); d.done = true; d.doneAt = d.doneAt || Date.now(); save(); },
    reset: function () {
      state = blank();
      try { window.localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    },
    IMAGE_CAP: IMAGE_CAP
  };
})();
