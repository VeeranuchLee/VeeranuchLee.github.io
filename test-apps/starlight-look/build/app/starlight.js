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
  function status(text, who) {
    /* Looked up lazily: this runtime boots before the page script appends the
       slice status bar, and the promise that an unrecorded line is printed and
       stays silent must not depend on script order. */
    if (!statusEl) statusEl = document.querySelector(".status,.slice-status");
    if (!statusEl) return;
    statusEl.innerHTML = "";
    if (who) {
      var w = document.createElement("span");
      w.className = "who"; w.textContent = who + ":";
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
    stage.appendChild(nav);

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

    /* Book 1's child-facing control chips, in the same order and place. The
       Display chip Book 1 never had is gone (owner, 2026-10-21: "no need for
       the display button."). */
    var row = document.createElement("div");
    row.className = "page-controls";
    row.innerHTML =
      '<button class="ctrl" id="cSound" type="button" aria-pressed="' + store.sound + '">' +
        (store.sound ? "Sound on" : "Sound off") + '</button>' +
      '<button class="ctrl" id="cCalm" type="button" aria-pressed="' + calm + '" ' +
        'title="Reduced motion">' + (calm ? "Full motion" : "Calm mode") + '</button>' +
      '<button class="ctrl" id="cFull" type="button" hidden>Full screen</button>';
    stage.appendChild(row);

    var bSound = row.querySelector("#cSound");
    bSound.addEventListener("click", function () {
      store.sound = !store.sound;
      bSound.setAttribute("aria-pressed", String(store.sound));
      bSound.textContent = store.sound ? "Sound on" : "Sound off";
      /* Sound-off mid-queue kills the chain too, with say()'s sound-off early
         return's own semantics: a paused clip never fires "ended", so the
         queue's remaining lines would otherwise never come, even after Sound
         is re-enabled. */
      if (!store.sound) { chain = null; if (current) { current.pause(); setReading(null); } }
      if (store.sound) sfx.tap();
    });

    var bCalm = row.querySelector("#cCalm");
    bCalm.addEventListener("click", function () {
      calm = !calm; store.motion = !calm;
      bCalm.setAttribute("aria-pressed", String(calm));
      bCalm.textContent = calm ? "Full motion" : "Calm mode";
      applyCalm();
      API.emit("calm", calm);
    });

    // A control that cannot work hides itself rather than offering a dead button.
    var bFull = row.querySelector("#cFull");
    var root = document.documentElement;
    if (root.requestFullscreen || root.webkitRequestFullscreen) {
      bFull.hidden = false;
      bFull.addEventListener("click", function () {
        try {
          if (document.fullscreenElement) document.exitFullscreen();
          else (root.requestFullscreen || root.webkitRequestFullscreen).call(root);
        } catch (e) {}
      });
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
  var KINDS = {
    seen:     { icon: "👁", word: "Seen",     blurb: "Someone looked at this, or photographed it." },
    measured: { icon: "📡", word: "Measured", blurb: "An instrument measured something about it." },
    inferred: { icon: "🧩", word: "Inferred", blurb: "Nobody can see it directly. The clues point firmly at it." },
    model:    { icon: "🖼", word: "Model",    blurb: "This picture is a diagram or a scientist's reconstruction." }
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
