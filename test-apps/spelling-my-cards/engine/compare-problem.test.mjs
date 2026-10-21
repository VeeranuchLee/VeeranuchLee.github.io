// Tests for the Which is Bigger? compare engine.
//
// Everything the engine claims is re-derived here independently: the test has
// its own gcd, its own cross-multiplication, its own expr evaluator and its own
// bound table, so a wrong engine cannot pass by restating itself. Run with:
//   node --test math-app/engine/compare-problem.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeCompareProblem, compareValues, isDirectionFixed } from './compare-problem.js';

// --- A seeded rng (mulberry32) ----------------------------------------------

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

// --- Independent arithmetic (no help from the module) ------------------------

function myGcd(a, b) {
  while (b !== 0) {
    const t = a % b;
    a = b;
    b = t;
  }
  return a === 0 ? 1 : a;
}

// §4.2: sign comes only from cross-multiplying the two rationals.
function crossSign(l, r) {
  const lp = l.n * r.d;
  const rp = r.n * l.d;
  return lp < rp ? '<' : lp > rp ? '>' : '=';
}

function isReducedRational(v) {
  return Number.isInteger(v.n) && Number.isInteger(v.d) &&
    v.n >= 0 && v.d >= 1 && myGcd(v.n, v.d) === 1;
}

// Evaluates a side's expr to a rational, independently of the engine. div is
// kept as a/b without assuming divisibility — the no-remainder rule is a
// separate, explicit assertion.
function exprRational(repr, expr) {
  switch (repr) {
    case 'add': return { n: expr.a + expr.b, d: 1 };
    case 'sub': return { n: expr.a - expr.b, d: 1 };
    case 'mul': return { n: expr.a * expr.b, d: 1 };
    case 'div': return { n: expr.a, d: expr.b };
    case 'dec': return { n: expr.digits, d: expr.places === 1 ? 10 : 100 };
    default: throw new Error('unexpected expr for ' + repr);
  }
}

function rationalsEqual(a, b) {
  return crossSign(a, b) === '=';
}

// Exact hundredths numerator (k where value = k/100), or null.
function hundredthsOf(v) {
  const k = 100 * v.n;
  return k % v.d === 0 ? k / v.d : null;
}

// --- The owner's worked examples (§4.3) --------------------------------------

test('3/4 ? 0.8 is < (30 versus 32) and 3/4 ? 0.75 is = (300 = 300)', () => {
  assert.equal(compareValues({ n: 3, d: 4 }, { n: 8, d: 10 }), '<');
  assert.equal(compareValues({ n: 3, d: 4 }, { n: 75, d: 100 }), '=');
  assert.equal(crossSign({ n: 3, d: 4 }, { n: 8, d: 10 }), '<');
  assert.equal(crossSign({ n: 3, d: 4 }, { n: 75, d: 100 }), '=');
});

// --- No hidden randomness ----------------------------------------------------

// A single Math.random() anywhere would make the module untestable: the same
// seed has to reproduce the same problems exactly.
test('same seed, same problems — the rng is the only source of chance', () => {
  const run = () => {
    const rng = mulberry32(42);
    const out = [];
    let avoid = null;
    for (let i = 0; i < 60; i++) {
      const p = makeCompareProblem('frac', 'dec', 2, avoid, rng);
      out.push(p);
      avoid = p;
    }
    return out;
  };
  assert.deepStrictEqual(run(), run());
});

test('the module refuses an unknown representation, tier, or missing rng', () => {
  assert.throws(() => makeCompareProblem('num', 'num', 1, null));
  assert.throws(() => makeCompareProblem('num', 'num', 1, null, undefined));
  assert.throws(() => makeCompareProblem('nope', 'num', 1, null, mulberry32(1)));
  assert.throws(() => makeCompareProblem('num', 'num', 9, null, mulberry32(1)));
});

// --- Per-side invariants, from the §5 table, checked independently -----------

const TIER_MAX = { 1: 20, 2: 100, 3: 1000 };
const EXPR_REPRS = ['add', 'sub', 'mul', 'div', 'dec'];
const EASY = [2, 3, 4, 5, 6];
const HARDER = [2, 3, 4, 5, 6, 8, 10];
const DEC_PAIRED = [2, 4, 5, 10];

function where(pairing, which, tier, p) {
  return pairing[which] + ' (tier ' + tier + ', sign ' + p.sign + '): ';
}

function checkSide(side, otherRepr, tier, kind, pairing, which, p) {
  const tag = where(pairing, which, tier, p);
  const v = side.value;

  // The value type: an exact rational, n ≥ 0, d ≥ 1 (§4.2) — reduced, with
  // one deliberate exception (owner, 2026-09-14): the whole-valued equal-pair
  // fraction (4/2 = 2), unreduced by definition and permitted nowhere else.
  if (!isReducedRational(v)) {
    const wholeValued = v.d >= 2 && v.n % v.d === 0;
    assert.ok(side.repr === 'frac' && wholeValued && p.sign === '=',
      tag + 'unreduced only as the whole-valued equal-pair fraction: ' + JSON.stringify(v));
    const w = v.n / v.d; // exact — d divides n by the assert above
    assert.ok(w === 1 || w === 2 || w === 4 || w === 6,
      tag + 'whole-valued fraction worth a tier F partner value (1, 2, 4 or 6): ' +
      JSON.stringify(v));
  }

  // §4.5 pair domains: tier F's integer partners draw 1 or 2; tier D's stay
  // inside 0.1–20 on the whole side. mul is exempt from 1-or-2 — table facts
  // are its domain — but in tier F it stays at the small end of the table
  // (2 × 2, 2 × 3 / 3 × 2) so a fraction can reach it (widened 2026-09-14).
  if (kind === 'F' && ['num', 'add', 'sub', 'div', 'blocks'].includes(side.repr)) {
    assert.ok(v.n === 1 || v.n === 2,
      tag + 'tier F partner draws 1 or 2, got ' + v.n);
  }
  if (kind === 'F' && side.repr === 'mul') {
    assert.ok(v.n === 4 || v.n === 6,
      tag + 'tier F mul fact stays small (2 × 2, 2 × 3 / 3 × 2), got ' + v.n);
  }
  if (kind === 'D' && ['num', 'add', 'sub', 'div', 'blocks'].includes(side.repr)) {
    assert.ok(v.n >= 1 && v.n <= 20, tag + 'tier D whole side in 1–20, got ' + v.n);
  }

  // expr is present exactly for add/sub/mul/div/dec (§4.2).
  if (EXPR_REPRS.includes(side.repr)) {
    assert.ok(side.expr, tag + 'expr must be present');
    // The expression drawn on screen evaluates exactly to the value.
    assert.ok(rationalsEqual(exprRational(side.repr, side.expr), v),
      tag + 'expr ' + JSON.stringify(side.expr) + ' must equal value ' + JSON.stringify(v));
  } else {
    assert.equal(side.expr, undefined, tag + 'expr must be absent');
  }

  switch (side.repr) {
    case 'blocks':
      assert.equal(v.d, 1, tag + 'blocks are whole');
      assert.ok(v.n >= 1 && v.n <= 999, tag + 'blocks in 1–999: ' + v.n);
      assert.notEqual(v.n, 1000, tag + 'blocks are NEVER 1000');
      break;
    case 'num':
      assert.equal(v.d, 1, tag + 'num is whole');
      if (kind === 'W') {
        assert.ok(v.n >= 1 && v.n <= TIER_MAX[tier], tag + 'num inside tier: ' + v.n);
      }
      break;
    case 'add':
      assert.ok(side.expr.a >= 1 && side.expr.b >= 1, tag + 'add terms ≥ 1');
      assert.equal(side.expr.a + side.expr.b, v.n, tag + 'a + b IS the value');
      assert.ok(v.n <= TIER_MAX[tier], tag + 'add total inside tier: ' + v.n);
      assert.equal(side.expr.op, '+');
      break;
    case 'sub':
      assert.ok(side.expr.a >= side.expr.b, tag + 'sub result non-negative');
      assert.ok(side.expr.b >= 0, tag + 'sub terms non-negative');
      assert.equal(side.expr.a - side.expr.b, v.n, tag + 'a − b IS the value');
      assert.ok(v.n <= TIER_MAX[tier], tag + 'sub result inside tier: ' + v.n);
      assert.equal(side.expr.op, '−');
      break;
    case 'mul':
      assert.ok(side.expr.a >= 2 && side.expr.a <= 10, tag + 'mul factors 2–10');
      assert.ok(side.expr.b >= 2 && side.expr.b <= 10, tag + 'mul factors 2–10');
      assert.equal(side.expr.a * side.expr.b, v.n, tag + 'a × b IS the value');
      assert.ok(v.n <= 100, tag + 'mul product ≤ 100: ' + v.n);
      assert.equal(side.expr.op, '×');
      break;
    case 'div':
      assert.ok(side.expr.b >= 2, tag + 'divisor ≥ 2');
      assert.equal(side.expr.a % side.expr.b, 0, tag + 'division is exact, no remainder');
      assert.equal(side.expr.a / side.expr.b, v.n, tag + 'a ÷ b IS the value');
      assert.equal(side.expr.op, '÷');
      break;
    case 'frac': {
      // §4.5, widened 2026-09-14: proper beside dec and frac as before; beside
      // a whole-number partner the fraction may also be improper (5/4, 3/2,
      // 5/2) or — the one unreduced exception, asserted above — whole-valued
      // on an equal pair (4/2 = 2). d ≥ 2 always: a fraction side is never an
      // integer in disguise.
      assert.ok(v.n >= 1 && v.d >= 2,
        tag + 'fraction is n ≥ 1 over d ≥ 2: ' + v.n + '/' + v.d);
      if (otherRepr === 'dec') {
        assert.ok(v.n < v.d, tag + 'frac paired with dec stays proper: ' + v.n + '/' + v.d);
        // §4.3: exactly writable in ≤ 2 places — 1/3 is excluded, not rounded.
        assert.ok(DEC_PAIRED.includes(v.d),
          tag + 'frac paired with dec keeps d in {2,4,5,10}: ' + v.d);
        assert.equal(100 % v.d, 0, tag + 'd divides 100');
      } else {
        const allowed = tier >= 2 ? HARDER : EASY;
        assert.ok(allowed.includes(v.d), tag + 'easy denominator: ' + v.d);
        if (otherRepr === 'frac') {
          assert.ok(v.n < v.d, tag + 'frac vs frac stays proper: ' + v.n + '/' + v.d);
        } else {
          // The whole-partner magnitude, by integer comparison only — the
          // fraction's value stays ≤ 2 (≤ 3 beside add's 1 + 1, ≤ 8 beside a
          // mul fact of 4 or 6): 3/4 < 1, 5/4 < 2, 5/2 > 1 + 1, 9/2 > 2 × 2.
          const cap = otherRepr === 'mul' ? 8 : otherRepr === 'add' ? 3 : 2;
          assert.ok(v.n <= cap * v.d,
            tag + 'fraction within the pair domain: ' + v.n + '/' + v.d + ' ≤ ' + cap);
        }
      }
      break;
    }
    case 'dec': {
      assert.ok(side.expr.places === 1 || side.expr.places === 2,
        tag + 'dec has 1–2 places');
      assert.ok(Number.isInteger(side.expr.digits) && side.expr.digits >= 1,
        tag + 'dec digits are a positive integer');
      const k = hundredthsOf(v);
      assert.notEqual(k, null, tag + 'dec value is k/100');
      if (kind === 'D') {
        assert.ok(k >= 10 && k <= 2000, tag + 'tier D dec in 0.1–20: k=' + k);
      } else {
        assert.ok(k >= 1 && k <= 200, tag + 'tier F dec in (0,2]: k=' + k);
      }
      break;
    }
    default:
      assert.fail(tag + 'unknown repr on a side');
  }
}

function checkProblem(p, pairing, tier) {
  assert.equal(p.left.repr, pairing[0], 'left repr is the requested one');
  assert.equal(p.right.repr, pairing[1], 'right repr is the requested one');
  const kind = pairing.includes('frac') ? 'F' : pairing.includes('dec') ? 'D' : 'W';
  checkSide(p.left, pairing[1], tier, kind, pairing, 0, p);
  checkSide(p.right, pairing[0], tier, kind, pairing, 1, p);
  // sign comes only from the values, by cross-multiplication.
  assert.equal(p.sign, crossSign(p.left.value, p.right.value),
    'sign agrees with independent cross-multiplication');
}

// --- The sweep: every pairing, every tier, many draws each -------------------

const REPRS = ['blocks', 'num', 'add', 'sub', 'mul', 'div', 'frac', 'dec'];

function sweepPairing(pairing, tier, draws, seed) {
  const rng = mulberry32(seed);
  let avoid = null;
  let prev = null;
  for (let i = 0; i < draws; i++) {
    const p = makeCompareProblem(pairing[0], pairing[1], tier, avoid, rng);
    checkProblem(p, pairing, tier);
    // §4.4: never two equal pairs in a row; not the same pair of values twice.
    if (prev) {
      assert.ok(!(prev.sign === '=' && p.sign === '='),
        'never two equal pairs in a row (' + pairing.join(' vs ') + ', tier ' + tier + ')');
      assert.ok(
        !(rationalsEqual(prev.left.value, p.left.value) &&
          rationalsEqual(prev.right.value, p.right.value)),
        'not the same pair of values twice in a row');
    }
    prev = p;
    avoid = p;
  }
}

test('sweep: every representation pair, every tier, obeys every rule', () => {
  let seed = 1000;
  for (const tier of [1, 2, 3]) {
    for (const l of REPRS) {
      for (const r of REPRS) {
        sweepPairing([l, r], tier, 80, seed++);
      }
    }
  }
});

// --- Asked many times, at volume ---------------------------------------------

test('blocks never reach 1000, however often asked (tier 3)', () => {
  for (const pairing of [['blocks', 'num'], ['num', 'blocks'], ['blocks', 'blocks']]) {
    const rng = mulberry32(777);
    for (let i = 0; i < 600; i++) {
      const p = makeCompareProblem(pairing[0], pairing[1], 3, null, rng);
      const sides = [p.left, p.right].filter((s) => s.repr === 'blocks');
      for (const s of sides) {
        assert.ok(s.value.n >= 1 && s.value.n <= 999,
          pairing.join(' vs ') + ': blocks stay in 1–999, got ' + s.value.n);
      }
    }
  }
});

test('sub never negative and div never leaves a remainder, at volume', () => {
  const rng = mulberry32(31415);
  const pairings = [
    ['sub', 'sub'], ['sub', 'num'], ['num', 'sub'],
    ['div', 'div'], ['div', 'num'], ['num', 'div'], ['div', 'sub'],
  ];
  for (const pairing of pairings) {
    for (let i = 0; i < 400; i++) {
      const p = makeCompareProblem(pairing[0], pairing[1], 2, null, rng);
      for (const s of [p.left, p.right]) {
        if (s.repr === 'sub') {
          assert.ok(s.expr.a >= s.expr.b, 'a ≥ b: ' + JSON.stringify(s.expr));
          assert.equal(s.expr.a - s.expr.b, s.value.n);
        }
        if (s.repr === 'div') {
          assert.equal(s.expr.a % s.expr.b, 0, 'exact: ' + JSON.stringify(s.expr));
          assert.equal(s.expr.a / s.expr.b, s.value.n);
        }
      }
    }
  }
});

// --- The equality cadence (§4.4 — decided, not tuned) -------------------------

test('equal pairs land near one in 6.7 and never twice in a row', () => {
  for (const [pairing, tier] of [
    [['num', 'num'], 1],
    [['frac', 'dec'], 1],
    [['dec', 'num'], 2],
  ]) {
    const rng = mulberry32(20260914);
    let avoid = null;
    let equals = 0;
    let prevSign = null;
    const N = 3000;
    for (let i = 0; i < N; i++) {
      const p = makeCompareProblem(pairing[0], pairing[1], tier, avoid, rng);
      if (prevSign === '=' && p.sign === '=') {
        assert.fail(pairing.join(' vs ') + ': two equal pairs in a row');
      }
      if (p.sign === '=') equals++;
      prevSign = p.sign;
      avoid = p;
    }
    const rate = equals / N;
    assert.ok(rate >= 0.10 && rate <= 0.20,
      pairing.join(' vs ') + ': equality rate felt ~15%, got ' + (rate * 100).toFixed(1) + '%');
    assert.ok(equals >= 250, 'the equal path is real, not dead code (got ' + equals + ')');
  }
});

test('a long mixed run never yields two equal pairs in a row', () => {
  const rng = mulberry32(555);
  let avoid = null;
  let prevSign = null;
  for (let i = 0; i < 5000; i++) {
    const l = REPRS[i % 8];
    const r = REPRS[(i * 3 + 1) % 8];
    const tier = 1 + (i % 3);
    const p = makeCompareProblem(l, r, tier, avoid, rng);
    checkProblem(p, [l, r], tier);
    if (prevSign === '=' && p.sign === '=') assert.fail('two equal pairs in a row');
    prevSign = p.sign;
    avoid = p;
  }
});

// --- Direction-first fairness (§4.4) -----------------------------------------

test('which side is bigger does not lean, on symmetric pairings', () => {
  // Measure all three first: an assert inside the loop would stop at the
  // first offender and leave the other pairings unmeasured.
  const measured = [];
  const leaning = [];
  for (const pairing of [['num', 'num'], ['frac', 'dec'], ['dec', 'num']]) {
    const rng = mulberry32(8888);
    let leftBigger = 0;
    let unequal = 0;
    for (let i = 0; i < 2000; i++) {
      const p = makeCompareProblem(pairing[0], pairing[1], 1, null, rng);
      if (p.sign === '>') leftBigger++;
      if (p.sign !== '=') unequal++;
    }
    const share = leftBigger / unequal;
    measured.push(pairing.join(' vs ') + ': ' + (share * 100).toFixed(1) + '% left');
    if (share < 0.35 || share > 0.65) {
      leaning.push(pairing.join(' vs ') + ' leans ' + (share * 100).toFixed(1) + '% left');
    }
  }
  assert.ok(leaning.length === 0,
    'direction outside 35–65% left — ' + leaning.join('; ') +
    ' (all pairings: ' + measured.join('; ') + ')');
});

// --- Direction fairness on every selectable pairing (§4.4) -------------------
//
// The spec offers all eight representations on both sides (§3: "g1 offers all
// eight on **both** sides") over the magnitude tiers 1–3, so every
// combination below is one a child can select, and §4.4 makes direction a
// fair coin: "which side is bigger is chosen before the gap, among the sides
// that have room". Share = left-bigger / unequal, pooled over the seeds.
//
// Since the fraction domain was widened (owner, 2026-09-14; §10 open question
// 4, closed) there are no direction-fixed pairings left: the twelve frac-vs-
// whole exceptions this test used to carry were the old proper-only domain
// deciding the answer by itself. The engine's own isDirectionFixed — kept
// exported for callers — is held to false on all sixty-four pairs, and both
// directions must genuinely occur on every one of them.
//
// Draw budget: 4 seeds × 200 draws = 800 problems per combination, ~660 of
// them unequal, so the pooled share's standard error is ~1.9pp and the 35–65%
// bound holds with >5σ margin at the worst legitimate share (~51%); a single
// seed (~165 unequal, ~3.9pp) is guarded at a looser 30–70%. The 153,600
// problems keep the whole suite in the low seconds.

const FAIRNESS_SEEDS = [909, 1818, 2727, 3636];
const FAIRNESS_DRAWS = 200;

test('direction is a fair coin on every selectable pairing — no exceptions left', () => {
  for (const l of REPRS) {
    for (const r of REPRS) {
      assert.equal(isDirectionFixed(l, r), false,
        'no pairing may have a fixed answer any more: ' + l + ' ' + r);
    }
  }
  const leaning = [];
  const oneWayed = [];
  for (const tier of [1, 2, 3]) {
    for (const l of REPRS) {
      for (const r of REPRS) {
        const key = 'tier ' + tier + ' ' + l + ' ' + r;
        let leftBigger = 0;
        let unequal = 0;
        let sawLeftBigger = false;
        let sawRightBigger = false;
        for (const seed of FAIRNESS_SEEDS) {
          const rng = mulberry32(seed);
          let seedLeftBigger = 0;
          let seedUnequal = 0;
          for (let i = 0; i < FAIRNESS_DRAWS; i++) {
            const p = makeCompareProblem(l, r, tier, null, rng);
            if (p.sign === '=') continue;
            unequal++;
            seedUnequal++;
            if (p.sign === '>') {
              leftBigger++;
              seedLeftBigger++;
              sawLeftBigger = true;
            } else {
              sawRightBigger = true;
            }
          }
          const share = seedLeftBigger / seedUnequal;
          if (share < 0.30 || share > 0.70) {
            leaning.push(key + ' seed ' + seed + ': ' +
              (share * 100).toFixed(1) + '% left-bigger');
          }
        }
        const share = leftBigger / unequal;
        if (share < 0.35 || share > 0.65) {
          leaning.push(key + ': ' + (share * 100).toFixed(1) + '% left-bigger');
        }
        if (!sawLeftBigger || !sawRightBigger) {
          oneWayed.push(key + ' — one direction never occurred');
        }
      }
    }
  }
  assert.ok(leaning.length === 0,
    'direction outside 35–65% (per-seed 30–70%) — ' + leaning.join('; '));
  assert.ok(oneWayed.length === 0,
    'both directions must occur on every pairing — ' + oneWayed.join('; '));
});

// --- The widened fraction domain (owner, 2026-09-14; §4.5, §10 Q4 closed) ----
//
// "For fraction ↔ whole number, definitely allow all three relationships:
// 3/4 < 1, 5/4 > 1, 4/2 = 2 … the generator must not create a learnable
// shortcut such as 'whole numbers always beat fractions.'" Each test below
// asks one pairing many times, because a single draw tests a point, not a
// distribution.

const WHOLE6 = ['blocks', 'num', 'add', 'sub', 'mul', 'div'];

test('frac against every whole-number representation yields <, > and =, in both orders', () => {
  for (const tier of [1, 2]) {
    for (let w = 0; w < WHOLE6.length; w++) {
      for (const pair of [[WHOLE6[w], 'frac'], ['frac', WHOLE6[w]]]) {
        const rng = mulberry32(4000 + tier * 100 + w * 2 + (pair[0] === 'frac' ? 1 : 0));
        let avoid = null;
        const seen = { '<': 0, '>': 0, '=': 0 };
        for (let i = 0; i < 900; i++) {
          const p = makeCompareProblem(pair[0], pair[1], tier, avoid, rng);
          checkProblem(p, pair, tier);
          seen[p.sign]++;
          avoid = p;
        }
        const missing = ['<', '>', '='].filter((s) => seen[s] === 0);
        assert.ok(missing.length === 0,
          'tier ' + tier + ' ' + pair.join(' vs ') + ' never yielded ' +
          missing.join(' or ') + ' (counts < ' + seen['<'] + ', > ' + seen['>'] +
          ', = ' + seen['='] + ')');
      }
    }
  }
});

test('the equal share on the widened pairings sits inside the owner’s 10–15% band', () => {
  // EQUAL_COIN is untouched (.15/.85, long-run share p/(1+p) = 15.0%): the
  // widening only means the twelve frac-vs-whole pairings now HONOUR the coin
  // instead of declining it away, so they land where every other pairing
  // already lands. Pooled over 18,000 draws the binomial σ is ≈ 0.26pp, so
  // the window holds the coin's 15.0% with >5σ of room while failing anything
  // a whisker above the band's top or anywhere near its floor; the
  // no-two-in-a-row gate is checked along the way.
  let equals = 0;
  let total = 0;
  for (let w = 0; w < WHOLE6.length; w++) {
    for (const pair of [[WHOLE6[w], 'frac'], ['frac', WHOLE6[w]]]) {
      const rng = mulberry32(6000 + w * 2 + (pair[0] === 'frac' ? 1 : 0));
      let avoid = null;
      let prevSign = null;
      for (let i = 0; i < 1500; i++) {
        const p = makeCompareProblem(pair[0], pair[1], 1, avoid, rng);
        if (prevSign === '=' && p.sign === '=') {
          assert.fail(pair.join(' vs ') + ': two equal pairs in a row');
        }
        if (p.sign === '=') equals++;
        prevSign = p.sign;
        avoid = p;
        total++;
      }
    }
  }
  const rate = equals / total;
  assert.ok(rate >= 0.10 && rate <= 0.16,
    'equal share felt ~15%, got ' + (rate * 100).toFixed(2) + '% of ' + total);
  assert.ok(equals >= 500, 'the equal path is real, not dead code (got ' + equals + ')');
});

test('a fraction is shown unreduced only as a whole value on an equal pair', () => {
  // 4/2 = 2 is the owner's named shape; 2/4 is still never shown. Every frac
  // side over every pairing containing frac is checked — and the exception
  // must actually occur, or the rule proves nothing about the generator that
  // ships. Whole values are 1 and 2 (the 1-or-2 partners) and 4 and 6 (the
  // small mul facts), by integer division after asserting d divides n.
  let unreduced = 0;
  for (const tier of [1, 2]) {
    for (const l of REPRS) {
      for (const r of REPRS) {
        if (l !== 'frac' && r !== 'frac') continue;
        const rng = mulberry32(9000 + tier * 1000 + REPRS.indexOf(l) * 8 + REPRS.indexOf(r));
        let avoid = null;
        for (let i = 0; i < 400; i++) {
          const p = makeCompareProblem(l, r, tier, avoid, rng);
          checkProblem(p, [l, r], tier);
          avoid = p;
          for (const side of [p.left, p.right]) {
            if (side.repr !== 'frac' || isReducedRational(side.value)) continue;
            unreduced++;
            assert.equal(p.sign, '=',
              'unreduced fraction outside an equal pair: ' + JSON.stringify(p));
            assert.ok(side.value.d >= 2 && side.value.n % side.value.d === 0,
              'unreduced fraction without a whole-number value: ' +
              JSON.stringify(side.value));
            const whole = side.value.n / side.value.d;
            assert.ok(whole === 1 || whole === 2 || whole === 4 || whole === 6,
              'unreduced fraction worth ' + whole + ', not a tier F partner value');
          }
        }
      }
    }
  }
  assert.ok(unreduced >= 50,
    'the unreduced exception is real, not dead code (saw ' + unreduced + ')');
});

test('every stated answer is the exact arithmetic of its sides', () => {
  // The sign is the test's own cross-multiplication of the two values, and
  // every expr drawn on screen evaluates exactly to its side's value through
  // the test's own evaluator (§4.2) — re-derived here, not borrowed from the
  // engine, over all sixty-four pairs at all three tiers.
  let seed = 7000;
  for (const tier of [1, 2, 3]) {
    for (const l of REPRS) {
      for (const r of REPRS) {
        const rng = mulberry32(seed++);
        let avoid = null;
        for (let i = 0; i < 40; i++) {
          const p = makeCompareProblem(l, r, tier, avoid, rng);
          assert.equal(p.sign, crossSign(p.left.value, p.right.value),
            'the stated sign is the cross-product of the values: ' + JSON.stringify(p));
          for (const s of [p.left, p.right]) {
            if (!EXPR_REPRS.includes(s.repr)) continue;
            assert.ok(rationalsEqual(exprRational(s.repr, s.expr), s.value),
              s.repr + ' expr ' + JSON.stringify(s.expr) +
              ' must evaluate exactly to ' + JSON.stringify(s.value));
          }
          avoid = p;
        }
      }
    }
  }
});
