/*
 * Our Maze — maze core.
 *
 * Pure maze logic: no DOM, no network, no storage, no art. Data in, data out — the
 * pattern-core.js seam, so the engine loads from a <script> tag (global MazeCore)
 * and from node (module.exports) without dragging any app's UI with it.
 *
 * Representation
 * --------------
 * A maze is { cols, rows, open, seed, bias, braid, passages } over cols*rows cells
 * addressed row-major: index i = row * cols + col, so cell 0 is the top-left corner.
 *
 * open[i] is one byte per cell: a bitmask of the passages leading OUT of cell i —
 *   "up" = 1, "right" = 2, "down" = 4, "left" = 8.
 * "Is the wall between cell A and its neighbour in direction D open?" is O(1):
 *   (open[A] & BIT[D]) !== 0        — isOpen(maze, A, "up") at the API surface.
 * The mask is kept symmetric (a wall is carved from both sides at once), so the
 * answer is the same whichever cell you ask from. A bit that points off the grid is
 * never set: only walls between two in-grid cells can open, never an edge. One
 * small int per cell keeps a whole round JSON-serialisable, which is exactly how
 * "same seed, same maze" is checked.
 *
 * Everything is reproducible: generate() from a seed, makeRound() from a seed plus
 * its options — same inputs, same maze, start, goal and solution, any machine.
 */
(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) {
    module.exports = factory();
  } else {
    root.MazeCore = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* ---------- directions: clockwise from the top; opposite = (d + 2) % 4 -------- */

  const DIRS = ["up", "right", "down", "left"];
  const BIT = [1, 2, 4, 8];
  const DX = [0, 1, 0, -1];
  const DY = [-1, 0, 1, 0];
  const POP = [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4]; // popcount, 0..15

  /* ---------- seeded RNG (mulberry32) — the math-app / pattern-core convention --- */

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const int = (r, n) => Math.floor(r() * n);
  const pick = (r, arr) => arr[int(r, arr.length)];
  function shuffled(r, arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = int(r, i + 1);
      const tmp = a[i];
      a[i] = a[j];
      a[j] = tmp;
    }
    return a;
  }

  function clamp01(x) {
    if (!Number.isFinite(x)) throw new Error("expected a number in 0..1, got " + x);
    return Math.min(1, Math.max(0, x));
  }

  /* ---------- grid plumbing ----------------------------------------------------- */

  function cellIndex(m, col, row) {
    if (!Number.isInteger(col) || !Number.isInteger(row) ||
        col < 0 || row < 0 || col >= m.cols || row >= m.rows)
      throw new Error("(" + col + "," + row + ") is outside a " + m.cols + "x" + m.rows + " maze");
    return row * m.cols + col;
  }
  const colOf = (m, i) => i % m.cols;
  const rowOf = (m, i) => Math.floor(i / m.cols);

  function _checkCell(m, i, what) {
    if (!Number.isInteger(i) || i < 0 || i >= m.cols * m.rows)
      throw new Error(what + " is not a cell index of a " + m.cols + "x" + m.rows + " maze: " + i);
  }

  // Neighbour of i in numeric direction d, or -1 off the grid.
  function _nb(m, i, d) {
    const col = (i % m.cols) + DX[d];
    const row = Math.floor(i / m.cols) + DY[d];
    if (col < 0 || row < 0 || col >= m.cols || row >= m.rows) return -1;
    return row * m.cols + col;
  }
  function neighbourOf(m, i, dirName) {
    return _nb(m, i, dirIndex(dirName));
  }

  function dirIndex(name) {
    const d = DIRS.indexOf(name);
    if (d < 0) throw new Error("unknown direction '" + name + "' (want up|right|down|left)");
    return d;
  }

  function isOpen(m, i, dirName) {
    return (m.open[i] & BIT[dirIndex(dirName)]) !== 0;
  }

  // The choices a child taps: open direction names from a cell.
  function exitsAt(m, i) {
    _checkCell(m, i, "cell");
    const out = [];
    for (let d = 0; d < 4; d++) if (m.open[i] & BIT[d]) out.push(DIRS[d]);
    return out;
  }

  function passageCount(m) {
    let bits = 0;
    for (let i = 0; i < m.open.length; i++) bits += POP[m.open[i]];
    return bits / 2; // symmetric mask: every passage counted from both sides
  }

  function deadEnds(m) {
    const out = [];
    for (let i = 0; i < m.open.length; i++) if (POP[m.open[i]] === 1) out.push(i);
    return out;
  }

  /* ---------- generation: growing tree, then optional braiding ------------------- */

  // bias = how often the NEWEST active cell is expanded rather than a random one.
  // 1 → randomised depth-first (long corridors), 0 → random-cell growing tree
  // (bushy). Default 0.6: corridor-ish with branch points, which reads well small.
  // braid = fraction of dead ends relieved by opening one extra wall (loops).
  function generate(opts) {
    if (!opts) throw new Error("generate({ cols, rows, seed, bias, braid }) needs options");
    const cols = opts.cols, rows = opts.rows;
    if (!Number.isInteger(cols) || !Number.isInteger(rows) || cols < 1 || rows < 1)
      throw new Error("cols and rows must be positive integers");
    const seed = opts.seed >>> 0;
    const bias = clamp01(opts.bias === undefined ? 0.6 : opts.bias);
    const braid = clamp01(opts.braid === undefined ? 0 : opts.braid);

    const r = mulberry32(seed);
    const grid = { cols, rows, open: new Array(cols * rows).fill(0) };
    const visited = new Uint8Array(cols * rows);
    const active = [int(r, cols * rows)];
    visited[active[0]] = 1;
    let carved = 0;

    while (active.length) {
      const ai = r() < bias ? active.length - 1 : int(r, active.length);
      const c = active[ai];
      const cands = [];
      for (let d = 0; d < 4; d++) {
        const v = _nb(grid, c, d);
        if (v >= 0 && !visited[v]) cands.push(d);
      }
      if (!cands.length) {
        active.splice(ai, 1);
        continue;
      }
      const d = cands[int(r, cands.length)];
      const v = _nb(grid, c, d);
      grid.open[c] |= BIT[d];
      grid.open[v] |= BIT[(d + 2) % 4];
      visited[v] = 1;
      active.push(v);
      carved++;
    }

    // Braiding: open one closed in-grid wall at that fraction of the dead ends.
    // Opening walls never creates a dead end, so a cell relieved earlier in the
    // pass is simply skipped when its turn comes.
    let braided = 0;
    if (braid > 0) {
      const ends = deadEnds(grid);
      const target = Math.round(ends.length * braid);
      const order = shuffled(r, ends);
      for (let k = 0; k < order.length && braided < target; k++) {
        const c = order[k];
        if (POP[grid.open[c]] !== 1) continue;
        const cands = [];
        for (let d = 0; d < 4; d++) {
          const v = _nb(grid, c, d);
          if (v >= 0 && !(grid.open[c] & BIT[d])) cands.push(d);
        }
        if (!cands.length) continue; // 1-wide corridor end: no legal wall to open
        const d = cands[int(r, cands.length)];
        const v = _nb(grid, c, d);
        grid.open[c] |= BIT[d];
        grid.open[v] |= BIT[(d + 2) % 4];
        braided++;
      }
    }

    return { cols, rows, open: grid.open, seed, bias, braid, passages: carved + braided };
  }

  /* ---------- distances and shortest path (BFS — all walls cost the same) -------- */

  function distances(m, from) {
    _checkCell(m, from, "from");
    const d = new Array(m.cols * m.rows).fill(-1);
    d[from] = 0;
    const queue = [from];
    for (let head = 0; head < queue.length; head++) {
      const c = queue[head];
      for (let dir = 0; dir < 4; dir++) {
        if (!(m.open[c] & BIT[dir])) continue;
        const v = _nb(m, c, dir);
        if (v >= 0 && d[v] < 0) {
          d[v] = d[c] + 1;
          queue.push(v);
        }
      }
    }
    return d;
  }

  // Shortest route as a list of cells, from `from` to `to` inclusive; null if the
  // two are not connected (cannot happen in a perfect or braided maze, but the
  // caller should not have to know that).
  function path(m, from, to) {
    _checkCell(m, from, "from");
    _checkCell(m, to, "to");
    if (from === to) return [from];
    const prev = new Int32Array(m.cols * m.rows).fill(-1);
    const seen = new Uint8Array(m.cols * m.rows);
    seen[from] = 1;
    const queue = [from];
    for (let head = 0; head < queue.length; head++) {
      const c = queue[head];
      for (let dir = 0; dir < 4; dir++) {
        if (!(m.open[c] & BIT[dir])) continue;
        const v = _nb(m, c, dir);
        if (v >= 0 && !seen[v]) {
          seen[v] = 1;
          prev[v] = c;
          queue.push(v);
        }
      }
    }
    if (!seen[to]) return null;
    const out = [];
    for (let c = to; c !== -1; c = prev[c]) out.push(c);
    out.reverse();
    return out;
  }

  /* ---------- goal placement and rounds ------------------------------------------ */

  // Picks a goal among cells whose BFS distance from start is in [minSteps,
  // maxSteps]. If the band is empty it says so and returns no goal — the caller
  // retries with a new seed (makeRound does exactly that); it never quietly
  // returns a goal outside the band.
  function placeGoal(m, opts) {
    if (!opts) throw new Error("placeGoal(maze, { start, minSteps, maxSteps, rng }) needs options");
    const start = opts.start;
    _checkCell(m, start, "start");
    const minSteps = opts.minSteps, maxSteps = opts.maxSteps;
    const d = distances(m, start);
    const cands = [];
    for (let i = 0; i < d.length; i++)
      if (i !== start && d[i] >= minSteps && d[i] <= maxSteps) cands.push(i);
    if (!cands.length)
      return {
        ok: false,
        goal: null,
        reason: "no cell is " + minSteps + ".." + maxSteps + " steps from start " + start +
                " — retry with a new seed",
      };
    const r = opts.rng || Math.random;
    const goal = pick(r, cands);
    return { ok: true, goal, distance: d[goal] };
  }

  const MAX_ATTEMPTS = 60;

  // The seeded retry loop: generate, place start (top-left corner by default —
  // stable, so the same seed always means the same corner) and a goal in band.
  function makeRound(opts) {
    if (!opts) throw new Error("makeRound({ cols, rows, seed, minSteps, maxSteps, braid, bias }) needs options");
    const cols = opts.cols, rows = opts.rows;
    if (!Number.isInteger(cols) || !Number.isInteger(rows) || cols < 1 || rows < 1)
      throw new Error("cols and rows must be positive integers");
    const seed = opts.seed >>> 0;
    const bias = opts.bias === undefined ? 0.6 : opts.bias;
    const braid = opts.braid === undefined ? 0 : opts.braid;
    const minSteps = opts.minSteps, maxSteps = opts.maxSteps;
    const start = opts.start === undefined ? 0 : opts.start;
    _checkCell({ cols, rows }, start, "start");

    const master = mulberry32(seed);
    let lastReason = "";
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const attemptSeed = int(master, 4294967296);
      const maze = generate({ cols, rows, seed: attemptSeed, bias, braid });
      const goalRng = mulberry32((attemptSeed ^ 0x6d2b79f5) >>> 0); // a second stream off the same attempt
      const placed = placeGoal(maze, { start, minSteps, maxSteps, rng: goalRng });
      if (!placed.ok) {
        lastReason = placed.reason;
        continue;
      }
      return {
        ok: true,
        seed,
        cols,
        rows,
        maze,
        start,
        goal: placed.goal,
        solution: path(maze, start, placed.goal),
        attempts: attempt,
      };
    }
    return {
      ok: false,
      seed,
      cols,
      rows,
      start,
      attempts: MAX_ATTEMPTS,
      reason: "no goal in " + minSteps + ".." + maxSteps + " steps after " + MAX_ATTEMPTS +
              " attempts; last: " + lastReason,
    };
  }

  /* ---------- stage payload helpers (pure data — nothing here draws anything) ----- */

  function _stepDir(m, a, b, i) {
    _checkCell(m, a, "solution[" + i + "]");
    _checkCell(m, b, "solution[" + (i + 1) + "]");
    const dx = (b % m.cols) - (a % m.cols);
    const dy = Math.floor(b / m.cols) - Math.floor(a / m.cols);
    let d = -1;
    if (dx === 1 && dy === 0) d = 1;
    else if (dx === -1 && dy === 0) d = 3;
    else if (dx === 0 && dy === 1) d = 2;
    else if (dx === 0 && dy === -1) d = 0;
    if (d < 0 || !(m.open[a] & BIT[d]))
      throw new Error("solution step " + i + ": " + b + " is not across an open wall from " + a);
    return d;
  }

  // Stage 2: one direction name per step — the arrow that continues the route at
  // each cell. arrows[i] is how to step from solution[i] to solution[i+1].
  function arrowSteps(m, solution) {
    if (!Array.isArray(solution) || solution.length === 0)
      throw new Error("arrowSteps needs the solution cell list from makeRound");
    const arrows = [];
    for (let i = 0; i + 1 < solution.length; i++) arrows.push(DIRS[_stepDir(m, solution[i], solution[i + 1], i)]);
    return arrows;
  }

  // Replays "always step to the open neighbour carrying the next number". Returns
  // { ok, path } — ok false carries a reason and the partial walk.
  function followNumbers(m, start, labels) {
    _checkCell(m, start, "start");
    let max = 0;
    for (let i = 0; i < labels.length; i++) if (labels[i] !== null && labels[i] > max) max = labels[i];
    const walked = [start];
    let cur = start;
    for (;;) {
      const next = (labels[cur] === null ? 0 : labels[cur]) + 1;
      if (next > max) return { ok: true, path: walked };
      let hit = -1, hits = 0;
      for (let d = 0; d < 4; d++) {
        if (!(m.open[cur] & BIT[d])) continue;
        const v = _nb(m, cur, d);
        if (v >= 0 && labels[v] === next) {
          hits++;
          hit = v;
        }
      }
      if (hits === 0)
        return { ok: false, path: walked, reason: "stuck at cell " + cur + ": no open neighbour carries " + next };
      if (hits > 1)
        return { ok: false, path: walked, reason: "ambiguous at cell " + cur + ": " + hits + " open neighbours carry " + next };
      walked.push(hit);
      cur = hit;
      if (walked.length > m.cols * m.rows)
        return { ok: false, path: walked, reason: "walk exceeded the cell count — labels do not form a simple route" };
    }
  }

  function _samePath(a, b) {
    return a.length === b.length && a.every((v, i) => v === b[i]);
  }

  // Stage 3: writes 1..N on the solution cells, then places decoy numbers on
  // off-route cells beside junctions, so a wrong exit at a junction shows a number
  // that is not the next one. A decoy may not carry the number a neighbouring
  // route cell shows, nor the next one that cell is looking for — across a wall
  // as well as through it, because a child sees neighbouring numbers on the grid
  // even where they cannot walk. Every value is replayed through followNumbers
  // before it is kept: a payload that fails its own replay is never handed back.
  function numberRoute(m, solution, opts) {
    if (!Array.isArray(solution) || solution.length < 2)
      throw new Error("numberRoute needs a solution of at least 2 cells");
    opts = opts || {};
    const r = opts.rng || Math.random;
    const wantDecoys = opts.decoys === undefined ? 3 : opts.decoys;

    const n = m.cols * m.rows;
    const labels = new Array(n).fill(null);
    const onRoute = new Uint8Array(n);
    const posOf = new Map();
    for (let i = 0; i < solution.length; i++) {
      _checkCell(m, solution[i], "solution[" + i + "]");
      if (onRoute[solution[i]]) throw new Error("solution visits cell " + solution[i] + " twice");
      onRoute[solution[i]] = 1;
      posOf.set(solution[i], i);
      labels[solution[i]] = i + 1;
    }

    // A junction is a route cell with three or more exits — a place to go wrong.
    const junctions = [];
    for (let i = 0; i < solution.length; i++)
      if (POP[m.open[solution[i]]] >= 3) junctions.push(solution[i]);

    const cands = [];
    for (let k = 0; k < junctions.length; k++) {
      const j = junctions[k];
      for (let d = 0; d < 4; d++) {
        if (!(m.open[j] & BIT[d])) continue;
        const v = _nb(m, j, d);
        if (v >= 0 && !onRoute[v] && labels[v] === null && !cands.includes(v)) cands.push(v);
      }
    }

    const decoys = [];
    const order = shuffled(r, cands);
    for (let k = 0; k < order.length && decoys.length < wantDecoys; k++) {
      const cell = order[k];
      // Bar the number every neighbouring route cell shows (i + 1) and the next
      // one that cell is looking for (i + 2) — over all four neighbours, wall or
      // not: two numbers side by side read as a pair even where a child cannot walk.
      const forbidden = new Set();
      for (let d = 0; d < 4; d++) {
        const v = _nb(m, cell, d);
        if (v < 0 || !onRoute[v]) continue;
        const i = posOf.get(v);
        forbidden.add(i + 1);
        if (i + 1 < solution.length) forbidden.add(i + 2);
      }
      const allowed = [];
      for (let v = 1; v <= solution.length; v++) if (!forbidden.has(v)) allowed.push(v);
      let kept = false;
      for (const value of shuffled(r, allowed)) {
        labels[cell] = value;
        const replay = followNumbers(m, solution[0], labels);
        if (replay.ok && _samePath(replay.path, solution)) {
          decoys.push({ cell, value });
          kept = true;
          break;
        }
      }
      if (!kept) labels[cell] = null; // never ship a payload that fails its own replay
    }

    return { labels, decoys, junctions };
  }

  /* ---------- proposed stage bands ------------------------------------------------- */

  // PROPOSAL, not settled design: these bands are what the engine is tested
  // against while the owner decides which stages v1 contains and whether stage 1
  // is tap, drag or both. Nothing else in the repository treats them as decided.
  const PROPOSED_STAGE_BANDS = {
    tracing: { cols: 5, rows: 5, minSteps: 5, maxSteps: 8, braid: 0.2 },
    direction: { cols: 7, rows: 7, minSteps: 8, maxSteps: 12 },
    number: { cols: 9, rows: 9, minSteps: 10, maxSteps: 16 },
  };

  /* ---------- public API ----------------------------------------------------------- */

  return {
    DIRS,
    PROPOSED_STAGE_BANDS,
    mulberry32,
    generate,
    distances,
    path,
    placeGoal,
    makeRound,
    arrowSteps,
    numberRoute,
    followNumbers,
    exitsAt,
    isOpen,
    neighbourOf,
    cellIndex,
    colOf,
    rowOf,
    passageCount,
    deadEnds,
  };
});
