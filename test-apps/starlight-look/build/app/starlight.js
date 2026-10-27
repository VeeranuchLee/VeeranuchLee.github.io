/* ==========================================================================
   Ari & Dot — Follow the Starlight : shared page runtime
   --------------------------------------------------------------------------
   A page declares its own content and its own instrument. This file supplies
   everything all twenty pages share: chrome, settings, interaction sound,
   the spoken line, the evidence badges, and art-slot fallback.

   Narration deliberately has NO robot-voice fallback. Book 1 shipped a
   narration map whose audio had not been published and `speechSynthesis`
   covered for it silently, so nobody could tell the difference between "this
   line is recorded" and "this line is missing". Here an unrecorded line is
   printed and stays silent, and `Starlight.narrationReport()` lists what is
   missing. See AUDIO-DIRECTION.md: every OS voice is an adult, and Ari is a
   child.
   ========================================================================== */
(function () {
  "use strict";

  var PAGES = 20;
  var page = Number(document.body.dataset.page || 1);

  /* ---------- settings, shared with Book 1's keys where they mean the same --- */
  var store = {
    get sound() { return localStorage.getItem("adx-sound") !== "off"; },
    set sound(v) { localStorage.setItem("adx-sound", v ? "on" : "off"); },
    get motion() { return localStorage.getItem("adx-motion") !== "reduce"; },
    set motion(v) { localStorage.setItem("adx-motion", v ? "full" : "reduce"); }
  };

  // Read the OS preference at load. Book 1 shipped a page that hardcoded this
  // to false and so ignored the setting entirely; that is the bug this line is.
  var systemCalm = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var calm = !store.motion || systemCalm;

  function applyCalm() { document.body.classList.toggle("calm", calm); }

  /* ---------- interaction sound: synthesised, never a shipped file ---------- */
  var actx = null;
  function ac() {
    if (!actx) { var C = window.AudioContext || window.webkitAudioContext; actx = new C(); }
    if (actx.state === "suspended") actx.resume();
    return actx;
  }
  function tone(freq, dur, type, gain, when) {
    if (!store.sound) return;
    try {
      var c = ac(), o = c.createOscillator(), g = c.createGain();
      o.type = type || "sine"; o.frequency.value = freq;
      var t = c.currentTime + (when || 0);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(gain == null ? 0.13 : gain, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.03);
    } catch (e) {}
  }
  function noise(dur, f0, f1, gain, shape) {
    if (!store.sound) return;
    try {
      var c = ac(), n = Math.floor(c.sampleRate * dur);
      var buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
      for (var i = 0; i < n; i++) {
        var t = i / n;
        var env = shape === "swell" ? Math.sin(Math.PI * t) : (1 - t);
        d[i] = (Math.random() * 2 - 1) * env;
      }
      var s = c.createBufferSource(); s.buffer = buf;
      var g = c.createGain(); g.gain.value = gain;
      var f = c.createBiquadFilter(); f.type = "lowpass";
      f.frequency.setValueAtTime(f0, c.currentTime);
      f.frequency.linearRampToValueAtTime(f1, c.currentTime + dur);
      s.connect(f).connect(g).connect(c.destination); s.start();
    } catch (e) {}
  }
  var sfx = {
    tap:    function () { tone(880, 0.09, "triangle", 0.09); },
    pick:   function () { tone(660, 0.08, "square", 0.07); tone(990, 0.09, "square", 0.06, 0.08); },
    good:   function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0.36, "sine", 0.09, i * 0.08); }); },
    ignite: function () { noise(0.7, 300, 2600, 0.16, "swell"); tone(180, 0.9, "sine", 0.07, 0.05); },
    boom:   function () { noise(1.1, 1800, 120, 0.2, "fall"); tone(70, 1.2, "sine", 0.1); },
    sweep:  function () { noise(0.5, 240, 1800, 0.09, "swell"); },
    tick:   function () { tone(1400, 0.03, "square", 0.05); }
  };

  /* ---------- narration ----------------------------------------------------- */
  var narration = null;          // page -> { textKey: file }
  var narrationTried = false;
  var missing = [];
  var current = null;
  var chain = null;              // the queued line sequence playing now, if any

  function loadNarration() {
    if (narrationTried) return Promise.resolve(narration);
    narrationTried = true;
    /* Plain caching, never no-cache: boot() warms this map before the first
       gesture, and a forced revalidation round-trip can outlast iOS's user
       activation, putting a cold page's first play() back outside the tap. */
    return fetch("narration/map.json")
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { narration = j; return j; })
      .catch(function () { narration = null; return null; });
  }

  /* The element the child tapped to hear a line carries .reading for exactly
     as long as its clip plays -- Book 1 Page 1's story-overlay highlight, on
     every line a child can now tap (owner, 2026-10-21: "pls check the voice. i
     want to hear the voice read if tap on the text."). The state follows the
     audio, not a timer: it clears on ended/error, and any later say() clears
     it, because a new tap cancels the previous clip (BUILD-PLAN's audio
     contract) and a second tap on the same words restarts them. */
  var readingEl = null;
  function setReading(el) {
    if (readingEl && readingEl !== el) readingEl.classList.remove("reading");
    readingEl = el || null;
    if (el) el.classList.add("reading");
  }

  /* onEnd (internal; sayQueue passes it) fires exactly once however the line
     ends -- played out, failed to load, blocked from autoplay, or sound off --
     so a queued ask never stalls on a clip that cannot play. onStart
     (internal) fires only when the clip is genuinely audible, which is how the
     page-open ask counts itself heard without swallowing the ask for a child
     whose browser blocked the untouched autoplay. */
  function say(text, who, sourceEl, onEnd, onStart) {
    if (!text) { if (onEnd) onEnd(); return; }
    status(text, who);
    setReading(null);
    if (!onEnd) chain = null;   // a fresh tap-say cancels any queued ask
    if (!store.sound) { if (onEnd) onEnd(); return; }
    var play = function (map) {
      var file = map && ((map[String(page)] && map[String(page)][text]) || (map.shared && map.shared[text]));
      if (!file) {
        if (missing.indexOf(text) < 0) missing.push(text);
        if (onEnd) onEnd();               // silent, and honestly so
        return;
      }
      try {
        if (current) { current.pause(); current.currentTime = 0; }
        current = new Audio("narration/" + file);
        var done = false;
        var finish = function () {
          if (done) return;
          done = true;
          setReading(null);
          if (onEnd) onEnd();
        };
        if (sourceEl) setReading(sourceEl);
        current.addEventListener("ended", finish);
        current.addEventListener("error", finish);
        current.play().then(function () { if (onStart) onStart(); }, finish);
      } catch (e) { finish(); }
    };
    /* iOS honours play() only while the tap's user activation lasts, so a warm
       map plays right here, synchronously inside the gesture; only a
       still-cold map waits on the promise. */
    if (narration) play(narration);
    else loadNarration().then(play);
  }

  /* A question is asked in lines -- Dot's lead-in, then the narrator's prompt,
     then whatever the child's tap earned -- and one gesture pays for the whole
     sequence: each line starts when the previous clip ends, a line with no
     clip yet steps straight through (its text still prints, never an error),
     and any new tap cancels the rest, exactly as a second tap on a single
     clip always has. An item may carry onStart, fired if that line truly
     plays. */
  function sayQueue(items) {
    var run = { items: items, i: 0 };
    chain = run;
    (function next() {
      if (chain !== run) return;
      var it = run.items[run.i++];
      if (!it) { if (chain === run) chain = null; return; }
      say(it.text, it.who || "", it.sourceEl || null, function () {
        if (chain === run) next();
      }, it.onStart || null);
    })();
  }

  /* ---------- the spoken line, printed ------------------------------------- */
  var statusEl = null;
  var statusTimer = 0;
  /* `who` is the narration manifest's speaker key (narration/lines.json calls
     it "role": "narrator" or "dot"), not a byline. "narrator" is jargon a
     child cannot read, so the book's own voice prints with no prefix at all;
     a character prints as their display name, capitalised, with ": " after it.
     A key with no name here still prints, capitalised, never raw. */
  var SPEAKERS = { dot: "Dot", ari: "Ari" };
  function speakerName(key) {
    if (!key) return "";
    var k = String(key).toLowerCase();
    if (k === "narrator") return "";
    return SPEAKERS[k] || (k.charAt(0).toUpperCase() + k.slice(1));
  }
  function status(text, who) {
    /* Looked up lazily: this runtime boots before the page script appends the
       slice status bar, and the promise that an unrecorded line is printed and
       stays silent must not depend on script order. */
    if (!statusEl) statusEl = document.querySelector(".status,.slice-status");
    if (!statusEl) return;
    statusEl.innerHTML = "";
    var name = speakerName(who);
    if (name) {
      var w = document.createElement("span");
      w.className = "who"; w.textContent = name + ": ";
      statusEl.appendChild(w);
    }
    statusEl.appendChild(document.createTextNode(text));
    statusEl.classList.add("show");
    clearTimeout(statusTimer);
    statusTimer = setTimeout(function () { statusEl.classList.remove("show"); }, 9000);
  }

  /* ---------- chrome -------------------------------------------------------- */
  function pad(n) { return String(n).padStart(2, "0"); }
  function href(n) { return "page-" + pad(n) + ".html"; }

  function buildChrome(stage) {
    var hub = document.createElement("a");
    hub.className = "hub";
    hub.href = "https://veeranuchlee.github.io/children-apps/";
    hub.textContent = "←";
    hub.setAttribute("aria-label", "Back to Children Games");
    hub.title = "Back to Children Games";
    stage.appendChild(hub);

    var nav = document.createElement("nav");
    nav.className = "page-nav";
    nav.setAttribute("aria-label", "Page navigation");
    var prev = page > 1
      ? '<a href="' + href(page - 1) + '" aria-label="Previous page" title="Previous page">‹</a>'
      : '<a aria-disabled="true" aria-label="Previous page">‹</a>';
    var next = page < PAGES
      ? '<a href="' + href(page + 1) + '" aria-label="Next page" title="Next page">›</a>'
      : '<a aria-disabled="true" aria-label="Next page">›</a>';
    nav.innerHTML = prev +
      '<button class="page-jump" type="button" aria-label="Page ' + page + ' of ' + PAGES +
      '. Press and hold to go to a page" title="Press and hold to go to a page">' +
      page + ' / ' + PAGES + '</button>' + next +
      '<form class="page-goto" hidden><label>Go to <input type="number" min="1" max="' + PAGES +
      '" value="' + page + '" inputmode="numeric" aria-label="Page number"></label>' +
      '<button class="ctrl" type="submit">Go</button></form>';
    /* The nav pill and the picture-button row share one top bar (.top-bar in
       starlight.css owns the old nav anchor, top 1.5% / right 1.5%). The row is
       inserted BEFORE the pill so it sits immediately left of it, centred on
       the pill's own midline; the controls no longer fit below the question
       panel, where the 64px buttons grew over its bottom edge (see the
       .page-controls comment in starlight.css). */
    var bar = document.createElement("div");
    bar.className = "top-bar";
    bar.appendChild(nav);
    stage.appendChild(bar);

    var jump = nav.querySelector(".page-jump");
    var form = nav.querySelector(".page-goto");
    var input = form.querySelector("input");
    var timer = 0, held = false;
    function open() { held = true; form.hidden = false; input.select(); input.focus(); }
    jump.addEventListener("pointerdown", function () { held = false; timer = setTimeout(open, 600); });
    ["pointerup", "pointercancel", "pointerleave"].forEach(function (t) {
      jump.addEventListener(t, function () { clearTimeout(timer); });
    });
    jump.addEventListener("click", function (e) { if (held) e.preventDefault(); });
    jump.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
    });
    jump.addEventListener("contextmenu", function (e) { e.preventDefault(); open(); });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var n = Number(input.value);
      if (n >= 1 && n <= PAGES) location.href = href(n);
    });
    document.addEventListener("pointerdown", function (e) {
      if (!nav.contains(e.target)) form.hidden = true;
    });

    /* Book 1's child-facing controls, in the same order and place. The Display
       chip Book 1 never had is gone (owner, 2026-10-21: "no need for the
       display button."), and the word chips are picture buttons now (owner,
       2026-10-27: "this is hard to use for kids. use picture instead.") -- a
       speaker, a shooting star, four corner arrows, each drawn inline (no
       emoji, no icon font, no extra file) with chunky currentColor strokes.
       The words moved into the aria-label rather than away: it names the state
       and what a tap does. aria-pressed and title are exactly what they were. */
    /* Each icon is one self-contained inline <svg> (counted per control by
       qc/check-slice-one.js), stroked in currentColor so the chip's own colour
       flows through the drawing. */
    var G = ' fill="none" stroke="currentColor" stroke-width="4.5" ' +
      'stroke-linecap="round" stroke-linejoin="round"';
    var SPEAKER = '<path d="M10 19h5l9-8v26l-9-8h-5z"/>';
    var iSoundOn =
      '<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false"><g' + G + '>' + SPEAKER +
      '<path d="M28 18a7 7 0 0 1 0 12"/><path d="M34 12.5a14 14 0 0 1 0 23"/></g></svg>';
    var iSoundOff =
      '<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false"><g' + G + '>' + SPEAKER +
      '<path d="M28 19l10 10"/><path d="M38 19l-10 10"/></g></svg>';
    var STAR = '<path d="M33 4l2.8 8.2 8.2 2.8-8.2 2.8L33 26l-2.8-8.2L22 15l8.2-2.8z"/>';
    var iMotion =
      '<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false"><g' + G + '>' + STAR +
      '<path d="M26 28L14 40"/><path d="M35 34L26 43"/><path d="M17 19L7 29"/></g></svg>';
    var iCalm =
      '<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false"><g' + G + '>' + STAR +
      '<path d="M8 33h9l-9 9h9"/></g></svg>';
    var iFullOut =
      '<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false"><g' + G + '>' +
      '<path d="M20 20L9 9"/><path d="M9 9h9"/><path d="M9 9v9"/>' +
      '<path d="M28 20L39 9"/><path d="M39 9h-9"/><path d="M39 9v9"/>' +
      '<path d="M20 28L9 39"/><path d="M9 39h9"/><path d="M9 39v-9"/>' +
      '<path d="M28 28L39 39"/><path d="M39 39h-9"/><path d="M39 39v-9"/></g></svg>';
    var iFullIn =
      '<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false"><g' + G + '>' +
      '<path d="M9 9L20 20"/><path d="M20 20h-9"/><path d="M20 20v-9"/>' +
      '<path d="M39 9L28 20"/><path d="M28 20h9"/><path d="M28 20v-9"/>' +
      '<path d="M9 39L20 28"/><path d="M20 28h-9"/><path d="M20 28v9"/>' +
      '<path d="M39 39L28 28"/><path d="M28 28h9"/><path d="M28 28v9"/></g></svg>';

    var row = document.createElement("div");
    row.className = "page-controls";
    row.innerHTML =
      '<button class="ctrl" id="cSound" type="button" aria-pressed="' + store.sound + '"></button>' +
      '<button class="ctrl" id="cCalm" type="button" aria-pressed="' + calm + '" ' +
        'title="Reduced motion"></button>' +
      '<button class="ctrl" id="cFull" type="button" hidden></button>';
    bar.insertBefore(row, nav);

    function paint(btn, drawing, label) {
      btn.innerHTML = drawing;
      btn.setAttribute("aria-label", label);
    }

    var bSound = row.querySelector("#cSound");
    function paintSound() {
      paint(bSound, store.sound ? iSoundOn : iSoundOff, store.sound
        ? "Sound is on. Tap to turn sound off."
        : "Sound is off. Tap to turn sound on.");
    }
    paintSound();
    bSound.addEventListener("click", function () {
      store.sound = !store.sound;
      bSound.setAttribute("aria-pressed", String(store.sound));
      paintSound();
      /* Sound-off mid-queue kills the chain too, with say()'s sound-off early
         return's own semantics: a paused clip never fires "ended", so the
         queue's remaining lines would otherwise never come, even after Sound
         is re-enabled. */
      if (!store.sound) { chain = null; if (current) { current.pause(); setReading(null); } }
      if (store.sound) sfx.tap();
    });

    var bCalm = row.querySelector("#cCalm");
    function paintCalm() {
      paint(bCalm, calm ? iCalm : iMotion, calm
        ? "Motion is calm. Tap for full motion."
        : "Motion is full. Tap for calm mode.");
    }
    paintCalm();
    bCalm.addEventListener("click", function () {
      calm = !calm; store.motion = !calm;
      bCalm.setAttribute("aria-pressed", String(calm));
      paintCalm();
      applyCalm();
      API.emit("calm", calm);
    });

    // A control that cannot work hides itself rather than offering a dead button.
    var bFull = row.querySelector("#cFull");
    var root = document.documentElement;
    function paintFull() {
      var on = !!(document.fullscreenElement || document.webkitFullscreenElement);
      paint(bFull, on ? iFullIn : iFullOut, on
        ? "Full screen is on. Tap to leave full screen."
        : "Full screen is off. Tap for full screen.");
    }
    if (root.requestFullscreen || root.webkitRequestFullscreen) {
      bFull.hidden = false;
      bFull.addEventListener("click", function () {
        try {
          if (document.fullscreenElement) document.exitFullscreen();
          else (root.requestFullscreen || root.webkitRequestFullscreen).call(root);
        } catch (e) {}
      });
      /* The icon follows the browser, not the tap: the escape gesture and the
         OS's own control change fullscreen state without this button. */
      document.addEventListener("fullscreenchange", paintFull);
      document.addEventListener("webkitfullscreenchange", paintFull);
      paintFull();
    }

  }

  /* ---------- art slots ----------------------------------------------------- */
  function wireArt() {
    Array.prototype.forEach.call(document.querySelectorAll("img.art"), function (img) {
      img.addEventListener("error", function () {
        var slot = document.createElement("div");
        slot.className = img.className;
        slot.setAttribute("style", img.getAttribute("style") || "");
        slot.dataset.missing = "1";
        slot.textContent = img.dataset.slot || img.alt || "art";
        if (img.parentNode) img.parentNode.replaceChild(slot, img);
      }, { once: true });
    });
  }

  /* ---------- evidence badges ---------------------------------------------- */
  /* The badge glyphs are drawn like the control icons (chunky currentColor
     strokes, one inline <svg> each), not emoji: an emoji is a different little
     picture on every platform and some of these render as nothing a child can
     name. The <i> keeps the badge's own colour, so the drawings follow each
     kind's palette. */
  var KG = ' fill="none" stroke="currentColor" stroke-width="4" ' +
    'stroke-linecap="round" stroke-linejoin="round"';
  var KINDS = {
    seen:     { icon: '<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false"><g' + KG + '>' +
      '<path d="M4 24c6-9 12-13 20-13s14 4 20 13c-6 9-12 13-20 13S10 33 4 24z"/>' +
      '<circle cx="24" cy="24" r="5.5"/></g></svg>',
      word: "Seen", blurb: "Someone looked at this, or photographed it." },
    measured: { icon: '<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false"><g' + KG + '>' +
      '<circle cx="10" cy="38" r="3.5"/><path d="M19 38a9 9 0 0 0-9-9"/>' +
      '<path d="M28 38a18 18 0 0 0-18-18"/></g></svg>',
      word: "Measured", blurb: "An instrument measured something about it." },
    inferred: { icon: '<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false"><g' + KG + '>' +
      '<path d="M8 16h9a5 5 0 0 1 10 0h9v8a5 5 0 0 1 0 10v8H8z"/></g></svg>',
      word: "Inferred", blurb: "Nobody can see it directly. The clues point firmly at it." },
    model:    { icon: '<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false"><g' + KG + '>' +
      '<path d="M8 8h32v32H8z"/><circle cx="31" cy="17" r="3.5"/>' +
      '<path d="M12 31l7-8 5 6 4-4 6 6"/></g></svg>',
      word: "Model", blurb: "This picture is a diagram or a scientist's reconstruction." }
  };

  function wireBadges(stage) {
    var drawer = document.createElement("section");
    drawer.className = "drawer";
    drawer.setAttribute("role", "dialog");
    drawer.setAttribute("aria-label", "How do we know?");
    drawer.innerHTML = '<button class="drawer-close" type="button" aria-label="Close">×</button>' +
      '<h2>How do we know?</h2><p class="kind-line"></p><p class="note-line"></p>' +
      '<p class="note"></p>';
    stage.appendChild(drawer);
    var close = drawer.querySelector(".drawer-close");
    close.addEventListener("click", function () { drawer.classList.remove("open"); });

    Array.prototype.forEach.call(document.querySelectorAll(".badge[data-kind]"), function (b) {
      var k = KINDS[b.dataset.kind];
      if (!b.textContent.trim() && k) b.innerHTML = "<i>" + k.icon + "</i>" + k.word;
      if (!b.getAttribute("aria-label") && k) {
        b.setAttribute("aria-label", "How do we know? " + k.word);
      }
      b.addEventListener("click", function () {
        sfx.tap();
        drawer.querySelector(".kind-line").innerHTML =
          '<span class="kind"><i>' + k.icon + "</i> " + k.word + "</span>";
        drawer.querySelector(".note-line").textContent = b.dataset.note || "";
        drawer.querySelector(".note").textContent = k.blurb;
        drawer.classList.add("open");
      });
    });

    // Any page-declared drawer opens the same way.
    Array.prototype.forEach.call(document.querySelectorAll("[data-drawer]"), function (t) {
      t.addEventListener("click", function () {
        var d = document.querySelector(t.dataset.drawer);
        if (!d) return;
        sfx.tap();
        d.classList.add("open");
        if (!d.querySelector(".drawer-close")) {
          var x = document.createElement("button");
          x.className = "drawer-close"; x.type = "button";
          x.setAttribute("aria-label", "Close"); x.textContent = "×";
          x.addEventListener("click", function () { d.classList.remove("open"); });
          d.appendChild(x);
        }
      });
    });
  }

  /* ---------- data-say ------------------------------------------------------ */
  function wireSay() {
    document.addEventListener("click", function (e) {
      var t = e.target.closest && e.target.closest("[data-say]");
      if (!t) return;
      sfx.tap();
      say(t.dataset.say, t.dataset.who || "", t);
    });
    /* Tappable text is not always a button (the story paragraph, the question,
       the cover title). Enter and Space must read those too; real buttons and
       links already get the browser's own key-to-click translation, so they are
       skipped here to avoid speaking twice. */
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Enter" && e.key !== " ") return;
      var t = e.target.closest && e.target.closest("[data-say]");
      if (!t || /^(BUTTON|A|INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) return;
      e.preventDefault();
      sfx.tap();
      say(t.dataset.say, t.dataset.who || "", t);
    });
  }

  /* ---------- tiny event bus ------------------------------------------------ */
  var handlers = {};
  var API = {
    page: page,
    sfx: sfx,
    say: say,
    sayQueue: sayQueue,
    status: status,
    get calm() { return calm; },
    get sound() { return store.sound; },
    on: function (name, fn) { (handlers[name] = handlers[name] || []).push(fn); return API; },
    emit: function (name, arg) {
      (handlers[name] || []).forEach(function (fn) { try { fn(arg); } catch (e) {} });
    },
    onReplay: function (fn) { return API.on("replay", fn); },
    onCalm: function (fn) { return API.on("calm", fn); },
    narrationReport: function () { return missing.slice(); },
    fmt: function (n) { return n.toLocaleString("en-GB"); }
  };
  window.Starlight = API;

  /* ---------- boot ---------------------------------------------------------- */
  function boot() {
    var stage = document.querySelector(".stage");
    if (!stage) return;
    loadNarration();   // warm the map before any gesture: the first tapped line plays inside the tap
    applyCalm();
    buildChrome(stage);
    wireArt();
    wireBadges(stage);
    wireSay();
    document.title = "Ari & Dot · Page " + page + " — " +
      (document.body.dataset.title || "Follow the Starlight");
    API.emit("ready");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
