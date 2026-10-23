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

  // Drawing lives in js/rule-icons.js so the Sort-by-Rule data check (Node) and the
  // app draw from one source.
  var beadSVG = RuleIcons.beadSVG;

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
  function pieceBead(p) { return beadSVG(pieceShape(p), pieceColour(p)); }

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
    // a bead landing on the peg: a short bright tick over a low knock — wood, not a bell
    clack: function () {
      this.tone(1500, 0, 0.035, "triangle", 0.07);
      this.tone(420, 0.005, 0.07, "sine", 0.09);
    },
    // a bead sliding up against its neighbour on the lace: smaller and lighter
    click: function () {
      this.tone(2300, 0, 0.025, "triangle", 0.05);
      this.tone(980, 0.004, 0.045, "sine", 0.05);
    },
    fanfare: function () {
      this.tone(523, 0, 0.2); this.tone(659, 0.11, 0.2); this.tone(784, 0.22, 0.34);
    },
    toggle: function () {
      this.on = !this.on;
      localStorage.setItem("pp.sound", this.on ? "on" : "off");
      return this.on;
    },
  };
  if (typeof AudioWake !== "undefined") AudioWake.attach(function () { return Sound.ctx; }, function () { Sound.ctx = null; });

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
    token: 0,       // bumped on every render; async work from an old puzzle stops
    fit: null,      // sizes the current board to the screen (copy, lace)
    game: null,
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

  function solvedClean(delay) {
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
    var token = S.token;
    setTimeout(function () { if (token === S.token) nextPuzzle(true); }, delay || 650);
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

  /* ---------- shared: fill-the-slots builder (Copy the Tower, Lace the Beads) ----------
   *
   * Owner, 2026-10-20, on Copy the Tower: "children might think what they put will be in
   * the dotted box and stay there." And on Lace the Beads: "will it be on the left first
   * or on the right first." Both screens used to show ONE dashed circle, which hid the
   * structure being built. Now both show every empty slot up front, the next one pulses,
   * a tapped piece visibly travels from the tray into that slot and stays, and a wrong
   * piece travels there, wobbles and comes back. One question (the pulsing slot), one tap.
   * Hints follow the house rule: at 2 misses on a slot the model is pointed at (teach the
   * rule), at 3 the right tray piece glows (reveal).
   */

  var REDUCED = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function fly(fromEl, toEl, piece, bounce) {
    var src = fromEl.querySelector("svg") || fromEl;
    var a = src.getBoundingClientRect();
    var b = toEl.getBoundingClientRect();
    var f = document.createElement("span");
    f.className = "flyer";
    f.innerHTML = pieceBead(piece);
    f.style.left = a.left + "px";
    f.style.top = a.top + "px";
    f.style.width = a.width + "px";
    f.style.height = a.height + "px";
    document.body.appendChild(f);
    var dx = b.left + b.width / 2 - (a.left + a.width / 2);
    var dy = b.top + b.height / 2 - (a.top + a.height / 2);
    var s = a.width ? b.width / a.width : 1;
    function at(x, y, sc) { return { transform: "translate(" + x + "px," + y + "px) scale(" + sc + ")" }; }
    var frames = bounce
      ? [at(0, 0, 1),
         Object.assign(at(dx, dy, s), { offset: 0.38 }),
         Object.assign(at(dx - 9, dy, s), { offset: 0.46 }),
         Object.assign(at(dx + 9, dy, s), { offset: 0.54 }),
         Object.assign(at(dx, dy, s), { offset: 0.62 }),
         at(0, 0, 1)]
      : [at(0, 0, 1), Object.assign(at(dx * 0.5, dy * 0.5 - 40, (1 + s) / 2), { offset: 0.5 }), at(dx, dy, s)];
    return new Promise(function (resolve) {
      if (!f.animate) { f.remove(); resolve(); return; }
      var anim = f.animate(frames, { duration: REDUCED ? 160 : (bounce ? 900 : 460), easing: "ease-in-out", fill: "forwards" });
      anim.onfinish = function () { f.remove(); resolve(); };
    });
  }

  /* Copy the Tower: the piece goes to the TOP of the "Yours" rod and drops down it.
   * Owner, 2026-10-20, on the first v9 build: "can we have the piece drop from above?"
   * Flying straight into the socket still read as a box the piece is put in; a real peg
   * tower is threaded from the top and the bead falls until it rests on the one below.
   * So: tray -> above the rod (0-38%), fall with gravity easing (38-82%), clack on
   * landing, small settle bounce. A wrong piece falls and lands the same way, wobbles,
   * then lifts back off the top of the rod and returns to the tray. ~680 ms right,
   * ~1.2 s wrong. Reduced motion: the piece fades in at the socket instead.
   */
  // Lace the Beads uses the same motion turned on its side. Owner, 2026-10-20: "can we
  // have bead slide to the left?" The bead flies to the NEEDLE on the right, threads on,
  // and slides LEFT along the lace until it rests against the knot or the bead before
  // it; a wrong bead slides in, wobbles, slides back off the needle and returns.
  // opts: { entry: element the piece threads on at, axis: "y" (rod, falls down) or
  // "x" (lace, slides left), sound: "clack" | "click" }
  function dropOnRod(fromEl, toEl, piece, wrong, topEl, opts) {
    opts = opts || { axis: "y", sound: "clack" };
    var src = fromEl.querySelector("svg") || fromEl;
    var a = src.getBoundingClientRect();
    var b = toEl.getBoundingClientRect();
    var top = (topEl || toEl).getBoundingClientRect();
    var f = document.createElement("span");
    f.className = "flyer";
    f.innerHTML = pieceBead(piece);
    f.style.left = a.left + "px";
    f.style.top = a.top + "px";
    f.style.width = a.width + "px";
    f.style.height = a.height + "px";
    document.body.appendChild(f);
    var s = a.width ? b.width / a.width : 1;
    var ax = a.left + a.width / 2, ay = a.top + a.height / 2;
    var sx = b.left + b.width / 2 - ax, sy = b.top + b.height / 2 - ay;
    var tx, ty;
    if (opts.axis === "x") {           // just past the needle tip, on the lace line
      tx = top.left + top.width * 0.6 + b.width / 2 - ax; ty = sy;
    } else {                           // just above the top of the rod
      tx = sx; ty = top.top - b.height * 0.9 - ay;
    }
    var ux = opts.axis === "x" ? 6 : 0, uy = opts.axis === "x" ? 0 : -7;   // settle rebound
    function at(x, y, sc, off, ease) {
      var k = { transform: "translate(" + x + "px," + y + "px) scale(" + sc + ")" };
      if (off !== undefined) k.offset = off;
      if (ease) k.easing = ease;
      return k;
    }
    var FALL = opts.axis === "x"
      ? "cubic-bezier(.35,0,.6,1)"            // a slide: gets going, then eases to a stop
      : "cubic-bezier(.55,0,1,.45)";          // accelerates, like something falling
    var frames, dur, landAt;
    if (REDUCED) {
      frames = [{ opacity: 0, transform: "translate(" + sx + "px," + sy + "px) scale(" + s + ")" },
                { opacity: 1, transform: "translate(" + sx + "px," + sy + "px) scale(" + s + ")" }];
      dur = wrong ? 500 : 200; landAt = 0.9;
      if (wrong) frames.push({ opacity: 0, transform: "translate(" + sx + "px," + sy + "px) scale(" + s + ")" });
    } else if (!wrong) {
      dur = 680; landAt = 0.82;
      frames = [at(0, 0, 1, 0, "ease-out"), at(tx, ty, s, 0.38, FALL), at(sx, sy, s, 0.82, "ease-out"),
                at(sx + ux, sy + uy, s, 0.9, "ease-in"), at(sx, sy, s, 1)];
    } else {
      dur = 1250; landAt = 0.46;
      frames = [at(0, 0, 1, 0, "ease-out"), at(tx, ty, s, 0.22, FALL), at(sx, sy, s, 0.46),
                opts.axis === "x" ? at(sx, sy - 8, s, 0.52) : at(sx - 8, sy, s, 0.52),
                opts.axis === "x" ? at(sx, sy + 8, s, 0.58) : at(sx + 8, sy, s, 0.58),
                at(sx, sy, s, 0.64, "ease-in"),
                at(tx, ty, s, 0.8, "ease-in-out"), at(0, 0, 1, 1)];
    }
    var landed = setTimeout(function () { Sound[opts.sound || "clack"](); }, dur * landAt);
    return new Promise(function (resolve) {
      if (!f.animate) { clearTimeout(landed); f.remove(); resolve(); return; }
      var anim = f.animate(frames, { duration: dur, fill: "forwards" });
      anim.onfinish = function () { f.remove(); resolve(); };
    });
  }

  function slotGame(o) {
    // o.slots: slot elements in fill order; o.answers: piece per slot;
    // o.tray: [{btn, piece}]; o.onTeach(i, misses): 2-miss hint; o.onClear(i);
    // o.onNext(i); o.onDone()
    var token = S.token;
    var g = { i: 0, misses: 0, busy: false };
    function clearHints() {
      o.tray.forEach(function (t) { t.btn.classList.remove("hint-glow"); });
      if (o.onClear) o.onClear(g.i);
    }
    function mark() {
      o.slots.forEach(function (s, k) { s.classList.toggle("next", k === g.i); });
      if (o.onNext) o.onNext(g.i);
    }
    function tap(piece, btn) {
      if (token !== S.token || g.i >= o.answers.length) return;
      Sound.ensure();
      if (g.busy) { btn.classList.remove("shake"); void btn.offsetWidth; btn.classList.add("shake"); return; }
      var slot = o.slots[g.i];
      g.busy = true;
      if (piece === o.answers[g.i]) {
        (o.move || fly)(btn, slot, piece, false).then(function () {
          if (token !== S.token) return;
          slot.classList.remove("next");
          slot.classList.add("filled");
          slot.setAttribute("aria-label", "placed " + piece);
          slot.innerHTML = pieceBead(piece);
          sparkleAt(slot);
          Sound.correct();
          clearHints();
          g.i++; g.misses = 0; g.busy = false;
          if (g.i >= o.answers.length) {
            o.slots.forEach(function (s) { s.classList.remove("next"); });
            o.onDone();
          } else {
            mark();
          }
        });
      } else {
        Sound.wrong();
        S.clean = false;
        g.misses++;
        if (!o.move) slot.classList.add("nope");
        else setTimeout(function () { if (token === S.token) slot.classList.add("nope"); }, REDUCED ? 100 : 560);
        (o.move || fly)(btn, slot, piece, true).then(function () {
          if (token !== S.token) return;
          slot.classList.remove("nope");
          btn.classList.remove("shake"); void btn.offsetWidth; btn.classList.add("shake");
          g.busy = false;
          if (g.misses >= 2 && o.onTeach) o.onTeach(g.i, g.misses);
          if (g.misses >= 3) {
            o.tray.forEach(function (t) { t.btn.classList.toggle("hint-glow", t.piece === o.answers[g.i]); });
          }
        });
      }
    }
    o.tray.forEach(function (t) {
      t.btn.addEventListener("click", function () { tap(t.piece, t.btn); });
    });
    mark();
    return g;
  }

  // Tray: one button per distinct piece the answer needs (never used up — the child
  // chooses a KIND of piece, it is not a stock to manage), plus optional extras, shuffled
  // so the first button is not always the first answer.
  function trayPanel(answers, extras, cls) {
    var kinds = [];
    answers.concat(extras || []).forEach(function (p) { if (kinds.indexOf(p) === -1) kinds.push(p); });
    for (var i = kinds.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = kinds[i]; kinds[i] = kinds[j]; kinds[j] = tmp;
    }
    var panel = document.createElement("div");
    panel.className = "panel tray " + (cls || "");
    var row = document.createElement("div");
    row.className = "bead-row tray-row";
    var tray = kinds.map(function (piece) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "choice-btn";
      b.dataset.piece = piece;
      b.setAttribute("aria-label", "tray " + piece);
      b.innerHTML = pieceBead(piece);
      row.appendChild(b);
      return { btn: b, piece: piece };
    });
    panel.appendChild(row);
    return { panel: panel, tray: tray };
  }

  /* ---------- copy the tower ----------
   * Bottom-up, like a real peg tower: target[0] is the bottom bead of "Make this", the
   * bottom socket of "Yours" is filled first, and the highlight climbs. Each row of
   * "Yours" sits level with the bead it must match, with an arrow between them on the
   * row being asked. Both towers stand on the same wooden base.
   */

  function renderCopy() {
    var body = el("activity-body");
    var p = S.puzzle;
    var n = p.target.length;
    document.body.classList.add("fit-mode");

    var layout = document.createElement("div");
    layout.className = "copy-layout";

    var board = document.createElement("div");
    board.className = "panel copy-board";
    var grid = document.createElement("div");
    grid.className = "copy-grid";
    grid.insertAdjacentHTML("beforeend",
      '<div class="copy-head"><span class="tower-label">Make this</span><span></span><span class="tower-label">Yours</span></div>');

    var rows = [], sockets = [];
    for (var i = n - 1; i >= 0; i--) {
      var row = document.createElement("div");
      row.className = "copy-row" + (i === n - 1 ? " top" : "");
      row.dataset.i = String(i);
      row.innerHTML =
        '<span class="peg peg-target">' + pieceBead(p.target[i]) + "</span>" +
        '<span class="row-link" aria-hidden="true">' +
        '<svg viewBox="0 0 60 30"><path d="M4 15 H46 M36 5 L50 15 L36 25" fill="none" stroke="#e8b64c" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
        '<span class="match-mark">=</span></span>' +
        '<span class="peg peg-socket" role="img" aria-label="empty peg ' + (i + 1) + '"></span>';
      rows[i] = row;
      sockets[i] = row.querySelector(".peg-socket");
      grid.appendChild(row);
    }
    grid.insertAdjacentHTML("beforeend",
      '<div class="copy-base"><span class="peg-base"></span><span></span><span class="peg-base"></span></div>');
    board.appendChild(grid);
    layout.appendChild(board);

    // the old tray idea stays: the pieces the tower needs plus one that it does not
    var extraPool = [];
    PatternCore.SHAPES.forEach(function (sh) {
      PatternCore.COLOURS.forEach(function (co) {
        var c = sh + ":" + co;
        if (p.target.indexOf(c) === -1) extraPool.push(c);
      });
    });
    var t = trayPanel(p.target, [extraPool[Math.floor(Math.random() * extraPool.length)]], "copy-tray");
    layout.appendChild(t.panel);
    body.appendChild(layout);

    S.fit = function () {
      var cs = getComputedStyle(board);
      var h = board.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      var w = board.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      var head = grid.querySelector(".copy-head").offsetHeight;
      var base = grid.querySelector(".copy-base").offsetHeight;
      var rowH = Math.floor((h - head - base) / n);
      var bead = Math.max(34, Math.min(84, Math.floor(rowH * 0.84), Math.floor((w - 90) / 2.6)));
      grid.style.setProperty("--row", rowH + "px");
      grid.style.setProperty("--bead", bead + "px");
    };
    S.fit();

    S.game = slotGame({
      slots: sockets,
      move: function (btn, slot, piece, wrong) { return dropOnRod(btn, slot, piece, wrong, sockets[n - 1]); },
      answers: p.target,
      tray: t.tray,
      onNext: function (k) {
        rows.forEach(function (r, j) { r.classList.toggle("ask", j === k); });
      },
      onTeach: function (k) { rows[k].classList.add("teach"); },
      onClear: function (k) { if (rows[k]) rows[k].classList.remove("teach"); },
      onDone: function () {
        rows.forEach(function (r) { r.classList.remove("ask", "teach"); });
        board.classList.add("done");
        solvedClean(1700);
      },
    });
  }

  /* ---------- sort by rule ----------
   * Owner, 2026-10-20: "this is also confusing. should i select circle or blue." A rule
   * is now drawn with single-property icons (js/rule-icons.js): a paint splash for a
   * colour, a grey outline for a shape. Each tap is answered at once: a right piece gets
   * a gold "you picked this" ring and a tick; a wrong one shows a cross, shakes and is
   * not picked. Green no longer means "selected" anywhere.
   */

  function renderSort() {
    if (S.puzzle.rule.bins) renderSortBins();
    else renderSortPick();
  }

  function badge(btn, text, cls) {
    var b = btn.querySelector(".pick-badge");
    if (!b) { b = document.createElement("span"); b.className = "pick-badge"; btn.appendChild(b); }
    b.textContent = text;
    b.className = "pick-badge " + cls;
    return b;
  }

  function renderSortPick() {
    var body = el("activity-body");
    var p = S.puzzle;
    var token = S.token;
    var banner = document.createElement("div");
    banner.className = "panel rule-banner";
    banner.innerHTML = RuleIcons.bannerHTML(p.rule);
    body.appendChild(banner);

    var memberSet = {};
    p.members.forEach(function (m) { memberSet[m] = true; });
    var st = { picked: {}, left: p.members.length, misses: 0 };

    var panel = document.createElement("div");
    panel.className = "panel";
    var row = document.createElement("div");
    row.className = "bead-row sort-row";
    var btns = {};
    p.pieces.forEach(function (piece) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "choice-btn sort-piece";
      b.dataset.piece = piece;
      b.setAttribute("aria-label", "sort " + piece);
      b.innerHTML = pieceBead(piece);
      b.addEventListener("click", function () {
        if (token !== S.token || st.left <= 0) return;
        Sound.ensure();
        if (st.picked[piece]) {            // already picked: say so, gently
          Sound.tone(523, 0, 0.12, "sine", 0.06);
          b.classList.remove("wiggle"); void b.offsetWidth; b.classList.add("wiggle");
          return;
        }
        if (memberSet[piece]) {
          st.picked[piece] = true;
          st.left--;
          st.misses = 0;
          b.classList.add("picked");
          b.classList.remove("hint-glow");
          b.setAttribute("aria-pressed", "true");
          badge(b, "✓", "yes");
          banner.classList.remove("teach");
          sparkleAt(b);
          if (st.left <= 0) solvedClean(900);
          else Sound.correct();
        } else {
          Sound.wrong();
          S.clean = false;
          st.misses++;
          var bd = badge(b, "✗", "no");
          b.classList.remove("shake"); void b.offsetWidth; b.classList.add("shake");
          setTimeout(function () { if (bd.parentNode) bd.remove(); }, 900);
          if (st.misses >= 2) banner.classList.add("teach");
          if (st.misses >= 3) {
            var next = p.members.filter(function (m) { return !st.picked[m]; })[0];
            if (next && btns[next]) btns[next].classList.add("hint-glow");
          }
        }
      });
      btns[piece] = b;
      row.appendChild(b);
    });
    panel.appendChild(row);
    body.appendChild(panel);
  }

  // R4, two boxes: one piece is asked at a time (it pulses); the child taps the box it
  // belongs in. One question, one tap — no cycling a piece through colours.
  function renderSortBins() {
    var body = el("activity-body");
    var p = S.puzzle;
    var token = S.token;
    var rp = RuleIcons.ruleParts(p.rule);

    var binsPanel = document.createElement("div");
    binsPanel.className = "panel sort-bins";
    binsPanel.insertAdjacentHTML("beforeend", '<div class="hint-line">Put each one in its box</div>');
    var binRow = document.createElement("div");
    binRow.className = "bin-row";
    var bins = {};
    rp.bins.forEach(function (bin) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "sort-bin";
      b.dataset.key = bin.key;
      b.setAttribute("aria-label", "box " + bin.key);
      b.innerHTML = '<span class="bin-icon">' + RuleIcons.binIconHTML(bin.parts) + '</span><span class="bin-well"></span>';
      bins[bin.key] = b;
      binRow.appendChild(b);
    });
    binsPanel.appendChild(binRow);
    body.appendChild(binsPanel);

    var panel = document.createElement("div");
    panel.className = "panel";
    var row = document.createElement("div");
    row.className = "bead-row sort-row";
    var pieceBtns = p.pieces.map(function (piece) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "choice-btn sort-piece";
      b.setAttribute("aria-label", "sort " + piece);
      b.innerHTML = pieceBead(piece);
      row.appendChild(b);
      return b;
    });
    panel.appendChild(row);
    body.appendChild(panel);

    var st = { i: 0, misses: 0, busy: false };
    function mark() {
      pieceBtns.forEach(function (b, k) { b.classList.toggle("next", k === st.i); });
      Object.keys(bins).forEach(function (k) { bins[k].classList.remove("teach", "hint-glow"); });
    }
    pieceBtns.forEach(function (b, k) {
      b.addEventListener("click", function () {
        if (token !== S.token || st.i >= pieceBtns.length) return;
        Sound.ensure();
        var target = k === st.i ? binRow : pieceBtns[st.i];   // never silent: point at what to do
        Sound.tone(523, 0, 0.12, "sine", 0.06);
        target.classList.remove("wiggle"); void target.offsetWidth; target.classList.add("wiggle");
      });
    });
    Object.keys(bins).forEach(function (key) {
      var bin = bins[key];
      bin.addEventListener("click", function () {
        if (token !== S.token || st.i >= pieceBtns.length || st.busy) return;
        Sound.ensure();
        var piece = p.pieces[st.i];
        var btn = pieceBtns[st.i];
        if (p.assignment[piece] === key) {
          st.busy = true;
          var well = bin.querySelector(".bin-well");
          var spot = document.createElement("span");
          spot.className = "bin-bead";
          well.appendChild(spot);
          fly(btn, spot, piece, false).then(function () {
            if (token !== S.token) return;
            spot.innerHTML = pieceBead(piece);
            btn.classList.remove("next");
            btn.classList.add("sorted");
            badge(btn, "✓", "yes");
            st.i++; st.misses = 0; st.busy = false;
            if (st.i >= pieceBtns.length) solvedClean(900);
            else { Sound.correct(); mark(); }
          });
        } else {
          Sound.wrong();
          S.clean = false;
          st.misses++;
          bin.classList.remove("shake"); void bin.offsetWidth; bin.classList.add("shake");
          var x = document.createElement("span");
          x.className = "pick-badge no";
          x.textContent = "✗";
          bin.appendChild(x);
          setTimeout(function () { x.remove(); }, 900);
          if (st.misses >= 2) Object.keys(bins).forEach(function (k) { bins[k].classList.add("teach"); });
          if (st.misses >= 3) bins[p.assignment[piece]].classList.add("hint-glow");
        }
      });
    });
    mark();
  }

  /* ---------- lace the beads ----------
   * Owner, 2026-10-20: "the confusing part is what i select , will it be on the left
   * first or on the right first." The lace is now drawn: a knot on the LEFT (where the
   * first bead rests), the needle tip on the RIGHT, and one socket per bead. The study
   * phase shows the pattern on this very string, then the beads come off and the
   * leftmost socket pulses. At 2 misses the pattern flashes back on the string.
   */

  function renderLace() {
    var body = el("activity-body");
    var p = S.puzzle;
    var token = S.token;
    var n = p.sequence.length;
    document.body.classList.add("fit-mode");
    S.lace = { phase: "study" };

    var board = document.createElement("div");
    board.className = "panel lace-board";
    var line = document.createElement("div");
    line.className = "hint-line";
    line.textContent = "Watch the beads…";
    board.appendChild(line);

    var lace = document.createElement("div");
    lace.className = "lace";
    lace.insertAdjacentHTML("beforeend",
      '<span class="lace-knot" aria-hidden="true"></span>');
    var sockets = p.sequence.map(function (piece, i) {
      var s = document.createElement("span");
      s.className = "lace-socket filled";
      s.setAttribute("role", "img");
      s.setAttribute("aria-label", "bead " + (i + 1) + " " + piece);
      s.innerHTML = pieceBead(piece);
      lace.appendChild(s);
      return s;
    });
    lace.insertAdjacentHTML("beforeend",
      '<span class="lace-tip" aria-hidden="true"><svg viewBox="0 0 60 24"><path d="M0 12 H34 L58 12" stroke="#b9b2ad" stroke-width="7" stroke-linecap="round"/><ellipse cx="18" cy="12" rx="6" ry="3" fill="#fff"/></svg></span>');
    board.appendChild(lace);

    var ring = document.createElement("div");
    ring.className = "study-ring";
    board.appendChild(ring);
    body.appendChild(board);

    S.fit = function () {
      var cs = getComputedStyle(board);
      var w = board.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      var bead = Math.max(34, Math.min(84, Math.floor((w - 70) / n) - 10));
      lace.style.setProperty("--bead", bead + "px");
    };
    S.fit();

    var total = p.studySeconds;
    var left = total;
    function tick() {
      if (token !== S.token) return;
      ring.textContent = String(left);
      ring.style.setProperty("--p", String((left / total) * 100) + "%");
      if (left > 0) { left--; setTimeout(tick, 1000); }
      else startLacing(board, line, ring, sockets);
    }
    tick();
  }

  function startLacing(board, line, ring, sockets) {
    var p = S.puzzle;
    var token = S.token;
    S.lace.phase = "lace";
    ring.remove();
    line.textContent = "Now lace them in order!";
    sockets.forEach(function (s, i) {
      s.classList.remove("filled");
      s.innerHTML = "";
      s.setAttribute("aria-label", "empty bead place " + (i + 1));
    });
    var t = trayPanel(p.sequence, [], "lace-tray");
    el("activity-body").appendChild(t.panel);
    S.fit();

    var tip = el("activity-body").querySelector(".lace-tip");
    S.game = slotGame({
      slots: sockets,
      move: function (btn, slot, piece, wrong) {
        return dropOnRod(btn, slot, piece, wrong, tip, { axis: "x", sound: "click" });
      },
      answers: p.sequence,
      tray: t.tray,
      onTeach: function () {
        // flash the remembered pattern back onto the empty part of the string
        sockets.forEach(function (s, i) {
          if (s.classList.contains("filled")) return;
          s.innerHTML = '<span class="peek">' + pieceBead(p.sequence[i]) + "</span>";
        });
        setTimeout(function () {
          if (token !== S.token) return;
          sockets.forEach(function (s) { var pk = s.querySelector(".peek"); if (pk) pk.remove(); });
        }, 1600);
      },
      onDone: function () {
        board.classList.add("done");
        solvedClean(1400);
      },
    });
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
    S.token++;          // stale timers and flights from the last puzzle check this
    S.fit = null;
    S.game = null;
    document.body.classList.remove("fit-mode");
    document.querySelectorAll(".flyer").forEach(function (f) { f.remove(); });
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
    S.token++;
    S.fit = null;
    document.body.classList.remove("fit-mode");
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
  window.addEventListener("resize", function () { if (S.fit) S.fit(); });

  var soundBtn = el("sound-toggle");
  /* Owner rule, 2026-10-20: no emoji in UI. One drawn speaker — the precedent icon from
     writing-book/vocab.js and math-app/magic-spelling.html — in currentColor ink with
     rounded strokes: waves when on, a cross-slash over the same speaker when muted.
     Sized by the svg's own width/height so it stays 24px, the size the emoji rendered
     at. index.html ships the on icon; this swaps the pair, nothing else changes. */
  var SPEAKER = '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">' +
    '<path d="M11 5 6 9H3v6h3l5 4V5z" fill="currentColor"/>';
  var SPEAKER_ON = SPEAKER +
    '<path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 6a9 9 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var SPEAKER_OFF = SPEAKER +
    '<path d="M16 9 22 15M22 9 16 15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function paintSound() {
    soundBtn.innerHTML = Sound.on ? SPEAKER_ON : SPEAKER_OFF;
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
