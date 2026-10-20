/*
 * Pattern Pegs & Beads — pattern core.
 *
 * Pure puzzle logic: no DOM, no network, no storage. Data in, data out. This file is
 * the extraction seam the owner ordered (2026-08-28): it must stay loadable by Node
 * and by any future app without dragging UI with it.
 *
 * Every puzzle is constructed by synthesis from the level recipes in
 * ../DIFFICULTY.md — the generator never invents difficulty. Its acceptance test is
 * tools/check-canonical.py passing on a generated sample (tools/test-generator.mjs).
 *
 * Puzzles use the canonical schema (data/canonical-puzzles.json), pieces are
 * "shape:colour" strings, gaps are null.
 */
(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) {
    module.exports = factory();
  } else {
    root.PatternCore = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const SHAPES = ["circle", "square", "triangle", "star", "heart"];
  const COLOURS = ["red", "yellow", "blue", "green", "purple"];

  /* ---------- seeded RNG (mulberry32) — same seed, same puzzle ---------- */

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

  /* ---------- pieces and distractors ---------- */

  const pStr = (p) => p[0] + ":" + p[1];
  const allPieces = [];
  for (const s of SHAPES) for (const c of COLOURS) allPieces.push([s, c]);

  // A twin differs from the answer in exactly one attribute (DIFFICULTY.md lever 5).
  function twinOf(r, answer, avoidStrs) {
    const changeShape = r() < 0.5;
    for (const step of [1, 2, 3, 4]) {
      let cand;
      if (changeShape) {
        cand = [SHAPES[(SHAPES.indexOf(answer[0]) + step) % 5], answer[1]];
      } else {
        cand = [answer[0], COLOURS[(COLOURS.indexOf(answer[1]) + step) % 5]];
      }
      if (!avoidStrs.includes(pStr(cand))) return cand;
    }
    throw new Error("twinOf exhausted");
  }

  // A pattern-echo is a visible board piece that is not the answer.
  function echoFrom(r, visible, answer, avoidStrs) {
    const cands = visible.filter(
      (p) => pStr(p) !== pStr(answer) && !avoidStrs.includes(pStr(p))
    );
    if (!cands.length) throw new Error("no echo available");
    return pick(r, cands);
  }

  function arbitrary(r, avoidStrs) {
    for (let i = 0; i < 80; i++) {
      const cand = pick(r, allPieces);
      if (!avoidStrs.includes(pStr(cand))) return cand;
    }
    throw new Error("arbitrary exhausted");
  }

  /* ---------- units ---------- */

  // Co-varying unit: every element distinct on both attributes, so each attribute
  // stream tiles with period = unit length (DIFFICULTY.md "attribute coupling").
  function coVaryUnit(r, len) {
    const sh = shuffled(r, SHAPES).slice(0, len);
    const co = shuffled(r, COLOURS).slice(0, len);
    return sh.map((s, i) => [s, co[i]]);
  }

  // L1 unit: exactly one attribute varies across the pair, the other is constant.
  function oneAttributeUnit(r) {
    if (r() < 0.5) {
      const sh = pick(r, SHAPES);
      const [c1, c2] = shuffled(r, COLOURS).slice(0, 2);
      return [[sh, c1], [sh, c2]]; // colour varies
    }
    const [s1, s2] = shuffled(r, SHAPES).slice(0, 2);
    const co = pick(r, COLOURS);
    return [[s1, co], [s2, co]]; // shape varies
  }

  // L5 doubles unit AABB: two distinct pieces, each twice.
  function doublesUnit(r) {
    const [a, b] = coVaryUnit(r, 2);
    return [a, a, b, b];
  }

  function tile(unit, n) {
    const out = [];
    for (let i = 0; i < n; i++) out.push(unit[i % unit.length].slice());
    return out;
  }

  /* ---------- B: continue the pattern ---------- */

  function continuePuzzle(r, level) {
    let board = [];
    let answers = null;
    let extra = "";

    if (level === 1) {
      const unit = oneAttributeUnit(r);
      board = tile(unit, 5);
      answers = [pStr(unit[5 % 2])];
      extra = "one attribute varies, AB";
    } else if (level === 2) {
      const unit = coVaryUnit(r, 2);
      board = tile(unit, 5);
      answers = [pStr(unit[1])];
      extra = "AB, both attributes co-vary";
    } else if (level === 3) {
      const kind = pick(r, ["AAB", "ABB", "ABC"]);
      let unit;
      if (kind === "ABC") {
        unit = coVaryUnit(r, 3);
      } else {
        const [a, b] = coVaryUnit(r, 2);
        unit = kind === "AAB" ? [a, a, b] : [a, b, b];
      }
      board = tile(unit, 7);
      answers = [pStr(unit[7 % 3])];
      extra = kind + " unit";
    } else if (level === 4) {
      const unit = coVaryUnit(r, r() < 0.5 ? 2 : 3);
      const len = unit.length;
      // 2 cycles (+1 piece when the unit is 2, so ≥4 pieces stay visible)
      const n = len * 2 + (len === 2 ? 1 : 0);
      board = tile(unit, n);
      const gap = len + int(r, n - len); // second cycle: first cycle stays a witness
      board[gap] = null;
      answers = [pStr(unit[gap % len])];
      extra = "middle gap";
    } else if (level === 5) {
      const unit = doublesUnit(r);
      if (r() < 0.5) {
        board = tile(unit, 7);
        answers = [pStr(unit[7 % 4])];
        extra = "AABB doubles, extend at the end";
      } else {
        board = tile(unit, 8);
        const gap = 4 + int(r, 4);
        board[gap] = null;
        answers = [pStr(unit[gap % 4])];
        extra = "AABB doubles, middle gap";
      }
    } else if (level === 6) {
      const unit = coVaryUnit(r, 4);
      board = tile(unit, 8);
      const gap = 4 + int(r, 4);
      board[gap] = null;
      answers = [pStr(unit[gap % 4])];
      extra = "ABCD unit, middle gap";
    } else if (level === 7) {
      const unit = coVaryUnit(r, 2);
      board = tile(unit, 6); // both unit pieces stay visible at 0,1,3,4
      board[2] = null;
      board[5] = null;
      answers = [pStr(unit[0]), pStr(unit[1])];
      extra = "two gaps";
    } else if (level === 8) {
      // Cross-mapped streams: colour period 2, shape period 3 (AAB).
      const [k0, k1] = shuffled(r, COLOURS).slice(0, 2);
      const [s0, s1] = shuffled(r, SHAPES).slice(0, 2);
      const shapeCycle = [s0, s0, s1];
      const n = 7;
      for (let i = 0; i < n; i++) board.push([shapeCycle[i % 3], [k0, k1][i % 2]]);
      answers = [shapeCycle[n % 3] + ":" + [k0, k1][n % 2]];
      extra = "colour AB, shape AAB — independent streams";
    } else {
      throw new Error("pattern levels are 1..8");
    }

    if (level !== 7 && !board.includes(null)) board.push(null); // end gap

    const visible = board.filter((p) => p);
    const choices = continueChoices(r, level, answers, visible);
    return {
      id: "",
      activity: "continue",
      ladder: "pattern",
      level,
      board: board.map((p) => (p ? pStr(p) : null)),
      answers,
      choices,
      whyThisLevel: why("continue", level, extra),
    };
  }

  function continueChoices(r, level, answers, visible) {
    const out = answers.map((a) => a.split(":"));
    const used = () => out.map(pStr);
    if (level === 1) {
      out.push(arbitrary(r, used()));
    } else if (level === 2) {
      out.push(echoFrom(r, visible, out[0], used()));
      out.push(arbitrary(r, used()));
    } else if (level === 3) {
      out.push(twinOf(r, out[0], used()));
      out.push(r() < 0.5 ? echoFrom(r, visible, out[0], used()) : arbitrary(r, used()));
    } else if (level >= 4 && level <= 6) {
      out.push(twinOf(r, out[0], used()));
      out.push(twinOf(r, out[0], used()));
      out.push(echoFrom(r, visible, out[0], used()));
    } else if (level === 7) {
      const a0 = out[0];
      const a1 = out[1];
      out.push(twinOf(r, a0, used()));
      out.push(twinOf(r, a1, used()));
    } else if (level === 8) {
      out.push(twinOf(r, out[0], used()));
      out.push(twinOf(r, out[0], used()));
      out.push(echoFrom(r, visible, out[0], used()));
    }
    return out.map(pStr);
  }

  /* ---------- E: decode the card ---------- */

  function decodePuzzle(r, level) {
    let unit, board, gaps;
    if (level === 3) {
      unit = coVaryUnit(r, 3);
      board = tile(unit, 6);
      gaps = [1, 5]; // slots 1 and 2, each witnessed elsewhere
    } else if (level === 5) {
      unit = doublesUnit(r);
      board = tile(unit, 8);
      gaps = [2, 5, 7]; // slots 2, 1, 3 — every slot keeps a witness
    } else {
      throw new Error("decode levels are 3 and 5");
    }
    const answers = gaps.map((g) => pStr(unit[g % unit.length]));
    for (const g of gaps) board[g] = null;
    const visible = board.filter((p) => p);

    const distinct = [...new Set(answers)];
    const out = distinct.map((a) => a.split(":"));
    const used = () => out.map(pStr);
    // L3 keeps the canonical 3-choice shape (one twin); L5 gives each distinct
    // answer its own twin (4 choices), matching the canonical E-L5.
    const twinBudget = level === 3 ? 1 : distinct.length;
    for (let i = 0; i < twinBudget; i++) out.push(twinOf(r, distinct[i].split(":"), used()));

    return {
      id: "",
      activity: "decode",
      ladder: "pattern",
      level,
      board: board.map((p) => (p ? pStr(p) : null)),
      answers,
      choices: out.map(pStr),
      whyThisLevel: why("decode", level, "reconstruct the card from marked gaps"),
    };
  }

  /* ---------- C: sort by rule ---------- */

  function sortPuzzle(r, level) {
    const shapes = shuffled(r, SHAPES);
    const colours = shuffled(r, COLOURS);

    if (level === 1) {
      const attr = pick(r, ["shape", "colour"]);
      const val = attr === "shape" ? shapes[0] : colours[0];
      const members = [];
      const rest = [];
      for (let i = 0; i < 3; i++) {
        members.push(attr === "shape" ? [val, colours[i]] : [shapes[i], val]);
      }
      for (let i = 0; i < 2; i++) {
        rest.push(attr === "shape" ? [shapes[1 + i], colours[3 + i]] : [shapes[3 + i], colours[1 + i]]);
      }
      const list = shuffled(r, members.concat(rest));
      return finishSort(list, { include: { [attr]: val } }, members, level, "one-attribute inclusion");
    }

    if (level === 2) {
      const [s0, c0] = [shapes[0], colours[0]];
      const members = [[s0, c0]];
      const rest = [
        [s0, colours[1]], // half-satisfier: shape only
        [shapes[1], c0], // half-satisfier: colour only
        [shapes[2], colours[2]],
        [shapes[3], colours[3]],
      ];
      const list = shuffled(r, members.concat(rest));
      return finishSort(
        list,
        { include: { shape: s0, colour: c0 } },
        members,
        level,
        "conjunction with half-satisfiers"
      );
    }

    if (level === 3) {
      const c0 = colours[0];
      const members = [];
      const rest = [];
      for (let i = 0; i < 3; i++) members.push([shapes[i], colours[1 + i]]);
      for (let i = 0; i < 2; i++) rest.push([shapes[3 + i], c0]);
      const list = shuffled(r, members.concat(rest));
      return finishSort(list, { exclude: { colour: c0 } }, members, level, "negation");
    }

    if (level === 4) {
      const attr = pick(r, ["shape", "colour"]);
      const [vA, vB] = attr === "shape" ? [shapes[0], shapes[1]] : [colours[0], colours[1]];
      const others = attr === "shape" ? colours.slice(2, 5) : shapes.slice(2, 5);
      const list = [];
      const assignment = {};
      for (let i = 0; i < 5; i++) {
        const val = i % 2 === 0 ? vA : vB;
        const piece = attr === "shape" ? [val, others[i % 3]] : [others[i % 3], val];
        list.push(piece);
        assignment[pStr(piece)] = val;
      }
      return {
        id: "",
        activity: "sort",
        ladder: "sort",
        level,
        pieces: list.map(pStr),
        rule: { bins: { [vA]: { [attr]: vA }, [vB]: { [attr]: vB } } },
        assignment,
        whyThisLevel: why("sort", level, "two bins held simultaneously"),
      };
    }

    throw new Error("sort levels are 1..4");
  }

  function finishSort(list, rule, members, level, extra) {
    const memberSet = new Set(members.map(pStr));
    return {
      id: "",
      activity: "sort",
      ladder: "sort",
      level,
      pieces: list.map(pStr),
      rule,
      members: list.filter((p) => memberSet.has(pStr(p))).map(pStr),
      whyThisLevel: why("sort", level, extra),
    };
  }

  /* ---------- A: copy the tower, D: lace the beads ---------- */

  const BAND_UNIT = { 2: 2, 4: 3, 6: 4 };

  function copyPuzzle(r, level) {
    const unit = coVaryUnit(r, BAND_UNIT[level]);
    const target = tile(unit, BAND_UNIT[level] * 2);
    return {
      id: "",
      activity: "copy",
      ladder: "pattern",
      level,
      target: target.map(pStr),
      modelVisible: true,
      whyThisLevel: why("copy", level, `tower of ${target.length} on a ${BAND_UNIT[level]}-element unit`),
    };
  }

  function lacePuzzle(r, level) {
    const unit = coVaryUnit(r, BAND_UNIT[level]);
    const seq = tile(unit, BAND_UNIT[level] * 2);
    return {
      id: "",
      activity: "lace",
      ladder: "pattern",
      level,
      sequence: seq.map(pStr),
      studySeconds: Math.max(3, seq.length),
      whyThisLevel: why("lace", level, `${seq.length} beads, hidden after study`),
    };
  }

  /* ---------- shared ---------- */

  function why(activity, level, extra) {
    return (
      "L" + level + (extra ? " (" + extra + ")" : "") +
      " — generated by pattern-core from the DIFFICULTY.md recipe; validated by tools/check-canonical.py."
    );
  }

  /* ---------- public API ---------- */

  function generate(opts) {
    const { activity, level, seed } = opts;
    const r = mulberry32(seed >>> 0);
    let p;
    if (activity === "continue") p = continuePuzzle(r, level);
    else if (activity === "decode") p = decodePuzzle(r, level);
    else if (activity === "sort") p = sortPuzzle(r, level);
    else if (activity === "copy") p = copyPuzzle(r, level);
    else if (activity === "lace") p = lacePuzzle(r, level);
    else throw new Error("activity must be copy|continue|sort|lace|decode");
    p.id = "G-" + activity.toUpperCase().slice(0, 5) + "-L" + level + "-s" + (seed >>> 0);
    return p;
  }

  // The canonical cells: every (activity, level) the canonical set covers.
  function canonicalCells() {
    return [
      ...[1, 2, 3, 4, 5, 6, 7, 8].map((level) => ({ activity: "continue", level })),
      ...[1, 2, 3, 4].map((level) => ({ activity: "sort", level })),
      { activity: "copy", level: 2 },
      { activity: "copy", level: 4 },
      { activity: "copy", level: 6 },
      { activity: "lace", level: 2 },
      { activity: "lace", level: 4 },
      { activity: "lace", level: 6 },
      { activity: "decode", level: 3 },
      { activity: "decode", level: 5 },
    ];
  }

  return {
    SHAPES,
    COLOURS,
    generate,
    canonicalCells,
    pieceSpace: () => ({
      shapes: SHAPES.slice(),
      colours: COLOURS.slice(),
      v1Attributes: ["shape", "colour"],
      reserved: {
        size: "later, after v1 levels are proven in play",
        orientation: "asymmetric shapes / advanced levels only — never a v1 axis",
      },
    }),
  };
});
