/*
 * Our Maze — pure Plan the Moves runner.
 *
 * A plan is deliberately only a series of calls to MazeMovement.step: this module
 * owns no second wall rule and knows nothing about DOM, timing, chips or sound.
 */
(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) {
    module.exports = factory(require("./maze-movement.js"), require("./maze-core.js"));
  } else {
    root.MazePlan = factory(root.MazeMovement, root.MazeCore);
  }
})(typeof self !== "undefined" ? self : this, function (MazeMovement, MazeCore) {
  "use strict";

  if (!MazeMovement || typeof MazeMovement.step !== "function")
    throw new Error("maze-plan needs MazeMovement.step");
  if (!MazeCore || typeof MazeCore.checkpointVisit !== "function")
    throw new Error("maze-plan needs MazeCore.checkpointVisit");

  function runPlan(maze, start, moves, options) {
    if (!maze || !Array.isArray(maze.open)) throw new Error("runPlan needs a maze-core maze");
    if (!start || start.maze !== maze) throw new Error("runPlan start must be a MazeMovement state for this maze");
    if (!Array.isArray(moves)) throw new Error("runPlan moves must be an array");

    options = options || {};
    var trail = options.trail || null;
    var progress = trail ? (options.progress === undefined ? 0 : options.progress) : null;
    if (trail && (!Number.isInteger(progress) || progress < 0 || progress > trail.count))
      throw new Error("runPlan checkpoint progress must be in 0..count");
    var startProgress = progress;
    var state = start;
    var steps = [];
    for (var i = 0; i < moves.length; i++) {
      var next = MazeMovement.step(state, moves[i]);
      var visit = null;
      if (!next.blocked && trail) {
        visit = MazeCore.checkpointVisit(trail, progress, next.cell, next.cell === next.goal);
        progress = visit.progress;
        // A flag is only sticky after every checkpoint. This lets a planned route
        // continue past an early flag and detect later checkpoints step by step.
        next.reached = visit.complete;
      }
      steps.push({ index: i, dir: moves[i], before: state, after: next, moved: !next.blocked,
        visit: visit, progress: progress });
      if (next.blocked) return { steps: steps, outcome: "wall", failedIndex: i,
        progress: progress, startProgress: startProgress };
      state = next;
      if (state.reached) return { steps: steps, outcome: "flag", failedIndex: null,
        progress: progress, startProgress: startProgress };
    }
    return { steps: steps, outcome: state.reached ? "flag" : "ended", failedIndex: null,
      progress: progress, startProgress: startProgress };
  }

  return { runPlan: runPlan };
});
