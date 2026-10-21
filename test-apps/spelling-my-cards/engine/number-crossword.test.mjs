// Tests for the Number Crossword board engine (NUMBER-CROSSWORD-SPEC.md §6).
//
// What the engine claims about a board is re-derived here INDEPENDENTLY where it
// can be: this file has its own arithmetic, its own range rules and its own
// brute-force solver (a plain depth-first search over tray tiles in cell order,
// no derivation, no propagation), so a wrong engine cannot pass by restating
// itself. The deduction properties (how much one line settles, whether two
// crossing lines are needed) are the engine's own measure, and are checked for
// consistency with each other and against the rung's rule.
//
//   node --test math-app/engine/number-crossword.test.mjs
//   NC_BOARDS=3000 node --test math-app/engine/number-crossword.test.mjs   (the long run)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  NC_LEVELS, NC_OPS, ncSeeded, ncGenerate, ncDeal, ncCheck, ncHintCell,
  ncCountSolutions, ncForcedAtStart, ncPropagate, ncLineWords, ncBuildLayout,
} from './number-crossword.js';

const BOARDS = Number(process.env.NC_BOARDS) || 300;

// --- Independent arithmetic ------------------------------------------------------

function holds(a, op, b, c) {
  switch (op) {
    case '+': return a + b === c;
    case '−': return a - b === c;
    case '×': return a * b === c;
    case '÷': return b !== 0 && b * c === a;
    default: return false;
  }
}

function valueOf(p, placed) {
  const v = {};
  for (const c of p.cells) if (c.kind !== 'eq') v[c.id] = c.blank ? placed[c.id] : c.value;
  return v;
}

// Brute force: every way of putting tray tiles into the blanks (each tile at most
// once, right type only), in plain cell order, testing an equation only once all
// four of its cells are filled. Counts distinct VALUE assignments; stops at `cap`.
function bruteCount(p, cap) {
  const blanks = p.blanks.slice();
  const kinds = {};
  p.cells.forEach((c) => { kinds[c.id] = c.kind; });
  const used = p.tray.map(() => false);
  const placed = {};
  const seen = new Set();
  const eqsReadyAt = blanks.map((id, i) => p.equations.filter((e) => e.cells.indexOf(id) >= 0
    && e.cells.every((x) => blanks.indexOf(x) < 0 || blanks.indexOf(x) <= i)));
  let stop = false;
  const rec = (i) => {
    if (stop) return;
    if (i === blanks.length) {
      const key = blanks.map((id) => placed[id]).join('|');
      if (!seen.has(key)) { seen.add(key); if (seen.size >= cap) stop = true; }
      return;
    }
    const id = blanks[i];
    const tried = new Set();
    for (let t = 0; t < p.tray.length; t++) {
      const tile = p.tray[t];
      if (used[t] || tile.kind !== kinds[id] || tried.has(tile.value)) continue;
      tried.add(tile.value);
      used[t] = true;
      placed[id] = tile.value;
      const v = valueOf(p, placed);
      if (eqsReadyAt[i].every((e) => holds(v[e.cells[0]], v[e.cells[1]], v[e.cells[2]], v[e.cells[3]]))) rec(i + 1);
      delete placed[id];
      used[t] = false;
      if (stop) return;
    }
  };
  rec(0);
  return seen.size;
}

// --- Per-board invariants --------------------------------------------------------

function checkBoard(p, spec, where) {
  const layout = ncBuildLayout(spec.layout);
  assert.equal(p.level, spec.id, where + ' level');
  assert.equal(p.equations.length, layout.equations.length, where + ' equation count');
  const byId = {};
  p.cells.forEach((c) => { byId[c.id] = c; });
  // Every cell of every equation exists and has the right type in the right place.
  for (const e of p.equations) {
    assert.deepEqual(e.cells.map((id) => byId[id].kind), ['num', 'op', 'num', 'num'], where + ' equation shape');
    assert.equal(byId[e.eq].kind, 'eq', where + ' "=" cell');
  }
  // The full solution: whole numbers in range, the rung's signs, exact ÷, small factors.
  const full = valueOf(p, p.solution);
  for (const e of p.equations) {
    const [a, op, b, c] = e.cells.map((id) => full[id]);
    assert.ok(holds(a, op, b, c), `${where} solution line ${a} ${op} ${b} = ${c} holds`);
    for (const n of [a, b, c]) assert.ok(Number.isInteger(n) && n >= 1 && n <= spec.max, `${where} ${n} in 1..${spec.max}`);
    assert.ok(spec.ops.indexOf(op) >= 0, `${where} sign ${op} is on this rung`);
    if (op === '×') assert.ok(a >= 2 && b >= 2 && a <= spec.timesMax && b <= spec.timesMax, `${where} × factors small`);
    if (op === '÷') assert.ok(b >= 2 && c >= 2 && b <= spec.timesMax && c <= spec.timesMax, `${where} ÷ divisor/quotient small`);
  }
  const distinctOps = new Set(p.equations.map((e) => full[e.cells[1]])).size;
  assert.ok(distinctOps >= Math.min(spec.minDistinctOps, spec.ops.length, p.equations.length), `${where} ${distinctOps} distinct signs`);
  // Blanks: the rung's count of each kind; the tray holds exactly their tiles plus distractors.
  const nb = p.blanks.filter((id) => byId[id].kind === 'num').length;
  const ob = p.blanks.filter((id) => byId[id].kind === 'op').length;
  assert.equal(nb, spec.numBlanks, where + ' number blanks');
  assert.equal(ob, spec.opBlanks, where + ' sign blanks');
  const trayNums = p.tray.filter((t) => t.kind === 'num').map((t) => t.value);
  const trayOps = p.tray.filter((t) => t.kind === 'op').map((t) => t.value);
  assert.equal(trayNums.length, spec.numBlanks + spec.numDistractors, where + ' number tiles');
  assert.equal(trayOps.length, spec.opBlanks + spec.opDistractors, where + ' sign tiles');
  trayNums.forEach((v) => assert.ok(Number.isInteger(v) && v >= 1 && v <= spec.max, where + ' number tile in range'));
  trayOps.forEach((v) => assert.ok(NC_OPS.indexOf(v) >= 0, where + ' sign tile is a sign'));
  const left = trayNums.concat(trayOps);
  for (const id of p.blanks) {
    const i = left.indexOf(p.solution[id]);
    assert.ok(i >= 0, where + ' tray holds every missing tile');
    left.splice(i, 1);
  }
  assert.equal(left.length, spec.numDistractors + spec.opDistractors, where + ' distractors');
  assert.equal(new Set(p.tray.map((t) => t.id)).size, p.tray.length, where + ' tile ids unique');
  // UNIQUE, by the engine's solver and by the independent brute force.
  assert.equal(ncCountSolutions(p, 2), 1, where + ' engine: exactly one solution');
  // Deduction: the rung's rule.
  const n = p.blanks.length;
  const f = ncForcedAtStart(p);
  const single = ncPropagate(p, 1);
  const pair = ncPropagate(p, 2);
  assert.ok(pair.solved, where + ' two-line reasoning solves it');
  if (spec.deduce === 'single-each') { assert.equal(f, n, where + ' every blank settled by its own line'); assert.ok(single.solved); }
  if (spec.deduce === 'single') assert.ok(single.solved, where + ' one-line reasoning solves it');
  if (spec.deduce === 'single-chain') { assert.ok(single.solved, where + ' one line at a time solves it'); assert.ok(f <= n - 2, where + ` a chain: ${f} of ${n} settled at the start`); }
  if (spec.deduce === 'pair') {
    assert.ok(f <= spec.maxForced, `${where} at most ${spec.maxForced} blank(s) settled by one line at the start (got ${f})`);
    assert.ok(!single.solved, where + ' one line at a time does NOT solve it: crossing lines are needed');
  }
  // The checker judges by the equations: the solution passes, a swapped tile fails.
  const good = ncCheck(p, p.solution);
  assert.ok(good.full && good.solved && good.lines.every((x) => x === true), where + ' check: the solution is solved');
  const half = Object.assign({}, p.solution);
  delete half[p.blanks[0]];
  const partial = ncCheck(p, half);
  assert.ok(!partial.full && !partial.solved, where + ' check: an empty slot is not solved');
  assert.ok(partial.lines.some((x) => x === null), where + ' check: the unfinished line is null');
  assert.equal(ncHintCell(p, p.solution), null, where + ' no hint once solved');
  assert.ok(p.blanks.indexOf(ncHintCell(p, {})) >= 0, where + ' a hint names a blank');
  p.equations.forEach((e, i) => assert.match(ncLineWords(p, i), /^\d+ (plus|minus|times|divided by) \d+ equals \d+$/));
  return { forced: f };
}

// --- The runs --------------------------------------------------------------------

const timing = {};

for (const spec of NC_LEVELS) {
  test(`${spec.id}: ${BOARDS} seeded boards are valid, unique and need the rung's deduction`, () => {
    let worst = 0, total = 0, forcedSum = 0;
    for (let i = 0; i < BOARDS; i++) {
      const t0 = process.hrtime.bigint();
      const p = ncGenerate(spec.id, ncSeeded(100000 + i));
      const ms = Number(process.hrtime.bigint() - t0) / 1e6;
      total += ms; worst = Math.max(worst, ms);
      // A null here is a live deal that ran out of budget; ncDeal would fall back to
      // the seed pool, which is tested below. It is counted, and must stay rare.
      if (!p) { timing[spec.id + ':misses'] = (timing[spec.id + ':misses'] || 0) + 1; continue; }
      forcedSum += checkBoard(p, spec, `${spec.id}#${i}`).forced;
    }
    const misses = timing[spec.id + ':misses'] || 0;
    assert.ok(misses <= Math.ceil(BOARDS * 0.02), `${spec.id}: ${misses} of ${BOARDS} live deals ran out of budget`);
    timing[spec.id] = { avg: total / BOARDS, worst, misses, forcedAvg: forcedSum / (BOARDS - misses) };
  });

  test(`${spec.id}: the independent brute-force solver agrees the board is unique`, () => {
    // The brute force has no pruning beyond whole equations, so it is run on a
    // sample; the engine's own solver checks every board above.
    const sample = Math.min(BOARDS, spec.layout === 'full' ? 25 : 200);
    for (let i = 0; i < sample; i++) {
      const p = ncGenerate(spec.id, ncSeeded(900000 + i));
      if (!p) continue;
      assert.equal(bruteCount(p, 2), 1, `${spec.id}#${i} brute force finds exactly one solution`);
    }
  });

  test(`${spec.id}: every vetted fallback seed deals a proven board`, () => {
    assert.ok(spec.seeds.length >= 4);
    for (const seed of spec.seeds) {
      const p = ncGenerate(spec.id, ncSeeded(seed), { fills: 400, perFill: 12 });
      assert.ok(p, `${spec.id} seed ${seed} deals`);
      checkBoard(p, spec, `${spec.id} seed ${seed}`);
    }
  });

  test(`${spec.id}: ncDeal never returns nothing`, () => {
    for (let i = 0; i < 40; i++) assert.ok(ncDeal(spec.id, ncSeeded(5000 + i)), `${spec.id} deal ${i}`);
  });
}

test('the same seed deals the same board', () => {
  for (const spec of NC_LEVELS) {
    const a = ncGenerate(spec.id, ncSeeded(42)), b = ncGenerate(spec.id, ncSeeded(42));
    assert.deepEqual(a, b);
  }
});

test('the checker accepts ANY placement that makes every line true, not only the key', () => {
  // A hand-built board with TWO solutions over its tray — never dealt (the prover
  // rejects exactly this), but it proves ncCheck reads the equations, not p.solution.
  const p = {
    cells: [
      { id: 'a', kind: 'num', value: 3, blank: true }, { id: 'o', kind: 'op', value: '+', blank: false },
      { id: 'b', kind: 'num', value: 7, blank: true }, { id: '=', kind: 'eq', value: '=', blank: false },
      { id: 'c', kind: 'num', value: 10, blank: false },
    ],
    equations: [{ cells: ['a', 'o', 'b', 'c'], eq: '=' }],
    blanks: ['a', 'b'],
    tray: [{ id: 't0', kind: 'num', value: 3 }, { id: 't1', kind: 'num', value: 7 }],
    solution: { a: 3, b: 7 },
  };
  assert.equal(ncCountSolutions(p, 2), 2, 'the solver sees both');
  assert.ok(ncCheck(p, { a: 3, b: 7 }).solved, 'the key is accepted');
  assert.ok(ncCheck(p, { a: 7, b: 3 }).solved, 'the other true placement is accepted too');
  assert.ok(!ncCheck(p, { a: 3, b: 3 }).solved, 'a false one is not');
});

test('report: time per board', () => {
  const rows = NC_LEVELS.map((s) => {
    const t = timing[s.id];
    return t ? `${s.id.padEnd(7)} avg ${t.avg.toFixed(1).padStart(6)} ms  worst ${t.worst.toFixed(1).padStart(6)} ms  misses ${t.misses}  forced-at-start avg ${t.forcedAvg.toFixed(2)}` : s.id + ' (not run)';
  });
  console.log('\n' + rows.join('\n'));
  for (const s of NC_LEVELS) if (timing[s.id]) assert.ok(timing[s.id].worst < 1500, `${s.id} worst board ${timing[s.id].worst} ms`);
});
