/*
 * Our Maze — movement engine: one grid step per intent.
 *
 * Pure movement logic over a maze-core maze — no DOM, no canvas, no pointer
 * events, no pixels. The maze-core.js seam again: the file loads from a
 * <script> tag (global MazeMovement, after maze-core.js) and from node. The
 * owner settled stage 1 input on 2026-09-16 — "Stage 1 input = both. Primary
 * direct manipulation via forgiving continuous drag/slide; four large arrow
 * buttons provide precise alternative control. No tap-to-move. No exact
 * drag-and-drop. Both inputs share the same grid-movement engine." — and this
 * module is that engine. The page, drag or arrows, reduces a finger or a
 * button press to the one thing understood here: an intent, one step in one
 * direction. Every rule about where that step may land lives in this file.
 *
 * Why step(state, dir) and not moveTo(cell)
 * ----------------------------------------
 * A function that takes a destination is tap-to-move wearing a different coat,
 * and tap-to-move is ruled out. moveTo would let the page teleport the
 * character, or quietly grow its own pathfinding, instead of asking the maze
 * wall by wall; a page that wants to animate along a route asks for a sequence
 * of steps — one seam, one rule set. Gesture geometry is kept out on purpose:
 * pixels, thresholds and "was that slide far enough" belong to the page, and
 * the engine must not know a finger exists. What it does own is the rule a
 * forgiving slide leans on — a step into a wall is refused — so a wobble lands
 * the child where they pointed or nowhere at all, never one cell off.
 *
 * State
 * -----
 * A state is plain and JSON-serialisable; step() never mutates its input, it
 * returns a fresh state (copy-on-write). The maze inside is maze-core's own
 * maze object, shared by reference and never written to — there is no second
 * grid or wall representation in this file, only MazeCore.isOpen and
 * MazeCore.neighbourOf over the maze the caller passed in.
 *
 *   { maze, cell, goal, reached, blocked, steps, refusals }
 *     maze     the maze-core maze the round is played on (shared reference)
 *     cell     where the character stands — a row-major maze-core cell index
 *     goal     the round's goal cell. initial() also accepts a makeRound()
 *              result verbatim: a round already carries maze, start and goal
 *     reached  sticky: true once the character has stood on the goal — a
 *              reached round does not un-happen because the page kept
 *              answering drags. When to stop taking intents is the page's call
 *     blocked  null, or the direction of the most recently refused step — the
 *              page's cue for a nudge animation; cleared by the next accepted
 *              step
 *     steps    accepted steps this round — one counter both inputs feed
 *     refusals refused steps. Monotone, so two identical refusals in a row
 *              still give distinct states and a nudge animation can retrigger
 *
 * Refused, not an error
 * ---------------------
 * A step into a wall, or off the grid, is refused: no exception, no teleport,
 * the same cell — a fresh state with blocked set to that direction and
 * refusals bumped. Returning the input state untouched would be purer still,
 * but then a page could not tell "nothing was asked" from "the child pushed at
 * a wall", and working that out by comparing cells is exactly the inference
 * this engine exists to own — it reports the goal for the same reason. The
 * grid edge needs no separate rule: in maze-core's mask a bit pointing off the
 * grid is never set, so the outside is just another wall (neighbourOf's -1 is
 * checked anyway, so the promise holds even for a mask that breaks maze-core's
 * invariants).
 *
 * Two things do throw: a direction that is not up|right|down|left, and options
 * or state not shaped like ours. Walls belong to the child's world and must
 * never crash a round; the direction vocabulary and the state shape are the
 * page's contract with this module, and a typo there should surface, not
 * quietly refuse.
 */
(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) {
    module.exports = factory(require("./maze-core.js"));
  } else {
    root.MazeMovement = factory(root.MazeCore);
  }
})(typeof self !== "undefined" ? self : this, function (MazeCore) {
  "use strict";

  if (!MazeCore || typeof MazeCore.isOpen !== "function" || typeof MazeCore.neighbourOf !== "function")
    throw new Error("maze-movement needs maze-core first: require('./maze-core.js'), or the MazeCore global");

  function _checkCell(n, i, what) {
    if (!Number.isInteger(i) || i < 0 || i >= n)
      throw new Error(what + " is not a cell index of a " + n + "-cell maze: " + i);
  }

  /* ---------- state --------------------------------------------------------------- */

  // The start of a round. `opts` may be a makeRound() result as-is: the keys
  // this reads — maze, start, goal — are exactly the ones a round carries.
  function initial(opts) {
    if (!opts || !opts.maze)
      throw new Error("initial({ maze, start, goal }) needs options, with a maze-core maze in maze");
    const m = opts.maze;
    if (!Number.isInteger(m.cols) || !Number.isInteger(m.rows) ||
        !Array.isArray(m.open) || m.open.length !== m.cols * m.rows)
      throw new Error("maze is not a maze-core maze: want { cols, rows, open[cols*rows] }");
    _checkCell(m.open.length, opts.start, "start");
    _checkCell(m.open.length, opts.goal, "goal");
    return {
      maze: m,
      cell: opts.start,
      goal: opts.goal,
      reached: opts.start === opts.goal,
      blocked: null,
      steps: 0,
      refusals: 0,
    };
  }

  /* ---------- one step --------------------------------------------------------------- */

  // One intent: one step, one direction. Accepted -> the neighbour across the
  // open wall, blocked cleared, one step counted. Refused (wall, or off the
  // grid) -> the same cell, blocked naming the direction, one refusal counted.
  // Either way the input state is untouched and the return is a fresh object.
  function step(state, dirName) {
    if (!state || !state.maze || !Array.isArray(state.maze.open))
      throw new Error("step needs a state from initial()");
    if (MazeCore.DIRS.indexOf(dirName) < 0)
      throw new Error("unknown direction '" + dirName + "' (want up|right|down|left)");
    _checkCell(state.maze.open.length, state.cell, "state.cell");
    const m = state.maze;
    const nb = MazeCore.neighbourOf(m, state.cell, dirName); // -1 off the grid
    if (nb < 0 || !MazeCore.isOpen(m, state.cell, dirName)) {
      return {
        maze: m,
        cell: state.cell,
        goal: state.goal,
        reached: state.reached,
        blocked: dirName,
        steps: state.steps,
        refusals: state.refusals + 1,
      };
    }
    return {
      maze: m,
      cell: nb,
      goal: state.goal,
      reached: state.reached || nb === state.goal,
      blocked: null,
      steps: state.steps + 1,
      refusals: state.refusals,
    };
  }

  /* ---------- public API ----------------------------------------------------------- */

  return { initial, step };
});
