// Tests for the What's Missing? hide-one-part engine.
//
// Everything the engine claims is re-derived here independently: the test has
// its own gcd, its own rational arithmetic, its own equation and sequence
// evaluators and its own copy of the six Count Block rungs' bounds, so a wrong
// engine cannot pass by restating itself. Run with:
//   node --test math-app/engine/missing-problem.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeMissingProblem, MODES } from './missing-problem.js';

// --- A seeded rng (mulberry32) — compare-problem.test.mjs's, mirrored ----------

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- Independent arithmetic (no help from the module) ---------------------------

function myGcd(a, b) {
  while (b !== 0) {
    const t = a % b;
    a = b;
    b = t;
  }
  return a === 0 ? 1 : a;
}

// A token as an exact rational — the test's own conversion, never the engine's.
function ratOf(t) {
  if (t.k === 'int') return { n: t.n, d: 1 };
  if (t.k === 'frac') return { n: t.n, d: t.d };
  if (t.k === 'dec') return { n: t.digits, d: Math.pow(10, t.places) };
  throw new Error('no rational for ' + JSON.stringify(t));
}

function ratsEqual(a, b) {
  return a.n * b.d === b.n * a.d;
}

function applyOp(o, x, y) {
  switch (o) {
    case '+': return { n: x.n * y.d + y.n * x.d, d: x.d * y.d };
    case '−': return { n: x.n * y.d - y.n * x.d, d: x.d * y.d };
    case '×': return { n: x.n * y.n, d: x.d * y.d };
    case '÷': return { n: x.n * y.d, d: x.d * y.n };
    default: throw new Error('unexpected operator ' + o);
  }
}

// The fact with the '?' filled back in — from slots and answer only.
function filledTokens(p) {
  return p.slots.map((s, i) => {
    if (i !== p.answerSlot) return s;
    if (s.k === 'q') return p.answer;
    if (s.k === 'frac') { // one part hidden: fill that part, keep the other
      return s.hidePart === 'n'
        ? { k: 'frac', n: p.answer.n, d: s.d }
        : { k: 'frac', n: s.n, d: p.answer.n };
    }
    return s;
  });
}

// [a op b = c] holds exactly (or [a = b], the fraction equivalence shape).
function checkEquation(p, tag) {
  const toks = filledTokens(p);
  const eq = p.slots.findIndex((s) => s.k === 'op' && s.op === '=');
  assert.ok(eq >= 0, tag + 'an equation has an =');
  const rat = (i) => ratOf(toks[i]);
  let lhs;
  if (eq === 1) {
    lhs = rat(0);
  } else {
    assert.equal(eq, 3, tag + 'equation shape is [a op b = c]');
    lhs = applyOp(toks[1].op, rat(0), rat(2));
  }
  assert.ok(ratsEqual(lhs, rat(eq + 1)),
    tag + 'the fact filled back in is not true: ' + JSON.stringify(p));
}

// A sequence ascends by one constant step; the step is returned so callers can
// pin it (1/10 for the Decimal sequence — the only sequence left, §1b).
function checkSequence(p, tag) {
  const toks = filledTokens(p);
  assert.equal(toks.length, 4, tag + 'sequence length 4');
  assert.ok(!p.slots.some((s) => s.k === 'op'), tag + 'a sequence has no operators');
  const rat = toks.map(ratOf);
  const diff = (i) => ({ n: rat[i].n * rat[i - 1].d - rat[i - 1].n * rat[i].d,
    d: rat[i - 1].d * rat[i].d });
  const step = diff(1);
  assert.ok(step.n > 0, tag + 'a sequence ascends');
  for (let i = 2; i < rat.length; i++) {
    assert.ok(ratsEqual(diff(i), step),
      tag + 'constant step: ' + JSON.stringify(p));
  }
  return step;
}

// The universal per-problem sweep. Every rule that holds of ALL problems lives
// here; per-mode rules get their own named tests below.
function checkProblem(p) {
  const tag = p.mode + '/' + p.family + ': ';
  assert.ok(MODES.includes(p.mode), tag + 'mode is a ribbon mode');

  // Exactly one part is missing, and answerSlot points at it.
  let missing = 0;
  p.slots.forEach((s, i) => {
    if (s.k === 'q' || (s.k === 'frac' && s.hidePart)) {
      missing++;
      assert.equal(i, p.answerSlot, tag + 'the missing part sits at answerSlot');
    }
  });
  assert.equal(missing, 1, tag + 'exactly one part is missing');

  // The answer's kind matches the mode's keypad: integers everywhere except
  // decimal answers (digits + places) and fraction-sum answers, where an
  // entire fraction goes missing (§1 "numerator/denominator input when an
  // entire fraction is missing"). Equivalence hides one PART, so its answer is
  // the integer that fills it.
  if (p.mode === 'dec') assert.equal(p.answer.k, 'dec', tag + 'decimal answer');
  else if (p.mode === 'frac' && p.family === 'sum') {
    assert.ok(p.answer.k === 'frac' || p.answer.k === 'int', tag + 'sum answer');
  } else {
    assert.equal(p.answer.k, 'int', tag + 'integer answer');
  }

  // Every value of the completed fact is an exact non-negative rational
  // (rule 1); fraction denominators are ≥ 2, so never 0 and never an integer
  // in disguise (rule 3); decimals are tenths (rule 4's shape).
  for (const s of filledTokens(p)) {
    if (s.k === 'op') continue;
    const r = ratOf(s);
    assert.ok(Number.isInteger(r.n) && r.n >= 0 && Number.isInteger(r.d) && r.d >= 1,
      tag + 'values are non-negative rationals: ' + JSON.stringify(s));
    if (s.k === 'frac') {
      assert.ok(s.d >= 2, tag + 'fraction denominator ≥ 2, never 0: ' + JSON.stringify(s));
    }
    if (s.k === 'dec') {
      assert.equal(s.places, 1, tag + 'decimals are tenths, one place');
      assert.ok(Number.isInteger(s.digits) && s.digits >= 1,
        tag + 'decimal digits are a positive integer: ' + JSON.stringify(s));
    }
  }
  if (p.answer.k === 'frac') {
    assert.ok(p.answer.d >= 2 && p.answer.n >= 1, tag + 'answer fraction is sane');
  }

  if (p.slots.some((s) => s.k === 'op')) {
    checkEquation(p, tag);
  } else {
    const step = checkSequence(p, tag);
    if (p.mode === 'dec') {
      assert.ok(ratsEqual(step, { n: 1, d: 10 }), tag + 'Decimal steps by 0.1');
    }
  }

  // Rule 2, stated where it bites: divisor ≥ 2 (never 0, never 1) and the
  // division exact, re-derived from the filled fact.
  if (p.mode === 'div') {
    const vals = filledTokens(p).filter((s) => s.k !== 'op').map(ratOf);
    assert.equal(vals[1].n >= 2, true, tag + 'divisor ≥ 2, never 0');
    assert.equal(vals[1].d, 1, tag + 'divisor is whole');
    assert.equal(vals[0].n % vals[1].n, 0, tag + 'division is exact');
    assert.equal(vals[0].n, vals[1].n * vals[2].n,
      tag + 'dividend IS divisor × quotient');
  }
}

// The test's own deep compare of two slot lists (rule 6's "same problem").
function sameSlots(a, b) {
  if (a === b) return true;
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  return a.every((s, i) => {
    const t = b[i];
    if (s === t) return true;
    if (!s || !t || typeof s !== 'object' || typeof t !== 'object') return false;
    const ka = Object.keys(s);
    const kb = Object.keys(t);
    return ka.length === kb.length && ka.every((k) => s[k] === t[k]); // flat tokens
  });
}

// Draw until `want` problems of one family are collected (family null = any).
function collect(mode, family, want, seed) {
  const rng = mulberry32(seed);
  const out = [];
  let avoid = null;
  let guard = want * 40;
  while (out.length < want && guard-- > 0) {
    const p = makeMissingProblem(mode, avoid, rng);
    avoid = p;
    if (family === null || p.family === family) out.push(p);
  }
  assert.equal(out.length, want,
    'could not collect ' + want + ' problems of ' + mode + '/' + family);
  return out;
}

// --- The ribbon ------------------------------------------------------------------

test('the ribbon offers exactly the seven modes, in §1’s order as amended by §1b', () => {
  // §1b (owner, 2026-09-16): "Remove the overlapping Number sequence mode from
  // What's Missing" — number runs are Sequence's. The ribbon is
  // Count Block | + | − | × | ÷ | Fraction | Decimal.
  assert.deepStrictEqual(MODES,
    ['count', 'add', 'sub', 'mul', 'div', 'frac', 'dec']);
});

// --- No hidden randomness ----------------------------------------------------------

// A single Math.random() anywhere would make the module untestable: the same
// seed has to reproduce the same problems exactly.
test('same seed, same problems — the rng is the only source of chance', () => {
  const run = () => {
    const rng = mulberry32(42);
    const out = [];
    let avoid = null;
    for (let i = 0; i < 160; i++) {
      const p = makeMissingProblem(MODES[i % MODES.length], avoid, rng);
      out.push(p);
      avoid = p;
    }
    return out;
  };
  assert.deepStrictEqual(run(), run());
});

test('the module refuses an unknown mode, a Count Block submode, or a missing rng', () => {
  const rng = mulberry32(1);
  assert.throws(() => makeMissingProblem('nope', null, rng), /unknown mode/);
  // §1: "Count Block has no child-facing submodes anymore" — the six old rungs
  // must not be selectable, by id or by tag. And §1b: the Number sequence mode
  // is Sequence's now, so 'number' must be gone from this engine too.
  for (const id of ['w10', 'wany', 'wbig', 'wfirst', 'wtook', 'wstart',
    'Up to a ten', 'Up to any', 'A big jump', '? first', 'Took away',
    'Started with', 'number']) {
    assert.throws(() => makeMissingProblem(id, null, rng), /unknown mode/,
      'the retired id "' + id + '" must not be a mode');
  }
  assert.throws(() => makeMissingProblem('add', null), /requires an rng/);
  assert.throws(() => makeMissingProblem('add', null, undefined), /requires an rng/);
  assert.throws(() => makeMissingProblem(), /requires an rng/);
});

// --- The core rule: a valid fact first, then one hidden part ------------------------

test('every problem is a completed fact — fill the ? back in and it is exactly true', () => {
  // §1: "Generate a valid mathematical fact first, then hide one part." The
  // test's own evaluator (no help from the engine) checks every mode at
  // volume: equations hold exactly, sequences step constantly, and no answer
  // had to be hoped for.
  let seed = 1000;
  for (const mode of MODES) {
    const rng = mulberry32(seed++);
    let avoid = null;
    for (let i = 0; i < 800; i++) {
      const p = makeMissingProblem(mode, avoid, rng);
      checkProblem(p);
      avoid = p;
    }
  }
});

// --- Rule 1: no negative whole-number answers ----------------------------------------

test('no value and no answer is negative, in any mode', () => {
  // checkProblem asserts it of the completed fact; this long mixed run covers
  // mode interleaving too, and states the rule on the answer itself.
  const rng = mulberry32(555);
  let avoid = null;
  for (let i = 0; i < 4000; i++) {
    const p = makeMissingProblem(MODES[i % MODES.length], avoid, rng);
    checkProblem(p);
    if (p.answer.k === 'int') assert.ok(p.answer.n >= 0, 'int answer ≥ 0');
    if (p.answer.k === 'frac') assert.ok(p.answer.n >= 0, 'frac answer ≥ 0');
    if (p.answer.k === 'dec') assert.ok(p.answer.digits >= 0, 'dec answer ≥ 0');
    avoid = p;
  }
});

// --- Rule 2: division is exact whole-number facts only, never by zero ------------------

test('division is exact, and the divisor is never zero — at volume', () => {
  const rng = mulberry32(31415);
  let avoid = null;
  let sawDivisorTwo = 0;
  for (let i = 0; i < 2000; i++) {
    const p = makeMissingProblem('div', avoid, rng);
    checkProblem(p); // asserts divisor ≥ 2 and dividend = divisor × quotient
    const vals = filledTokens(p).filter((s) => s.k !== 'op').map(ratOf);
    for (const v of vals) assert.equal(v.d, 1, 'division facts are whole numbers');
    assert.ok(vals[0].n <= 100, 'dividends stay table-sized');
    assert.ok(vals[2].n >= 2, 'quotients stay at or above 2');
    if (vals[1].n === 2) sawDivisorTwo++;
    avoid = p;
  }
  assert.ok(sawDivisorTwo > 50, 'divisor 2 genuinely occurs (got ' + sawDivisorTwo + ')');
});

// --- Rule 3: a fraction denominator is never zero ---------------------------------------

test('a fraction denominator is never zero — or one — anywhere in Fraction mode', () => {
  const rng = mulberry32(2718);
  let avoid = null;
  let sawUnreduced = 0;
  for (let i = 0; i < 3000; i++) {
    const p = makeMissingProblem('frac', avoid, rng);
    checkProblem(p);
    for (const s of filledTokens(p)) {
      if (s.k !== 'frac') continue;
      assert.ok(Number.isInteger(s.d) && s.d >= 2,
        'denominator ≥ 2, so never 0 and never an integer in disguise: ' +
        JSON.stringify(s));
      assert.ok(Number.isInteger(s.n) && s.n >= 1, 'numerator ≥ 1');
      if (myGcd(s.n, s.d) > 1) sawUnreduced++;
    }
    if (p.answer.k === 'frac') {
      assert.ok(p.answer.d >= 2, 'answer denominator ≥ 2');
    }
    avoid = p;
  }
  // The equivalence family's scaled side is unreduced BY DESIGN (1/2 = ?/4) —
  // it must actually occur, or the family is not the one the spec asked for.
  assert.ok(sawUnreduced >= 100,
    'the unreduced equivalence writing is real, not dead code (got ' + sawUnreduced + ')');
});

// --- Rule 4: decimal correctness uses scaled integers, not floats ------------------------

test('naive float equality is unsafe in tenths — the hazard this rule guards against is real', () => {
  // IEEE 754 facts, true of any JavaScript. NOTE: 0.7 + 0.3 === 1 is TRUE — that sum
  // happens to round back to exactly 1.0, so it is the WRONG example to guard with, and
  // an earlier version of this test asserted it and failed. The hazard is real but it is
  // value-dependent, which is precisely why no decimal fact may be trusted to float
  // equality: you cannot tell by looking which sums survive.
  assert.notEqual(0.1 + 0.2, 0.3);          // 0.30000000000000004
  assert.notEqual(0.7 - 0.6, 0.1);          // 0.09999999999999998
  assert.equal(0.7 + 0.3, 1);               // survives, by luck, not by rule
  // The engine's arithmetic is in tenths, where every one of these is an integer
  // and none of them can fail.
  assert.equal(1 + 2, 3);
  assert.equal(7 - 6, 1);
  assert.equal(7 + 3, 10);
});

test('every decimal fact is exact in tenths — including facts float equality would get wrong', () => {
  // Over a seeded run: each fact re-derived by the test's own integer
  // arithmetic, AND at least one fact in the run is one where naive float
  // equality fails (x/10 + y/10 !== z/10) while the engine states it exactly —
  // proving the integer path is load-bearing, not decorative.
  const rng = mulberry32(1618);
  let avoid = null;
  let floatTraps = 0;
  for (let i = 0; i < 4000; i++) {
    const p = makeMissingProblem('dec', avoid, rng);
    checkProblem(p);
    if (p.family !== 'equation') { avoid = p; continue; }
    const vals = filledTokens(p).filter((s) => s.k !== 'op').map(ratOf);
    // tenths, exactly: values are digits over 10
    for (const v of vals) assert.equal(v.d, 10, 'decimal values are tenths');
    if (p.slots[1].op === '+') {
      assert.equal(vals[0].n + vals[1].n, vals[2].n, 'x + y IS z, in tenths');
      if (vals[0].n / 10 + vals[1].n / 10 !== vals[2].n / 10) floatTraps++;
    } else {
      assert.equal(vals[0].n - vals[1].n, vals[2].n, 'x − y IS z, in tenths');
    }
    avoid = p;
  }
  assert.ok(floatTraps >= 1,
    'the run must include a fact naive float equality would get wrong (got ' +
    floatTraps + ')');
});

// --- Rule 5: where the ? falls does not lean ----------------------------------------------
//
// The position is drawn uniformly over each family's legal slots, so the shares
// below hold with wide margin: at N = 3600 the binomial σ on a 1-in-3 share is
// ≈ 0.8pp and on a 1-in-4 ≈ 0.7pp, so every window is > 10σ roomy while still
// failing any real lean — a 60/40 split fails the two-slot window, a dead
// position fails outright, and a 45% concentration fails the three-slot one.

const N_POS = 3600;
const TWO = [0.35, 0.65];
const THREE = [0.24, 0.43];
const FOUR = [0.15, 0.35];

function assertShares(list, legal, window, label) {
  const counts = new Map(legal.map((i) => [i, 0]));
  for (const p of list) counts.set(p.answerSlot, (counts.get(p.answerSlot) || 0) + 1);
  const bad = [];
  for (const i of legal) {
    const share = (counts.get(i) || 0) / list.length;
    if (share < window[0] || share > window[1]) {
      bad.push('slot ' + i + ': ' + (share * 100).toFixed(1) + '%');
    }
  }
  assert.ok(bad.length === 0,
    label + ' position leans — ' + bad.join('; ') + ' (of ' + list.length + ')');
}

test('the ? position is a fair draw in every family of every mode', () => {
  // Count Block: slot 0 (? first) vs slot 2 (? second), via the uniform form
  // mix. The decimal sequence: four terms (Number's four-term run moved to
  // Sequence, §1b — the dec sequence keeps the same check). The operator
  // equations: three value slots (0, 2, 4 — operators occupy 1 and 3).
  assertShares(collect('count', null, N_POS, 3001), [0, 2], TWO, 'Count Block');
  assertShares(collect('add', 'equation', N_POS, 3003), [0, 2, 4], THREE, '+');
  assertShares(collect('sub', 'equation', N_POS, 3004), [0, 2, 4], THREE, '−');
  assertShares(collect('mul', 'equation', N_POS, 3005), [0, 2, 4], THREE, '×');
  assertShares(collect('div', 'equation', N_POS, 3006), [0, 2, 4], THREE, '÷');
  // Fraction equivalence: which fraction hides (slot 0 or 2) AND which part of
  // it (numerator or denominator) are both fair coins — four positions.
  const eq = collect('frac', 'equivalence', N_POS, 3007);
  assertShares(eq, [0, 2], TWO, 'Fraction equivalence, which side');
  const parts = new Map([['n', 0], ['d', 0]]);
  for (const p of eq) {
    const hp = p.slots[p.answerSlot].hidePart;
    parts.set(hp, parts.get(hp) + 1);
  }
  for (const [name, n] of parts) {
    const share = n / eq.length;
    assert.ok(share >= TWO[0] && share <= TWO[1],
      'Fraction equivalence hidePart ' + name + ' leans: ' +
      (share * 100).toFixed(1) + '%');
  }
  assertShares(collect('frac', 'sum', N_POS, 3008), [0, 2, 4], THREE, 'Fraction sum');
  assertShares(collect('dec', 'equation', N_POS, 3009), [0, 2, 4], THREE, 'Decimal equation');
  assertShares(collect('dec', 'sequence', N_POS, 3010), [0, 1, 2, 3], FOUR, 'Decimal sequence');
});

test('Count Block’s hidden pile occurs on both sides of the balance', () => {
  // The old layout grammar (space-math.html :5398, mirrored exactly) draws the
  // gap on the left for three forms and the right for one (subTake): 3:1 by
  // grammar, not by accident. Both sides must occur — a child must not learn
  // "the sockets are always on the left" — and if the mix ever moves from the
  // mirrored grammar, this says so.
  const list = collect('count', null, 4000, 3011);
  let left = 0;
  for (const p of list) {
    const gapLeft = p.layout.left.some((g) => g.kind === 'gap');
    const gapRight = p.layout.right.some((g) => g.kind === 'gap');
    assert.ok(gapLeft !== gapRight, 'exactly one side holds the gap');
    if (gapLeft) left++;
  }
  const share = left / list.length;
  assert.ok(share >= 0.60 && share <= 0.90,
    'gap-side mix moved from the mirrored 3:1 grammar: ' +
    (share * 100).toFixed(1) + '% left');
});

// --- Rule 6: avoid immediately repeating the same problem ----------------------------------

test('never the same problem twice in a row, with avoid threaded', () => {
  const rng = mulberry32(8888);
  let avoid = null;
  let prev = null;
  for (let i = 0; i < 5000; i++) {
    const mode = MODES[(i * 3 + 1) % MODES.length]; // gcd(3, 7) = 1: every mode occurs
    const p = makeMissingProblem(mode, avoid, rng);
    checkProblem(p);
    if (prev && prev.mode === p.mode) {
      assert.ok(!sameSlots(prev.slots, p.slots),
        'immediate repeat: ' + JSON.stringify(p));
    }
    prev = p;
    avoid = p;
  }
});

test('without avoid, consecutive repeats can occur — the guard is the threading', () => {
  // The guard is avoid, not luck: 'add' has 18 totals × their splits × 3
  // positions ≈ 567 distinct problems, so unguarded consecutive draws repeat
  // about one time in 567 — ~17 expected in 10,000 (P(none) ≈ 2e-8).
  const rng = mulberry32(1200);
  let repeats = 0;
  let prev = null;
  for (let i = 0; i < 10000; i++) {
    const p = makeMissingProblem('add', null, rng);
    if (prev && sameSlots(prev.slots, p.slots)) repeats++;
    prev = p;
  }
  assert.ok(repeats >= 1,
    'expected some consecutive repeats without avoid (got ' + repeats + ')');
});

// --- Count Block: the six old rungs live on inside, inside their old bounds ------------------
//
// The bounds are the test's own copy of MISSING_PRESETS (space-math.html :3242)
// — ids, forms and numbers — so the engine is held to the spec it inherited,
// not to itself. `a` is the given amount, `b` the amount on the other side,
// `answer` what the child builds; which of the three the rung caps differs by
// form, exactly as the old generator's draws do.

const COUNT_BOUNDS = {
  w10: { form: 'addEnd', bMax: 60, ansMin: 1, ansMax: 9, round: true },
  wany: { form: 'addEnd', bMin: 12, bMax: 60, ansMin: 1, ansMax: 10 },
  wbig: { form: 'addEnd', bMin: 30, bMax: 99, ansMin: 11, ansMax: 25 },
  wfirst: { form: 'addStart', bMax: 60, ansMin: 8, ansMax: 48 },
  wtook: { form: 'subTake', bMax: 60, ansMin: 1, ansMax: 12 },
  wstart: { form: 'subStart', bMax: 60 },
};

test('all six internal rungs generate, inside their old bounds', () => {
  const rng = mulberry32(20260915);
  const seen = new Map(Object.keys(COUNT_BOUNDS).map((id) => [id, 0]));
  let avoid = null;
  for (let i = 0; i < 7200; i++) {
    const p = makeMissingProblem('count', avoid, rng);
    avoid = p;
    checkProblem(p);
    const b = COUNT_BOUNDS[p.strategy];
    assert.ok(b, 'a known internal rung: ' + p.strategy);
    assert.equal(p.family, b.form, 'the rung’s form');
    seen.set(p.strategy, seen.get(p.strategy) + 1);
    // Re-derive the three amounts from the equation, never from engine fields.
    // addEnd/subTake write [a op ? = b]; addStart/subStart [? op a = b].
    const f = filledTokens(p).filter((s) => s.k !== 'op');
    const givenFirst = b.form === 'addEnd' || b.form === 'subTake';
    const given = (givenFirst ? f[0] : f[1]).n; // the rung’s `a`
    const other = f[2].n;                       // the rung’s `b`
    const ans = p.answer.n;
    assert.ok(ans >= 1 && given >= 1 && other >= 1, 'all three amounts ≥ 1');
    if (b.form === 'addEnd') {
      assert.ok(other >= (b.bMin || 1) && other <= b.bMax,
        'addEnd total inside the rung: ' + other);
      assert.ok(ans >= b.ansMin && ans <= b.ansMax, 'addEnd answer band: ' + ans);
      if (b.round) assert.equal(other % 5, 0, 'w10 targets end in 0 or 5');
    } else if (b.form === 'addStart') {
      assert.ok(other <= b.bMax, 'addStart total ≤ 60');
      assert.ok(ans >= b.ansMin && ans <= b.ansMax, 'addStart answer band: ' + ans);
      assert.ok(given >= 2 && given <= 12, 'addStart given amount 2–12');
    } else if (b.form === 'subTake') {
      assert.ok(given <= b.bMax && given >= 15, 'subTake started-with in [15, 60]');
      assert.ok(ans >= b.ansMin && ans <= b.ansMax, 'subTake answer band: ' + ans);
    } else {
      assert.ok(given >= 2 && given <= 12, 'subStart went-away 2–12');
      assert.ok(other >= 10, 'subStart stayed ≥ 10');
      assert.ok(ans <= b.bMax, 'subStart start ≤ 60');
    }
  }
  for (const [id, n] of seen) {
    assert.ok(n >= 100, 'rung ' + id + ' is real, not dead code (drew ' + n + ')');
  }
});

test('the easy rung keeps the owner’s 72/28 tens-and-fives bias', () => {
  // Owner, 2026-08-19: targets ending 0 are "satisfying and easy to see". The
  // two cases are drawn SEPARATELY at 72/28; the naive one-draw shortcut
  // measured 86.8/13.2 (space-math.html :5437). w10 is 1/4 × 1/3 = 1/12 of a
  // uniform-form mix: ~600 of 7200, tens ≈ 432, σ ≈ 1.8pp, so the window holds
  // 72% with > 6σ and fails 86.8% outright.
  const rng = mulberry32(4242);
  let avoid = null;
  let tens = 0;
  let fives = 0;
  for (let i = 0; i < 7200; i++) {
    const p = makeMissingProblem('count', avoid, rng);
    avoid = p;
    if (p.strategy !== 'w10') continue;
    const other = filledTokens(p).filter((s) => s.k !== 'op')[2].n;
    if (other % 10 === 0) tens++; else fives++;
  }
  assert.ok(tens + fives >= 400,
    'enough w10 draws to mean anything (got ' + (tens + fives) + ')');
  const share = tens / (tens + fives);
  assert.ok(share >= 0.60 && share <= 0.85,
    'tens share inside the owner’s band, got ' + (share * 100).toFixed(1) + '%');
});

// --- §1’s acceptance examples, as shapes -----------------------------------------------------

test('each mode produces the shape §1’s table promises', () => {
  const rng = mulberry32(99);
  const seen = { mulProduct: 0, fracEq: 0, fracSum: 0, wholeTotal: 0,
    fracWholeMissing: 0, decEq: 0, decSeq: 0 };
  let avoid = null;
  for (let i = 0; i < 4000; i++) {
    const mode = MODES[i % MODES.length];
    const p = makeMissingProblem(mode, avoid, rng);
    avoid = p;
    checkProblem(p);
    switch (mode) {
      case 'count':
        assert.ok(p.layout.left.concat(p.layout.right).some((g) => g.kind === 'gap'),
          'Count Block always has a missing pile');
        assert.ok(p.slots[1].op === '+' || p.slots[1].op === '−',
          'Count Block writes + or −');
        break;
      case 'add': assert.equal(p.slots[1].op, '+'); break;
      case 'sub': assert.equal(p.slots[1].op, '−'); break;
      case 'mul':
        assert.equal(p.slots[1].op, '×');
        if (p.answerSlot === 4) seen.mulProduct++; // 4 × 5 = ?
        break;
      case 'div': assert.equal(p.slots[1].op, '÷'); break;
      case 'frac':
        if (p.family === 'equivalence') {
          seen.fracEq++;
          assert.equal(p.slots[1].op, '=', 'equivalence is [frac = frac]');
        } else {
          seen.fracSum++;
          assert.ok(p.slots[1].op === '+' || p.slots[1].op === '−',
            'sum family is + or −');
          // 3/4 + ? = 1: the whole 1 written as the total. Parts are always
          // fractions, so any int token in the filled fact is the whole.
          if (filledTokens(p).some((s) => s.k === 'int')) seen.wholeTotal++;
          if (p.answer.k === 'frac') seen.fracWholeMissing++;
        }
        break;
      case 'dec':
        if (p.family === 'equation') {
          seen.decEq++;
          assert.ok(p.slots[1].op === '+' || p.slots[1].op === '−');
        } else {
          seen.decSeq++;
        }
        break;
    }
  }
  // Everything §1’s table names must be real, not dead code: the missing
  // product, both fraction families, totals written as the whole (3/4 + ? = 1),
  // entire fractions missing, and both decimal families.
  assert.ok(seen.mulProduct >= 100, 'missing product occurs (' + seen.mulProduct + ')');
  assert.ok(seen.fracEq >= 100 && seen.fracSum >= 100,
    'both fraction families occur (' + seen.fracEq + '/' + seen.fracSum + ')');
  assert.ok(seen.wholeTotal >= 40,
    'totals written as the whole 1 occur (' + seen.wholeTotal + ')');
  assert.ok(seen.fracWholeMissing >= 100,
    'entire fractions go missing (' + seen.fracWholeMissing + ')');
  assert.ok(seen.decEq >= 100 && seen.decSeq >= 100,
    'both decimal families occur (' + seen.decEq + '/' + seen.decSeq + ')');
});
