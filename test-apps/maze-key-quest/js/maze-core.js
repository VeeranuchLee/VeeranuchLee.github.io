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

  // Measures the choices a child actually meets on the route, rather than treating
  // a larger grid as automatically harder. A decision point has at least one open
  // exit off the shortest solution. `longestWrongTurn` is the deepest reachable
  // off-route cell behind one of those exits; `longestDeadEnd` is the greatest
  // shortest walk from an off-route dead end back to the solution. `loops` is the
  // cyclomatic count for this connected grid graph.
  function analyseTopology(m, solution) {
    if (!Array.isArray(solution) || solution.length < 2)
      throw new Error("analyseTopology needs a solution of at least 2 cells");
    const n = m.cols * m.rows;
    const onRoute = new Uint8Array(n);
    for (let i = 0; i < solution.length; i++) {
      _checkCell(m, solution[i], "solution[" + i + "]");
      onRoute[solution[i]] = 1;
    }

    const entries = [];
    let decisions = 0;
    for (let i = 0; i + 1 < solution.length; i++) {
      const c = solution[i];
      let wrongHere = 0;
      for (let d = 0; d < 4; d++) {
        if (!(m.open[c] & BIT[d])) continue;
        const v = _nb(m, c, d);
        if (v >= 0 && !onRoute[v]) {
          wrongHere++;
          if (!entries.includes(v)) entries.push(v);
        }
      }
      if (wrongHere) decisions++;
    }

    let longestWrongTurn = 0;
    for (const entry of entries) {
      const dist = new Int32Array(n).fill(-1);
      dist[entry] = 0;
      const queue = [entry];
      for (let head = 0; head < queue.length; head++) {
        const c = queue[head];
        longestWrongTurn = Math.max(longestWrongTurn, dist[c] + 1);
        for (let d = 0; d < 4; d++) {
          if (!(m.open[c] & BIT[d])) continue;
          const v = _nb(m, c, d);
          if (v >= 0 && !onRoute[v] && dist[v] < 0) {
            dist[v] = dist[c] + 1;
            queue.push(v);
          }
        }
      }
    }

    // Multi-source BFS from the route gives every cell's shortest return distance.
    // Looking only at real dead ends prevents a broad loop from masquerading as a
    // long cul-de-sac.
    const back = new Int32Array(n).fill(-1);
    const queue = solution.slice();
    for (const c of queue) back[c] = 0;
    for (let head = 0; head < queue.length; head++) {
      const c = queue[head];
      for (let d = 0; d < 4; d++) {
        if (!(m.open[c] & BIT[d])) continue;
        const v = _nb(m, c, d);
        if (v >= 0 && back[v] < 0) {
          back[v] = back[c] + 1;
          queue.push(v);
        }
      }
    }
    let longestDeadEnd = 0;
    for (let i = 0; i < n; i++)
      if (!onRoute[i] && POP[m.open[i]] === 1) longestDeadEnd = Math.max(longestDeadEnd, back[i]);

    return {
      decisionPoints: decisions,
      wrongTurnEntries: entries.length,
      longestWrongTurn,
      longestDeadEnd,
      loops: passageCount(m) - n + 1,
    };
  }

  function topologyMeets(actual, wanted) {
    if (!wanted) return true;
    const keys = ["decisionPoints", "wrongTurnEntries", "longestWrongTurn", "longestDeadEnd", "loops"];
    for (const key of keys) {
      const min = wanted["min" + key[0].toUpperCase() + key.slice(1)];
      if (min !== undefined && actual[key] < min) return false;
    }
    return true;
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
      const solution = path(maze, start, placed.goal);
      const topology = analyseTopology(maze, solution);
      if (!topologyMeets(topology, opts.topology)) {
        lastReason = "topology " + JSON.stringify(topology) + " misses " + JSON.stringify(opts.topology);
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
        solution,
        topology,
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

  // Places a small set of ordered checkpoints only after the normal maze, start,
  // goal and shortest start→goal solution already exist. Checkpoints therefore do
  // not shape the maze or turn its solution into a labelled breadcrumb trail.
  //
  // Every pair is separated by a real maze-path distance. Off-path cells are side
  // regions by definition; preferring their deepest/dead-end cells makes the child
  // leave the shortest route, then backtrack. A failed placement is explicit so a
  // caller can keep the rung rules and try another independently generated round.
  function checkpointTrail(m, start, goal, opts) {
    opts = opts || {};
    _checkCell(m, start, "start");
    _checkCell(m, goal, "goal");
    const count = opts.count;
    const requiredOffPath = opts.requiredOffPath === undefined ? 1 : opts.requiredOffPath;
    if (!Number.isInteger(count) || count < 1 || count > 26)
      throw new Error("checkpointTrail count must be an integer in 1..26");
    if (!Number.isInteger(requiredOffPath) || requiredOffPath < 0 || requiredOffPath > count)
      throw new Error("checkpointTrail requiredOffPath must be in 0..count");
    const solution = opts.solution || path(m, start, goal);
    if (!solution || solution.length < 2)
      throw new Error("checkpointTrail needs a reachable start and goal");
    const routeSteps = solution.length - 1;
    const scaled = Math.floor(Math.sqrt(m.cols * m.rows) * 0.7);
    const minDistance = opts.minDistance === undefined
      ? Math.max(2, Math.min(Math.max(2, scaled), Math.ceil(routeSteps * 0.25)))
      : opts.minDistance;
    if (!Number.isInteger(minDistance) || minDistance < 1)
      throw new Error("checkpointTrail minDistance must be a positive integer");

    const n = m.cols * m.rows;
    const onRoute = new Uint8Array(n);
    for (const cell of solution) onRoute[cell] = 1;
    const toRoute = new Array(n).fill(Infinity);
    const routeQueue = solution.slice();
    for (const cell of solution) toRoute[cell] = 0;
    for (let head = 0; head < routeQueue.length; head++) {
      const cell = routeQueue[head];
      for (let d = 0; d < 4; d++) {
        if (!(m.open[cell] & BIT[d])) continue;
        const v = _nb(m, cell, d);
        if (v >= 0 && toRoute[v] === Infinity) {
          toRoute[v] = toRoute[cell] + 1;
          routeQueue.push(v);
        }
      }
    }

    const allDistances = new Array(n);
    function apart(cell, selected) {
      if (!allDistances[cell]) allDistances[cell] = distances(m, cell);
      return selected.every(other => allDistances[cell][other] >= minDistance);
    }
    const candidates = [];
    const branches = [];
    for (let cell = 0; cell < n; cell++) {
      if (cell === start || cell === goal) continue;
      candidates.push(cell);
      if (!onRoute[cell]) branches.push(cell);
    }
    const deadBranches = branches.filter(cell => POP[m.open[cell]] === 1);
    if (deadBranches.length < requiredOffPath)
      return { ok: false, reason: "only " + deadBranches.length + " off-path dead ends; need " + requiredOffPath };

    const r = opts.rng || Math.random;
    let selected = null;
    const branchTarget = Math.max(requiredOffPath, Math.floor(count / 2));
    // Repeated seeded greedy packing is fast at these grids and avoids a fixed
    // top-left bias. Deep branch/dead-end cells get first refusal in half the tries.
    for (let attempt = 0; attempt < 1200 && !selected; attempt++) {
      const branchOrder = shuffled(r, branches).sort(function (a, b) {
        const depth = toRoute[b] - toRoute[a];
        if (depth) return depth;
        return (POP[m.open[a]] === 1 ? -1 : 0) - (POP[m.open[b]] === 1 ? -1 : 0);
      });
      const picked = [];
      for (const cell of shuffled(r, deadBranches).sort((a, b) => toRoute[b] - toRoute[a])) {
        if (apart(cell, picked)) picked.push(cell);
        if (picked.length === requiredOffPath) break;
      }
      if (picked.length < requiredOffPath) continue;
      for (const cell of branchOrder) {
        if (picked.includes(cell)) continue;
        if (apart(cell, picked)) picked.push(cell);
        if (picked.length === branchTarget) break;
      }
      if (picked.length < branchTarget) continue;
      for (const cell of shuffled(r, candidates)) {
        if (picked.includes(cell) || !apart(cell, picked)) continue;
        picked.push(cell);
        if (picked.length === count) break;
      }
      if (picked.length === count) {
        // Alternate route and off-route targets whenever possible, so consecutive
        // labels can never form one continuous strip along the flag solution.
        const side = shuffled(r, picked.filter(cell => !onRoute[cell]));
        const main = shuffled(r, picked.filter(cell => onRoute[cell]));
        const ordered = [];
        while (side.length || main.length) {
          if (main.length && (!ordered.length || !onRoute[ordered[ordered.length - 1]])) ordered.push(main.pop());
          if (side.length) ordered.push(side.pop());
          else if (main.length) break;
        }
        if (ordered.length === count && ordered.every((cell, i) => i === 0 || !onRoute[cell] || !onRoute[ordered[i - 1]]))
          selected = ordered;
      }
    }
    if (!selected)
      return { ok: false, reason: "cannot place " + count + " checkpoints " + minDistance + " steps apart" };

    const labels = new Array(n).fill(null);
    const checkpoints = selected.map(function (cell, i) {
      labels[cell] = i + 1;
      return { cell, value: i + 1, offPath: !onRoute[cell], deadEnd: POP[m.open[cell]] === 1, branchDepth: toRoute[cell] };
    });
    return {
      ok: true,
      labels,
      checkpoints,
      count,
      progress: 0,
      minDistance,
      requiredOffPath,
      offPathCount: checkpoints.filter(c => c.offPath).length,
      solution: solution.slice(),
    };
  }

  // Pure progression rule shared by the page and tests. Later checkpoints and an
  // early flag are gentle "not yet" events: the child may stand there and continue.
  function checkpointVisit(trail, progress, cell, atGoal) {
    if (!trail || !Array.isArray(trail.labels) || !Number.isInteger(trail.count))
      throw new Error("checkpointVisit needs a checkpointTrail payload");
    if (!Number.isInteger(progress) || progress < 0 || progress > trail.count)
      throw new Error("checkpointVisit progress must be in 0..count");
    if (atGoal)
      return progress === trail.count
        ? { progress, accepted: false, complete: true, reason: "complete" }
        : { progress, accepted: false, complete: false, reason: "flag-early" };
    const value = trail.labels[cell];
    if (value === progress + 1)
      return { progress: progress + 1, accepted: true, complete: false, reason: "checkpoint" };
    if (value !== null && value > progress + 1)
      return { progress, accepted: false, complete: false, reason: "checkpoint-early" };
    return { progress, accepted: false, complete: false, reason: "ordinary" };
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
    checkpointTrail,
    checkpointVisit,
    exitsAt,
    isOpen,
    neighbourOf,
    cellIndex,
    colOf,
    rowOf,
    passageCount,
    deadEnds,
    analyseTopology,
  };
});
