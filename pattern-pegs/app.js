/* Pattern Pegs — app glue (v1).
 *
 * This file renders and sequences; it never invents puzzles. Every puzzle comes from
 * js/pattern-core.js (seeded, model-checked), and the only difficulty logic here is
 * presentation: level dots, three-clean-solves auto-advance (never auto-descend), and
 * session stars. Beads are code-drawn SVG this round; the plate is the one painted
 * element. No speechSynthesis (AUDIO-DIRECTION: OS voices are not narration); sound
 * is WebAudio synthesis only.
 */

(function () {
  "use strict";

  /* ---------- beads ---------- */

  var COLOUR_HEX = {
    red: "#e86262",
    yellow: "#f4be4e",
    blue: "#5b8dd9",
    green: "#6fbf73",
    purple: "#9a6ad6",
  };

  var SHAPES_SVG = {
    circle: '<circle cx="50" cy="50" r="42"/>',
    square: '<rect x="12" y="12" width="76" height="76" rx="14"/>',
    triangle: '<polygon points="50,10 89,82 11,82" stroke-linejoin="round"/>',
    star: '<polygon points="50,7 61.8,35.5 92,38.2 69,58.6 75.6,88.3 50,72.8 24.4,88.3 31,58.6 8,38.2 38.2,35.5" stroke-linejoin="round"/>',
    heart: '<path d="M50 84 C22 62 12 44 22 30 C30 18 46 20 50 32 C54 20 70 18 78 30 C88 44 78 62 50 84 Z"/>',
  };

  var SVG_OPEN =
    '<svg viewBox="0 0 100 100" role="img" aria-label="bead" xmlns="http://www.w3.org/2000/svg"';

  function beadSVG(shape, colour, extra) {
    return (
      SVG_OPEN + (extra || "") + ">" +
      '<g fill="' + COLOUR_HEX[colour] + '" stroke="rgba(90,60,50,.25)" stroke-width="2">' +
      SHAPES_SVG[shape] +
      "</g>" +
      '<ellipse cx="38" cy="28" rx="15" ry="10" fill="rgba(255,255,255,.55)"/>' +
      "</svg>"
    );
  }

  function beadWrap(pieceStr, cls) {
    var parts = pieceStr.split(":");
    return (
      '<span class="bead-wrap' + (cls ? " " + cls : "") + '">' +
      beadSVG(parts[0], parts[1]) +
      "</span>"
    );
  }

  function pieceShape(p) { return p.split(":")[0]; }
  function pieceColour(p) { return p.split(":")[1]; }

  /* ---------- sound (WebAudio synthesis, no files) ---------- */

  var Sound = {
    ctx: null,
    on: localStorage.getItem("pp.sound") !== "off",
    ensure: function () {
      if (!this.ctx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (AC) this.ctx = new AC();
      }
      if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
      return this.ctx;
    },
    tone: function (freq, start, dur, type, vol) {
      var ctx = this.ensure();
      if (!ctx || !this.on) return;
      var o = ctx.createOscillator();
      var g = ctx.createGain();
      o.type = type || "sine";
      o.frequency.value = freq;
      var t = ctx.currentTime + start;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol || 0.12, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + dur + 0.05);
    },
    correct: function () { this.tone(659, 0, 0.22); this.tone(880, 0.09, 0.28); },
    wrong: function () { this.tone(220, 0, 0.18, "triangle", 0.07); },
    fanfare: function () {
      this.tone(523, 0, 0.2); this.tone(659, 0.11, 0.2); this.tone(784, 0.22, 0.34);
    },
    toggle: function () {
      this.on = !this.on;
      localStorage.setItem("pp.sound", this.on ? "on" : "off");
      return this.on;
    },
  };

  /* ---------- state ---------- */

  var MAX_LEVEL = { copy: 6, continue: 8, sort: 4, lace: 6, decode: 5 };
  var LEVELS = { copy: [2, 4, 6], continue: [1, 2, 3, 4, 5, 6, 7, 8], sort: [1, 2, 3, 4], lace: [2, 4, 6], decode: [3, 5] };
  var TITLES = {
    copy: "Copy the Tower",
    continue: "Continue the Pattern",
    sort: "Sort by Rule",
    lace: "Lace the Beads",
    decode: "Decode the Card",
  };

  var S = {
    activity: null,
    level: {},      // per activity
    streak: {},     // clean solves in a row, per activity
    stars: 0,
    puzzle: null,
    seedBase: Math.floor(Math.random() * 1e9),
    count: 0,
    lace: null,     // lace phase state
    copyTray: null, // copy tray multiset
  };

  function loadLevel(activity) {
    var v = parseInt(localStorage.getItem("pp.level." + activity) || "", 10);
    var allowed = LEVELS[activity];
    if (!v || allowed.indexOf(v) === -1) v = allowed[0];
    return v;
  }

  function setLevel(activity, v) {
    S.level[activity] = v;
    localStorage.setItem("pp.level." + activity, String(v));
  }

  function nextPuzzle(cleanExpected) {
    S.count++;
    S.puzzle = PatternCore.generate({
      activity: S.activity,
      level: S.level[S.activity],
      seed: S.seedBase + S.count,
    });
    if (cleanExpected) S.clean = true;
    renderPuzzle();
  }

  /* ---------- chrome ---------- */

  function el(id) { return document.getElementById(id); }

  function renderStars() {
    var box = el("stars");
    box.innerHTML = "";
    for (var i = 0; i < 10; i++) {
      var s = document.createElement("span");
      s.className = "star" + (i < S.stars ? " earned" : "");
      s.textContent = "★";
      box.appendChild(s);
    }
  }

  function renderLevels() {
    var box = el("levels");
    box.innerHTML = "";
    LEVELS[S.activity].forEach(function (lv) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "level-dot";
      b.textContent = String(lv);
      b.setAttribute("aria-pressed", String(lv === S.level[S.activity]));
      b.addEventListener("click", function () {
        setLevel(S.activity, lv);
        S.streak[S.activity] = 0;
        renderLevels();
        nextPuzzle(true);
      });
      box.appendChild(b);
    });
  }

  /* ---------- shared feedback ---------- */

  function sparkleAt(node) {
    var sp = document.createElement("span");
    sp.className = "sparkle";
    node.appendChild(sp);
    setTimeout(function () { sp.remove(); }, 950);
  }

  function solvedClean() {
    var act = S.activity;
    S.stars++;
    if (S.stars >= 10) { S.stars = 0; Sound.fanfare(); } else { Sound.correct(); }
    renderStars();
    if (S.clean) {
      S.streak[act] = (S.streak[act] || 0) + 1;
      if (S.streak[act] >= 3) {
        var allowed = LEVELS[act];
        var idx = allowed.indexOf(S.level[act]);
        if (idx < allowed.length - 1) {
          setLevel(act, allowed[idx + 1]);
          S.streak[act] = 0;
          renderLevels();
        }
      }
    } else {
      S.streak[act] = 0;
    }
    setTimeout(nextPuzzle, 650, true);
  }

  function wrongTap(node) {
    Sound.wrong();
    S.clean = false;
    node.classList.remove("shake");
    void node.offsetWidth;
    node.classList.add("shake");
  }

  /* ---------- continue / decode ---------- */

  function renderGapBoard(onFill) {
    var body = el("activity-body");
    var p = S.puzzle;
    var boardPanel = document.createElement("div");
    boardPanel.className = "panel";
    var row = document.createElement("div");
    row.className = "bead-row";
    p.board.forEach(function (cell, i) {
      if (cell) {
        row.insertAdjacentHTML("beforeend", beadWrap(cell));
      } else {
        var slot = document.createElement("span");
        slot.className = "gap-slot";
        slot.dataset.i = String(i);
        row.appendChild(slot);
      }
    });
    boardPanel.appendChild(row);
    body.appendChild(boardPanel);
    markNextGap();
  }

  function markNextGap() {
    var slots = document.querySelectorAll(".gap-slot:not(.filled)");
    slots.forEach(function (s) { s.classList.remove("needs"); });
    if (slots.length) slots[0].classList.add("needs");
  }

  function renderChoices() {
    var body = el("activity-body");
    var p = S.puzzle;
    var tray = document.createElement("div");
    tray.className = "panel";
    var row = document.createElement("div");
    row.className = "bead-row";
    p.choices.forEach(function (choice) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "choice-btn";
      b.setAttribute("aria-label", choice);
      b.innerHTML = beadSVG(pieceShape(choice), pieceColour(choice));
      b.addEventListener("click", function () { tryFillGap(choice, b); });
      row.appendChild(b);
    });
    tray.appendChild(row);
    body.appendChild(tray);
  }

  function tryFillGap(choice, btn) {
    var slots = document.querySelectorAll(".gap-slot:not(.filled)");
    if (!slots.length) return;
    var slot = slots[0];
    var i = parseInt(slot.dataset.i, 10);
    var expected = S.puzzle.answers[S.puzzle.board.filter(function (c, j) { return c === null && j <= i; }).length - 1];
    if (choice === expected) {
      slot.classList.add("filled");
      slot.classList.remove("needs");
      slot.innerHTML = beadSVG(pieceShape(choice), pieceColour(choice));
      sparkleAt(slot);
      Sound.correct();
      if (!document.querySelector(".gap-slot:not(.filled)")) solvedClean();
      else markNextGap();
    } else {
      wrongTap(btn);
    }
  }

  /* ---------- copy the tower ---------- */

  function renderCopy() {
    var body = el("activity-body");
    var p = S.puzzle;
    var area = document.createElement("div");
    area.className = "panel copy-area";

    var model = document.createElement("div");
    model.className = "tower-col";
    model.insertAdjacentHTML("beforeend", '<span class="tower-label">Make this</span>');
    p.target.slice().reverse().forEach(function (piece) {
      model.insertAdjacentHTML("beforeend", beadWrap(piece));
    });

    var yours = document.createElement("div");
    yours.className = "tower-col";
    yours.id = "your-tower";
    yours.insertAdjacentHTML("beforeend", '<span class="tower-label">Yours</span>');

    area.appendChild(model);
    area.appendChild(yours);
    body.appendChild(area);

    // tray: the full multiset (so it is always solvable) plus one extra piece
    var multiset = p.target.slice();
    var extraPool = [];
    for (var si = 0; si < PatternCore.SHAPES.length; si++) {
      for (var ci = 0; ci < PatternCore.COLOURS.length; ci++) {
        var cand = PatternCore.SHAPES[si] + ":" + PatternCore.COLOURS[ci];
        if (multiset.indexOf(cand) === -1) extraPool.push(cand);
      }
    }
    multiset.push(extraPool[Math.floor(Math.random() * extraPool.length)]);
    S.copyTray = { counts: {}, built: [] };
    multiset.forEach(function (piece) {
      S.copyTray.counts[piece] = (S.copyTray.counts[piece] || 0) + 1;
    });

    var tray = document.createElement("div");
    tray.className = "panel";
    var row = document.createElement("div");
    row.className = "bead-row";
    Object.keys(S.copyTray.counts).forEach(function (piece) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "choice-btn";
      b.dataset.piece = piece;
      b.setAttribute("aria-label", "tray " + piece);
      b.innerHTML = beadSVG(pieceShape(piece), pieceColour(piece));
      b.addEventListener("click", function () { addToTower(piece, b); });
      row.appendChild(b);
    });
    tray.appendChild(row);
    body.appendChild(tray);
    renderYourTower(); // shows the empty tower with the "next bead goes here" ghost
  }

  function addToTower(piece, btn) {
    if (S.copyTray.counts[piece] <= 0) return;
    S.copyTray.counts[piece]--;
    S.copyTray.built.push(piece);
    btn.style.opacity = S.copyTray.counts[piece] > 0 ? "1" : "0.35";
    renderYourTower();
    if (S.copyTray.built.length === S.puzzle.target.length) checkTower();
  }

  function ghostNext(label) {
    var g = document.createElement("span");
    g.className = "ghost-next";
    g.setAttribute("role", "img");
    g.setAttribute("aria-label", label);
    return g;
  }

  function renderYourTower() {
    var col = el("your-tower");
    col.querySelectorAll(".bead-wrap, .ghost-next").forEach(function (n) { n.remove(); });
    // The tower grows upward: the first tapped bead is the bottom, the next bead
    // lands on TOP of the stack — so the ghost marker sits at the growth end,
    // just under the label and above the newest bead.
    var frag = document.createDocumentFragment();
    if (S.copyTray.built.length < S.puzzle.target.length) {
      frag.appendChild(ghostNext("next bead goes here"));
    }
    S.copyTray.built.slice().reverse().forEach(function (piece, revI) {
      var idx = S.copyTray.built.length - 1 - revI; // real index (top-most pops first)
      var wrap = document.createElement("span");
      wrap.className = "bead-wrap";
      wrap.innerHTML = beadSVG(pieceShape(piece), pieceColour(piece));
      wrap.addEventListener("click", function () { popTower(idx, piece); });
      frag.appendChild(wrap);
    });
    col.insertBefore(frag, col.children[1] || null); // after the label
  }

  function popTower(idx, piece) {
    if (idx !== S.copyTray.built.length - 1) return; // only the top bead pops
    S.copyTray.built.pop();
    S.copyTray.counts[piece]++;
    var btn = document.querySelector('.choice-btn[data-piece="' + piece + '"]');
    if (btn) btn.style.opacity = "1";
    renderYourTower();
  }

  function checkTower() {
    var t = S.puzzle.target;
    var built = S.copyTray.built;
    var allOk = true;
    for (var i = 0; i < t.length; i++) if (t[i] !== built[i]) allOk = false;
    if (allOk) {
      var wraps = el("your-tower").querySelectorAll(".bead-wrap");
      sparkleAt(wraps[wraps.length - 1] || el("your-tower"));
      solvedClean();
    } else {
      Sound.wrong();
      S.clean = false;
      var col = el("your-tower");
      col.querySelectorAll(".bead-wrap").forEach(function (n, revI) {
        var i = built.length - 1 - revI;
        n.classList.toggle("bad", t[i] !== built[i]);
      });
    }
  }

  /* ---------- sort by rule ---------- */

  function ruleBanner() {
    var rule = S.puzzle.rule;
    var banner = document.createElement("div");
    banner.className = "panel rule-banner";
    if (rule.include && Object.keys(rule.include).length === 1) {
      var attr = Object.keys(rule.include)[0];
      var val = rule.include[attr];
      var sample = attr === "shape" ? val + ":" + PatternCore.COLOURS[0] : PatternCore.SHAPES[0] + ":" + val;
      banner.innerHTML = '<span class="rule-text">Pick all</span>' + beadSVG(pieceShape(sample), pieceColour(sample));
    } else if (rule.include) {
      var s0 = rule.include.shape + ":" + rule.include.colour;
      banner.innerHTML = '<span class="rule-text">Pick only</span>' + beadSVG(pieceShape(s0), pieceColour(s0));
    } else if (rule.exclude) {
      var ex = rule.exclude;
      var attr2 = Object.keys(ex)[0];
      var val2 = ex[attr2];
      var sample2 = attr2 === "shape" ? val2 + ":" + PatternCore.COLOURS[1] : PatternCore.SHAPES[1] + ":" + val2;
      banner.innerHTML =
        '<span class="rule-text">Pick all that are NOT</span>' +
        '<span style="position:relative;display:inline-flex;width:58px;height:58px">' +
        beadSVG(pieceShape(sample2), pieceColour(sample2)) +
        '<span style="position:absolute;inset:0;display:grid;place-items:center;font-size:34px;color:#d95a5a">🚫</span></span>';
    } else if (rule.bins) {
      var keys = Object.keys(rule.bins);
      var b1 = rule.bins[keys[0]], b2 = rule.bins[keys[1]];
      var a1 = Object.keys(b1)[0], a2 = Object.keys(b2)[0];
      var s1 = a1 === "shape" ? b1[a1] + ":" + PatternCore.COLOURS[0] : PatternCore.SHAPES[0] + ":" + b1[a1];
      var s2 = a2 === "shape" ? b2[a2] + ":" + PatternCore.COLOURS[0] : PatternCore.SHAPES[0] + ":" + b2[a2];
      banner.innerHTML =
        '<span class="rule-text">Two boxes</span>' + beadSVG(pieceShape(s1), pieceColour(s1)) +
        '<span class="rule-text">and</span>' + beadSVG(pieceShape(s2), pieceColour(s2));
    }
    return banner;
  }

  function renderSort() {
    var body = el("activity-body");
    body.appendChild(ruleBanner());

    var state = {}; // piece -> "in" | "out" | "A" | "B"
    S.puzzle.pieces.forEach(function (piece) { state[piece] = null; });

    var row = document.createElement("div");
    row.className = "panel bead-row";
    S.puzzle.pieces.forEach(function (piece) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "choice-btn";
      b.dataset.piece = piece;
      b.setAttribute("aria-label", "sort " + piece);
      b.innerHTML = beadSVG(pieceShape(piece), pieceColour(piece));
      b.addEventListener("click", function () { cycleSort(piece, b, state); });
      row.appendChild(b);
    });
    body.appendChild(row);
    S.sortState = state;
  }

  function cycleSort(piece, btn, state) {
    var p = S.puzzle;
    if (p.rule.bins) {
      var keys = Object.keys(p.rule.bins);
      state[piece] = state[piece] === keys[0] ? keys[1] : keys[0];
      btn.style.outline = "5px solid " + (state[piece] === keys[0] ? "#e86262" : "#5b8dd9");
      btn.style.outlineOffset = "3px";
    } else {
      state[piece] = state[piece] === "in" ? "out" : "in";
      btn.style.outline = state[piece] === "in" ? "5px solid #6fbf73" : "none";
      btn.style.outlineOffset = "3px";
    }
    if (Object.keys(state).every(function (k) { return state[k] !== null; })) checkSort(state);
  }

  function checkSort(state) {
    var p = S.puzzle;
    var ok = true;
    var wrongPiece = null;
    if (p.rule.bins) {
      p.pieces.forEach(function (piece) {
        if (p.assignment[piece] !== state[piece]) { ok = false; wrongPiece = wrongPiece || piece; }
      });
    } else {
      var memberSet = {};
      p.members.forEach(function (m) { memberSet[m] = true; });
      p.pieces.forEach(function (piece) {
        var chosen = state[piece] === "in";
        if (chosen !== !!memberSet[piece]) { ok = false; wrongPiece = wrongPiece || piece; }
      });
    }
    if (ok) solvedClean();
    else {
      S.clean = false;
      var btn = document.querySelector('.choice-btn[data-piece="' + wrongPiece + '"]');
      if (btn) wrongTap(btn);
    }
  }

  /* ---------- lace the beads ---------- */

  function renderLace() {
    var body = el("activity-body");
    var p = S.puzzle;
    S.lace = { phase: "study", next: 0, used: {} };

    var study = document.createElement("div");
    study.className = "panel";
    study.id = "lace-study";
    study.insertAdjacentHTML("beforeend", '<div class="hint-line">Watch the beads…</div>');
    var row = document.createElement("div");
    row.className = "bead-row";
    p.sequence.forEach(function (piece) { row.insertAdjacentHTML("beforeend", beadWrap(piece)); });
    study.appendChild(row);
    var ring = document.createElement("div");
    ring.className = "study-ring";
    ring.id = "study-ring";
    ring.style.margin = "10px auto 0";
    study.appendChild(ring);
    body.appendChild(study);

    var total = p.studySeconds;
    var left = total;
    function tick() {
      ring.textContent = String(left);
      ring.style.setProperty("--p", String((left / total) * 100) + "%");
      if (left > 0) { left--; setTimeout(tick, 1000); }
      else startLacing();
    }
    tick();
  }

  function startLacing() {
    var study = el("lace-study");
    if (study) study.remove();
    S.lace.phase = "lace";
    var body = el("activity-body");
    var p = S.puzzle;

    var progress = document.createElement("div");
    progress.className = "panel";
    progress.id = "lace-progress";
    progress.insertAdjacentHTML("beforeend", '<div class="hint-line">Now lace them in order!</div>');
    var prow = document.createElement("div");
    prow.className = "bead-row";
    prow.id = "lace-thread";
    prow.appendChild(ghostNext("next bead goes here"));
    progress.appendChild(prow);
    body.appendChild(progress);

    var tray = document.createElement("div");
    tray.className = "panel";
    var trow = document.createElement("div");
    trow.className = "bead-row";
    var shuffled = p.sequence.slice();
    for (var i = shuffled.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = shuffled[i]; shuffled[i] = shuffled[j]; shuffled[j] = tmp;
    }
    shuffled.forEach(function (piece, idx) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "choice-btn";
      b.dataset.idx = String(idx);
      b.setAttribute("aria-label", "lace " + piece);
      b.innerHTML = beadSVG(pieceShape(piece), pieceColour(piece));
      b.addEventListener("click", function () { laceTap(piece, b); });
      trow.appendChild(b);
    });
    tray.appendChild(trow);
    body.appendChild(tray);
  }

  function laceTap(piece, btn) {
    var p = S.puzzle;
    if (piece === p.sequence[S.lace.next]) {
      var thread = el("lace-thread");
      var wrap = document.createElement("span");
      wrap.className = "bead-wrap";
      wrap.innerHTML = beadSVG(pieceShape(piece), pieceColour(piece));
      thread.appendChild(wrap);
      sparkleAt(wrap);
      btn.remove();
      S.lace.next++;
      var oldGhost = thread.querySelector(".ghost-next");
      if (oldGhost) oldGhost.remove();
      if (S.lace.next < p.sequence.length) thread.appendChild(ghostNext("next bead goes here"));
      Sound.correct();
      if (S.lace.next >= p.sequence.length) solvedClean();
    } else {
      wrongTap(btn);
    }
  }

  /* ---------- flow ---------- */

  var ACTIVITY_RENDER = {
    continue: function () { renderGapBoard(); renderChoices(); },
    decode: function () { renderGapBoard(); renderChoices(); },
    copy: renderCopy,
    sort: renderSort,
    lace: renderLace,
  };

  function renderPuzzle() {
    el("activity-body").innerHTML = "";
    S.clean = true;
    ACTIVITY_RENDER[S.activity]();
  }

  function openActivity(name) {
    S.activity = name;
    S.level[name] = loadLevel(name);
    el("menu").classList.add("hidden");
    el("activity").classList.remove("hidden");
    el("activity-title").textContent = TITLES[name];
    renderStars();
    renderLevels();
    nextPuzzle(true);
  }

  function showMenu() {
    S.activity = null;
    el("activity").classList.add("hidden");
    el("menu").classList.remove("hidden");
  }

  /* ---------- boot ---------- */

  document.querySelectorAll(".menu-card").forEach(function (card) {
    card.addEventListener("click", function () {
      Sound.ensure();
      openActivity(card.dataset.activity);
    });
  });

  el("home-btn").addEventListener("click", showMenu);

  var soundBtn = el("sound-toggle");
  function paintSound() {
    soundBtn.textContent = Sound.on ? "🔊" : "🔇";
    soundBtn.setAttribute("aria-pressed", String(Sound.on));
  }
  soundBtn.addEventListener("click", function () { Sound.toggle(); paintSound(); });
  paintSound();

  // menu card mini-beads
  document.querySelectorAll(".menu-beads").forEach(function (span) {
    span.dataset.beads.split(",").forEach(function (piece) {
      span.insertAdjacentHTML("beforeend", beadSVG(pieceShape(piece), pieceColour(piece)));
    });
  });

  // QA/debug handle: read-only view of what is on screen (no secrets, no setters).
  Object.defineProperty(window, "__PP", {
    get: function () {
      return {
        activity: S.activity,
        level: S.level[S.activity],
        puzzle: S.puzzle,
        stars: S.stars,
        streak: S.streak[S.activity] || 0,
      };
    },
  });

  // Deep links: #continue etc. open that activity on load (also how QA reaches
  // each screen directly).
  var hash = (location.hash || "").replace("#", "");
  if (TITLES[hash]) openActivity(hash);
  window.addEventListener("hashchange", function () {
    var h = (location.hash || "").replace("#", "");
    if (S.activity && TITLES[h] && h !== S.activity) openActivity(h);
  });

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./service-worker.js");
  }
})();
