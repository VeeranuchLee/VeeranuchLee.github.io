/*
 * Reading Tree reader -- one engine for every fact book.
 *
 * A book is a folder: reading-app/books/<id>/book.json + art/. books/index.json lists them.
 * Open one with ?book=<id>; with no (or an unknown) id the first listed book opens.
 *
 * Natural page narration is preferred when book.json names a pre-rendered page clip.
 * Timing data holds each word highlighted until the next one starts. Missing, failed, or
 * never-started page clips fall back to the original isolated-word sequence. Tapping a word
 * always plays only its word-bank clip.
 * There is NO device text-to-speech and no runtime voice service.
 *
 *   speaker, idle      -> play the natural page clip, or the word sequence as fallback
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
  var STALL_MS = 4000;        // a page clip that has not started playing by now is not going to
  var WORD_RE = /[A-Za-z]+(?:'[A-Za-z]+)?/g;

  var el = {
    book: document.getElementById("book"),
    img: document.getElementById("art-img"),
    discoveries: document.getElementById("discoveries"),
    discoveryCard: document.getElementById("discovery-card"),
    text: document.getElementById("text"),
    quickWords: document.getElementById("quick-words"),
    speaker: document.getElementById("speaker"),
    prev: document.getElementById("prev"),
    next: document.getElementById("next"),
    dots: document.getElementById("dots"),
    error: document.getElementById("load-error"),
    shelfBack: document.getElementById("shelf-back"),
    readNext: document.getElementById("read-next"),
    readNextImg: document.getElementById("read-next-img")
  };

  var book = null;
  var bookDir = "";
  // "Read next" (owner, 2026-10-06): a book's index.json entry may name `next`, the book after
  // it in a genuine chain (Instructions -> Loops -> Conditions -> Bug, ...). The last page then
  // offers that book's cover. Only a shelved book is offered -- a draft or missing `next` shows
  // nothing -- and it is an invitation, never a lock: every book still opens from the shelf.
  var nextBook = null;        // {id, title} once the next book's cover is known
  var index = 0;
  var run = 0;                // bumps on every stop / page change; stale callbacks check it
  var wordButtons = [];
  var discoveryTimer = 0;

  // ---------------------------------------------------------------- audio
  // Every clip plays through an <audio> element -- the same path as the page narration.
  // WebAudio was dropped on 2026-10-06 (owner: word taps sometimes silent while the page clip
  // played fine, with the tab's speaker icon showing). WebAudio can keep rendering to an output
  // device the Mac has switched away from, is muted by the iPad's silent switch while media
  // elements are not, and Safari leaves it "interrupted" after an <audio> element has played;
  // a source started on a non-running context plays nothing and never ends. One path, no gaps
  // in behaviour. `ctx` stays null; `load()` only warms the cache now.
  var Ctx = null;
  var ctx = null;
  var buffers = {};           // word -> Promise<AudioBuffer|null>
  var current = null;         // the playing source / element
  var fallbackAudio = null;
  var pageAudio = null;
  var pageStall = 0;          // stall-guard timer id for the current page clip; 0 = none armed
  var timingCache = {};       // app-relative timing path -> Promise<object|null>
  var highlightFrame = 0;

  function clearStall() {
    if (!pageStall) return;
    clearTimeout(pageStall);
    pageStall = 0;
  }

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
    clearStall();
    if (highlightFrame) {
      cancelAnimationFrame(highlightFrame);
      highlightFrame = 0;
    }
    if (current) {
      // A page performance owns a fresh Audio element. Detach its callbacks before
      // pausing so an old ended/error event cannot settle a later playback attempt.
      if (current === pageAudio) {
        pageAudio.onended = null;
        pageAudio.onerror = null;
        pageAudio.onplaying = null;
        pageAudio = null;
      }
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
      var settled = false;
      function end(ok) { if (settled) return; settled = true; clearTimeout(guard); if (current === a) current = null; done(ok); }
      a.onended = function () { end(true); };
      a.onerror = function () { end(false); };
      // A word clip is ~1 s; if it has not ended in 4 s something is stuck -- never hang the reader.
      var guard = setTimeout(function () { try { a.pause(); } catch (e) {} end(false); }, 4000);
      a.src = WORDS + encodeURIComponent(slug(word)) + ".m4a";
      current = a;
      var p = a.play();
      if (p && p.catch) p.catch(function () { end(false); });
    });
  }

  // ---------------------------------------------------------------- state
  function setSpeaker(state) {
    el.speaker.setAttribute("data-state", state);
    el.speaker.setAttribute("aria-label", state === "playing" ? "Stop reading" : "Read this page aloud");
  }

  function clearHighlight() {
    wordButtons.forEach(function (b) { b.classList.remove("reading-now"); });
    el.text.classList.remove("page-reading");
  }

  function stopAll() {
    run++;
    stopSound();
    clearHighlight();
    setSpeaker("idle");
  }

  function wait(ms) { return new Promise(function (ok) { setTimeout(ok, ms); }); }

  function readWordsPage(myRun) {
    if (!wordButtons.length || myRun !== run) return Promise.resolve(false);
    var i = 0;
    return new Promise(function (finish) {
      function step() {
        if (myRun !== run) { finish(false); return; }
        if (i >= wordButtons.length) { clearHighlight(); finish(true); return; }
        var b = wordButtons[i];
        clearHighlight();
        b.classList.add("reading-now");
        playWord(b.getAttribute("data-word"), myRun).then(function (ok) {
          if (myRun !== run) { finish(false); return; }
          if (!ok) flagFailed(b);
          i++;
          return wait(ok ? GAP_MS : 250).then(step);
        });
      }
      step();
    });
  }

  function appAsset(path) {
    return "../" + String(path || "").replace(/^\.\//, "");
  }

  function loadTiming(path) {
    if (!path) return Promise.resolve(null);
    if (!timingCache[path]) {
      timingCache[path] = fetch(appAsset(path))
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
        .catch(function () { return null; });
    }
    return timingCache[path];
  }

  function followTiming(a, timing, myRun) {
    var words = timing && Array.isArray(timing.words) ? timing.words : [];
    if (!words.length) return;
    // Between words the active index is -1. Clearing on every frame made the highlight
    // blink off in each gap, which reads as flicker rather than as reading. Hold the last
    // spoken word instead: it is replaced only when the next word starts, and dropped by
    // clearHighlight() when playback ends or stops, or when a word is tapped.
    var held = -1;              // last word whose time range covered the playhead
    var shown = -1;             // what is actually marked right now
    function frame() {
      if (myRun !== run || current !== a || a.paused) return;
      var t = a.currentTime;
      for (var i = 0; i < words.length; i++) {
        if (t >= words[i].start && t < words[i].end) { held = i; break; }
      }
      if (held !== shown) {
        shown = held;
        // Only the per-word mark: clearHighlight() would also drop .page-reading, the soft
        // background that shows the whole page is being read.
        wordButtons.forEach(function (b) { b.classList.remove("reading-now"); });
        if (held >= 0 && wordButtons[held]) wordButtons[held].classList.add("reading-now");
      }
      highlightFrame = requestAnimationFrame(frame);
    }
    frame();
  }

  function playPageClip(narration, myRun) {
    return new Promise(function (done) {
      var a = new Audio();
      a.preload = "auto";
      pageAudio = a;
      var settled = false;
      function finish(ok) {
        if (settled) return;
        settled = true;
        clearStall();
        if (current === a) current = null;
        if (pageAudio === a) pageAudio = null;
        clearHighlight();
        done(ok);
      }
      a.onended = function () { finish(true); };
      a.onerror = function () { finish(false); };
      // A page clip that never reaches 'playing' -- a stalled fetch, a decode iPad refuses --
      // would leave this promise pending and the page mute. Arm a guard: if nothing is
      // playing after STALL_MS, stop it and take exactly the path a failed clip takes, so
      // narration-mode runs the word sequence instead. Cleared on playing, error, end and
      // stop, so it can never fire into a clip that started normally.
      a.onplaying = clearStall;
      clearStall();
      pageStall = setTimeout(function () {
        pageStall = 0;
        if (settled) return;
        try { a.pause(); } catch (e) { /* never reached playing */ }
        finish(false);
      }, STALL_MS);
      a.src = appAsset(narration.clip);
      current = a;
      el.text.classList.add("page-reading");
      loadTiming(narration.timing).then(function (timing) {
        if (myRun === run && current === a && timing && timing.text === pageText(book.pages[index])) {
          followTiming(a, timing, myRun);
        }
      });
      var p;
      try { p = a.play(); } catch (e) { finish(false); return; }
      if (p && p.catch) p.catch(function () { finish(false); });
    });
  }

  function pageText(page) {
    return page && page.kind === "cover" ? book.title : ((page && page.text) || "");
  }

  function readPage() {
    stopAll();
    var myRun = run;
    var page = book.pages[index];
    if (!wordButtons.length) return;
    setSpeaker("playing");
    ReadingNarration.play(page,
      function (narration) { return playPageClip(narration, myRun); },
      function () { return readWordsPage(myRun); })
      .then(function () {
        if (myRun !== run) return;
        clearHighlight();
        setSpeaker("idle");
      });
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
    var source = pageText(page);
    var silent = page.narrate === false;
    el.text.className = "text" + (isCover ? " title" : "") + (silent ? " reference-text" : "");
    el.text.textContent = "";
    wordButtons = [];
    el.speaker.hidden = silent;
    if (silent) {
      var reference = document.createElement("span");
      reference.className = "reference-copy";
      reference.textContent = source;
      el.text.appendChild(reference);
      return;
    }
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

  // Optional, unscored picture discoveries. Coordinates are percentages of the square
  // painting, so the same data works in both tablet orientations. A tap reveals one short
  // causal sentence; another tap replaces it and it closes itself after six seconds.
  function renderDiscoveries(page) {
    var items = Array.isArray(page.discoveries) ? page.discoveries : [];
    if (discoveryTimer) { clearTimeout(discoveryTimer); discoveryTimer = 0; }
    el.discoveries.textContent = "";
    el.discoveryCard.textContent = "";
    el.discoveryCard.hidden = true;
    el.discoveries.hidden = items.length === 0;
    items.forEach(function (item, itemIndex) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "discovery-hotspot";
      button.style.left = item.x + "%";
      button.style.top = item.y + "%";
      button.style.width = item.w + "%";
      button.style.height = item.h + "%";
      button.setAttribute("aria-label", "Picture discovery " + (itemIndex + 1));
      button.addEventListener("click", function () {
        if (discoveryTimer) clearTimeout(discoveryTimer);
        el.discoveries.querySelectorAll(".discovery-hotspot").forEach(function (other) {
          other.classList.toggle("open", other === button);
        });
        el.discoveryCard.textContent = item.label;
        el.discoveryCard.hidden = false;
        discoveryTimer = setTimeout(function () {
          el.discoveryCard.hidden = true;
          button.classList.remove("open");
          discoveryTimer = 0;
        }, 6000);
      });
      el.discoveries.appendChild(button);
    });
  }

  function renderQuickWords(page) {
    var items = Array.isArray(page.quickWords) ? page.quickWords : [];
    el.quickWords.textContent = "";
    el.quickWords.hidden = items.length === 0;
    el.book.classList.toggle("has-quick-words", items.length > 0);
    if (!items.length) return;

    var label = document.createElement("span");
    label.className = "quick-words-label";
    label.textContent = "Quick Words · คำศัพท์";
    el.quickWords.appendChild(label);
    items.forEach(function (item) {
      var pair = document.createElement("span");
      pair.className = "quick-word-pair";
      pair.textContent = item.en + " — " + item.th;
      el.quickWords.appendChild(pair);
    });
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
      renderDiscoveries(page);
      renderQuickWords(page);
      renderText(page);
      renderDots();
      el.prev.hidden = index === 0;
      var last = index === book.pages.length - 1;
      el.next.classList.toggle("again", last);
      el.next.setAttribute("aria-label", last ? "Back to the cover" : "Next page");
      el.readNext.hidden = !(last && nextBook);
      // Warm the clips for this page and the next.
      wordButtons.forEach(function (b) { load(b.getAttribute("data-word")); });
      if (page.narration && page.narration.timing) loadTiming(page.narration.timing);
      el.book.classList.remove("turning");
      try { history.replaceState(null, "", "?book=" + encodeURIComponent(book.id) + "&page=" + index + setQuery + fromQuery); } catch (e) { /* file: */ }
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
  // ?set=<id>: the book was opened from a book set's shelf, so back returns there (2026-10-06).
  // The set id rides along on page turns and "Read next"; a stale id falls back to the shelf.
  var setId = params.get("set") || "";
  var setQuery = setId ? "&set=" + encodeURIComponent(setId) : "";
  el.shelfBack.href = "../index.html" + (from ? "?from=" + from : "");
  el.shelfBack.addEventListener("click", stopAll);
  el.readNext.addEventListener("click", stopAll);
  function findNext(entries, id) {
    var me = entries.filter(function (b) { return b && b.id === id; })[0];
    var nx = me && me.next ? entries.filter(function (b) { return b && b.id === me.next && b.draft !== true; })[0] : null;
    if (!nx) return;
    var dir = BOOKS + nx.id + "/";
    fetch(dir + "book.json")
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (b) {
        var pages = b.pages || [];
        var cover = pages.filter(function (p) { return p.kind === "cover"; })[0] || pages[0];
        if (cover && cover.art) el.readNextImg.src = dir + cover.art;
        var title = b.title || nx.title || nx.id;
        el.readNext.href = "./?book=" + encodeURIComponent(nx.id) + setQuery + fromQuery;
        el.readNext.setAttribute("aria-label", "Read next: " + title);
        nextBook = { id: nx.id, title: title };
        if (book && index === book.pages.length - 1) el.readNext.hidden = false;
      })
      .catch(function (err) { console.error("Reading Tree: next book " + nx.id, err); });
  }
  fetch(BOOKS + "index.json")
    .then(function (r) { if (!r.ok) throw new Error("books/index.json " + r.status); return r.json(); })
    .then(function (list) {
      var ids = (list.books || []).map(function (b) { return b.id; });
      var want = params.get("book");
      var id = ids.indexOf(want) >= 0 ? want : ids[0];
      if (!id) throw new Error("no books listed");
      var set = (list.sets || []).filter(function (s) { return s && s.id === setId && (s.books || []).indexOf(id) >= 0; })[0];
      if (set) {
        el.shelfBack.href = "../index.html?set=" + encodeURIComponent(set.id) + fromQuery;
        el.shelfBack.setAttribute("aria-label", "Back to " + set.title);
      } else {
        setId = "";
        setQuery = "";
      }
      findNext(list.books, id);
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
