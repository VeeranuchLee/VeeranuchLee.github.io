/*
 * Token Maze — maze core.
 *
 * Pure game logic: no DOM, no canvas, no audio, no storage backend. Data in, data
 * out — the maze-app/js/maze-core.js seam, so this file loads from a <script> tag
 * (global TokenMazeCore) and from node (module.exports) without dragging the UI
 * with it. tools/test-rules.mjs checks the rules below without a browser.
 *
 * Levels are hand-authored maps (strings, one per row) so every garden is known
 * good by construction: '#' wall, '.' path, 'S' RAM start, 'T' gold token,
 * 'G' GPU palette, 'B' bug start. The outer ring of every map is wall, so there
 * are no tunnels at the edges and nothing can leave the grid.
 *
 * Movement rule ("games ask, children answer"): one tap runs in one direction
 * until the next place a choice exists — a junction (3+ open sides) or a dead
 * end — or a wall stops it, then RAM waits for the next tap. A tap into
 * a wall is refused, never an error: same cell, blocked=true, so the page can
 * answer every tap with a nudge and a soft sound.
 */
(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) module.exports = factory();
  else root.TokenMazeCore = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var DIRS = ["up", "right", "down", "left"];
  var DX = [0, 1, 0, -1];
  var DY = [-1, 0, 1, 0];

  /* ---------- the eight gardens: one new thing each -------------------- */
  var LEVELS = [
    { word: "Tokens", label: "Tokens = AI's little word pieces", bugSpeed: 0, map: [
      "#######",
      "#S.T.T#",
      "#.#.#.#",
      "#T.T.T#",
      "#.#.#.#",
      "#T.T.T#",
      "#.#.#.#",
      "#T.T.T#",
      "#######"
    ] },
    { word: "Glitch", label: "Glitch bugs = friendly trouble", bugSpeed: 0.8, map: [
      "#########",
      "#T..B..T#",
      "#.##.##.#",
      "#.##.##.#",
      "#T..T..T#",
      "#.##.##.#",
      "#.##.##.#",
      "#T..T..T#",
      "#.##.##.#",
      "#S..T..T#",
      "#########"
    ] },
    { word: "GPU", label: "GPU = super fast", bugSpeed: 0.9, map: [
      "#########",
      "#T..B..T#",
      "#.##.##.#",
      "#.T#.##.#",
      "#T..G..T#",
      "#.##.##.#",
      "#.##.T#.#",
      "#T..T..T#",
      "#.##.##.#",
      "#S..T..T#",
      "#########"
    ] },
    { word: "CPU", label: "CPU = warm when busy", bugSpeed: 1.05, map: [
      "#########",
      "#T..B..T#",
      "#..#.##.#",
      "#..#.#T.#",
      "#T..G..T#",
      "#.##.#..#",
      "#.##.#..#",
      "#T..B..T#",
      "#.##.##.#",
      "#S.TT..T#",
      "#########"
    ] },
    { word: "RAM", label: "RAM = quick little memory", bugSpeed: 1.15, map: [
      "############",
      "#T..T..T..B#",
      "#.##.##.##.#",
      "#T##.##.##.#",
      "#..T...G.T.#",
      "#.##.##.##.#",
      "#.##.##.T#.#",
      "#T..B.....T#",
      "#.##.##.##.#",
      "#.##.##.##.#",
      "#S.T..T..T.#",
      "#.##.##.##.#",
      "############"
    ] },
    { word: "Storage", label: "Storage = saved space", bugSpeed: 1.3, map: [
      "############",
      "#B..T..T..T#",
      "#.##.##.##.#",
      "#.##.T#.##.#",
      "#T..G..T.G.#",
      "#.##.##.##.#",
      "#.##.##.##.#",
      "#T..B..T..B#",
      "#.##.##.##.#",
      "#.T#.##.#T.#",
      "#S...T..T..#",
      "#.##.##.##.#",
      "############"
    ] },
    { word: "Bug Fix", label: "GPU glow fixes bugs", bugSpeed: 1.5, map: [
      "############",
      "#T..B..T..T#",
      "#..#.##.#..#",
      "#T.#.##.#.T#",
      "#..T.G..T..#",
      "#.##.##.##.#",
      "#.##.T#.##.#",
      "#T..B...B.T#",
      "#.##.##.##.#",
      "#.##.##.##.#",
      "#S.T...G.T.#",
      "#.##.##.##.#",
      "############"
    ] },
    { word: "Crew", label: null, bugSpeed: 1.7, map: [
      "############",
      "#B..T..B..T#",
      "#.##.##.##.#",
      "#.##.T#.##.#",
      "#T..G...G.T#",
      "#.##.##.##.#",
      "#T##.##.##T#",
      "#T..B..B..T#",
      "#.##.##.##.#",
      "#.##.##.##.#",
      "#S.T..T..T.#",
      "#.##.##.##.#",
      "############"
    ] }
  ];

  /* ---------- map parsing ------------------------------------------------ */
  function parseLevel(def, index) {
    if (!def || !Array.isArray(def.map) || !def.map.length) throw new Error("level needs a map");
    var rows = def.map, rowCount = rows.length, colCount = rows[0].length;
    var walls = new Uint8Array(colCount * rowCount);
    var tokens = [], gpus = [], bugs = [];
    var start = -1;
    for (var r = 0; r < rowCount; r++) {
      if (typeof rows[r] !== "string" || rows[r].length !== colCount)
        throw new Error("level " + (index + 1) + " row " + r + " must be " + colCount + " cells");
      for (var c = 0; c < colCount; c++) {
        var ch = rows[r][c], i = r * colCount + c;
        if (ch === "#") { walls[i] = 1; continue; }
        if (ch === "S") start = i;
        else if (ch === "T") tokens.push(i);
        else if (ch === "G") gpus.push(i);
        else if (ch === "B") bugs.push(i);
        else if (ch !== ".") throw new Error("level " + (index + 1) + " row " + r + " has unknown cell '" + ch + "'");
      }
    }
    if (start < 0) throw new Error("level " + (index + 1) + " has no start square");
    return {
      index: index, cols: colCount, rows: rowCount, walls: walls,
      start: start, tokens: tokens, gpus: gpus, bugs: bugs,
      bugSpeed: def.bugSpeed, label: def.label || null, word: def.word
    };
  }

  /* ---------- grid plumbing ------------------------------------------------ */
  function colOf(l, i) { return i % l.cols; }
  function rowOf(l, i) { return Math.floor(i / l.cols); }
  function inBounds(l, c, r) { return c >= 0 && r >= 0 && c < l.cols && r < l.rows; }
  function isFloor(l, i) { return i >= 0 && i < l.walls.length && l.walls[i] === 0; }
  function neighbour(l, i, dirName) {
    var d = DIRS.indexOf(dirName);
    if (d < 0) throw new Error("unknown direction '" + dirName + "' (want up|right|down|left)");
    var c = colOf(l, i) + DX[d], r = rowOf(l, i) + DY[d];
    return inBounds(l, c, r) ? r * l.cols + c : -1;
  }
  function floorNeighbours(l, i) {
    var out = [];
    for (var d = 0; d < 4; d++) {
      var n = neighbour(l, i, DIRS[d]);
      if (n >= 0 && l.walls[n] === 0) out.push(n);
    }
    return out;
  }
  function isJunction(l, i) { return floorNeighbours(l, i).length >= 3; }

  // The open direction from `from` straight to the adjacent cell `to`, or null.
  function dirTo(l, from, to) {
    if (!isFloor(l, from) || !isFloor(l, to)) return null;
    for (var d = 0; d < 4; d++) if (neighbour(l, from, DIRS[d]) === to) return DIRS[d];
    return null;
  }

  // The whole outer ring is wall: no tunnels, and no run can leave the grid.
  function borderIsWalled(l) {
    for (var c = 0; c < l.cols; c++)
      if (!l.walls[c] || !l.walls[(l.rows - 1) * l.cols + c]) return false;
    for (var r = 0; r < l.rows; r++)
      if (!l.walls[r * l.cols] || !l.walls[r * l.cols + l.cols - 1]) return false;
    return true;
  }

  /* ---------- one tap: run to the next junction --------------------------- */
  // Walks cell by cell while the way ahead is open, and stops the moment
  // RAM reaches a place with a choice: 3+ open sides (a junction) or one
  // open side (a dead end). A corner stops the run too, because the way ahead
  // is a wall. Returns { path, blocked, dir }; path always includes `from`.
  function runToJunction(l, from, dirName) {
    if (!isFloor(l, from)) throw new Error("runToJunction start " + from + " is a wall");
    var path = [from], cell = from;
    for (;;) {
      var next = neighbour(l, cell, dirName);
      if (next < 0 || l.walls[next] === 1) break;   // wall or grid edge ahead
      cell = next;
      path.push(cell);
      if (floorNeighbours(l, cell).length !== 2) break; // junction or dead end: wait
    }
    return { path: path, blocked: path.length === 1, dir: dirName };
  }

  /* ---------- the friendly glitch bugs ------------------------------------ */
  // Bugs wander. They keep their direction a little more than half the time,
  // never reverse unless a dead end forces it, and never walk into walls.
  // Deterministic given the rng, so the tests can replay a wander.
  function stepBug(l, bug, rng) {
    var from = bug.cell;
    if (!isFloor(l, from)) throw new Error("stepBug cell " + from + " is a wall");
    var options = [], d;
    for (d = 0; d < 4; d++) {
      var n = neighbour(l, from, DIRS[d]);
      if (n >= 0 && l.walls[n] === 0) options.push(d);
    }
    if (!options.length) return { cell: from, dir: bug.dir };
    if (options.length === 1) return { cell: neighbour(l, from, DIRS[options[0]]), dir: DIRS[options[0]] };
    var prev = bug.dir ? DIRS.indexOf(bug.dir) : -1;
    var choices = options;
    if (prev >= 0) {
      var reverse = (prev + 2) % 4;
      var filtered = [];
      for (d = 0; d < options.length; d++) if (options[d] !== reverse) filtered.push(options[d]);
      if (filtered.length) choices = filtered;
    }
    var pick;
    if (prev >= 0 && choices.indexOf(prev) >= 0 && rng() < 0.55) pick = prev;
    else pick = choices[Math.floor(rng() * choices.length) % choices.length];
    return { cell: neighbour(l, from, DIRS[pick]), dir: DIRS[pick] };
  }

  // Touching a bug only ever bumps. Fixed bugs (GPU glow) never bump again.
  function bumpCheck(playerCell, bugs) {
    for (var i = 0; i < bugs.length; i++)
      if (!bugs[i].fixed && bugs[i].cell === playerCell) return i;
    return -1;
  }

  /* ---------- progress: current level, stickers, saved tokens ------------- */
  var STORAGE_KEY = "token-maze.progress";

  function Progress(storage) {
    this.storage = null;
    try { if (storage && typeof storage.getItem === "function") this.storage = storage; }
    catch (e) { this.storage = null; }
    var words = LEVELS.map(function (def) { return def.word; });
    this.state = { level: 1, stickers: [], tokens: new Array(LEVELS.length).fill(0) };
    var saved = null;
    if (this.storage) {
      try { saved = JSON.parse(this.storage.getItem(STORAGE_KEY) || "null"); }
      catch (e) { saved = null; }
    }
    if (saved && typeof saved === "object") {
      if (Number.isInteger(saved.level) && saved.level >= 1 && saved.level <= LEVELS.length) this.state.level = saved.level;
      if (Array.isArray(saved.stickers)) {
        var seen = [];
        for (var i = 0; i < saved.stickers.length; i++)
          if (words.indexOf(saved.stickers[i]) >= 0 && seen.indexOf(saved.stickers[i]) < 0) seen.push(saved.stickers[i]);
        this.state.stickers = seen;
      }
      if (Array.isArray(saved.tokens)) {
        for (var k = 0; k < LEVELS.length; k++) {
          var n = saved.tokens[k];
          if (Number.isFinite(n) && n > 0) this.state.tokens[k] = Math.floor(n);
        }
      }
    }
  }
  Progress.prototype.unlockedLevel = function () { return this.state.level; };
  Progress.prototype.stickers = function () { return this.state.stickers.slice(); };
  Progress.prototype.tokensByLevel = function () { return this.state.tokens.slice(); };
  Progress.prototype.totalSaved = function () {
    return this.state.tokens.reduce(function (a, b) { return a + b; }, 0);
  };
  // Finishing level `index` (0-based) records its tokens, awards the level's
  // sticker the first time, and unlocks the next level. A locked or unknown
  // level changes nothing and returns null. Never throws: saving is optional.
  Progress.prototype.completeLevel = function (index, tokensEaten) {
    if (!Number.isInteger(index) || index < 0 || index >= LEVELS.length) return null;
    if (index >= this.state.level) return null;
    var word = LEVELS[index].word;
    var eaten = Math.max(0, Math.floor(tokensEaten || 0));
    this.state.tokens[index] = Math.max(this.state.tokens[index], eaten);
    var sticker = null;
    if (this.state.stickers.indexOf(word) < 0) { this.state.stickers.push(word); sticker = word; }
    this.state.level = Math.min(LEVELS.length, Math.max(this.state.level, index + 2));
    this._save();
    return { sticker: sticker, word: word };
  };
  Progress.prototype._save = function () {
    if (!this.storage) return;
    try { this.storage.setItem(STORAGE_KEY, JSON.stringify(this.state)); }
    catch (e) { /* saving is optional; the game keeps working */ }
  };

  return {
    DIRS: DIRS, DX: DX, DY: DY, LEVELS: LEVELS,
    parseLevel: parseLevel,
    colOf: colOf, rowOf: rowOf, neighbour: neighbour, isFloor: isFloor,
    floorNeighbours: floorNeighbours, isJunction: isJunction, dirTo: dirTo,
    borderIsWalled: borderIsWalled,
    runToJunction: runToJunction,
    stepBug: stepBug, bumpCheck: bumpCheck,
    Progress: Progress
  };
});
