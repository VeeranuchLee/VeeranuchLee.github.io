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
 * Toy Room theme, one skinnable generator, the original five-rung ladder, no timer,
 * no score, no failure.
 */
(function () {
  "use strict";
  var MC = window.MazeCore, MM = window.MazeMovement, MP = window.MazePlan, MR = window.MazeRobot, SND = window.MazeSound;

  /* ---------- data ------------------------------------------------------------------ */

  var CAST = [
    { id: "teddy", name: "Teddy" }, { id: "bunny", name: "Bunny" },
    { id: "dinosaur", name: "Dinosaur" }, { id: "robot", name: "Robot" },
    { id: "doll", name: "Doll" }, { id: "penguin", name: "Penguin" },
    { id: "lion", name: "Lion" }, { id: "hippo", name: "Hippo" },
    { id: "duck", name: "Duck" }, { id: "elephant", name: "Elephant" },
    { id: "owl", name: "Owl" }, { id: "rocking-horse", name: "Rocking horse" },
  ];

  // One smooth ladder, not a second "hard mode" implementation. The early rungs stay
  // spacious; intermediate rungs begin guaranteeing real choices; the two appended
  // harder rungs must contain several route decisions, deep wrong turns, dead ends and
  // independent loops. maze-core rejection-samples until those topology gates pass.
  var LADDER = [
    { n: 3, tier: "easy", name: "Easy maze 1", minSteps: 4, maxSteps: 8, bias: .72, braid: 0 },
    { n: 4, tier: "easy", name: "Easy maze 2", minSteps: 7, maxSteps: 15, bias: .68, braid: 0 },
    { n: 5, tier: "middle", name: "Intermediate maze 1", minSteps: 10, maxSteps: 24, bias: .60, braid: .08,
      topology: { minDecisionPoints: 1, minLongestWrongTurn: 2 } },
    { n: 6, tier: "middle", name: "Intermediate maze 2", minSteps: 14, maxSteps: 35, bias: .52, braid: .12,
      topology: { minDecisionPoints: 2, minLongestWrongTurn: 3, minLongestDeadEnd: 2, minLoops: 1 } },
    { n: 8, tier: "middle", name: "Intermediate maze 3", minSteps: 20, maxSteps: 63, bias: .45, braid: .18,
      topology: { minDecisionPoints: 3, minLongestWrongTurn: 4, minLongestDeadEnd: 3, minLoops: 2 } },
    { n: 9, tier: "hard", name: "Hard maze 1", minSteps: 25, maxSteps: 80, bias: .40, braid: .22,
      topology: { minDecisionPoints: 4, minLongestWrongTurn: 5, minLongestDeadEnd: 3, minLoops: 3 } },
    { n: 10, tier: "hard", name: "Hard maze 2", minSteps: 28, maxSteps: 99, bias: .35, braid: .25,
      topology: { minDecisionPoints: 5, minLongestWrongTurn: 6, minLongestDeadEnd: 3, minLoops: 4 } },
  ];

  // Plan Moves deliberately has one calm cap across the whole ladder. The strip owns the
  // overflow: a child can build a longer route without making the page itself scroll.
  var PLAN_CAP = 30;
  var PLAN_PREVIEW_SLOTS = 5;
  var SLOT_SIZE = 64;
  var SLOT_GAP = 5;
  // Number and Alphabet goals generate the exact same normal rung first. Only then
  // do they place a sparse set of ordered checkpoints. Larger rungs have more targets
  // and require two off-shortest-path detours, but never approach 1–26 / A–Z coverage.
  var TRAIL_COUNTS = [3, 3, 4, 4, 5, 6, 7];
  var TRAIL_OFF_PATH = [1, 1, 1, 1, 1, 2, 2];
  var MOVEMENTS = ["go", "plan"];
  var GOALS = ["flag", "number", "alphabet"];
  var MAZE_TYPES = ["directions", "robot"];
  var ROBOT_LEVELS = [
    "Straight Forward", "One Turn", "Left and Right", "Turn First",
    "Turn Around", "Branching Route", "Checkpoint Route",
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
  // Migrate the former four-way choice once, then remember the two dimensions
  // independently. A goal choice never changes the movement choice, or vice versa.
  var rememberedMode = load("mode", "walk");
  var migratedMovement = rememberedMode === "plan" ? "plan" : "go";
  var migratedGoal = rememberedMode === "number" ? "number" : rememberedMode === "alphabet" ? "alphabet" : "flag";
  var rememberedMovement = load("movement", migratedMovement);
  var rememberedGoal = load("goal", migratedGoal);
  var rememberedMazeType = load("maze-type", "directions");
  var S = {
    hero: load("hero", null),
    mazeType: MAZE_TYPES.indexOf(rememberedMazeType) >= 0 ? rememberedMazeType : "directions",
    movement: MOVEMENTS.indexOf(rememberedMovement) >= 0 ? rememberedMovement : "go",
    goal: GOALS.indexOf(rememberedGoal) >= 0 ? rememberedGoal : "flag",
    rung: Math.max(0, Math.min(LADDER.length - 1, load("rung", 0) | 0)),
    doneWalk: load("done-walk", load("done", [])),
    donePlan: load("done-plan", []),
    doneNumber: load("done-number", []),
    doneAlphabet: load("done-alphabet", []),
    donePlanNumber: load("done-plan-number", []),
    donePlanAlphabet: load("done-plan-alphabet", []),
    doneRobotGo: load("done-robot-go", []),
    doneRobotPlan: load("done-robot-plan", []),
    round: null, state: null, cell: 0, locked: false, seed: 0,
    trail: null,
    plan: [], planStatuses: null, chunkStart: null, wallAttempts: 0, running: false,
    robotMisses: 0, eyesCompact: false,
  };
  if (!Array.isArray(S.doneWalk)) S.doneWalk = [];
  if (!Array.isArray(S.donePlan)) S.donePlan = [];
  if (!Array.isArray(S.doneNumber)) S.doneNumber = [];
  if (!Array.isArray(S.doneAlphabet)) S.doneAlphabet = [];
  if (!Array.isArray(S.donePlanNumber)) S.donePlanNumber = [];
  if (!Array.isArray(S.donePlanAlphabet)) S.donePlanAlphabet = [];
  if (!Array.isArray(S.doneRobotGo)) S.doneRobotGo = [];
  if (!Array.isArray(S.doneRobotPlan)) S.doneRobotPlan = [];
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
    var robot = S.mazeType === "robot";
    var ordered = robot ? rung === 6 : (S.goal === "number" || S.goal === "alphabet");
    S.seed = (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0;
    if (window.__MAZE_SEED__ !== undefined) S.seed = window.__MAZE_SEED__ >>> 0; // harness hook
    var round = null, trail = null;
    for (var retry = 0; retry < 40 && (!round || !round.ok || (ordered && (!trail || !trail.ok))); retry++) {
      if (robot) {
        round = MR.makePuzzle({ rung: rung, cols: cfg.n, seed: S.seed + retry,
          bias: cfg.bias, braid: cfg.braid });
        trail = round && round.trail;
        continue;
      }
      // These are byte-for-byte the normal rung inputs. Checkpoints do not get a vote
      // in maze topology, start/goal placement or shortest-path length.
      round = MC.makeRound({ cols: cfg.n, rows: cfg.n, seed: S.seed + retry,
        minSteps: cfg.minSteps,
        maxSteps: cfg.maxSteps,
        bias: cfg.bias, braid: cfg.braid, topology: cfg.topology });
      if (round.ok && ordered) trail = MC.checkpointTrail(round.maze, round.start, round.goal, {
        solution: round.solution,
        count: TRAIL_COUNTS[rung],
        requiredOffPath: TRAIL_OFF_PATH[rung],
        rng: MC.mulberry32(((S.seed + retry) ^ ((rung + 1) * 2654435761)) >>> 0),
      });
    }
    if (!round || !round.ok || (ordered && (!trail || !trail.ok)))
      throw new Error("Could not build rung " + rung + ": " + ((trail && trail.reason) || (round && round.reason) || "checkpoint placement failed"));
    S.round = round;
    S.trail = ordered ? trail : null;
    S.state = robot ? MR.initial({ maze: round.maze, start: round.start, goal: round.goal, heading: round.heading }) : MM.initial(round);
    S.locked = false;
    S.plan = [];
    S.planStatuses = null;
    S.chunkStart = S.state;
    S.wallAttempts = 0;
    S.running = false;
    S.robotMisses = 0;
    S.eyesCompact = robot && rung >= 3;

    renderPlayScreen();
  }

  function renderPlayScreen() {
    detachInput();

    var done = doneForChoice();

    app.className = "screen-play";
    app.innerHTML =
      '<header class="topline">' +
      '<button class="hub" id="back" aria-label="Pick a different friend">&larr; Friends</button>' +
      '<nav class="ladder" aria-label="Maze size">' +
      LADDER.map(function (l, i) {
        var isDone = done.indexOf(i) >= 0;
        var rungName = S.mazeType === "robot" ? ROBOT_LEVELS[i] : l.name;
        return '<button class="rung rung-' + l.tier + (i === S.rung ? " now" : "") + (isDone ? " done" : "") + '" data-rung="' + i +
          '" aria-label="' + rungName + ", " + l.n + " by " + l.n + (isDone ? ", finished in " + choiceName() : "") + '"' + (i === S.rung ? ' aria-current="true"' : "") + ">" +
          '<span class="dots" aria-hidden="true" style="--n:' + l.n + '">' + new Array(l.n * l.n + 1).join("<i></i>") + "</span>" + (isDone ? '<span class="star" aria-hidden="true">★</span>' : "") + "</button>";
      }).join("") +
      "</nav>" + speakerButton() + "</header>" +
      '<section class="stage ' + (S.movement === "plan" ? "stage-plan" : "stage-walk") + (S.trail ? " stage-trail stage-" + S.goal : "") + (S.mazeType === "robot" ? " stage-robot" : "") + '">' +
      '<div class="board-wrap"><div class="board" id="board">' +
      '<canvas id="walls"></canvas>' +
      '<div class="trail-labels" id="trail-labels" aria-hidden="true"></div>' +
      '<div class="trail-feedback" id="trail-feedback" aria-hidden="true">?</div>' +
      '<div class="plan-trail" id="trail" aria-hidden="true"></div>' +
      '<img class="marker goal" id="goal" data-ph="flag" src="' + SPRITE("flag", "flag") + '" alt="The flag"/>' +
      '<div class="bump" id="bump"></div>' +
      '<img class="hero" id="hero" data-ph="hero" src="' + SPRITE(S.hero) + '" alt=""/>' +
      '<img class="sparkles" id="sparkles" data-ph="sparkles" src="' + SPRITE("sparkles", "sparkles") + '" alt=""/>' +
      "</div></div>" +
      '<div class="play-controls">' + choiceControls() + (S.trail ? trailPrompt() : "") +
      (S.mazeType === "robot" ? robotEyesPanel() : "") +
      (S.movement === "plan" ? planPanel() : '') +
      '<div class="pad' + (S.mazeType === "robot" ? " robot-pad" : "") + '" role="group" aria-label="' + (S.movement === "plan" ? "Add a move" : "Move") + '">' +
      (S.mazeType === "robot" ? robotPadButtons() :
        padButton("up", "Up") + padButton("left", "Left") + '<span class="pad-hub" aria-hidden="true"></span>' +
        padButton("right", "Right") + padButton("down", "Down")) +
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
      labels: document.getElementById("trail-labels"),
      trailFeedback: document.getElementById("trail-feedback"),
      trailPrompt: document.getElementById("trail-prompt"),
      eyes: document.getElementById("robot-eyes"),
      eyesScene: document.getElementById("eyes-scene"),
      eyesHeading: document.getElementById("eyes-heading"),
      px: 0, cellPx: 0,
    };
    var heroName = CAST.filter(function (c) { return c.id === S.hero; })[0];
    R.hero.alt = heroName ? heroName.name : "";
    document.getElementById("back").onclick = picker;
    Array.prototype.forEach.call(app.querySelectorAll(".rung"), function (b) {
      b.onclick = function () { if (SND) SND.pick(); play(+b.getAttribute("data-rung")); };
    });
    Array.prototype.forEach.call(app.querySelectorAll(".movement-toggle button"), function (b) {
      b.onclick = function () { switchMovement(b.getAttribute("data-movement")); };
    });
    Array.prototype.forEach.call(app.querySelectorAll(".maze-type-toggle button"), function (b) {
      b.onclick = function () { switchMazeType(b.getAttribute("data-maze-type")); };
    });
    Array.prototype.forEach.call(app.querySelectorAll(".goal-toggle button"), function (b) {
      b.onclick = function () { switchGoal(b.getAttribute("data-goal")); };
    });
    var refreshSpeaker = function () {
      var b = document.getElementById("speaker");
      if (b) b.outerHTML = speakerButton();
      wireSpeaker(refreshSpeaker);
    };
    wireSpeaker(refreshSpeaker);
    wirePad();
    if (S.mazeType === "robot") wireRobotEyes();
    if (S.movement === "plan") wirePlan(); else if (S.mazeType === "directions") attachInput();
    layout();
    // Queued chips and the checkpoint status row change the space left for the board
    // after the first layout, so refit whenever the board's own container resizes.
    if (layoutWatch) layoutWatch.disconnect();
    if (window.ResizeObserver && R.board.parentNode) {
      layoutWatch = new ResizeObserver(function () {
        if (!R || app.className !== "screen-play" || boardPx() === R.px) return;
        // A refit redraws the labels; keep a "not yet" cue the child is still reading.
        var cue = R.trailPrompt ? R.trailPrompt.innerHTML : null;
        layout();
        if (cue !== null && R.trailPrompt) R.trailPrompt.innerHTML = cue;
      });
      layoutWatch.observe(R.board.parentNode);
    }
  }
  var layoutWatch = null;

  function choiceControls() {
    return '<div class="maze-choices">' +
      '<div class="choice-row"><span class="choice-label">Maze Type</span><div class="maze-type-toggle choice-toggle" role="group" aria-label="Choose maze type">' +
      choiceButton("maze-type", "directions", "Directions", S.mazeType) +
      choiceButton("maze-type", "robot", "Robot Code", S.mazeType) +
      '</div></div>' +
      '<div class="choice-row"><span class="choice-label">Movement</span><div class="movement-toggle choice-toggle" role="group" aria-label="Choose movement method">' +
      choiceButton("movement", "go", "Go Now", S.movement) +
      choiceButton("movement", "plan", "Plan Moves", S.movement) +
      '</div></div>' + (S.mazeType === "robot" ? "" :
      '<div class="choice-row"><span class="choice-label">Goal</span><div class="goal-toggle choice-toggle" role="group" aria-label="Choose maze goal">' +
      choiceButton("goal", "flag", "Flag", S.goal) +
      choiceButton("goal", "number", "1 2 3", S.goal) +
      choiceButton("goal", "alphabet", "A B C", S.goal) +
      '</div></div>') + '</div>';
  }

  function choiceButton(kind, value, label, selected) {
    return '<button data-' + kind + '="' + value + '" class="' + (selected === value ? "selected" : "") +
      '" aria-pressed="' + (selected === value) + '">' + label + '</button>';
  }

  function choiceName() {
    if (S.mazeType === "robot") return "Robot Code + " + (S.movement === "plan" ? "Plan Moves" : "Go Now");
    return (S.movement === "plan" ? "Plan Moves" : "Go Now") + " + " +
      ({ flag: "Flag", number: "Number Checkpoints", alphabet: "Letter Checkpoints" }[S.goal]);
  }

  function doneForChoice() {
    if (S.mazeType === "robot") return S.movement === "plan" ? S.doneRobotPlan : S.doneRobotGo;
    if (S.movement === "plan") return { flag: S.donePlan, number: S.donePlanNumber, alphabet: S.donePlanAlphabet }[S.goal];
    return { flag: S.doneWalk, number: S.doneNumber, alphabet: S.doneAlphabet }[S.goal];
  }

  function doneKey() {
    if (S.mazeType === "robot") return S.movement === "plan" ? "done-robot-plan" : "done-robot-go";
    if (S.movement === "plan") return S.goal === "flag" ? "done-plan" : "done-plan-" + S.goal;
    return S.goal === "flag" ? "done-walk" : "done-" + S.goal;
  }

  function trailPrompt() {
    return '<div class="trail-prompt" id="trail-prompt" aria-live="polite"></div>';
  }

  function switchMovement(movement) {
    if (S.running || movement === S.movement || MOVEMENTS.indexOf(movement) < 0) return;
    if (SND) { SND.unlock(); SND.pick(); }
    if (movement !== "plan") S.plan = [];
    S.movement = movement;
    S.planStatuses = null;
    S.chunkStart = S.state;
    S.wallAttempts = 0;
    save("movement", movement);
    renderPlayScreen();
  }

  function switchMazeType(type) {
    if (S.running || type === S.mazeType || MAZE_TYPES.indexOf(type) < 0) return;
    if (SND) { SND.unlock(); SND.pick(); }
    S.mazeType = type;
    save("maze-type", type);
    play(S.rung);
  }

  function switchGoal(goal) {
    if (S.running || goal === S.goal || GOALS.indexOf(goal) < 0) return;
    if (SND) { SND.unlock(); SND.pick(); }
    S.goal = goal;
    save("goal", goal);
    play(S.rung);
  }

  function planPanel() {
    var hero = CAST.filter(function (c) { return c.id === S.hero; })[0];
    var friendName = hero ? hero.name.toLowerCase() : "friend";
    return '<aside class="plan-panel">' +
      '<div class="plan-heading"><span><strong>Plan the moves</strong><small>' + (S.mazeType === "robot" ? "Add robot commands, then press GO!" : "Add arrows below, then press GO to move the " + friendName + "!") + '</small></span>' +
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

  function robotPadButtons() {
    return robotCommandButton("L", "Turn left", "↶", "robot-left") +
      robotCommandButton("F", "Forward", "↑", "robot-forward") +
      robotCommandButton("R", "Turn right", "↷", "robot-right");
  }

  function robotCommandButton(command, label, glyph, cls) {
    return '<button class="arrow robot-command ' + cls + '" data-command="' + command + '" aria-label="' + label + '">' +
      '<span class="robot-command-glyph" aria-hidden="true">' + glyph + '</span><small>' + label + '</small></button>';
  }

  function robotEyesPanel() {
    return '<aside class="robot-eyes' + (S.eyesCompact ? " compact" : "") + '" id="robot-eyes" aria-label="Robot Eyes local view">' +
      '<button class="eyes-toggle" id="eyes-toggle" aria-expanded="' + (!S.eyesCompact) + '"><span>Robot Eyes</span><strong id="eyes-heading"></strong></button>' +
      '<div class="eyes-scene" id="eyes-scene" aria-live="polite">' +
      '<div class="eyes-sky"><i></i><i></i></div><div class="eyes-floor"></div>' +
      '<div class="eyes-wall eyes-left" data-side="left"></div><div class="eyes-wall eyes-front" data-side="forward"></div><div class="eyes-wall eyes-right" data-side="right"></div>' +
      '<div class="eyes-target" id="eyes-target" aria-hidden="true"></div><div class="eyes-nose" aria-hidden="true">▲</div>' +
      '</div></aside>';
  }

  function wireRobotEyes() {
    var toggle = document.getElementById("eyes-toggle");
    if (toggle) toggle.onclick = function () {
      S.eyesCompact = !S.eyesCompact;
      R.eyes.classList.toggle("compact", S.eyesCompact);
      toggle.setAttribute("aria-expanded", String(!S.eyesCompact));
      if (SND) SND.pick();
      layout();
    };
    preloadRobotViews();
    updateRobotVisual();
  }

  // The Robot hero turns on the board by changing view, not by spinning: N (up the screen)
  // is the back view, S the front view, E the side view, W the same side view mirrored.
  // Other friends keep the old whole-sprite rotation. Only used in Robot Code mode.
  var ROBOT_VIEW = { N: "robot-back", E: "robot-side", S: "robot", W: "robot-side" };
  var robotViewTimer = null, robotPreloaded = [];
  function robotViewsReady() {
    return ["robot", "robot-back", "robot-side"].every(function (id) { return MISSING.indexOf(id) < 0; });
  }
  function preloadRobotViews() {
    if (robotPreloaded.length || typeof window.Image !== "function" || !robotViewsReady()) return;
    ["robot", "robot-back", "robot-side"].forEach(function (id) {
      var im = new window.Image(); im.src = SPRITE(id); robotPreloaded.push(im);
    });
  }
  function applyRobotView(heading) {
    var hero = R && R.hero;
    if (!hero || hero.getAttribute("data-placeholder")) return;
    var view = ROBOT_VIEW[heading];
    hero.style.rotate = "0deg";
    hero.setAttribute("data-view", view);
    hero.setAttribute("data-flip", heading === "W" ? "1" : "0");
    hero.style.transform = heading === "W" ? "scaleX(-1)" : "";
    var src = SPRITE(view);
    if (hero.getAttribute("src") !== src) hero.setAttribute("src", src);
  }
  function showRobotView(heading, turnCommand) {
    var hero = R.hero;
    if (robotViewTimer) { clearTimeout(robotViewTimer); robotViewTimer = null; }
    hero.classList.remove("view-turn");
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!turnCommand || reduce) { applyRobotView(heading); return; }
    // Quarter turn: squash to a sliver, swap the view at the midpoint, expand back (230 ms).
    void hero.offsetWidth;
    hero.classList.add("view-turn");
    robotViewTimer = setTimeout(function () {
      robotViewTimer = null; applyRobotView(S.state ? S.state.heading : heading);
    }, 115);
    setTimeout(function () { if (hero) hero.classList.remove("view-turn"); }, 240);
  }

  function updateRobotVisual(turnCommand) {
    if (S.mazeType !== "robot" || !R || !S.state) return;
    var angles = { N: 0, E: 90, S: 180, W: 270 };
    R.hero.setAttribute("data-heading", S.state.heading);
    if (S.hero === "robot" && robotViewsReady()) showRobotView(S.state.heading, turnCommand);
    else R.hero.style.rotate = angles[S.state.heading] + "deg";
    var view = MR.relativeView(S.round.maze, S.state.cell, S.state.heading);
    ["left", "forward", "right"].forEach(function (side) {
      var wall = R.eyesScene.querySelector('[data-side="' + side + '"]');
      wall.classList.toggle("open", view[side].open);
    });
    var target = document.getElementById("eyes-target"), seenCell = view.forward.open ? view.forward.cell : -1;
    var checkpoint = S.trail && S.trail.labels[seenCell] === S.trail.progress + 1;
    var flag = seenCell === S.round.goal && (!S.trail || S.trail.progress === S.trail.count);
    target.className = "eyes-target" + (flag ? " flag" : checkpoint ? " checkpoint" : "");
    target.textContent = flag ? "⚑" : checkpoint ? String(S.trail.progress + 1) : "";
    R.eyesHeading.textContent = "Heading " + S.state.heading;
    R.eyesHeading.hidden = S.robotMisses < 2 && S.rung > 2;
    if (turnCommand) {
      R.hero.classList.remove("turn-left", "turn-right");
      R.eyesScene.classList.remove("turn-left", "turn-right");
      void R.hero.offsetWidth;
      R.hero.classList.add(turnCommand === "L" ? "turn-left" : "turn-right");
      R.eyesScene.classList.add(turnCommand === "L" ? "turn-left" : "turn-right");
    }
  }

  /* ---------- geometry and drawing --------------------------------------------------- */

  function boardPx() {
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
    return Math.floor(Math.min(w || 600, h || 600));
  }

  function layout() {
    if (!R) return;
    var px = boardPx();
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
    renderTrail();
    place(R.goal, S.round.goal, 0, 0);
    place(R.hero, S.state.cell, 0, 0, true);
    updateRobotVisual();
    if (S.movement === "plan") renderPlan();
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

  function formatTrailValue(value) {
    return S.goal === "alphabet" ? String.fromCharCode(64 + value) : String(value);
  }

  function renderTrail() {
    if (!R || !R.labels) return;
    if (!S.trail) { R.labels.innerHTML = ""; return; }
    // The 10x10 hard trail can put labels in the outermost row or column. Keep those
    // overlay boxes just inside the board in landscape, where the square is largest and
    // sits closest to the viewport edge. Portrait keeps its established geometry.
    var inset = window.innerWidth > window.innerHeight ? 2 : 0;
    R.labels.innerHTML = S.trail.labels.map(function (value, cell) {
      if (value === null) return "";
      var xy = cellXY(cell), status = value <= S.trail.progress ? " done" : (value === S.trail.progress + 1 ? " next" : "");
      return '<span class="trail-label' + status + '" data-cell="' + cell + '" data-value="' + value +
        '" style="left:' + (xy[0] + inset) + 'px;top:' + (xy[1] + inset) + 'px;width:' + (R.cellPx - inset * 2) +
        'px;height:' + (R.cellPx - inset * 2) +
        'px;--cell-px:' + R.cellPx + 'px;--trail-font:' + Math.max(22, Math.min(44, R.cellPx * .43)) + 'px">' + formatTrailValue(value) + '</span>';
    }).join("");
    updateTrailPrompt();
  }

  function updateTrailPrompt(extra) {
    if (!R || !R.trailPrompt || !S.trail) return;
    var next = S.trail.progress + 1;
    if (next > S.trail.count) {
      R.trailPrompt.innerHTML = '<span class="prompt-label">⚑</span><span>' + (extra || "Now find the flag") + '</span>';
      if (R.goal) R.goal.classList.add("ready");
      return;
    }
    if (R.goal) R.goal.classList.remove("ready");
    R.trailPrompt.innerHTML = '<span class="prompt-label">' + formatTrailValue(next) + '</span><span>' +
      (extra || (S.goal === "alphabet" ? "Find the next letter" : "Find the next number")) + '</span>';
  }

  /* ---------- the one seam: an intent in, the engine's answer out --------------------- */

  function intent(dir) {
    if (S.locked || !S.state) return false;
    var before = S.state;
    var next = MM.step(before, dir);
    if (next.blocked) { S.state = next; refused(dir); return false; }
    var visit = null;
    if (S.trail) {
      visit = MC.checkpointVisit(S.trail, S.trail.progress, next.cell, next.cell === S.round.goal);
      S.trail.progress = visit.progress;
      // MazeMovement reports any contact with its goal. Checkpoint modes deliberately
      // make that non-sticky until every ordered target has been collected.
      next.reached = visit.complete;
    }
    S.state = next;
    if (SND) SND.step(next.steps);
    place(R.hero, next.cell, 0, 0);
    if (visit && visit.accepted) renderTrail();
    if (visit && (visit.reason === "checkpoint-early" || visit.reason === "flag-early"))
      notYet(next.cell, visit.reason === "flag-early");
    else updateTrailPrompt();
    if (next.reached) finished();
    return true;
  }

  function robotIntent(command) {
    if (S.locked || !S.state) return false;
    var next = MR.command(S.state, command);
    if (next.blocked) {
      S.state = next;
      S.robotMisses++;
      refused(next.blocked);
      if (S.robotMisses >= 2) {
        S.eyesCompact = false;
        if (R.eyes) R.eyes.classList.remove("compact");
        if (R.eyesHeading) R.eyesHeading.hidden = false;
      }
      if (S.robotMisses >= 3) showRobotHint();
      updateRobotVisual();
      return false;
    }
    var visit = null;
    if (command === "F" && S.trail) {
      visit = MC.checkpointVisit(S.trail, S.trail.progress, next.cell, next.cell === S.round.goal);
      S.trail.progress = visit.progress;
      next.reached = visit.complete;
    }
    S.state = next;
    if (command === "F") {
      if (SND) SND.step(next.steps);
      place(R.hero, next.cell, 0, 0);
      if (visit && visit.accepted) renderTrail();
    } else if (SND && SND.turn) SND.turn(command);
    updateRobotVisual(command === "F" ? null : command);
    if (next.reached) finished();
    return true;
  }

  function showRobotHint() {
    Array.prototype.forEach.call(app.querySelectorAll(".robot-command.hint"), function (b) { b.classList.remove("hint"); });
    var solved = MR.solve(S.round.maze, S.state.cell, S.round.goal, S.state.heading, {
      trail: S.trail, progress: S.trail ? S.trail.progress : 0, maxCommands: 30,
    });
    var cmd = solved.nextCommands[0];
    var button = app.querySelector('.robot-command[data-command="' + cmd + '"]');
    if (button) button.classList.add("hint");
  }

  function notYet(cell, flagEarly) {
    if (SND) SND.tryAgain();
    var xy = cellXY(cell), f = R.trailFeedback;
    f.style.left = xy[0] + R.cellPx * .16 + "px";
    f.style.top = xy[1] + R.cellPx * .16 + "px";
    f.style.width = R.cellPx * .68 + "px";
    f.style.height = R.cellPx * .68 + "px";
    f.classList.remove("on"); void f.offsetWidth; f.classList.add("on");
    var label = R.labels && R.labels.querySelector('[data-cell="' + cell + '"]');
    if (label) { label.classList.remove("try-again"); void label.offsetWidth; label.classList.add("try-again"); }
    updateTrailPrompt(flagEarly ? "Find all the checkpoints first" : "Not yet — keep looking");
  }

  function padIntent(dir) {
    if (S.movement === "plan") return addMove(dir);
    if (S.mazeType === "robot") return robotIntent(dir);
    return intent(dir);
  }

  function chipCap() { return PLAN_CAP; }
  function arrowGlyph(dir) { return { up: "↑", right: "→", down: "↓", left: "←", F: "↑", L: "↶", R: "↷" }[dir]; }
  function commandName(dir) { return { F: "forward", L: "turn left", R: "turn right" }[dir] || dir; }

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

  function stripRowCapacity() {
    var width = R.strip && R.strip.clientWidth;
    if (!width) return PLAN_PREVIEW_SLOTS;
    return Math.max(1, Math.floor((width - 6 + SLOT_GAP) / (SLOT_SIZE + SLOT_GAP)));
  }

  function previewSlotCount() {
    var remaining = chipCap() - S.plan.length;
    if (remaining <= 0) return 0;
    // Show only enough quiet placeholders to finish the row the child is looking at.
    // The fallback is used by the dependency-free mounted harness, which has no layout.
    var row = Math.min(PLAN_PREVIEW_SLOTS, stripRowCapacity());
    var usedInRow = S.plan.length % row;
    return Math.min(remaining, usedInRow ? row - usedInRow : row);
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
        arrowGlyph(dir) + '<span class="sr-only">' + commandName(dir) + '</span>' + (hasQuestion ? '<span class="question">?</span>' : '') + '</button>';
    }).join("");
    var slotCount = previewSlotCount();
    var slots = new Array(slotCount + 1).join('<span class="move-slot" aria-hidden="true"></span>');
    var oldScroll = R.strip.scrollTop || 0;
    R.strip.innerHTML = chips + slots;
    R.strip.setAttribute("aria-label", "Planned moves: " + S.plan.length + " of " + chipCap());
    if (R.count) R.count.textContent = S.plan.length + " / " + chipCap();
    Array.prototype.forEach.call(R.strip.querySelectorAll(".move-chip"), function (b) {
      b.onclick = function () { if (!S.running) { S.plan.splice(+b.getAttribute("data-index"), 1); renderPlan(); } };
    });
    // Follow a newly appended chip, but do not yank the strip while GO is annotating chips.
    R.strip.scrollTop = S.planStatuses ? oldScroll : R.strip.scrollHeight;
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
    var runner = S.mazeType === "robot" ? MR.runProgram : MP.runPlan;
    var result = runner(S.round.maze, S.state, S.plan.slice(), S.trail ? {
      trail: S.trail,
      progress: S.trail.progress,
    } : null);
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
        if (S.trail && step.visit) {
          S.trail.progress = step.progress;
          if (step.visit.accepted) renderTrail();
          if (step.visit.reason === "checkpoint-early" || step.visit.reason === "flag-early")
            notYet(S.state.cell, step.visit.reason === "flag-early");
          else updateTrailPrompt();
        }
        if (SND) SND.step(S.state.steps);
        place(R.hero, S.state.cell, 0, 0);
        updateRobotVisual();
        statuses[i] = "used"; renderPlan(statuses);
        if (S.state.reached) return later(function () { finishPlan(result, statuses); }, 400);
        later(function () { walk(i + 1); }, 400);
      } else if (step.turned) {
        S.state = step.after;
        if (SND && SND.turn) SND.turn(step.command);
        updateRobotVisual(step.command);
        statuses[i] = "used turn-used"; renderPlan(statuses);
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
      if (S.mazeType === "robot") {
        S.eyesCompact = false;
        if (R.eyes) R.eyes.classList.remove("compact");
        if (R.eyesHeading) R.eyesHeading.hidden = false;
      }
    }
    if (S.wallAttempts >= 3) {
      if (S.mazeType === "robot") showRobotHint();
      else {
        var d = directionToGoal(result.steps[failed].before.cell);
        var hint = app.querySelector(".arrow-" + d);
        if (hint) hint.classList.add("hint");
      }
    }
    renderPlan(statuses);
    later(function () {
      walkBack(result.steps.slice(0, failed).filter(function (s) { return s.moved; }).reverse(), 0, result.startProgress);
    }, 1000);
  }

  function clearPlanFeedback() {
    S.planStatuses = null;
    if (R && R.trail) R.trail.innerHTML = "";
    Array.prototype.forEach.call(app.querySelectorAll(".arrow.hint"), function (b) { b.classList.remove("hint"); });
  }

  function walkBack(steps, i, restoreProgress) {
    if (i >= steps.length) {
      S.state = S.chunkStart;
      if (S.trail && restoreProgress !== undefined) { S.trail.progress = restoreProgress; renderTrail(); }
      place(R.hero, S.state.cell, 0, 0);
      updateRobotVisual();
      controlsRunning(false);
      return;
    }
    S.state = steps[i].before;
    place(R.hero, S.state.cell, 0, 0);
    updateRobotVisual();
    later(function () { walkBack(steps, i + 1, restoreProgress); }, 180);
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
    if (S.trail && S.trail.progress < S.trail.count) { notYet(S.round.goal, true); return; }
    S.locked = true;
    detachInput();
    var done = doneForChoice();
    if (done.indexOf(S.rung) < 0) { done.push(S.rung); save(doneKey(), done); }
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
      var dir = b.getAttribute("data-command") || b.getAttribute("data-dir"), hold = null, rep = null, viaPointer = false;
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
    if (S.mazeType === "robot") map = { ArrowUp: "F", ArrowLeft: "L", ArrowRight: "R" };
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
        var moved = intent(dir);
        if (!moved) { D.ax = p[0]; D.ay = p[1]; break; }
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
    get movement() { return S.movement; }, get goal() { return S.goal; },
    get mazeType() { return S.mazeType; }, get heading() { return S.state && S.state.heading; },
    get robotMisses() { return S.robotMisses; }, get eyesCompact() { return S.eyesCompact; },
    get plan() { return S.plan.slice(); }, get wallAttempts() { return S.wallAttempts; },
    get trail() { return S.trail; },
    get running() { return S.running; }, get cap() { return chipCap(); },
    get planCap() { return PLAN_CAP; }, get previewSlots() { return previewSlotCount(); },
    LADDER: LADDER, ROBOT_LEVELS: ROBOT_LEVELS, TRAIL_COUNTS: TRAIL_COUNTS, TRAIL_OFF_PATH: TRAIL_OFF_PATH, CAST: CAST,
  };

  // Always open on the friend picker, with the last friend marked: a child coming back
  // chooses again rather than landing mid-maze.
  picker();
})();
