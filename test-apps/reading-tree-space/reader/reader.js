/*
 * Reading Tree reader -- one engine for every fact book.
 *
 * A book is a folder: reading-app/books/<id>/book.json + art/. books/index.json lists them.
 * Open one with ?book=<id>; with no (or an unknown) id the first listed book opens.
 *
 * Word-by-word reading (owner spec sections 10 and 13). Every word a child hears is a
 * pre-rendered clip at reading-app/audio/words/<word>.m4a (lowercased, punctuation
 * stripped). There is NO device text-to-speech and no network voice: a missing clip is an
 * incomplete build, caught by tools/check-reader.mjs, never papered over here.
 *
 *   speaker, idle      -> read from the first word, highlighting each word as it plays
 *   speaker, playing   -> stop
 *   speaker, stopped   -> (idle again) read from the beginning
 *   tap a word         -> stop page playback, highlight that word, play only it, back to idle
 *   page change        -> stop audio, clear highlight, load the page
 */
(function () {
  "use strict";

  var BOOKS = "../books/";
  var WORDS = "../audio/words/";
  var GAP_MS = 90;            // breath between words during page playback
  var WORD_RE = /[A-Za-z]+(?:'[A-Za-z]+)?/g;

  var el = {
    book: document.getElementById("book"),
    img: document.getElementById("art-img"),
    text: document.getElementById("text"),
    speaker: document.getElementById("speaker"),
    prev: document.getElementById("prev"),
    next: document.getElementById("next"),
    dots: document.getElementById("dots"),
    error: document.getElementById("load-error"),
    shelfBack: document.getElementById("shelf-back")
  };

  var book = null;
  var bookDir = "";
  var index = 0;
  var run = 0;                // bumps on every stop / page change; stale callbacks check it
  var wordButtons = [];

  // ---------------------------------------------------------------- audio
  // WebAudio where available (gapless, reliable sequencing on iPad Safari once unlocked by
  // the first tap); a single reused <audio> element otherwise.
  var Ctx = window.AudioContext || window.webkitAudioContext;
  var ctx = null;
  var buffers = {};           // word -> Promise<AudioBuffer|null>
  var current = null;         // the playing source / element
  var fallbackAudio = null;

  function slug(w) { return w.toLowerCase(); }

  function unlock() {
    if (!Ctx) return;
    if (!ctx) {
      try { ctx = new Ctx(); } catch (e) { ctx = null; return; }
    }
    if (ctx.state === "suspended" && ctx.resume) ctx.resume();
  }

  function load(word) {
    var key = slug(word);
    if (!buffers[key]) {
      buffers[key] = fetch(WORDS + encodeURIComponent(key) + ".m4a")
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
        .then(function (data) {
          if (!ctx) return data;  // decoded later, once a tap has made a context
          return new Promise(function (ok, bad) { ctx.decodeAudioData(data, ok, bad); });
        })
        .catch(function (e) {
          console.error("Reading Tree: no clip for \"" + key + "\" -- incomplete build", e);
          delete buffers[key];
          return null;
        });
    }
    return buffers[key].then(function (b) {
      // Pre-tap prefetch kept raw bytes; decode now that a context exists.
      if (b && ctx && !(b instanceof AudioBuffer)) {
        var p = new Promise(function (ok, bad) { ctx.decodeAudioData(b.slice(0), ok, bad); })
          .catch(function () { return null; });
        buffers[key] = p;
        return p;
      }
      return b;
    });
  }

  function stopSound() {
    if (current) {
      try {
        if (current.stop) current.stop(); else current.pause();
      } catch (e) { /* already ended */ }
      current = null;
    }
  }

  // Play one word's clip; resolves true when it ended, false when it could not play.
  function playWord(word, myRun) {
    if (ctx) {
      return load(word).then(function (buf) {
        if (myRun !== run) return false;
        if (!buf || !(buf instanceof AudioBuffer)) return false;
        return new Promise(function (done) {
          var src = ctx.createBufferSource();
          src.buffer = buf;
          src.connect(ctx.destination);
          src.onended = function () { if (current === src) current = null; done(true); };
          current = src;
          src.start(0);
        });
      });
    }
    return new Promise(function (done) {
      if (!fallbackAudio) fallbackAudio = new Audio();
      var a = fallbackAudio;
      a.onended = function () { current = null; done(true); };
      a.onerror = function () { current = null; done(false); };
      a.src = WORDS + encodeURIComponent(slug(word)) + ".m4a";
      current = a;
      var p = a.play();
      if (p && p.catch) p.catch(function () { done(false); });
    });
  }

  // ---------------------------------------------------------------- state
  function setSpeaker(state) {
    el.speaker.setAttribute("data-state", state);
    el.speaker.setAttribute("aria-label", state === "playing" ? "Stop reading" : "Read this page aloud");
  }

  function clearHighlight() {
    wordButtons.forEach(function (b) { b.classList.remove("reading-now"); });
  }

  function stopAll() {
    run++;
    stopSound();
    clearHighlight();
    setSpeaker("idle");
  }

  function wait(ms) { return new Promise(function (ok) { setTimeout(ok, ms); }); }

  function readPage() {
    stopAll();
    var myRun = run;
    if (!wordButtons.length) return;
    setSpeaker("playing");
    var i = 0;
    function step() {
      if (myRun !== run) return;
      if (i >= wordButtons.length) { clearHighlight(); setSpeaker("idle"); return; }
      var b = wordButtons[i];
      clearHighlight();
      b.classList.add("reading-now");
      playWord(b.getAttribute("data-word"), myRun).then(function (ok) {
        if (myRun !== run) return;
        if (!ok) flagFailed(b);
        i++;
        return wait(ok ? GAP_MS : 250).then(step);
      });
    }
    step();
  }

  function readOne(b) {
    stopAll();
    var myRun = run;
    b.classList.add("reading-now");
    playWord(b.getAttribute("data-word"), myRun).then(function (ok) {
      if (myRun !== run) return;
      if (!ok) flagFailed(b);
      setTimeout(function () { if (myRun === run) b.classList.remove("reading-now"); }, ok ? 120 : 300);
    });
  }

  function flagFailed(b) {
    b.classList.remove("failed");
    void b.offsetWidth;
    b.classList.add("failed");
  }

  // ---------------------------------------------------------------- rendering
  function renderText(page) {
    var isCover = page.kind === "cover";
    var source = isCover ? book.title : page.text;
    el.text.className = "text" + (isCover ? " title" : "");
    el.text.textContent = "";
    wordButtons = [];
    // Split on spaces into chunks ("planets.", "moons,"). A chunk never breaks across a
    // line, so a full stop or comma is never orphaned at a line start; lines break only
    // at the spaces between chunks. Punctuation stays visible but is never spoken.
    source.split(/\s+/).filter(Boolean).forEach(function (chunk, ci) {
      if (ci > 0) el.text.appendChild(document.createTextNode(" "));
      var wrap = document.createElement("span");
      wrap.className = "chunk";
      var last = 0;
      var m;
      WORD_RE.lastIndex = 0;
      while ((m = WORD_RE.exec(chunk))) {
        if (m.index > last) wrap.appendChild(punct(chunk.slice(last, m.index)));
        var b = document.createElement("button");
        b.type = "button";
        b.className = "word";
        b.textContent = m[0];
        b.setAttribute("data-word", slug(m[0]));
        wrap.appendChild(b);
        wordButtons.push(b);
        last = m.index + m[0].length;
      }
      if (last < chunk.length) wrap.appendChild(punct(chunk.slice(last)));
      el.text.appendChild(wrap);
    });
  }

  function punct(s) {
    var span = document.createElement("span");
    span.className = "punct";
    span.textContent = s;
    return span;
  }

  function renderArt(page) {
    var img = el.img;
    img.classList.remove("loaded");
    img.onload = function () { img.classList.add("loaded"); };
    img.onerror = function () { img.classList.remove("loaded"); };  // cream placeholder stays
    img.src = bookDir + page.art;
    img.alt = "";
  }

  function renderDots() {
    el.dots.textContent = "";
    book.pages.forEach(function (p, i) {
      var d = document.createElement("span");
      if (i === index) d.className = "on";
      el.dots.appendChild(d);
    });
  }

  function show(i, animate) {
    stopAll();
    index = Math.max(0, Math.min(book.pages.length - 1, i));
    var page = book.pages[index];
    var go = function () {
      renderArt(page);
      renderText(page);
      renderDots();
      el.prev.hidden = index === 0;
      var last = index === book.pages.length - 1;
      el.next.classList.toggle("again", last);
      el.next.setAttribute("aria-label", last ? "Back to the cover" : "Next page");
      // Warm the clips for this page and the next.
      wordButtons.forEach(function (b) { load(b.getAttribute("data-word")); });
      el.book.classList.remove("turning");
      try { history.replaceState(null, "", "?book=" + encodeURIComponent(book.id) + "&page=" + index + fromQuery); } catch (e) { /* file: */ }
    };
    if (animate) {
      el.book.classList.add("turning");
      setTimeout(go, 120);
    } else {
      go();
    }
  }

  // ---------------------------------------------------------------- events
  el.speaker.addEventListener("click", function () {
    unlock();
    if (el.speaker.getAttribute("data-state") === "playing") stopAll();
    else readPage();
  });
  el.text.addEventListener("click", function (e) {
    var b = e.target.closest ? e.target.closest(".word") : null;
    if (!b) return;
    unlock();
    readOne(b);
  });
  el.prev.addEventListener("click", function () { unlock(); if (index > 0) show(index - 1, true); });
  el.next.addEventListener("click", function () {
    unlock();
    show(index === book.pages.length - 1 ? 0 : index + 1, true);
  });
  document.addEventListener("keydown", function (e) {
    if (!book) return;
    if (e.key === "ArrowRight") el.next.click();
    else if (e.key === "ArrowLeft" && index > 0) el.prev.click();
  });
  document.addEventListener("visibilitychange", function () { if (document.hidden && book) stopAll(); });

  // ---------------------------------------------------------------- boot
  function fail(why) {
    console.error("Reading Tree:", why);
    el.book.hidden = true;
    el.error.hidden = false;
  }

  var params = new URLSearchParams(location.search);
  // ?from=wordbook rides along so the bookshelf's back arrow still returns to Our Word Book.
  var from = params.get("from") === "wordbook" ? "wordbook" : "";
  var fromQuery = from ? "&from=" + from : "";
  el.shelfBack.href = "../index.html" + (from ? "?from=" + from : "");
  el.shelfBack.addEventListener("click", stopAll);
  fetch(BOOKS + "index.json")
    .then(function (r) { if (!r.ok) throw new Error("books/index.json " + r.status); return r.json(); })
    .then(function (list) {
      var ids = (list.books || []).map(function (b) { return b.id; });
      var want = params.get("book");
      var id = ids.indexOf(want) >= 0 ? want : ids[0];
      if (!id) throw new Error("no books listed");
      bookDir = BOOKS + id + "/";
      return fetch(bookDir + "book.json");
    })
    .then(function (r) { if (!r.ok) throw new Error("book.json " + r.status); return r.json(); })
    .then(function (b) {
      book = b;
      document.title = b.title;
      var p = parseInt(params.get("page"), 10);
      show(isNaN(p) ? 0 : p, false);
    })
    .catch(fail);
})();
