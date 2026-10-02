/* ============================================================
   Ari & Dot — the deep-dive mini-book system, and the contents overlay.

   DEEP-DIVE-SPEC.md, Phase 1A (§15). Reads `app/book-nav.js` and nothing else.

   WHAT A PAGE HAS TO DO TO OPT IN — three lines, no page-specific code:

       <link rel="stylesheet" href="app/deep-dive.css">
       <script src="app/book-nav.js"></script>
       <script src="app/deep-dive.js"></script>

   The page it is running on is read from the filename (`page-07.html` ->
   `page-07`), so a page never has to declare its own number and can never
   declare it wrongly. `data-page` on the script tag overrides that for a
   harness.

   ------------------------------------------------------------
   THE STATE MODEL, AND THE ONE FIELD THAT BREAKS QUIETLY
   ------------------------------------------------------------

   §11 asks for `currentMainPage`, `activeOverlay`, `activeDeepDiveId`,
   `deepDivePageIndex` and `deepDiveSourcePage`. All five are here, in one
   object, and every transition goes through the four functions below it.

   The book is twenty separate HTML documents, not one app shell. So
   `currentMainPage` is a real thing the document already knows, and changing it
   means a navigation. That makes `goToMainPage()` the only place a page change
   can happen, and both the contents overlay and Close go through it.

   This matters because of the rule §3 calls out as the one that breaks
   silently: closing a deep dive must return the child to the exact page that
   OPENED it — page 10 to page 10, page 16 to page 16, never page 1 and never a
   hub. There are two tempting ways to write Close that look right:

       close() { location.href = "page-01.html"; }        // a hub. No.
       close() { goToMainPage(deepDive.sourcePage); }     // the CONFIG's page.

   The second is the dangerous one. It behaves correctly for every deep dive
   that is offered from exactly one page, which is most of them, and it is wrong
   the moment a mini-book is reachable from two — the child is moved to
   someone else's page and nothing errors. So `sourcePage` in the config (where
   a deep dive belongs) and `deepDiveSourcePage` in the state (where this child
   actually opened it) are separate fields, captured at different times, and
   Close reads only the second. `moons-intro` is launched from pages 7 and 9 so
   that the difference is exercised rather than merely intended.

   State is mirrored into sessionStorage, and is NOT read back as authority.
   `currentMainPage` is re-derived from the document on every load, so a page
   the child reached by some other route — the page navigator, a bookmark, the
   back button — can never be described by a stale stored value. The mirror is
   there to be read: it is what a QC harness inspects to see the five fields
   §11 names, and what makes `deepDiveSourcePage` visible at the moment it is
   captured rather than only in its effect. An overlay deliberately does not
   survive a reload.

   ------------------------------------------------------------
   BACK IS NOT CLOSE
   ------------------------------------------------------------

   Back (top left) moves within the deep dive. Close (top right) leaves it. When
   there is nowhere inside left to go, Back is dimmed and inert rather than
   quietly behaving like Close. That is a decision, not an omission: a control
   that does one thing four times and a different thing the fifth cannot be
   learned by a six-year-old, and the book already dims Previous this way on
   page 1 rather than making it mean something else. Close is always there, in
   its own corner, in its own colour.

   See `back()` for how "nowhere left to go" is worked out — it is not simply
   "the first page", because a deep dive can be entered part-way through.

   ------------------------------------------------------------
   NO SPEECH HERE
   ------------------------------------------------------------

   AUDIO-DIRECTION.md: every OS voice is an adult, Ari is a child, so
   `speechSynthesis` is a defect and not a degraded mode. Nothing in this file
   speaks. Deep-dive narration is rendered clips wired the way the pages already
   wire theirs, and that is Phase 1D.
   ============================================================ */
(function () {
  "use strict";

  var NAV = window.BOOK_NAV;
  if (!NAV) {
    console.error("[book-nav] app/book-nav.js did not load, so the contents " +
                  "overlay and every deep dive are unavailable on this page.");
    return;
  }

  /* ---------- which page is this? ---------- */
  var thisScript = document.currentScript;
  function currentPageId() {
    if (thisScript && thisScript.dataset.page) return thisScript.dataset.page;
    var file = (location.pathname.split("/").pop() || "").replace(/\.html?$/i, "");
    return /^page-\d+$/.test(file) ? file : null;
  }

  /* ---------- state (§11) ---------- */
  var STORE_KEY = "adx-book-nav";

  var state = {
    currentMainPage: currentPageId(),
    activeOverlay: null,        // null | "toc" | "deepDive"
    activeDeepDiveId: null,
    deepDivePageIndex: 0,
    deepDiveSourcePage: null,   // captured when a deep dive OPENS. See header.
    deepDiveHistory: []         // indices visited, for Back
  };

  function persist() {
    try {
      sessionStorage.setItem(STORE_KEY, JSON.stringify({
        currentMainPage: state.currentMainPage,
        activeOverlay: state.activeOverlay,
        activeDeepDiveId: state.activeDeepDiveId,
        deepDivePageIndex: state.deepDivePageIndex,
        deepDiveSourcePage: state.deepDiveSourcePage
      }));
    } catch (e) { /* private browsing: the book still works, nothing is remembered */ }
  }

  /* ---------- config lookup ---------- */
  function deepDiveById(id) {
    var list = NAV.deepDives || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function pageMeta(id) {
    var list = NAV.pages || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  /* `?deepdive=preview` un-hides entries marked `preview: true`. Phase 1B's
     real deep dives carry no such mark and are always offered. */
  function previewOn() {
    try {
      return new URLSearchParams(location.search).get("deepdive") === "preview";
    } catch (e) { return false; }
  }
  function offeredHere(dd, pageId) {
    var from = dd.launchFrom || (dd.sourcePage ? [dd.sourcePage] : []);
    if (from.indexOf(pageId) < 0) return false;
    return dd.preview ? previewOn() : true;
  }

  /* ---------- the only place currentMainPage changes ---------- */
  function goToMainPage(pageId) {
    if (!pageId) return;
    state.currentMainPage = pageId;
    persist();
    /* Already on it — the overlay simply closes and the child is where they
       should be. Any other page is a real document navigation. */
    var here = currentPageId();
    if (pageId === here) return;
    location.href = pageId + ".html";
  }

  /* ---------- DOM scaffolding ---------- */
  var root = null, scrim = null, panel = null;
  var elBack, elClose, elTitle, elSub, elBody, elPos, elDots, elNext, elFoot;
  var lastFocus = null, inerted = [];

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function buildShell() {
    if (root) return;
    root = el("div", "dd-root");

    scrim = el("div", "dd-scrim");
    scrim.hidden = true;

    panel = el("section", "dd-panel");
    panel.hidden = true;
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-labelledby", "dd-title");

    var bar = el("header", "dd-bar");
    elBack = el("button", "dd-btn dd-btn-back");
    elBack.type = "button";
    elBack.innerHTML = '<span aria-hidden="true">‹</span><span>Back</span>';

    var head = el("div", "dd-head");
    elTitle = el("h2"); elTitle.id = "dd-title";
    elSub = el("p");
    head.appendChild(elTitle); head.appendChild(elSub);

    elClose = el("button", "dd-btn dd-btn-close");
    elClose.type = "button";
    /* Says what it does, not what it is. "Close" alone leaves a child's helper
       guessing whether it closes the page, the book or the app. */
    elClose.setAttribute("aria-label", "Close. Go back to the story");
    elClose.innerHTML = '<span>Close</span><span aria-hidden="true">×</span>';

    bar.appendChild(elBack); bar.appendChild(head); bar.appendChild(elClose);

    elBody = el("div", "dd-body");

    elFoot = el("footer", "dd-foot");
    var foot = elFoot;
    elDots = el("div", "dd-dots");
    elPos = el("div", "dd-pos");
    elNext = el("button", "dd-btn dd-next");
    elNext.type = "button";
    elNext.innerHTML = '<span>Next</span><span aria-hidden="true">›</span>';
    foot.appendChild(elDots); foot.appendChild(elPos); foot.appendChild(elNext);

    panel.appendChild(bar); panel.appendChild(elBody); panel.appendChild(foot);
    root.appendChild(scrim); root.appendChild(panel);
    document.body.appendChild(root);

    elBack.addEventListener("click", back);
    elClose.addEventListener("click", closeOverlay);
    elNext.addEventListener("click", next);
    scrim.addEventListener("click", closeOverlay);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && state.activeOverlay) { e.preventDefault(); closeOverlay(); }
    });
    window.addEventListener("resize", sizeToStage);
    window.addEventListener("scroll", sizeToStage, { passive: true });
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", sizeToStage);
    }
  }

  /* The overlay covers the page's own stage, CLIPPED TO THE VIEWPORT.
     Measured, never recomputed from the min()/aspect-ratio formula the pages
     use — see deep-dive.css for why that formula is not safe to copy.

     The clipping is not defensive tidying, it is the fix for something this
     found: on a 768x1024 iPad held upright, page 7's portrait rules give it a
     stage 1100px tall inside a 1024px viewport. An overlay that matched the
     stage exactly therefore put its own footer — the position counter and Next
     — 76px below the bottom of the screen, on a panel that is `position: fixed`
     and so cannot be scrolled to. The deep dive looked perfect and had no way
     forward. Intersecting with the viewport costs nothing where the stage
     already fits, which is every landscape case. */
  function sizeToStage() {
    if (!root) return;
    var doc = document.documentElement;
    var vw = doc.clientWidth, vh = doc.clientHeight;
    var stage = document.getElementById("stage");
    var box = { left: 0, top: 0, width: vw, height: vh };

    if (stage) {
      var r = stage.getBoundingClientRect();
      var left = Math.max(0, r.left), top = Math.max(0, r.top);
      var w = Math.min(vw, r.right) - left, h = Math.min(vh, r.bottom) - top;
      /* A stage scrolled almost out of view would leave a sliver of a panel.
         Below a usable size, cover the viewport instead — ugly beats unusable. */
      if (w >= 280 && h >= 280) box = { left: left, top: top, width: w, height: h };
    }

    root.style.setProperty("--dd-left", box.left + "px");
    root.style.setProperty("--dd-top", box.top + "px");
    root.style.setProperty("--dd-w", box.width + "px");
    root.style.setProperty("--dd-h", box.height + "px");
  }

  /* Everything behind the overlay stops answering to taps and to the screen
     reader. `inert` is applied to body's other children, so the page does not
     have to name a container for us. */
  function setBackgroundInert(on) {
    if (on) {
      inerted = [];
      Array.prototype.forEach.call(document.body.children, function (c) {
        if (c === root) return;
        if (c.inert) return;              // already inert for the page's own reasons
        c.inert = true;
        inerted.push(c);
      });
    } else {
      inerted.forEach(function (c) { c.inert = false; });
      inerted = [];
    }
  }

  function showPanel(on) {
    buildShell();
    if (on) {
      lastFocus = document.activeElement;
      sizeToStage();
      scrim.hidden = false;
      panel.hidden = false;
      setBackgroundInert(true);
    } else {
      scrim.hidden = true;
      panel.hidden = true;
      setBackgroundInert(false);
      if (lastFocus && lastFocus.focus) lastFocus.focus();
      lastFocus = null;
    }
  }

  /* ============================================================
     TOC overlay (§7.1). Card UI is allowed here, and only here.
     ============================================================ */
  function openTOC() {
    buildShell();
    state.activeOverlay = "toc";
    state.activeDeepDiveId = null;
    persist();

    elTitle.textContent = "Contents";
    elSub.textContent = "Twenty pages. Tap one to go there.";
    elClose.setAttribute("aria-label", "Close the contents");

    /* The contents is a list, not a mini-book: there is no page 2 of it, so the
       deep dive's Back / Next / position furniture is taken away rather than
       shown doing nothing. A dimmed control a child can never use still reads as
       a control, and §7.1 asks for cards and a close button, full stop. */
    elBack.hidden = true;
    elFoot.hidden = true;

    elBody.className = "dd-body toc-body";
    elBody.textContent = "";

    var here = state.currentMainPage;
    var chapters = NAV.chapters && NAV.chapters.length
      ? NAV.chapters
      : [{ id: "all", title: "", pages: (NAV.pages || []).map(function (p) { return p.number; }) }];

    chapters.forEach(function (ch) {
      if (ch.title) elBody.appendChild(el("h3", "toc-chapter", ch.title));
      var grid = el("div", "toc-grid");
      ch.pages.forEach(function (n) {
        var meta = pageMeta("page-" + String(n).padStart(2, "0"));
        if (!meta) return;
        var card = el("button", "toc-card");
        card.type = "button";
        card.dataset.target = meta.id;
        if (meta.id === here) card.dataset.current = "true";
        card.setAttribute("aria-label",
          "Page " + meta.number + ", " + meta.title +
          (meta.id === here ? ". This is the page you are on" : ""));
        card.appendChild(el("span", "toc-num", String(meta.number)));
        var txt = el("div", "toc-text");
        txt.appendChild(el("strong", null, meta.title));
        if (meta.subtitle) txt.appendChild(el("span", null, meta.subtitle));
        card.appendChild(txt);
        card.addEventListener("click", function () { jumpTo(meta.id); });
        grid.appendChild(card);
      });
      elBody.appendChild(grid);
    });

    showPanel(true);
    elClose.focus();
  }

  /* A contents card is an explicit choice by the child, which §3 allows: it
     sets currentMainPage and closes the overlay. It is not a deep-dive Close
     and must never be confused with one. */
  function jumpTo(pageId) {
    state.activeOverlay = null;
    persist();
    showPanel(false);
    goToMainPage(pageId);
  }

  /* ============================================================
     Deep dives (§8, §10, §12)
     ============================================================ */
  function openDeepDive(id, opts) {
    var dd = deepDiveById(id);
    if (!dd || !dd.pages || !dd.pages.length) {
      console.error("[book-nav] no deep dive called " + id + ", or it has no pages.");
      return;
    }
    buildShell();
    opts = opts || {};

    state.activeOverlay = "deepDive";
    state.activeDeepDiveId = id;
    state.deepDivePageIndex = indexOfPage(dd, opts.page) || 0;
    /* THE CAPTURE. Where this child is right now — not dd.sourcePage. */
    state.deepDiveSourcePage = state.currentMainPage;
    state.deepDiveHistory = [state.deepDivePageIndex];
    persist();

    elBack.hidden = false;
    elFoot.hidden = false;
    elNext.hidden = false;
    elClose.setAttribute("aria-label", "Close. Go back to the story");
    elBody.className = "dd-body";
    renderDeepDivePage();
    showPanel(true);
    elClose.focus();
  }

  function indexOfPage(dd, pageId) {
    if (!pageId) return 0;
    for (var i = 0; i < dd.pages.length; i++) if (dd.pages[i].id === pageId) return i;
    return 0;
  }

  function goToDeepDivePage(index, opts) {
    var dd = deepDiveById(state.activeDeepDiveId);
    if (!dd) return;
    if (index < 0 || index >= dd.pages.length) return;
    state.deepDivePageIndex = index;
    if (!opts || !opts.replaceHistory) state.deepDiveHistory.push(index);
    persist();
    renderDeepDivePage();
  }

  function next() {
    goToDeepDivePage(state.deepDivePageIndex + 1);
  }

  /* Back moves INSIDE the deep dive. It never leaves it — see the header.

     Two ways to move back, and both are needed. Popping the history undoes the
     jump that was actually made, which matters because a hotspot on the
     overview page can skip several pages forward and "one less than the index"
     would not undo it. But a deep dive can also be ENTERED at a page — Phase
     1B's "About Ceres" is meant to open the asteroid-belt mini-book straight at
     Ceres — and such a child has no history at all. Popping alone would leave
     Back dead for the whole mini-book and make its first pages unreachable, so
     with no history to pop, Back steps one page back instead.

     Which leaves Back inert in exactly one situation: no history, and already
     on the mini-book's first page. There is genuinely nowhere inside to go. */
  function canGoBack() {
    return state.deepDiveHistory.length > 1 || state.deepDivePageIndex > 0;
  }

  function back() {
    if (state.activeOverlay !== "deepDive") return;
    if (state.deepDiveHistory.length > 1) {
      state.deepDiveHistory.pop();
      state.deepDivePageIndex = state.deepDiveHistory[state.deepDiveHistory.length - 1];
    } else if (state.deepDivePageIndex > 0) {
      state.deepDivePageIndex -= 1;
      state.deepDiveHistory = [state.deepDivePageIndex];
    } else {
      return;
    }
    persist();
    renderDeepDivePage();
  }

  /* Close LEAVES the deep dive, and returns to the page that opened it. */
  function closeOverlay() {
    var wasDeepDive = state.activeOverlay === "deepDive";
    var source = state.deepDiveSourcePage;

    state.activeOverlay = null;
    state.activeDeepDiveId = null;
    state.deepDiveHistory = [];
    persist();
    showPanel(false);

    if (wasDeepDive && source) goToMainPage(source);
  }

  function renderDeepDivePage() {
    var dd = deepDiveById(state.activeDeepDiveId);
    if (!dd) return;
    var p = dd.pages[state.deepDivePageIndex];
    var total = dd.pages.length;
    var n = state.deepDivePageIndex + 1;

    elTitle.textContent = p.title || dd.title;
    elSub.textContent = p.subtitle || dd.title;

    var canBack = canGoBack();
    elBack.setAttribute("aria-disabled", canBack ? "false" : "true");
    elBack.setAttribute("aria-label", canBack ? "Back one page" : "Back. This is the first page");

    var canNext = state.deepDivePageIndex < total - 1;
    elNext.setAttribute("aria-disabled", canNext ? "false" : "true");
    elNext.setAttribute("aria-label", canNext ? "Next page" : "Next. This is the last page");

    elPos.textContent = n + " / " + total;
    elDots.textContent = "";
    for (var i = 0; i < total; i++) {
      var d = el("span", "dd-dot");
      d.dataset.on = String(i === state.deepDivePageIndex);
      elDots.appendChild(d);
    }

    elBody.textContent = "";
    elBody.scrollTop = 0;
    renderLayout(p);
  }

  /* ---------- layout renderers (§12) ----------
     A layoutType the engine does not know still renders its words rather than
     rendering nothing: an unfinished config should look plain, not empty. */
  function renderLayout(p) {
    /* The picture comes FIRST, above the words. "Children get images, not
       lists": our readers are six and seven, and a page that opens with five
       lines of prose and no picture is a page they turn away from. `image` is
       `{ src, alt }` and every src below points at art the book already
       publishes and already lists in `assets-manifest.json` — nothing new was
       drawn for Phase 1B and nothing new has to be precached.

       A src is always the `standard` tier. The pages swap themselves up to
       `high` with a `retier()` pass over `img[src]` at load, which cannot see
       an image the overlay creates later; and the high tier is not published
       for these folders anyway, so a swapped src would 404 into a broken
       picture instead of a moon. */
    if (p.image && p.image.src && p.layoutType !== "overview-hotspots") {
      var fig = el("div", "dd-hero");
      var img = document.createElement("img");
      img.src = p.image.src;
      img.alt = p.image.alt || "";
      img.decoding = "async";
      fig.appendChild(img);
      elBody.appendChild(fig);
    }

    if (p.body) elBody.appendChild(el("p", "dd-copy", p.body));

    switch (p.layoutType) {
      case "overview-hotspots": renderHotspots(p); break;
      case "compare":           renderCompare(p);  break;
      case "chips":             renderChips(p);    break;
      case "single-focus":
      case "diagram":
      default:                  break;
    }

    if (p.facts && p.facts.length) renderFacts(p.facts);
  }

  /* HotspotScene — a few big targets that jump to a page inside this mini-book. */
  function renderHotspots(p) {
    if (!p.hotspots || !p.hotspots.length) return;
    var dd = deepDiveById(state.activeDeepDiveId);
    var scene = el("div", "dd-scene");
    /* On an overview the picture is the scene itself and the targets sit on
       top of it, which is exactly what deep-dive.css was written for: "when
       Phase 1B gives a deep-dive page a picture the discs sit on top of it
       unchanged". `aria-hidden` because the labels on the discs already say
       what each target is; a second description of the same thing is noise. */
    if (p.image && p.image.src) {
      var bg = document.createElement("img");
      bg.className = "dd-scene-art";
      bg.src = p.image.src;
      bg.alt = "";
      bg.setAttribute("aria-hidden", "true");
      bg.decoding = "async";
      scene.appendChild(bg);
    }
    p.hotspots.forEach(function (h) {
      var b = el("button", "dd-hotspot", h.label);
      b.type = "button";
      b.dataset.hotspot = h.id || "";
      b.setAttribute("aria-label", h.label);
      if (h.x != null && h.y != null) {
        b.style.position = "absolute";
        b.style.left = h.x + "%";
        b.style.top = h.y + "%";
        b.style.transform = "translate(-50%,-50%)";
      }
      b.addEventListener("click", function () {
        goToDeepDivePage(indexOfPage(dd, h.targetPage));
      });
      scene.appendChild(b);
    });
    elBody.appendChild(scene);
  }

  function renderCompare(p) {
    if (!p.items || !p.items.length) return;
    var wrap = el("div", "dd-compare");
    p.items.slice(0, 5).forEach(function (it) {          // §12: 3 to 5, no more
      var box = el("div", "dd-compare-item");
      box.appendChild(el("strong", null, it.name));
      if (it.note) box.appendChild(el("span", null, it.note));
      wrap.appendChild(box);
    });
    elBody.appendChild(wrap);
  }

  /* ChipList (§10). Phase 1A shipped chips as bare labels because its only
     chip page was a list of names to read. Phase 1B needs two more things from
     the same primitive, and both are content rather than code:

       `pron`  the written pronunciation, shown UNDER the name, always.
               `2026-09-11-deep-dive-spec-amendment.md` requires it: none of
               J7's five moons has a recorded name clip, and the rule the
               Explorer already followed (`app/moon-explorer.js:77-86`) is that
               a body with no clip is silent and shows its written `pron` —
               never the OS robot voice, which AUDIO-DIRECTION.md rules out.

       `note`  the body's one-line fact, revealed when the chip is tapped.

     The reveal is the part that is a decision. A `<button>` that visibly does
     nothing when a child taps it is worse than no button: the child learns the
     control is broken and stops trying the ones that work. Phase 1D will add
     sound to this same tap; until then the tap has to pay for itself, so it
     puts the chip's fact in one panel under the row. One panel rather than ten
     expanding chips, because expanding a chip in a wrapped row reflows every
     chip after it and moves the target the child just hit.

     A chip with no `note` keeps Phase 1A's behaviour exactly: a label, and
     nothing to reveal. */
  function renderChips(p) {
    if (!p.chips || !p.chips.length) return;
    var wrap = el("div", "dd-chips");
    var anyNote = p.chips.some(function (c) { return !!c.note; });

    var note = null;
    if (anyNote) {
      note = el("div", "dd-chip-note");
      note.setAttribute("aria-live", "polite");
      note.appendChild(el("strong", null, ""));
      note.appendChild(el("span", null, "Tap a name to read about it."));
    }

    p.chips.forEach(function (c) {
      var b = el("button", "dd-chip");
      b.type = "button";
      b.appendChild(el("span", "dd-chip-name", c.label));
      if (c.pron) b.appendChild(el("span", "dd-chip-pron", "say it: " + c.pron));
      b.setAttribute("aria-label",
        c.label + (c.pron ? ". Say it: " + c.pron : "") + (c.note ? ". " + c.note : ""));
      if (c.note) {
        b.addEventListener("click", function () {
          Array.prototype.forEach.call(wrap.children, function (o) { o.dataset.on = "false"; });
          b.dataset.on = "true";
          note.firstChild.textContent = c.label;
          note.lastChild.textContent = c.note;
        });
      }
      wrap.appendChild(b);
    });

    elBody.appendChild(wrap);
    if (note) elBody.appendChild(note);
  }

  function renderFacts(facts) {
    var strip = el("div", "dd-facts");
    facts.forEach(function (f) {
      var cell = el("div", "dd-fact");
      cell.appendChild(el("span", null, f.label));
      cell.appendChild(el("strong", null, f.value));
      strip.appendChild(cell);
    });
    elBody.appendChild(strip);
  }

  /* ============================================================
     Mount: wire what this page actually carries.
     ============================================================ */
  function mount() {
    /* The contents button, wherever a page puts one. */
    Array.prototype.forEach.call(
      document.querySelectorAll('[data-book-nav="toc"]'),
      function (b) { b.addEventListener("click", openTOC); }
    );

    /* A deep-dive launch button, for every deep dive offered on this page.
       A page may carry its own placed button (`[data-deep-dive="<id>"]`); if it
       does not, one is appended to the page's `.actions` row so the button
       lands where the page's other calls to action already are. */
    (NAV.deepDives || []).forEach(function (dd) {
      if (!offeredHere(dd, state.currentMainPage)) return;

      /* `data-deep-dive-page="a1"` opens the mini-book AT a page instead of at
         its first. `openDeepDive` has taken `opts.page` since Phase 1A and
         `back()` was written for exactly this case — "a deep dive can also be
         ENTERED at a page … with no history to pop, Back steps one page back
         instead" — but nothing could reach either declaratively. §7.2 is what
         needs it: page 10's second button says "About Ceres", so it has to land
         on Ceres. A button whose label names one thing and whose tap shows a
         different one is the kind of small lie a six-year-old notices first. */
      var placed = document.querySelectorAll('[data-deep-dive="' + dd.id + '"]');
      if (placed.length) {
        Array.prototype.forEach.call(placed, function (b) {
          var at = b.dataset.deepDivePage || null;
          b.addEventListener("click", function () { openDeepDive(dd.id, { page: at }); });
        });
        return;
      }

      var host = document.querySelector(".actions") || document.querySelector(".story");
      if (!host) return;
      var b = el("button", "dd-open", dd.launchLabel || dd.title);
      b.type = "button";
      b.dataset.deepDive = dd.id;
      b.addEventListener("click", function () { openDeepDive(dd.id); });
      host.appendChild(b);
    });

    persist();
  }

  /* Public surface. Named `BookNav` rather than `DeepDive` because the contents
     overlay is half of it, and named at all so a QC harness can read the state
     the spec describes instead of guessing at it from the DOM. */
  window.BookNav = {
    state: state,
    config: NAV,
    openTOC: openTOC,
    openDeepDive: openDeepDive,
    back: back,
    next: next,
    close: closeOverlay,
    goToMainPage: goToMainPage,
    isPreview: previewOn
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
