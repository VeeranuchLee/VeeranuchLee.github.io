/*
 * Our Maze — pure Plan the Moves runner.
 *
 * A plan is deliberately only a series of calls to MazeMovement.step: this module
 * owns no second wall rule and knows nothing about DOM, timing, chips or sound.
 */
(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) {
    module.exports = factory(require("./maze-movement.js"));
  } else {
    root.MazePlan = factory(root.MazeMovement);
  }
})(typeof self !== "undefined" ? self : this, function (MazeMovement) {
  "use strict";

  if (!MazeMovement || typeof MazeMovement.step !== "function")
    throw new Error("maze-plan needs MazeMovement.step");

  function runPlan(maze, start, moves) {
    if (!maze || !Array.isArray(maze.open)) throw new Error("runPlan needs a maze-core maze");
    if (!start || start.maze !== maze) throw new Error("runPlan start must be a MazeMovement state for this maze");
    if (!Array.isArray(moves)) throw new Error("runPlan moves must be an array");

    var state = start;
    var steps = [];
    for (var i = 0; i < moves.length; i++) {
      var next = MazeMovement.step(state, moves[i]);
      steps.push({ index: i, dir: moves[i], before: state, after: next, moved: !next.blocked });
      if (next.blocked) return { steps: steps, outcome: "wall", failedIndex: i };
      state = next;
      if (state.reached) return { steps: steps, outcome: "flag", failedIndex: null };
    }
    return { steps: steps, outcome: state.reached ? "flag" : "ended", failedIndex: null };
  }

  return { runPlan: runPlan };
});
