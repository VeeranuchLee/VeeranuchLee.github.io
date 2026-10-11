/*
 * Our Maze — Robot Code engine.
 *
 * Pure relative-programming logic over MazeCore/MazeMovement. A robot state is the
 * existing movement state plus heading N/E/S/W. F asks the shared wall engine for
 * one absolute step; L and R rotate in place and never visit a checkpoint.
 */
(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) {
    module.exports = factory(require("./maze-core.js"), require("./maze-movement.js"));
  } else {
    root.MazeRobot = factory(root.MazeCore, root.MazeMovement);
  }
})(typeof self !== "undefined" ? self : this, function (MazeCore, MazeMovement) {
  "use strict";

  if (!MazeCore || !MazeMovement) throw new Error("maze-robot needs maze-core and maze-movement first");

  var HEADINGS = ["N", "E", "S", "W"];
  var ABSOLUTE = ["up", "right", "down", "left"];
  var COMMANDS = ["F", "L", "R"];

  function headingIndex(heading) {
    var i = HEADINGS.indexOf(heading);
    if (i < 0) throw new Error("unknown heading '" + heading + "' (want N|E|S|W)");
    return i;
  }

  function initial(opts) {
    var base = MazeMovement.initial(opts);
    return Object.assign({}, base, {
      heading: HEADINGS[headingIndex(opts.heading === undefined ? "N" : opts.heading)],
      commands: 0,
      turns: 0,
    });
  }

  function command(state, cmd) {
    if (!state || HEADINGS.indexOf(state.heading) < 0) throw new Error("command needs a Robot Code state");
    if (COMMANDS.indexOf(cmd) < 0) throw new Error("unknown robot command '" + cmd + "' (want F|L|R)");
    var hi = headingIndex(state.heading);
    if (cmd === "L" || cmd === "R") {
      return Object.assign({}, state, {
        heading: HEADINGS[(hi + (cmd === "L" ? 3 : 1)) % 4],
        blocked: null,
        commands: (state.commands || 0) + 1,
        turns: (state.turns || 0) + 1,
      });
    }
    var moved = MazeMovement.step(state, ABSOLUTE[hi]);
    return Object.assign({}, moved, {
      heading: state.heading,
      commands: (state.commands || 0) + 1,
      turns: state.turns || 0,
    });
  }

  function runProgram(maze, start, commands, options) {
    if (!maze || !Array.isArray(maze.open)) throw new Error("runProgram needs a maze-core maze");
    if (!start || start.maze !== maze || HEADINGS.indexOf(start.heading) < 0)
      throw new Error("runProgram start must be a Robot Code state for this maze");
    if (!Array.isArray(commands)) throw new Error("runProgram commands must be an array");
    options = options || {};
    var trail = options.trail || null;
    var progress = trail ? (options.progress === undefined ? 0 : options.progress) : null;
    var startProgress = progress;
    var state = start, steps = [];
    for (var i = 0; i < commands.length; i++) {
      var before = state;
      var next = command(state, commands[i]);
      var turned = commands[i] !== "F";
      var moved = !turned && !next.blocked;
      var visit = null;
      if (moved && trail) {
        visit = MazeCore.checkpointVisit(trail, progress, next.cell, next.cell === next.goal);
        progress = visit.progress;
        next.reached = visit.complete;
      }
      steps.push({ index: i, command: commands[i], dir: turned ? null : ABSOLUTE[headingIndex(before.heading)],
        before: before, after: next, moved: moved, turned: turned, visit: visit, progress: progress });
      if (next.blocked) return { steps: steps, outcome: "wall", failedIndex: i,
        progress: progress, startProgress: startProgress };
      state = next;
      if (state.reached) return { steps: steps, outcome: "flag", failedIndex: null,
        progress: progress, startProgress: startProgress };
    }
    return { steps: steps, outcome: state.reached ? "flag" : "ended", failedIndex: null,
      progress: progress, startProgress: startProgress };
  }

  function solve(maze, start, goal, heading, options) {
    options = options || {};
    var trail = options.trail || null;
    var startProgress = trail ? (options.progress || 0) : 0;
    var maxCommands = options.maxCommands === undefined ? 30 : options.maxCommands;
    var maxSolutions = options.maxSolutions === undefined ? 16 : options.maxSolutions;
    headingIndex(heading);
    var startKey = start + "|" + heading + "|" + startProgress;
    var queue = [{ cell: start, heading: heading, progress: startProgress, commands: [] }];
    var best = new Map([[startKey, 0]]), visits = new Map([[startKey, 1]]), solutions = [], bestGoal = Infinity;
    for (var q = 0; q < queue.length; q++) {
      var node = queue[q], distance = node.commands.length;
      if (distance >= maxCommands || distance >= bestGoal) continue;
      for (var ci = 0; ci < COMMANDS.length; ci++) {
        var cmd = COMMANDS[ci], hi = headingIndex(node.heading);
        var cell = node.cell, nextHeading = node.heading, progress = node.progress;
        if (cmd === "L") nextHeading = HEADINGS[(hi + 3) % 4];
        else if (cmd === "R") nextHeading = HEADINGS[(hi + 1) % 4];
        else {
          var dir = ABSOLUTE[hi];
          if (!MazeCore.isOpen(maze, cell, dir)) continue;
          cell = MazeCore.neighbourOf(maze, cell, dir);
          if (trail) {
            var visit = MazeCore.checkpointVisit(trail, progress, cell, cell === goal);
            progress = visit.progress;
          }
        }
        var commands = node.commands.concat(cmd);
        var complete = cell === goal && (!trail || progress === trail.count);
        if (complete) {
          if (commands.length < bestGoal) { bestGoal = commands.length; solutions = []; }
          if (commands.length === bestGoal && solutions.length < maxSolutions) solutions.push(commands);
          continue;
        }
        var key = cell + "|" + nextHeading + "|" + progress;
        var known = best.get(key);
        if (known !== undefined && known < commands.length) continue;
        var equalVisits = known === commands.length ? (visits.get(key) || 0) : 0;
        // Preserve a few equal-cost predecessors (needed for LL/RR ties) without
        // expanding exponentially many turn-cycles that reach the same state.
        if (equalVisits >= (maxSolutions > 1 ? 4 : 1)) continue;
        best.set(key, commands.length);
        visits.set(key, equalVisits + 1);
        queue.push({ cell: cell, heading: nextHeading, progress: progress, commands: commands });
      }
    }
    var nextCommands = [];
    solutions.forEach(function (s) { if (s.length && nextCommands.indexOf(s[0]) < 0) nextCommands.push(s[0]); });
    return { ok: solutions.length > 0, distance: solutions.length ? bestGoal : Infinity,
      commands: solutions.length ? solutions[0] : null, solutions: solutions, nextCommands: nextCommands };
  }

  function relativeView(maze, cell, heading) {
    var hi = headingIndex(heading);
    function side(offset) {
      var dir = ABSOLUTE[(hi + offset + 4) % 4];
      return { dir: dir, open: MazeCore.isOpen(maze, cell, dir), cell: MazeCore.neighbourOf(maze, cell, dir) };
    }
    return { forward: side(0), right: side(1), back: side(2), left: side(-1) };
  }

  function qualifies(rung, solved, round) {
    if (!solved.ok || solved.distance > 30) return false;
    var c = solved.commands, turns = c.filter(function (x) { return x !== "F"; });
    if (rung === 0) return c.length >= 2 && turns.length === 0;
    if (rung === 1) return turns.length === 1 && c[0] === "F";
    if (rung === 2) return c.indexOf("L") >= 0 && c.indexOf("R") >= 0;
    if (rung === 3) return (c[0] === "L" || c[0] === "R") && turns.length >= 1;
    if (rung === 4) return (c[0] === "L" && c[1] === "L") || (c[0] === "R" && c[1] === "R");
    if (rung === 5) return c.length >= 16 && round.topology.decisionPoints >= 2;
    return c.length >= 12 && !!round.trail;
  }

  function checkpointPuzzleTrail(maze, start, goal, path) {
    if (path.length < 7) return null;
    var first = path[Math.max(1, Math.floor(path.length / 3))];
    var last = path[Math.min(path.length - 2, Math.floor(path.length * 2 / 3))];
    var onPath = new Set(path);
    var branches = MazeCore.deadEnds(maze).filter(function (cell) { return !onPath.has(cell); });
    branches.sort(function (a, b) {
      var da = MazeCore.path(maze, first, a).length + MazeCore.path(maze, a, last).length;
      var db = MazeCore.path(maze, first, b).length + MazeCore.path(maze, b, last).length;
      return da - db;
    });
    for (var i = 0; i < branches.length; i++) {
      var branch = branches[i];
      var routeCells = MazeCore.path(maze, start, first).length - 1 +
        MazeCore.path(maze, first, branch).length - 1 + MazeCore.path(maze, branch, last).length - 1 +
        MazeCore.path(maze, last, goal).length - 1;
      if (routeCells > 22) continue;
      var labels = new Array(maze.cols * maze.rows).fill(null);
      var cells = [first, branch, last];
      cells.forEach(function (cell, index) { labels[cell] = index + 1; });
      return { ok: true, labels: labels, checkpoints: cells.map(function (cell, index) {
        return { cell: cell, value: index + 1, offPath: !onPath.has(cell), deadEnd: MazeCore.exitsAt(maze, cell).length === 1 };
      }), count: 3, progress: 0, minDistance: 1, requiredOffPath: 1, offPathCount: 1, solution: path.slice() };
    }
    return null;
  }

  // Deterministically search generated grids for a rung-appropriate puzzle. Robot
  // rounds choose start/goal/heading together because orientation is part of difficulty.
  function makePuzzle(opts) {
    var rung = opts.rung | 0, seed = opts.seed >>> 0, n = opts.cols | 0;
    var rng = MazeCore.mulberry32(seed ^ 0x526f626f);
    var minForward = [2, 3, 4, 5, 5, 12, 8][rung];
    var maxForward = [3, 6, 9, 10, 12, 23, 18][rung];
    for (var attempt = 0; attempt < 100; attempt++) {
      var maze = MazeCore.generate({ cols: n, rows: n, seed: (seed + attempt * 2654435761) >>> 0,
        bias: opts.bias, braid: opts.braid });
      var cells = Array.from({ length: n * n }, function (_, i) { return i; });
      for (var swap = cells.length - 1; swap > 0; swap--) {
        var j = Math.floor(rng() * (swap + 1)), tmp = cells[swap]; cells[swap] = cells[j]; cells[j] = tmp;
      }
      for (var si = 0; si < cells.length; si++) {
        var start = cells[si], distances = MazeCore.distances(maze, start);
        var goals = cells.filter(function (cell) { return distances[cell] >= minForward && distances[cell] <= maxForward; });
        for (var gi = 0; gi < goals.length; gi++) {
          var goal = goals[gi], path = MazeCore.path(maze, start, goal);
          var topology = MazeCore.analyseTopology(maze, path);
          var trail = null;
          if (rung === 6) {
            trail = checkpointPuzzleTrail(maze, start, goal, path);
            if (!trail) continue;
          }
          for (var hi = 0; hi < HEADINGS.length; hi++) {
            var round = { ok: true, seed: seed, cols: n, rows: n, maze: maze, start: start,
              goal: goal, solution: path, topology: topology, attempts: attempt + 1, trail: trail };
            var solved = solve(maze, start, goal, HEADINGS[hi], { trail: trail, maxCommands: 30, maxSolutions: 1 });
            if (qualifies(rung, solved, round)) {
              round.heading = HEADINGS[hi]; round.robotSolution = solved;
              return round;
            }
          }
        }
      }
    }
    return { ok: false, reason: "no Robot Code rung " + rung + " puzzle under 30 commands" };
  }

  return { HEADINGS: HEADINGS, COMMANDS: COMMANDS, ABSOLUTE: ABSOLUTE, initial: initial,
    command: command, runProgram: runProgram, solve: solve, relativeView: relativeView,
    makePuzzle: makePuzzle };
});
