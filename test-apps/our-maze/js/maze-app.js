/*
 * Our Maze — the page.
 *
 * Everything about where a step may land lives in maze-movement.js; everything about
 * how a maze is made lives in maze-core.js. This file only turns a finger or a button
 * into one intent — one step, one direction — and draws the answer.
 *
 * The two inputs (owner, 2026-09-16, verbatim): "Primary direct manipulation via
 * forgiving continuous drag/slide; four large arrow buttons provide precise alternative
 * control. No tap-to-move. No exact drag-and-drop. Both inputs share the same
 * grid-movement engine."
 *
 *   drag    a slide anywhere on the board. Every time the finger is a little more than
 *           half a cell past the character's cell, that direction becomes one intent. A tap (no travel) does nothing — there is no tap-to-move. The
 *           character leans a little toward the finger between steps, so a slide feels
 *           continuous rather than jumpy. Forgiving: when the stronger direction is a
 *           wall but the weaker one is open (a wobbly finger at a corner), the open one
 *           is taken.
 *   arrows  four large buttons, one intent per press, repeating while held.
 *
 * A refused step is never silent: the character nudges toward the wall, the wall
 * glows, and a soft low bump plays.
 *
 * v1 DEFAULTS the owner may overturn on the Test Hub (maze-app/work_progress_...md):
 * Toy Room theme, one skinnable generator, the five-rung size ladder below, no timer,
 * no score, no failure.
 */
(function () {
  "use strict";
  var MC = window.MazeCore, MM = window.MazeMovement, MP = window.MazePlan, SND = window.MazeSound;

  /* ---------- data ------------------------------------------------------------------ */

  var CAST = [
    { id: "teddy", name: "Teddy" }, { id: "bunny", name: "Bunny" },
    { id: "dinosaur", name: "Dinosaur" }, { id: "robot", name: "Robot" },
    { id: "doll", name: "Doll" }, { id: "penguin", name: "Penguin" },
    { id: "lion", name: "Lion" }, { id: "hippo", name: "Hippo" },
    { id: "duck", name: "Duck" }, { id: "elephant", name: "Elephant" },
    { id: "owl", name: "Owl" }, { id: "rocking-horse", name: "Rocking horse" },
  ];

  // The size ladder. Start is always the top-left cell; the goal is placed far from it
  // (the band's lower bound is most of the way across) so every maze is a real walk.
  var LADDER = [
    { n: 3, minSteps: 4, maxSteps: 8, braid: 0 },
    { n: 4, minSteps: 7, maxSteps: 15, braid: 0 },
    { n: 5, minSteps: 10, maxSteps: 24, braid: 0.1 },
    { n: 6, minSteps: 14, maxSteps: 35, braid: 0.12 },
    { n: 8, minSteps: 22, maxSteps: 63, braid: 0.15 },
  ];

  var MISSING = window.MAZE_SPRITES_MISSING || [];
  var SPRITE = function (id, kind) {
    return MISSING.indexOf(id) >= 0 && PLACEHOLDER[kind || "hero"] ? PLACEHOLDER[kind || "hero"] : "./assets/sprites/" + id + ".webp";
  };

  // PLACEHOLDERS, for a build staged before every sprite exists (the art arrives in
  // batches). assets/sprites/sprites.js, written by the sprite build, names what is
  // missing, so nothing absent is ever requested. A friend whose picture is missing is
  // simply not offered: a child should never see a broken tile. guardImages below is
  // the second line, for a sprite that fails to load anyway. A missing flag or sparkles falls back to a small drawn
  // shape so the maze still has a goal and a celebration. With the full art set built,
  // none of this ever fires.
  var svg = function (body) { return "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' + body + "</svg>"); };
  var PLACEHOLDER = {
    flag: svg('<rect x="28" y="12" width="7" height="76" rx="3.5" fill="#8a6446"/><ellipse cx="31" cy="88" rx="16" ry="6" fill="#f2c14e"/>' +
      '<path d="M35 14h44l-9 15 9 15H35z" fill="#e8665a" stroke="#fff" stroke-width="4" stroke-linejoin="round"/>'),
    sparkles: svg('<g fill="#f2c14e" stroke="#fff" stroke-width="3" stroke-linejoin="round">' +
      '<path d="M50 8l10 26 28 2-22 17 8 27-24-16-24 16 8-27-22-17 28-2z"/></g>' +
      '<circle cx="16" cy="18" r="6" fill="#6aa8e8"/><circle cx="86" cy="80" r="6" fill="#a98be0"/><circle cx="84" cy="16" r="5" fill="#e8665a"/>'),
    hero: svg('<circle cx="50" cy="54" r="34" fill="#f29e5c" stroke="#fff" stroke-width="6"/><circle cx="39" cy="48" r="5" fill="#3b2f2a"/>' +
      '<circle cx="61" cy="48" r="5" fill="#3b2f2a"/><path d="M38 64q12 10 24 0" fill="none" stroke="#3b2f2a" stroke-width="5" stroke-linecap="round"/>'),
  };
  // Wire every <img data-ph="..."> just inserted. Handlers are attached in the same turn
  // as the innerHTML write, before any load can fail; the complete/naturalWidth test
  // catches one that failed from cache anyway.
  function guardImages(root) {
    Array.prototype.forEach.call(root.querySelectorAll("img[data-ph]"), function (img) {
      var kind = img.getAttribute("data-ph");
      var fail = function () {
        img.onerror = null;
        if (kind === "friend") { var b = img.closest(".friend"); if (b && b.parentNode) b.parentNode.removeChild(b); return; }
        img.setAttribute("data-placeholder", kind);
        img.src = PLACEHOLDER[kind];
      };
      img.onerror = fail;
      if (img.complete && img.naturalWidth === 0 && img.getAttribute("src")) fail();
    });
  }
  var HUB = "https://veeranuchlee.github.io/children-apps/";
  var DIR_VEC = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] };

  /* ---------- per-viewer memory (a convenience; the game works without it) ------------ */

  function load(key, fallback) {
    try { var v = window.localStorage.getItem("our-maze-" + key); return v === null ? fallback : JSON.parse(v); }
    catch (e) { return fallback; }
  }
  function save(key, value) {
    try { window.localStorage.setItem("our-maze-" + key, JSON.stringify(value)); } catch (e) { /* ignore */ }
  }

  var app = document.getElementById("app");
  var S = {
    hero: load("hero", null),
    mode: load("mode", "walk") === "plan" ? "plan" : "walk",
    rung: Math.max(0, Math.min(LADDER.length - 1, load("rung", 0) | 0)),
    doneWalk: load("done-walk", load("done", [])),
    donePlan: load("done-plan", []),
    round: null, state: null, cell: 0, locked: false, seed: 0,
    plan: [], planStatuses: null, chunkStart: null, wallAttempts: 0, running: false,
  };
  if (!Array.isArray(S.doneWalk)) S.doneWalk = [];
  if (!Array.isArray(S.donePlan)) S.donePlan = [];
  if (S.hero && (!CAST.some(function (c) { return c.id === S.hero; }) || MISSING.indexOf(S.hero) >= 0)) S.hero = null;

  function speakerButton() {
    if (!SND || !SND.available()) return "";
    var m = SND.isMuted();
    return '<button class="speaker" id="speaker" aria-pressed="' + (!m) + '" aria-label="' +
      (m ? "Sound off. Turn sound on" : "Sound on. Turn sound off") + '">' +
      (m ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9l5 6M21 9l-5 6" fill="none" stroke-width="2.2" stroke-linecap="round"/></svg>'
         : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 8.5c1.6 1.8 1.6 5.2 0 7M18.6 6c3 3.3 3 8.7 0 12" fill="none" stroke-width="2.2" stroke-linecap="round"/></svg>') +
      "</button>";
  }
  function wireSpeaker(onChange) {
    var b = document.getElementById("speaker");
    if (!b) return;
    b.onclick = function () { SND.setMuted(!SND.isMuted()); SND.unlock(); if (!SND.isMuted()) SND.pick(); onChange(); };
  }

  /* ---------- screen 1: pick a friend ------------------------------------------------ */

  function picker() {
    S.locked = true;
    detachInput();
    app.className = "screen-pick";
    app.innerHTML =
      '<header class="topline"><a class="hub" href="' + HUB + '" aria-label="Back to Children Games">&larr; All games</a>' +
      speakerButton() + "</header>" +
      '<section class="pick">' +
      '<h1 class="title"><img class="title-flag" data-ph="flag" src="' + SPRITE("flag", "flag") + '" alt="" aria-hidden="true"/>Our Maze</h1>' +
      '<p class="ask">Who will find the flag?</p>' +
      '<div class="cast" role="list">' +
      CAST.filter(function (c) { return MISSING.indexOf(c.id) < 0; }).map(function (c) {
        return '<button class="friend' + (c.id === S.hero ? " last" : "") + '" role="listitem" data-id="' + c.id +
          '" aria-label="' + c.name + '"><img data-ph="friend" src="' + SPRITE(c.id) + '" alt=""/></button>';
      }).join("") +
      "</div></section>";
    guardImages(app);
    Array.prototype.forEach.call(app.querySelectorAll(".friend"), function (b) {
      b.onclick = function () {
        if (SND) { SND.unlock(); SND.pick(); }
        S.hero = b.getAttribute("data-id");
        save("hero", S.hero);
        play(S.rung);
      };
    });
    wireSpeaker(picker);
  }

  /* ---------- screen 2: the maze ----------------------------------------------------- */

  var R = null; // references into the current play screen

  function play(rung) {
    S.rung = rung;
    save("rung", rung);
    var cfg = LADDER[rung];
    S.seed = (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0;
    if (window.__MAZE_SEED__ !== undefined) S.seed = window.__MAZE_SEED__ >>> 0; // harness hook
    var round = MC.makeRound({ cols: cfg.n, rows: cfg.n, seed: S.seed, minSteps: cfg.minSteps, maxSteps: cfg.maxSteps, braid: cfg.braid });
    if (!round.ok) round = MC.makeRound({ cols: cfg.n, rows: cfg.n, seed: S.seed + 1, minSteps: 1, maxSteps: cfg.n * cfg.n, braid: cfg.braid });
    S.round = round;
    S.state = MM.initial(round);
    S.locked = false;
    S.plan = [];
    S.planStatuses = null;
    S.chunkStart = S.state;
    S.wallAttempts = 0;
    S.running = false;

    renderPlayScreen();
  }

  function renderPlayScreen() {
    detachInput();

    var done = S.mode === "plan" ? S.donePlan : S.doneWalk;

    app.className = "screen-play";
    app.innerHTML =
      '<header class="topline">' +
      '<button class="hub" id="back" aria-label="Pick a different friend">&larr; Friends</button>' +
      '<nav class="ladder" aria-label="Maze size">' +
      LADDER.map(function (l, i) {
        var isDone = done.indexOf(i) >= 0;
        return '<button class="rung' + (i === S.rung ? " now" : "") + (isDone ? " done" : "") + '" data-rung="' + i +
          '" aria-label="' + l.n + " by " + l.n + " maze" + (isDone ? ", finished in " + S.mode + " mode" : "") + '"' + (i === S.rung ? ' aria-current="true"' : "") + ">" +
          '<span class="dots" aria-hidden="true" style="--n:' + l.n + '">' + new Array(l.n * l.n + 1).join("<i></i>") + "</span>" + (isDone ? '<span class="star" aria-hidden="true">★</span>' : "") + "</button>";
      }).join("") +
      "</nav>" + speakerButton() + "</header>" +
      '<section class="stage ' + (S.mode === "plan" ? "stage-plan" : "stage-walk") + '">' +
      '<div class="board-wrap"><div class="board" id="board">' +
      '<canvas id="walls"></canvas>' +
      '<div class="plan-trail" id="trail" aria-hidden="true"></div>' +
      '<img class="marker goal" id="goal" data-ph="flag" src="' + SPRITE("flag", "flag") + '" alt="The flag"/>' +
      '<div class="bump" id="bump"></div>' +
      '<img class="hero" id="hero" data-ph="hero" src="' + SPRITE(S.hero) + '" alt=""/>' +
      '<img class="sparkles" id="sparkles" data-ph="sparkles" src="' + SPRITE("sparkles", "sparkles") + '" alt=""/>' +
      "</div></div>" +
      '<div class="play-controls">' + modeToggle() +
      (S.mode === "plan" ? planPanel() : '') +
      '<div class="pad" role="group" aria-label="' + (S.mode === "plan" ? "Add a move" : "Move") + '">' +
      padButton("up", "Up") + padButton("left", "Left") + '<span class="pad-hub" aria-hidden="true"></span>' +
      padButton("right", "Right") + padButton("down", "Down") +
      "</div></div>" +
      "</section>" +
      '<div class="finish" id="finish" hidden></div>';
    guardImages(app);

    R = {
      board: document.getElementById("board"),
      canvas: document.getElementById("walls"),
      hero: document.getElementById("hero"),
      goal: document.getElementById("goal"),
      bump: document.getElementById("bump"),
      sparkles: document.getElementById("sparkles"),
      finish: document.getElementById("finish"),
      strip: document.getElementById("move-strip"),
      count: document.getElementById("plan-count"),
      undo: document.getElementById("undo"), clear: document.getElementById("clear-plan"), go: document.getElementById("go"),
      trail: document.getElementById("trail"),
      px: 0, cellPx: 0,
    };
    var heroName = CAST.filter(function (c) { return c.id === S.hero; })[0];
    R.hero.alt = heroName ? heroName.name : "";
    document.getElementById("back").onclick = picker;
    Array.prototype.forEach.call(app.querySelectorAll(".rung"), function (b) {
      b.onclick = function () { if (SND) SND.pick(); play(+b.getAttribute("data-rung")); };
    });
    Array.prototype.forEach.call(app.querySelectorAll(".mode-toggle button"), function (b) {
      b.onclick = function () { switchMode(b.getAttribute("data-mode")); };
    });
    var refreshSpeaker = function () {
      var b = document.getElementById("speaker");
      if (b) b.outerHTML = speakerButton();
      wireSpeaker(refreshSpeaker);
    };
    wireSpeaker(refreshSpeaker);
    wirePad();
    if (S.mode === "plan") wirePlan(); else attachInput();
    layout();
  }

  function modeToggle() {
    return '<div class="mode-toggle" role="group" aria-label="Choose how to move">' +
      '<button data-mode="walk" class="' + (S.mode === "walk" ? "selected" : "") + '" aria-pressed="' + (S.mode === "walk") + '"><span aria-hidden="true">▶</span> Move Now</button>' +
      '<button data-mode="plan" class="' + (S.mode === "plan" ? "selected" : "") + '" aria-pressed="' + (S.mode === "plan") + '"><span aria-hidden="true">☰</span> Plan Moves</button>' +
      '</div>';
  }

  function switchMode(mode) {
    if (S.running || mode === S.mode || (mode !== "walk" && mode !== "plan")) return;
    if (SND) { SND.unlock(); SND.pick(); }
    if (mode === "walk") S.plan = [];
    S.mode = mode;
    S.planStatuses = null;
    S.chunkStart = S.state;
    S.wallAttempts = 0;
    save("mode", mode);
    renderPlayScreen();
  }

  function planPanel() {
    var hero = CAST.filter(function (c) { return c.id === S.hero; })[0];
    var friendName = hero ? hero.name.toLowerCase() : "friend";
    return '<aside class="plan-panel">' +
      '<div class="plan-heading"><span><strong>Plan the moves</strong><small>Add arrows below, then press GO to move the ' + friendName + '!</small></span>' +
      '<span class="plan-count" id="plan-count" aria-live="polite">0 / ' + chipCap() + '</span></div>' +
      '<div class="sequence"><div class="move-strip" id="move-strip" aria-label="Planned moves"></div></div>' +
      '<div class="plan-actions"><button id="undo" class="plan-action undo" disabled aria-label="Undo last move">↶<small>Undo</small></button>' +
      '<button id="clear-plan" class="plan-action clear" disabled aria-label="Clear moves">✕<small>Clear</small></button>' +
      '<button id="go" class="plan-action go" disabled><span aria-hidden="true">▶</span> GO</button></div>' +
      '</aside>';
  }

  function padButton(dir, label) {
    var rot = { up: 0, right: 90, down: 180, left: 270 }[dir];
    return '<button class="arrow arrow-' + dir + '" data-dir="' + dir + '" aria-label="' + label + '">' +
      '<svg viewBox="0 0 48 48" aria-hidden="true" style="transform:rotate(' + rot + 'deg)"><path d="M24 9 L40 29 H30 V39 H18 V29 H8 Z"/></svg></button>';
  }

  /* ---------- geometry and drawing --------------------------------------------------- */

  function layout() {
    if (!R) return;
    var wrap = R.board.parentNode;
    var w = wrap.clientWidth, h = wrap.clientHeight;
    // clientWidth/Height include padding. The portrait plan row reserves a little space
    // above the board so its shadow does not cover the ladder, so size from the content box.
    if (window.getComputedStyle) {
      var cs = window.getComputedStyle(wrap);
      w -= parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
      h -= parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
    }
    // A DOM without layout (the node harness) measures 0; give it a stable square.
    var px = Math.floor(Math.min(w || 600, h || 600));
    R.px = px;
    R.board.style.width = px + "px";
    R.board.style.height = px + "px";
    var n = S.round.cols;
    R.cellPx = px / n;
    var dpr = window.devicePixelRatio || 1;
    R.canvas.width = Math.round(px * dpr);
    R.canvas.height = Math.round(px * dpr);
    R.canvas.style.width = px + "px";
    R.canvas.style.height = px + "px";
    var sz = R.cellPx * 0.86;
    [R.hero, R.goal].forEach(function (img) { img.style.width = sz + "px"; img.style.height = sz + "px"; });
    R.sparkles.style.width = R.cellPx * 1.8 + "px";
    R.sparkles.style.height = R.cellPx * 1.8 + "px";
    draw(dpr);
    place(R.goal, S.round.goal, 0, 0);
    place(R.hero, S.state.cell, 0, 0, true);
  }

  function cellXY(i) {
    var n = S.round.cols;
    return [(i % n) * R.cellPx, Math.floor(i / n) * R.cellPx];
  }

  function place(img, cell, ox, oy, instant) {
    var xy = cellXY(cell);
    var inset = (R.cellPx - parseFloat(img.style.width || 0)) / 2;
    if (instant) img.style.transition = "none";
    // left/top, not transform: the nudge, cheer and held effects use the independent
    // translate/scale/rotate properties, and those compose BEFORE transform — a scale
    // there would scale the position too and walk the character off its cell.
    img.style.left = xy[0] + inset + (ox || 0) + "px";
    img.style.top = xy[1] + inset + (oy || 0) + "px";
    if (instant) { void img.offsetWidth; img.style.transition = ""; }
  }

  function draw(dpr) {
    var c = R.canvas.getContext && R.canvas.getContext("2d");
    if (!c) return; // node harness: no canvas
    var n = S.round.cols, m = S.round.maze, cp = R.cellPx;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, R.px, R.px);
    // Floor: soft play-mat squares in two creams.
    for (var i = 0; i < n * n; i++) {
      var x = (i % n) * cp, y = Math.floor(i / n) * cp;
      c.fillStyle = ((i % n) + Math.floor(i / n)) % 2 ? "#fbefd9" : "#fff7e8";
      c.fillRect(x, y, cp, cp);
    }
    // Start and goal pads.
    pad(c, S.round.start, "rgba(124,194,107,0.30)");
    pad(c, S.round.goal, "rgba(246,201,69,0.45)");
    // Walls: chunky wooden block rails with round ends.
    var lw = Math.max(6, Math.min(18, cp * 0.13));
    c.lineCap = "round";
    // Collect every rail first, then stroke all the dark outlines and only then all the
    // wood, so a joint between two rails never shows an outline cap across the wood.
    var rails = [];
    function rail(x0, y0, x1, y1) { rails.push([x0, y0, x1, y1]); }
    function strokeAll(color, width) {
      c.strokeStyle = color; c.lineWidth = width; c.beginPath();
      rails.forEach(function (r) { c.moveTo(r[0], r[1]); c.lineTo(r[2], r[3]); });
      c.stroke();
    }
    var o = lw / 2 + 1; // keep the outer rail fully inside the canvas
    for (var k = 0; k < n * n; k++) {
      var cx = (k % n) * cp, cy = Math.floor(k / n) * cp;
      var col = k % n, row = Math.floor(k / n);
      if (!MC.isOpen(m, k, "up")) rail(cx, Math.max(o, cy), cx + cp, Math.max(o, cy));
      if (!MC.isOpen(m, k, "left")) rail(Math.max(o, cx), cy, Math.max(o, cx), cy + cp);
      if (col === n - 1 && !MC.isOpen(m, k, "right")) rail(R.px - o, cy, R.px - o, cy + cp);
      if (row === n - 1 && !MC.isOpen(m, k, "down")) rail(cx, R.px - o, cx + cp, R.px - o);
    }
    strokeAll("#8a5a2e", lw + 3);
    strokeAll("#c98a4b", lw);
    function pad(ctx, cell, color) {
      var p = cellXY(cell), r = cp * 0.18;
      ctx.fillStyle = color;
      roundRect(ctx, p[0] + cp * 0.1, p[1] + cp * 0.1, cp * 0.8, cp * 0.8, r);
      ctx.fill();
    }
  }
  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r);
    c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y); c.closePath();
  }

  /* ---------- the one seam: an intent in, the engine's answer out --------------------- */

  function intent(dir) {
    if (S.locked || !S.state) return false;
    var before = S.state;
    var next = MM.step(before, dir);
    S.state = next;
    if (next.blocked) { refused(dir); return false; }
    if (SND) SND.step(next.steps);
    place(R.hero, next.cell, 0, 0);
    if (next.reached) finished();
    return true;
  }

  function padIntent(dir) {
    if (S.mode === "plan") return addMove(dir);
    return intent(dir);
  }

  function chipCap() { return S.rung < 2 ? 6 : S.rung === 2 ? 8 : 10; }
  function arrowGlyph(dir) { return { up: "↑", right: "→", down: "↓", left: "←" }[dir]; }

  function wirePlan() {
    R.undo.onclick = function () { if (!S.running && S.plan.length) { S.plan.pop(); clearPlanFeedback(); renderPlan(); } };
    R.clear.onclick = function () { if (!S.running) { S.plan = []; clearPlanFeedback(); renderPlan(); } };
    R.go.onclick = function () { if (!S.running && S.plan.length) startPlan(); };
    renderPlan();
  }

  function addMove(dir) {
    if (S.locked || S.running) return false;
    if (S.plan.length >= chipCap()) {
      var pad = app.querySelector(".pad");
      pad.classList.remove("full"); void pad.offsetWidth; pad.classList.add("full");
      return false;
    }
    S.plan.push(dir);
    clearPlanFeedback();
    renderPlan();
    if (SND) SND.step(S.plan.length);
    return true;
  }

  function renderPlan(statuses) {
    if (!R || !R.strip) return;
    if (statuses !== undefined) S.planStatuses = statuses;
    statuses = S.planStatuses;
    var chips = S.plan.map(function (dir, i) {
      var st = statuses && statuses[i] ? " " + statuses[i] : "";
      // `ask` marks the chip; `question` belongs only to the bubble. Reusing one class for
      // both made the red chip inherit the bubble's 25px position and size.
      var hasQuestion = st.indexOf("ask") >= 0;
      return '<button class="move-chip' + st + '" data-index="' + i + '" aria-label="Remove ' + dir + ' move">' +
        arrowGlyph(dir) + (hasQuestion ? '<span class="question">?</span>' : '') + '</button>';
    }).join("");
    var slots = new Array(chipCap() - S.plan.length + 1).join('<span class="move-slot" aria-hidden="true"></span>');
    R.strip.innerHTML = chips + slots;
    if (R.count) R.count.textContent = S.plan.length + " / " + chipCap();
    Array.prototype.forEach.call(R.strip.querySelectorAll(".move-chip"), function (b) {
      b.onclick = function () { if (!S.running) { S.plan.splice(+b.getAttribute("data-index"), 1); renderPlan(); } };
    });
    var empty = !S.plan.length;
    R.undo.disabled = empty || S.running;
    R.clear.disabled = empty || S.running;
    R.go.disabled = empty || S.running;
  }

  function controlsRunning(on) {
    S.running = on;
    Array.prototype.forEach.call(app.querySelectorAll(".arrow"), function (b) { b.disabled = on; });
    renderPlan(S.planStatuses);
    app.classList.toggle("plan-running", on);
  }

  function later(fn, ms) { setTimeout(fn, window.__MAZE_FAST__ ? 0 : ms); }

  function startPlan() {
    var result = MP.runPlan(S.round.maze, S.state, S.plan.slice());
    var statuses = {};
    S.planStatuses = statuses;
    controlsRunning(true);
    if (R.trail) R.trail.innerHTML = "";
    Array.prototype.forEach.call(app.querySelectorAll(".arrow"), function (b) { b.classList.remove("hint"); });
    function walk(i) {
      if (i >= result.steps.length) return finishPlan(result, statuses);
      var step = result.steps[i];
      statuses[i] = "walking"; renderPlan(statuses);
      if (step.moved) {
        S.state = step.after;
        if (SND) SND.step(S.state.steps);
        place(R.hero, S.state.cell, 0, 0);
        statuses[i] = "used"; renderPlan(statuses);
        if (S.state.reached) return later(function () { finishPlan(result, statuses); }, 400);
        later(function () { walk(i + 1); }, 400);
      } else {
        S.state = step.after;
        refused(step.dir);
        statuses[i] = "failed";
        renderPlan(statuses);
        finishPlan(result, statuses);
      }
    }
    walk(0);
  }

  function finishPlan(result, statuses) {
    if (result.outcome === "flag") {
      controlsRunning(false);
      finished();
      return;
    }
    if (result.outcome === "ended") {
      S.chunkStart = S.state;
      S.wallAttempts = 0;
      Object.keys(statuses).forEach(function (i) { statuses[i] = "used fading"; });
      renderPlan(statuses);
      later(function () {
        S.plan = [];
        S.planStatuses = null;
        controlsRunning(false);
        renderPlan();
      }, 300);
      return;
    }
    S.wallAttempts++;
    var failed = result.failedIndex;
    if (S.wallAttempts >= 2) {
      statuses[failed] = "failed ask";
      showTrail(result.steps.slice(0, failed));
    }
    if (S.wallAttempts >= 3) {
      var d = directionToGoal(result.steps[failed].before.cell);
      var hint = app.querySelector(".arrow-" + d);
      if (hint) hint.classList.add("hint");
    }
    renderPlan(statuses);
    later(function () { walkBack(result.steps.slice(0, failed).filter(function (s) { return s.moved; }).reverse(), 0); }, 1000);
  }

  function clearPlanFeedback() {
    S.planStatuses = null;
    if (R && R.trail) R.trail.innerHTML = "";
    Array.prototype.forEach.call(app.querySelectorAll(".arrow.hint"), function (b) { b.classList.remove("hint"); });
  }

  function walkBack(steps, i) {
    if (i >= steps.length) {
      S.state = S.chunkStart;
      place(R.hero, S.state.cell, 0, 0);
      controlsRunning(false);
      return;
    }
    S.state = steps[i].before;
    place(R.hero, S.state.cell, 0, 0);
    later(function () { walkBack(steps, i + 1); }, 180);
  }

  function showTrail(steps) {
    if (!R.trail) return;
    R.trail.innerHTML = steps.map(function (s) {
      var xy = cellXY(s.after.cell);
      return '<i style="left:' + (xy[0] + R.cellPx * .43) + 'px;top:' + (xy[1] + R.cellPx * .43) + 'px"></i>';
    }).join("");
  }

  function directionToGoal(start) {
    var q = [start], seen = {}; seen[start] = true;
    var first = {}; first[start] = null;
    while (q.length) {
      var c = q.shift();
      if (c === S.round.goal) return first[c];
      MC.exitsAt(S.round.maze, c).forEach(function (d) {
        var n = MC.neighbourOf(S.round.maze, c, d);
        if (seen[n]) return;
        seen[n] = true; first[n] = first[c] || d; q.push(n);
      });
    }
    return null;
  }

  function refused(dir) {
    if (SND) SND.bump();
    // Nudge toward the wall and back.
    R.hero.classList.remove("nudge-up", "nudge-right", "nudge-down", "nudge-left");
    void R.hero.offsetWidth;
    R.hero.classList.add("nudge-" + dir);
    R.hero.setAttribute("data-refusals", String(S.state.refusals));
    // Glow the wall segment that said no.
    var xy = cellXY(S.state.cell), cp = R.cellPx, t = Math.max(10, cp * 0.2);
    var b = R.bump.style;
    if (dir === "up" || dir === "down") {
      b.width = cp * 0.9 + "px"; b.height = t + "px";
      b.left = xy[0] + cp * 0.05 + "px"; b.top = (dir === "up" ? xy[1] : xy[1] + cp) - t / 2 + "px";
    } else {
      b.width = t + "px"; b.height = cp * 0.9 + "px";
      b.top = xy[1] + cp * 0.05 + "px"; b.left = (dir === "left" ? xy[0] : xy[0] + cp) - t / 2 + "px";
    }
    R.bump.classList.remove("on"); void R.bump.offsetWidth; R.bump.classList.add("on");
  }

  function finished() {
    S.locked = true;
    detachInput();
    var done = S.mode === "plan" ? S.donePlan : S.doneWalk;
    if (done.indexOf(S.rung) < 0) { done.push(S.rung); save(S.mode === "plan" ? "done-plan" : "done-walk", done); }
    if (SND) SND.win();
    var g = cellXY(S.round.goal), cp = R.cellPx;
    R.sparkles.style.left = g[0] - cp * 0.4 + "px";
    R.sparkles.style.top = g[1] - cp * 0.4 + "px";
    R.sparkles.classList.add("on");
    R.hero.classList.add("cheer");
    var last = S.rung >= LADDER.length - 1;
    R.finish.innerHTML =
      '<div class="finish-card">' +
      '<img class="finish-hero" data-ph="hero" src="' + SPRITE(S.hero) + '" alt=""/>' +
      '<p class="yay">You found the flag!</p>' +
      '<div class="finish-buttons">' +
      '<button class="big again" id="again"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5a7 7 0 1 1-6.6 4.7" fill="none" stroke-width="2.6" stroke-linecap="round"/><path d="M4 4v6h6" fill="none" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>New maze</button>' +
      (last ? '<button class="big next" id="friends">Pick a friend</button>'
            : '<button class="big next" id="next">Bigger maze<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l8 7-8 7" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></button>') +
      "</div></div>";
    guardImages(R.finish);
    // Let the celebration play before the card covers the board.
    setTimeout(function () {
      if (!R || !R.finish) return;
      R.finish.hidden = false;
      document.getElementById("again").onclick = function () { play(S.rung); };
      var nx = document.getElementById("next");
      if (nx) nx.onclick = function () { play(S.rung + 1); };
      var fr = document.getElementById("friends");
      if (fr) fr.onclick = picker;
    }, window.__MAZE_FAST__ ? 0 : 1100);
  }

  /* ---------- arrows ----------------------------------------------------------------- */

  function wirePad() {
    Array.prototype.forEach.call(app.querySelectorAll(".arrow"), function (b) {
      var dir = b.getAttribute("data-dir"), hold = null, rep = null, viaPointer = false;
      function stop() { clearTimeout(hold); clearInterval(rep); hold = rep = null; b.classList.remove("down"); }
      b.addEventListener("pointerdown", function (e) {
        if (e.button !== undefined && e.button > 0) return;
        viaPointer = true;
        if (SND) SND.unlock();
        b.classList.add("down");
        padIntent(dir);
        stop(); b.classList.add("down");
        hold = setTimeout(function () { rep = setInterval(function () { if (!padIntent(dir)) stop(); }, 210); }, 420);
      });
      ["pointerup", "pointercancel", "pointerleave"].forEach(function (t) { b.addEventListener(t, stop); });
      // Keyboard or switch access presses a button with a click and no pointer.
      b.addEventListener("click", function () { if (viaPointer) { viaPointer = false; return; } padIntent(dir); });
    });
  }

  function onKey(e) {
    var map = { ArrowUp: "up", ArrowRight: "right", ArrowDown: "down", ArrowLeft: "left" };
    if (map[e.key] && app.className.indexOf("screen-play") === 0) { e.preventDefault(); padIntent(map[e.key]); }
  }

  /* ---------- the forgiving slide ---------------------------------------------------- */

  var D = null; // the active drag: { id, ax, ay } — the anchor is where the last step counted

  function local(e) {
    var r = R.board.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  }
  function down(e) {
    if (S.locked || D) return;
    if (SND) SND.unlock();
    var p = local(e);
    D = { id: e.pointerId, ax: p[0], ay: p[1] };
    try { R.board.setPointerCapture(e.pointerId); } catch (err) { /* synthetic events */ }
    R.hero.classList.add("held");
  }
  function move(e) {
    if (!D || e.pointerId !== D.id || S.locked) return;
    // The anchor is where, in finger space, the character's cell centre sits. A step fires
    // once the finger is 0.6 of a cell past it; the anchor then moves a whole cell, so the
    // finger and the character stay 1:1 and a step back needs a real 0.2-cell reversal
    // (hysteresis) instead of flickering on a trembling finger.
    var p = local(e), cp = R.cellPx, go = cp * 0.6;
    for (var guard = 0; guard < 6 && !S.locked; guard++) {
      var dx = p[0] - D.ax, dy = p[1] - D.ay;
      var ax = Math.abs(dx), ay = Math.abs(dy);
      var primary = ax >= ay ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up");
      var secondary = ax >= ay ? (dy > 0 ? "down" : "up") : (dx > 0 ? "right" : "left");
      var pMag = Math.max(ax, ay), sMag = Math.min(ax, ay);
      if (pMag < go) break;
      var open = function (d) { return MC.isOpen(S.round.maze, S.state.cell, d); };
      var dir = open(primary) ? primary : (sMag >= cp * 0.3 && open(secondary) ? secondary : null);
      if (dir) {
        intent(dir);
        if (S.locked || !D) break; // the flag: finished() has already let go of the drag
        var v = DIR_VEC[dir];
        if (dir !== primary) {
          // The forgiving corner step: the push that met the wall is spent, so both axes
          // start afresh here instead of the leftover driving a step straight back.
          D.ax = p[0]; D.ay = p[1];
          break;
        }
        D.ax += v[0] * cp; D.ay += v[1] * cp;
        // The axis not travelled keeps its drift only up to half a cell, so a long
        // sideways wobble cannot bank a surprise step later.
        if (v[0]) D.ay = p[1] - clamp(p[1] - D.ay, -cp * 0.5, cp * 0.5);
        else D.ax = p[0] - clamp(p[0] - D.ax, -cp * 0.5, cp * 0.5);
      } else {
        intent(primary); // refused: the engine counts it, the page nudges
        D.ax = p[0]; D.ay = p[1]; // a fresh push is needed before the next nudge
        break;
      }
    }
    if (!S.locked && D) lean(p);
  }
  function lean(p) {
    var dx = p[0] - D.ax, dy = p[1] - D.ay, cp = R.cellPx, max = cp * 0.28;
    var ox = 0, oy = 0;
    if (Math.abs(dx) >= Math.abs(dy)) {
      if (MC.isOpen(S.round.maze, S.state.cell, dx > 0 ? "right" : "left")) ox = clamp(dx * 0.6, -max, max);
    } else if (MC.isOpen(S.round.maze, S.state.cell, dy > 0 ? "down" : "up")) oy = clamp(dy * 0.6, -max, max);
    R.hero.style.transition = "none";
    place(R.hero, S.state.cell, ox, oy);
  }
  function up(e) {
    if (!D || e.pointerId !== D.id) return;
    D = null;
    R.hero.classList.remove("held");
    R.hero.style.transition = "";
    if (!S.locked) place(R.hero, S.state.cell, 0, 0);
  }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  function attachInput() {
    R.board.addEventListener("pointerdown", down);
    R.board.addEventListener("pointermove", move);
    R.board.addEventListener("pointerup", up);
    R.board.addEventListener("pointercancel", up);
  }
  function detachInput() {
    D = null;
    if (!R || !R.board) return;
    R.board.removeEventListener("pointerdown", down);
    R.board.removeEventListener("pointermove", move);
    R.board.removeEventListener("pointerup", up);
    R.board.removeEventListener("pointercancel", up);
  }

  window.addEventListener("resize", function () { if (app.className === "screen-play") layout(); });
  window.addEventListener("keydown", onKey);

  // Read-only view for the harnesses. Nothing in the game reads it.
  window.__maze = {
    get state() { return S.state; }, get round() { return S.round; },
    get cellPx() { return R ? R.cellPx : 0; }, get rung() { return S.rung; },
    get mode() { return S.mode; }, get plan() { return S.plan.slice(); }, get wallAttempts() { return S.wallAttempts; },
    get running() { return S.running; }, get cap() { return chipCap(); },
    LADDER: LADDER, CAST: CAST,
  };

  // Always open on the friend picker, with the last friend marked: a child coming back
  // chooses again rather than landing mid-maze.
  picker();
})();
