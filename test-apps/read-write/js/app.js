/*
 * Read & Write — one page, one lesson renderer (read-write-app/BRIEF.md §8).
 *
 * Data: lessons/lessons.json (20 lessons, SPEC format); until it exists, lessons/lessons.sample.json.
 * ?lessons=sample forces the sample. ?day=N opens a day directly.
 *
 * Screens: journey map -> lesson (Read, Words, Questions, Write, Reward, one step at a time).
 * Audio paths come only from js/audio-ids.js. A missing clip greys its speaker; nothing breaks.
 * No locking: any day opens; "next" means the next unfinished day.
 */
(function () {
  "use strict";

  var IDS = window.RWAudioIds;
  var A = window.RWAudio;
  var S = window.RWStore;
  var TOTAL = 20;
  var STEPS = [
    { key: "read", label: "Read" },
    { key: "words", label: "Words" },
    { key: "questions", label: "Questions" },
    { key: "write", label: "Write" },
    { key: "reward", label: "Done" }
  ];

  var ICON = {
    speaker: '<svg viewBox="0 0 64 64" aria-hidden="true"><path class="cone" d="M10 25 h9 l13 -11 v36 l-13 -11 h-9 z"/><path class="wave" d="M40 24 q6 8 0 16"/><path class="wave" d="M46 18 q11 14 0 28"/></svg>',
    stop: '<svg viewBox="0 0 64 64" aria-hidden="true"><rect class="cone" x="19" y="19" width="26" height="26" rx="5"/></svg>',
    map: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M6 12 l11 -4 l14 5 l11 -4 v27 l-11 4 l-14 -5 l-11 4 z"/><path d="M17 8 v27 M31 13 v27"/></svg>',
    next: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M18 10 L32 24 L18 38"/></svg>',
    back: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M30 10 L16 24 L30 38"/></svg>',
    star: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 4 l6 13 l14 1.5 l-10.5 9.5 l3 14 l-12.5 -7 l-12.5 7 l3 -14 l-10.5 -9.5 l14 -1.5 z"/></svg>',
    undo: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M14 18 h18 a10 10 0 0 1 0 20 h-10"/><path d="M20 10 l-8 8 l8 8"/></svg>',
    clear: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M12 14 h24 M19 14 v-4 h10 v4 M15 14 l2 26 h14 l2 -26"/></svg>',
    tick: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M10 25 l9 9 l19 -20"/></svg>'
  };

  var el = {
    map: document.getElementById("map"),
    lesson: document.getElementById("lesson"),
    stops: document.getElementById("stops"),
    trail: document.getElementById("trail"),
    trailPath: document.getElementById("trail-path"),
    tally: document.getElementById("tally"),
    goNext: document.getElementById("go-next"),
    reset: document.getElementById("reset"),
    mapToast: document.getElementById("map-toast"),
    home: document.getElementById("home"),
    dayChip: document.getElementById("day-chip"),
    title: document.getElementById("lesson-title"),
    steps: document.getElementById("steps"),
    stage: document.getElementById("stage"),
    foot: document.getElementById("foot"),
    error: document.getElementById("load-error")
  };

  var lessons = [];
  var byId = {};
  var cur = null;        // { lesson, step, q }
  var pad = null;
  var justFinished = null;

  // ------------------------------------------------------------------ helpers
  function h(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html !== undefined) n.innerHTML = html;
    return n;
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; });
  }
  function asset(p) {
    if (!p) return "";
    // A Word Book path is served from the repository during development only; tools/check-app.mjs
    // warns about it, because only files inside read-write-app/ are published.
    if (/^word-book\//.test(p)) return "../" + p;
    return p;
  }
  function speaker(clip, label, extra) {
    var b = h("button", "spk" + (extra ? " " + extra : ""), ICON.speaker);
    b.type = "button";
    b.setAttribute("data-clip", clip);
    b.setAttribute("aria-label", label || "Listen");
    return b;
  }
  function button(cls, html, label) {
    var b = h("button", "btn " + cls, html);
    b.type = "button";
    if (label) b.setAttribute("aria-label", label);
    return b;
  }
  function pulse(node, cls) {
    cls = cls || "nudge";
    node.classList.remove(cls);
    void node.offsetWidth;
    node.classList.add(cls);
  }
  function stepIndex(key) { for (var i = 0; i < STEPS.length; i++) if (STEPS[i].key === key) return i; return 0; }
  function thumbOf(lesson) { return asset((lesson.reward && lesson.reward.icon) || (lesson.image && lesson.image.src)); }
  function nextUnfinished() {
    for (var i = 0; i < lessons.length; i++) if (!S.isDone(lessons[i].id)) return lessons[i];
    return null;
  }
  function setUrl(day) {
    try {
      var p = new URLSearchParams(location.search);
      if (day) p.set("day", day); else p.delete("day");
      var q = p.toString();
      history.replaceState(null, "", location.pathname + (q ? "?" + q : ""));
    } catch (e) { /* file: or sandboxed */ }
  }

  // Delegated speaker handling: any .spk plays its clip; a missing clip answers with a soft wobble.
  document.addEventListener("click", function (e) {
    A.unlock();
    var b = e.target.closest ? e.target.closest(".spk") : null;
    if (!b) return;
    e.stopPropagation();
    var clip = b.getAttribute("data-clip");
    stopReadAll();
    if (!clip || A.isMissing(clip)) { pulse(b); return; }
    b.classList.add("playing");
    A.play(clip).then(function (ok) {
      b.classList.remove("playing");
      if (!ok && A.isMissing(clip)) pulse(b);
    });
  }, true);

  // ------------------------------------------------------------------ journey map
  function renderMap() {
    var ids = lessons.map(function (l) { return l.id; });
    var done = S.doneCount(ids);
    el.tally.textContent = done + " / " + TOTAL;
    var nxt = nextUnfinished();
    el.goNext.innerHTML = nxt
      ? (done ? "Next: Day " + nxt.id : "Start Day " + nxt.id) + ' <span class="ico">' + ICON.next + "</span>"
      : (done >= TOTAL ? "All " + TOTAL + " done! Read again " : "Read Day " + lessons[0].id + " again ") + '<span class="ico">' + ICON.star + "</span>";
    el.goNext.onclick = function () { openDay((nxt || lessons[0]).id); };

    el.stops.textContent = "";
    var cols = window.innerWidth > window.innerHeight ? 5 : 4;
    el.stops.style.setProperty("--cols", cols);
    for (var day = 1; day <= TOTAL; day++) {
      var i = day - 1;
      var row = Math.floor(i / cols);
      var col = row % 2 ? cols - 1 - (i % cols) : i % cols;
      var lesson = byId[day];
      var li = h("li", "stop");
      li.style.gridRow = String(row + 1);
      li.style.gridColumn = String(col + 1);
      var b = h("button", "stop-btn");
      b.type = "button";
      b.setAttribute("data-day", day);
      var isDone = lesson && S.isDone(day);
      if (!lesson) {
        li.classList.add("soon");
        b.innerHTML = '<span class="disc"><span class="num">' + day + "</span></span>" +
          '<span class="stop-title">Coming soon</span>';
        b.setAttribute("aria-label", "Day " + day + ", coming soon");
      } else {
        if (isDone) li.classList.add("done");
        if (nxt && nxt.id === day) li.classList.add("next");
        if (justFinished === day) li.classList.add("stamp");
        var inner = isDone
          ? '<span class="disc"><img alt="" src="' + esc(thumbOf(lesson)) + '"><span class="badge">' + ICON.star + "</span></span>"
          : '<span class="disc"><span class="num">' + day + "</span></span>";
        b.innerHTML = inner + '<span class="stop-title"><span class="stop-day">Day ' + day + "</span> " + esc(lesson.title) + "</span>";
        b.setAttribute("aria-label", "Day " + day + ": " + lesson.title + (isDone ? ", finished" : ""));
        var img = b.querySelector("img");
        if (img) img.onerror = function () { this.style.visibility = "hidden"; };
      }
      li.appendChild(b);
      el.stops.appendChild(li);
    }
    justFinished = null;
    requestAnimationFrame(drawTrail);
  }

  function drawTrail() {
    var svg = el.trailPath;
    var box = el.trail.getBoundingClientRect();
    if (!box.width) return;
    svg.setAttribute("viewBox", "0 0 " + box.width + " " + box.height);
    var pts = [];
    var discs = el.stops.querySelectorAll(".disc");
    for (var i = 0; i < discs.length; i++) {
      var r = discs[i].getBoundingClientRect();
      pts.push({ x: r.left - box.left + r.width / 2, y: r.top - box.top + r.height / 2, done: discs[i].closest(".stop").classList.contains("done") });
    }
    var dAll = "", dDone = "";
    for (var k = 0; k < pts.length; k++) {
      var p = pts[k];
      if (k === 0) { dAll = "M " + p.x + " " + p.y; continue; }
      var a = pts[k - 1];
      var seg;
      if (Math.abs(a.y - p.y) < 2) seg = " L " + p.x + " " + p.y;
      else {
        var bulge = (a.x > box.width / 2 ? 1 : -1) * 60;
        seg = " C " + (a.x + bulge) + " " + a.y + " " + (p.x + bulge) + " " + p.y + " " + p.x + " " + p.y;
      }
      dAll += seg;
      if (a.done && p.done) dDone += " M " + a.x + " " + a.y + seg;
    }
    svg.innerHTML = '<path class="trail-all" d="' + dAll + '"/><path class="trail-done" d="' + dDone + '"/>';
  }

  el.stops.addEventListener("click", function (e) {
    var b = e.target.closest ? e.target.closest(".stop-btn") : null;
    if (!b) return;
    var day = parseInt(b.getAttribute("data-day"), 10);
    if (!byId[day]) {
      pulse(b);
      toast("Day " + day + " is still being written.");
      return;
    }
    openDay(day);
  });

  var toastTimer = null;
  function toast(msg) {
    el.mapToast.textContent = msg;
    el.mapToast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.mapToast.classList.remove("show"); }, 2200);
  }

  // Two-tap reset: the first tap arms it and says what will happen; the second, within 4 s, clears.
  var resetTimer = null;
  el.reset.addEventListener("click", function () {
    if (el.reset.classList.contains("armed")) {
      clearTimeout(resetTimer);
      el.reset.classList.remove("armed");
      el.reset.textContent = "Start over";
      S.reset();
      renderMap();
      toast("A fresh journey!");
      return;
    }
    el.reset.classList.add("armed");
    el.reset.textContent = "Tap again to clear every day";
    resetTimer = setTimeout(function () {
      el.reset.classList.remove("armed");
      el.reset.textContent = "Start over";
    }, 4000);
  });

  window.addEventListener("resize", function () {
    if (!el.map.hidden) renderMap();
  });

  function showMap() {
    leaveLesson();
    el.lesson.hidden = true;
    el.map.hidden = false;
    setUrl(null);
    renderMap();
  }

  // ------------------------------------------------------------------ lesson shell
  function firstOpenStep(lesson) {
    var d = S.peek(lesson.id);
    if (!d || d.done) return "read";
    for (var i = 0; i < STEPS.length - 1; i++) if (!d.steps[STEPS[i].key]) return STEPS[i].key;
    return "reward";
  }
  function reached(lesson) {
    var d = S.peek(lesson.id);
    if (d && d.done) return STEPS.length - 1;
    return stepIndex(firstOpenStep(lesson));
  }

  function openDay(id) {
    var lesson = byId[id];
    if (!lesson) return;
    A.unlock();
    el.map.hidden = true;
    el.lesson.hidden = false;
    el.lesson.setAttribute("data-topic", lesson.topic || "");
    el.dayChip.textContent = "Day " + lesson.id;
    el.title.textContent = lesson.title;
    cur = { lesson: lesson, step: firstOpenStep(lesson), q: 0 };
    setUrl(lesson.id);
    go(cur.step);
  }

  function leaveLesson() {
    stopReadAll();
    A.stop();
    if (pad) { pad.destroy(); pad = null; }
  }

  function renderSteps() {
    el.steps.textContent = "";
    var at = stepIndex(cur.step);
    var max = Math.max(reached(cur.lesson), at);
    STEPS.forEach(function (s, i) {
      var li = h("li");
      var b = h("button", "step-dot" + (i === at ? " on" : "") + (i !== at && (i < at || i < max) ? " seen" : ""));
      b.type = "button";
      b.innerHTML = '<span class="dot-n">' + (i < STEPS.length - 1 ? i + 1 : ICON.star) + '</span><span class="dot-l">' + s.label + "</span>";
      b.setAttribute("aria-label", s.label + (i === at ? " (now)" : ""));
      b.setAttribute("data-step", s.key);
      if (i > max) b.classList.add("ahead");
      li.appendChild(b);
      el.steps.appendChild(li);
    });
  }
  el.steps.addEventListener("click", function (e) {
    var b = e.target.closest ? e.target.closest(".step-dot") : null;
    if (!b) return;
    var key = b.getAttribute("data-step");
    if (stepIndex(key) > Math.max(reached(cur.lesson), stepIndex(cur.step))) { pulse(b); return; }
    go(key);
  });
  el.home.addEventListener("click", showMap);

  function go(key) {
    stopReadAll();
    A.stop();
    if (pad) { pad.destroy(); pad = null; }
    if (key === "questions" && cur.step !== "questions") cur.qPicked = false;
    cur.step = key;
    el.lesson.setAttribute("data-step", key);
    el.stage.textContent = "";
    el.foot.textContent = "";
    el.stage.scrollTop = 0;
    renderSteps();
    ({ read: renderRead, words: renderWords, questions: renderQuestions, write: renderWrite, reward: renderReward })[key]();
    A.paint(document);
  }

  function advance(fromKey) {
    if (fromKey !== "reward") S.markStep(cur.lesson.id, fromKey);
    go(STEPS[stepIndex(fromKey) + 1].key);
  }

  function nextButton(label, fromKey) {
    var b = button("primary next", esc(label) + ' <span class="ico">' + ICON.next + "</span>");
    b.addEventListener("click", function () { advance(fromKey); });
    return b;
  }

  // ------------------------------------------------------------------ 1. picture & read
  var readAll = { on: false };
  function stopReadAll() {
    if (!readAll.on) return;
    readAll.on = false;
    A.stop();
    var b = document.getElementById("read-all");
    if (b) setReadAll(b, false);
    var lit = el.stage.querySelectorAll(".sent.now");
    for (var i = 0; i < lit.length; i++) lit[i].classList.remove("now");
  }
  function setReadAll(b, on) {
    b.classList.toggle("playing", on);
    b.innerHTML = '<span class="ico">' + (on ? ICON.stop : ICON.speaker) + "</span>" + (on ? "Stop" : "Read to Me");
    b.setAttribute("aria-label", on ? "Stop reading" : "Read the whole page to me");
  }

  function hero(lesson) {
    var fig = h("figure", "hero");
    var img = h("img");
    img.alt = (lesson.image && lesson.image.alt) || "";
    img.decoding = "async";
    img.onload = function () { fig.classList.add("loaded"); };
    img.onerror = function () { fig.classList.add("noimg"); };
    img.src = asset(lesson.image && lesson.image.src);
    fig.appendChild(img);
    return fig;
  }

  function renderRead() {
    var L = cur.lesson;
    var wrap = h("div", "read-layout");
    wrap.appendChild(hero(L));
    var passage = h("div", "passage");
    passage.id = "passage";
    var paths = [];
    L.sentences.forEach(function (s, i) {
      var clip = IDS.sentence(L, s).path;
      paths.push(clip);
      var b = h("button", "sent");
      b.type = "button";
      b.setAttribute("data-clip", clip);
      b.setAttribute("data-i", i);
      b.innerHTML = '<span class="sent-spk">' + ICON.speaker + '</span><span class="sent-text">' + esc(s.text) + "</span>";
      b.setAttribute("aria-label", "Hear: " + s.text);
      passage.appendChild(b);
    });
    wrap.appendChild(passage);
    el.stage.appendChild(wrap);
    A.preload(paths);

    passage.addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest(".sent") : null;
      if (!b) return;
      stopReadAll();
      var clip = b.getAttribute("data-clip");
      var lit = passage.querySelectorAll(".sent.now");
      for (var i = 0; i < lit.length; i++) lit[i].classList.remove("now");
      if (A.isMissing(clip)) { pulse(b); return; }
      b.classList.add("now");
      A.play(clip).then(function () { b.classList.remove("now"); });
    });

    var all = button("read-all", "", "Read the whole page to me");
    all.id = "read-all";
    all.setAttribute("data-clip", paths.join(" "));
    setReadAll(all, false);
    all.addEventListener("click", function () {
      if (readAll.on) { stopReadAll(); return; }
      if (paths.every(function (p) { return A.isMissing(p); })) { pulse(all); return; }
      readAll.on = true;
      setReadAll(all, true);
      var rows = passage.querySelectorAll(".sent");
      A.sequence(paths, function (i) {
        for (var k = 0; k < rows.length; k++) rows[k].classList.toggle("now", k === i);
        if (rows[i].scrollIntoView) rows[i].scrollIntoView({ block: "nearest", behavior: "smooth" });
      }).then(function (finished) {
        if (finished) {
          readAll.on = false;
          setReadAll(all, false);
          for (var k = 0; k < rows.length; k++) rows[k].classList.remove("now");
          S.markStep(L.id, "read");
        }
      });
    });
    el.foot.appendChild(all);
    el.foot.appendChild(h("span", "spacer"));
    el.foot.appendChild(nextButton("Words", "read"));
  }

  // ------------------------------------------------------------------ 2. words
  function quoteFor(L, word) {
    var re = new RegExp("\\b(" + word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "[a-z]*)", "i");
    for (var i = 0; i < L.sentences.length; i++) {
      var t = L.sentences[i].text;
      if (re.test(t)) return esc(t).replace(re, "<mark>$1</mark>");
    }
    return "";
  }
  function renderWords() {
    var L = cur.lesson;
    var list = h("div", "cards n" + L.vocabulary.length);
    var paths = [];
    L.vocabulary.forEach(function (v, i) {
      var card = h("article", "card" + (v.image ? " has-pic" : ""));
      if (v.image) {
        var pic = h("div", "card-pic");
        var img = h("img");
        img.alt = "";
        img.onerror = function () { pic.remove(); card.classList.remove("has-pic"); };
        img.src = asset(v.image);
        pic.appendChild(img);
        card.appendChild(pic);
      }
      var wclip = IDS.word(v).path;
      var mclip = IDS.meaning(L, i + 1).path;
      paths.push(wclip, mclip);
      var w = h("button", "card-word spk", '<span class="w">' + esc(v.word) + '</span><span class="w-spk">' + ICON.speaker + "</span>");
      w.type = "button";
      w.setAttribute("data-clip", wclip);
      w.setAttribute("aria-label", "Hear the word " + v.word);
      card.appendChild(w);
      var m = h("div", "card-meaning");
      m.appendChild(speaker(mclip, "Hear what it means", "sm"));
      m.appendChild(h("p", "", esc(v.meaning)));
      card.appendChild(m);
      var q = quoteFor(L, v.word);
      if (q) card.appendChild(h("p", "card-quote", q));
      list.appendChild(card);
    });
    el.stage.appendChild(h("h3", "step-title", "Words to know"));
    el.stage.appendChild(list);
    A.preload(paths);
    el.foot.appendChild(backButton("read"));
    el.foot.appendChild(h("span", "spacer"));
    el.foot.appendChild(nextButton("Questions", "words"));
  }
  function backButton(toKey) {
    var b = button("ghost back", '<span class="ico">' + ICON.back + "</span>Back", "Back");
    b.addEventListener("click", function () { go(toKey); });
    return b;
  }

  // ------------------------------------------------------------------ 3. questions
  function renderQuestions() {
    var L = cur.lesson;
    var qi = Math.min(cur.q || 0, L.questions.length - 1);
    var d = S.peek(L.id) || { answers: {} };
    // Resume at the first question not yet answered correctly.
    if (!cur.qPicked) {
      qi = 0;
      while (qi < L.questions.length - 1 && d.answers && d.answers[L.questions[qi].id] && d.answers[L.questions[qi].id].correct) qi++;
      cur.qPicked = true;
    }
    cur.q = qi;
    var Q = L.questions[qi];
    var prev = d.answers && d.answers[Q.id];
    var tries = 0;
    var solved = !!(prev && prev.correct);

    var box = h("div", "question");
    box.appendChild(h("p", "q-count", "Question " + (qi + 1) + " of " + L.questions.length));
    var pr = h("div", "q-prompt");
    var pclip = IDS.question(L, Q).path;
    pr.appendChild(speaker(pclip, "Hear the question"));
    pr.appendChild(h("h3", "", esc(Q.prompt)));
    box.appendChild(pr);

    var ul = h("ul", "choices");
    var paths = [pclip];
    Q.choices.forEach(function (c) {
      var li = h("li", "choice-row");
      var cclip = IDS.choice(L, Q, c).path;
      paths.push(cclip);
      li.appendChild(speaker(cclip, "Hear: " + c.text, "sm"));
      var b = h("button", "choice", '<span class="c-text">' + esc(c.text) + '</span><span class="c-mark">' + ICON.tick + "</span>");
      b.type = "button";
      b.setAttribute("data-cid", c.id);
      li.appendChild(b);
      ul.appendChild(li);
    });
    box.appendChild(ul);
    var hclip = IDS.hint(L, Q).path;
    paths.push(hclip);
    var fb = h("div", "q-feedback");
    fb.setAttribute("aria-live", "polite");
    box.appendChild(fb);
    el.stage.appendChild(box);
    A.preload(paths);

    var nextQ = button("primary next", "", "Next");
    var last = qi === L.questions.length - 1;
    nextQ.innerHTML = (last ? "Write" : "Next question") + ' <span class="ico">' + ICON.next + "</span>";
    function setNext() { nextQ.classList.toggle("waiting", !solved); }
    setNext();
    nextQ.addEventListener("click", function () {
      if (!solved) { pulse(nextQ); showMsg("Choose an answer first.", "soft"); return; }
      if (last) { cur.qPicked = false; advance("questions"); }
      else { cur.q = qi + 1; go("questions"); }
    });

    function showMsg(text, kind) {
      fb.className = "q-feedback show " + (kind || "");
      fb.innerHTML = "";
      fb.appendChild(h("p", "", text));
    }
    function showHint(isExplain) {
      fb.className = "q-feedback show " + (isExplain ? "yay" : "hint");
      fb.innerHTML = "";
      var row = h("div", "hint-row");
      row.appendChild(speaker(hclip, "Hear the hint", "sm"));
      var p = h("p");
      p.innerHTML = (isExplain ? "<strong>Yes!</strong> " : "<strong>Here is a clue:</strong> ") + esc(Q.hint);
      row.appendChild(p);
      fb.appendChild(row);
      A.paint(fb);
    }
    function markSolved(b) {
      b.classList.add("right");
      ul.classList.add("solved");
      solved = true;
      setNext();
    }

    if (solved) {
      markSolved(ul.querySelector('[data-cid="' + Q.answer + '"]'));
      showHint(true);
    }

    ul.addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest(".choice") : null;
      if (!b || solved) return;
      if (b.classList.contains("tried")) { pulse(b); return; }
      A.stop();
      tries++;
      if (b.getAttribute("data-cid") === Q.answer) {
        markSolved(b);
        S.answer(L.id, Q.id, tries, true);
        A.chime();
        showHint(true);
        pulse(box, "cheer");
        if (last) S.markStep(L.id, "questions");
      } else {
        b.classList.add("tried");
        b.setAttribute("aria-disabled", "true");
        pulse(b);
        S.answer(L.id, Q.id, tries, false);
        if (tries >= 2) {
          showHint(false);
          A.play(hclip);
        } else {
          showMsg("Not quite. Try again!", "soft");
        }
      }
    });

    // Hear the question once as it appears (the child has just tapped, so audio is unlocked).
    if (!solved) setTimeout(function () { if (cur && cur.step === "questions" && cur.q === qi) A.play(pclip); }, 350);

    el.foot.appendChild(qi === 0 ? backButton("words") : (function () {
      var b = button("ghost back", '<span class="ico">' + ICON.back + "</span>Back", "Previous question");
      b.addEventListener("click", function () { cur.q = qi - 1; go("questions"); });
      return b;
    })());
    el.foot.appendChild(h("span", "spacer"));
    el.foot.appendChild(nextQ);
  }

  // ------------------------------------------------------------------ 4. write
  function renderWrite() {
    var L = cur.lesson;
    var W = L.writing || {};
    var d = S.peek(L.id);
    var card = h("div", "write-card type-" + (W.type || "free"));
    var wclip = IDS.writePrompt(L).path;
    var paths = [wclip];
    var p = h("div", "write-prompt");
    p.appendChild(speaker(wclip, "Hear what to write", "sm"));
    p.appendChild(h("p", "", esc(W.prompt || "")));
    card.appendChild(p);
    if (W.type === "copy" && W.model) {
      var mclip = IDS.model(L).path;
      paths.push(mclip);
      var m = h("div", "write-model");
      m.appendChild(speaker(mclip, "Hear the sentence", "sm"));
      m.appendChild(h("p", "", esc(W.model)));
      card.appendChild(m);
    } else if (W.type === "complete" && W.frame) {
      var f = h("div", "write-model frame");
      f.appendChild(h("p", "", esc(W.frame).replace(/_{2,}/, '<span class="blank" aria-label="blank"></span>')));
      card.appendChild(f);
    }
    el.stage.appendChild(card);
    A.preload(paths);

    var saved = d && d.writing && d.writing.done;
    if (saved) {
      var keep = h("div", "write-saved");
      if (d.writing.image) {
        var img = h("img");
        img.alt = "What you wrote";
        img.src = d.writing.image;
        keep.appendChild(img);
      } else {
        keep.appendChild(h("p", "", "You wrote this one already."));
      }
      el.stage.appendChild(keep);
      var again = button("ghost", '<span class="ico">' + ICON.undo + "</span>Write again", "Write again");
      again.addEventListener("click", function () {
        var dd = S.peek(L.id);
        if (dd) dd.writing = null;
        renderWriteFresh(card);
      });
      el.foot.appendChild(backButton("questions"));
      el.foot.appendChild(h("span", "spacer"));
      el.foot.appendChild(again);
      el.foot.appendChild(nextButton("Finish", "write"));
      return;
    }
    renderWriteFresh(card);
  }

  function renderWriteFresh(card) {
    var L = cur.lesson;
    var W = L.writing || {};
    el.stage.textContent = "";
    el.foot.textContent = "";
    el.stage.appendChild(card);
    var host = h("div", "pad");
    el.stage.appendChild(host);
    var undo, clear, done;
    pad = window.RWWritePad.create({
      host: host,
      lines: W.type === "free" ? 3 : 2,
      lineHeight: W.type === "free" ? 250 : 290,
      onChange: function (n) {
        undo.classList.toggle("waiting", n === 0);
        clear.classList.toggle("waiting", n === 0);
        done.classList.toggle("waiting", n === 0);
        if (n === 0) disarm();
      }
    });
    undo = button("tool", '<span class="ico">' + ICON.undo + "</span>Undo", "Undo the last line");
    clear = button("tool", '<span class="ico">' + ICON.clear + "</span>Clear", "Clear the page");
    done = button("primary done", '<span class="ico">' + ICON.tick + "</span>Done", "I am done");
    [undo, clear, done].forEach(function (b) { b.classList.add("waiting"); });

    undo.addEventListener("click", function () {
      if (!pad.count()) { pulse(undo); return; }
      pad.undo();
    });
    // Clear is two taps: the first asks, the second (within 3 s) clears. It is only their own page,
    // but one stray tap should not wipe a finished sentence.
    var armT = null;
    function disarm() { clearTimeout(armT); clear.classList.remove("armed"); clear.innerHTML = '<span class="ico">' + ICON.clear + "</span>Clear"; }
    clear.addEventListener("click", function () {
      if (!pad.count()) { pulse(clear); return; }
      if (clear.classList.contains("armed")) { disarm(); pad.clear(); return; }
      clear.classList.add("armed");
      clear.innerHTML = '<span class="ico">' + ICON.clear + "</span>Tap again";
      armT = setTimeout(disarm, 3000);
    });
    done.addEventListener("click", function () {
      if (!pad.count()) { pulse(done); pulse(host, "nudge"); return; }
      var png = pad.toPNG(600);
      if (png && png.length > S.IMAGE_CAP) png = pad.toPNG(360);
      S.writing(L.id, png);
      advance("write");
    });
    el.foot.appendChild(backButton("questions"));
    el.foot.appendChild(h("span", "spacer"));
    el.foot.appendChild(undo);
    el.foot.appendChild(clear);
    el.foot.appendChild(done);
  }

  // ------------------------------------------------------------------ 5. reward
  function renderReward() {
    var L = cur.lesson;
    var wasDone = S.isDone(L.id);
    S.finish(L.id);
    if (!wasDone) justFinished = L.id;
    var d = S.peek(L.id);
    var box = h("div", "reward");
    var medal = h("div", "medal");
    var img = h("img");
    img.alt = "";
    img.onerror = function () { medal.classList.add("noimg"); };
    img.src = thumbOf(L);
    medal.appendChild(img);
    medal.appendChild(h("span", "medal-star", ICON.star));
    box.appendChild(medal);
    box.appendChild(h("h3", "", "Day " + L.id + " done!"));
    var name = (L.reward && L.reward.name) || L.title;
    box.appendChild(h("p", "reward-name", "You earned the <strong>" + esc(name) + "</strong>."));
    if (d && d.writing && d.writing.image) {
      var fig = h("figure", "my-writing");
      var w = h("img");
      w.alt = "What you wrote today";
      w.src = d.writing.image;
      fig.appendChild(w);
      fig.appendChild(h("figcaption", "", "Your writing"));
      box.appendChild(fig);
    }
    el.stage.appendChild(box);
    A.chime();
    var back = button("primary", '<span class="ico">' + ICON.map + "</span>Back to my journey", "Back to my journey");
    back.addEventListener("click", showMap);
    el.foot.appendChild(h("span", "spacer"));
    el.foot.appendChild(back);
    el.foot.appendChild(h("span", "spacer"));
  }

  // ------------------------------------------------------------------ boot
  function usable(l) {
    return l && typeof l.id === "number" && l.title && Array.isArray(l.sentences) && l.sentences.length &&
      Array.isArray(l.vocabulary) && Array.isArray(l.questions) && l.questions.length && l.writing;
  }
  function getJSON(url) {
    return fetch(url, { cache: "no-cache" }).then(function (r) { if (!r.ok) throw new Error(url + " " + r.status); return r.json(); });
  }
  var params = new URLSearchParams(location.search);
  var want = params.get("lessons") === "sample" ? "lessons/lessons.sample.json" : "lessons/lessons.json";
  getJSON(want)
    .catch(function () { return getJSON("lessons/lessons.sample.json"); })
    .then(function (data) {
      lessons = (data.lessons || []).filter(usable).sort(function (a, b) { return a.id - b.id; });
      if (!lessons.length) throw new Error("no usable lessons");
      lessons.forEach(function (l) { byId[l.id] = l; });
      TOTAL = Math.max(TOTAL, lessons[lessons.length - 1].id);
      var day = parseInt(params.get("day"), 10);
      if (byId[day]) openDay(day); else showMap();
    })
    .catch(function (e) {
      console.error("Read & Write:", e);
      el.error.hidden = false;
    });

  window.__readWrite = { state: function () { return cur && { day: cur.lesson.id, step: cur.step, q: cur.q }; } };
})();
