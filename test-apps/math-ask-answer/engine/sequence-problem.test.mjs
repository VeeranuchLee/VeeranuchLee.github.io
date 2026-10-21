// Tests for the Sequence pattern-run engine (SEQUENCE-SPEC §31).
//
// Everything the engine claims is re-derived here independently: the test has
// its own rule application, its own label table, its own cap and its own
// family domains, so a wrong engine cannot pass by restating itself. The
// checks are the spec's §31 checklist, run over large seeded samples rather
// than hand-picked questions. Run with:
//   node --test math-app/engine/sequence-problem.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  makeSequenceProblem,
  validateSequenceProblem,
  questionSignature,
} from './sequence-problem.js';

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

const MAX = 9999; // §9's cap, restated here
const FAMS = ['count', 'skipCount', 'addSub', 'multiplyDivide'];
const PRESET_LIST = FAMS.concat(['mixed']);

// §16's child-facing symbols — the test's own table, so a label drift in the
// engine cannot pass by echoing itself. The minus is U+2212, not a hyphen.
const SYMBOL = { add: '+', sub: '−', multiply: '×', divide: '÷' };

// The row's length, derived independently: five (§2), except four on a
// ×10/÷10 row — the owner's "shorter row" ruling, 2026-09-17. Gated on the
// operator as well as the factor, because an additive step of 10 (skip
// counting by 10, +10) is an ordinary five-term row.
function rowLength(operator, k) {
  return (operator === 'multiply' || operator === 'divide') && k === 10 ? 4 : 5;
}

// The stored rule applied forward from start — the test's own derivation of
// what the terms must be (§31: "verify mathematically that the stored answer
// exactly satisfies the stored rule"). Division is kept as a / b; if the
// engine ever built a ÷ run that was not an exact reversed multiplication,
// the deepStrictEqual below catches it before any integer assertion does.
function deriveTerms(operator, start, k) {
  const out = [start];
  for (let i = 1; i < rowLength(operator, k); i++) {
    const prev = out[i - 1];
    out.push(operator === 'add' ? prev + k
      : operator === 'sub' ? prev - k
      : operator === 'multiply' ? prev * k
      : prev / k);
  }
  return out;
}

// Every §31/§18 invariant, on one problem. `preset` is what was asked for;
// for 'mixed' the family-specific rules are checked against p.family, which
// is §10's "mixed draws only from the four Phase-1 families".
function checkProblem(p, preset) {
  const tag = preset + ' ' + JSON.stringify(p) + ': ';
  assert.ok(p && typeof p === 'object', tag + 'a question object');

  // Structure: exactly the row's term count — five (§2), or four on a ×10/÷10
  // row (owner ruling "shorter row", 2026-09-17) — and exactly one blank
  // inside that row (§2, §31).
  const expected = rowLength(p.operator, p.stepOrFactor);
  assert.ok(Array.isArray(p.terms) && p.terms.length === expected,
    tag + 'exactly ' + expected + ' terms');
  assert.ok(Number.isInteger(p.blankIndex) && p.blankIndex >= 0 && p.blankIndex < expected,
    tag + 'exactly one blank at an integer index 0–' + (expected - 1));

  // The terms are the stored rule applied forward — re-derived, not trusted.
  const derived = deriveTerms(p.operator, p.start, p.stepOrFactor);
  assert.deepStrictEqual(derived, p.terms,
    tag + 'terms are the rule applied forward from start');

  // §31's literal per-operator checks on every adjacent pair.
  for (let i = 1; i < p.terms.length; i++) {
    const a = p.terms[i - 1], b = p.terms[i], k = p.stepOrFactor;
    if (p.operator === 'add') assert.equal(b, a + k, tag + 'next === current + step');
    if (p.operator === 'sub') assert.equal(b, a - k, tag + 'next === current − step');
    if (p.operator === 'multiply') assert.equal(b, a * k, tag + 'next === current × factor');
    if (p.operator === 'divide') {
      assert.ok(Number.isInteger(b), tag + 'every division term is an integer');
      assert.equal(a % k, 0, tag + 'division is exact');
      assert.equal(b, a / k, tag + 'next === current ÷ divisor');
    }
  }

  // The stored answer IS the hidden term, and satisfies the rule.
  assert.equal(p.answer, p.terms[p.blankIndex], tag + 'answer is terms[blankIndex]');
  assert.equal(p.answer, derived[p.blankIndex], tag + 'answer satisfies the rule');

  // Finiteness, whole numbers, sign, cap, and no −0 (§31).
  for (const t of [p.start, p.stepOrFactor, p.answer].concat(p.terms)) {
    assert.ok(Number.isFinite(t), tag + 'no NaN or Infinity');
    assert.ok(Number.isInteger(t), tag + 'whole numbers only');
  }
  for (const t of p.terms) {
    assert.ok(t >= 0, tag + 'no negative numbers');
    assert.ok(t <= MAX, tag + 'nothing above the 9,999 maximum');
    assert.ok(!Object.is(t, -0), tag + 'no negative zero');
  }

  // No +0/−0/×0/×1/÷0/÷1 (§18, §31).
  if (p.operator === 'add' || p.operator === 'sub') {
    assert.ok(p.stepOrFactor >= 1, tag + 'no +0 or −0 step');
  } else {
    assert.ok(p.stepOrFactor >= 2, tag + 'no ×0/×1/÷0/÷1');
  }

  // §16: the label uses the proper symbols, never * or /.
  assert.equal(p.ruleLabel, SYMBOL[p.operator] + p.stepOrFactor, tag + 'ruleLabel');
  assert.ok(p.ruleLabel.indexOf('*') === -1 && p.ruleLabel.indexOf('/') === -1,
    tag + 'no programming symbols in the label');

  // Family domains: each preset emits only its own family; mixed emits only
  // the four Phase-1 families, and the family's own rules still hold (§6–§10).
  assert.ok(FAMS.includes(p.family), tag + 'family is a Phase-1 family');
  if (preset !== 'mixed') assert.equal(p.family, preset, tag + 'family matches the preset');
  const fam = preset === 'mixed' ? p.family : preset;
  switch (fam) {
    case 'count':
      assert.ok(p.operator === 'add' || p.operator === 'sub', tag + 'count is +1 or −1');
      assert.equal(p.stepOrFactor, 1, tag + 'count step is exactly 1');
      break;
    case 'skipCount':
      assert.ok(p.operator === 'add' || p.operator === 'sub', tag + 'skip is ±n');
      assert.ok([2, 3, 4, 5, 10].includes(p.stepOrFactor), tag + 'skip step in {2,3,4,5,10}');
      break;
    case 'addSub':
      assert.ok(p.operator === 'add' || p.operator === 'sub', tag + 'addSub is +N or −N');
      assert.ok(p.stepOrFactor >= 2 && p.stepOrFactor <= 20, tag + 'addSub N in 2–20');
      break;
    case 'multiplyDivide':
      assert.ok(p.operator === 'multiply' || p.operator === 'divide', tag + '×/÷ operator');
      // 10 is back, on a FOUR-term row — the owner's "shorter row" ruling,
      // 2026-09-17, the only shape in which a ×10 run fits under 9,999; the
      // dedicated ruling tests below hold that down themselves.
      assert.ok([2, 3, 4, 5, 10].includes(p.stepOrFactor), tag + 'factor in {2,3,4,5,10}');
      break;
    default:
      assert.fail(tag + 'unknown family');
  }
}

// --- No hidden randomness ----------------------------------------------------

test('same seed, same problems — the rng is the only source of chance', () => {
  const run = () => {
    const out = [];
    for (const preset of PRESET_LIST) {
      const rng = mulberry32(42);
      let avoid = null;
      for (let i = 0; i < 60; i++) {
        const p = makeSequenceProblem(preset, avoid, rng);
        out.push(p);
        avoid = p;
      }
    }
    return out;
  };
  assert.deepStrictEqual(run(), run());
});

test('the module refuses an unknown preset or a missing rng', () => {
  assert.throws(() => makeSequenceProblem('addSub', null, undefined));
  assert.throws(() => makeSequenceProblem('addSub'));
  assert.throws(() => makeSequenceProblem('fibonacci', null, mulberry32(1)));
});

// --- The sweep: every preset, thousands of draws (§31) ------------------------

test('sweep: every preset obeys every rule, thousands of draws each', () => {
  const plan = [
    ['count', 2500, 1000],
    ['skipCount', 2500, 2000],
    ['addSub', 2500, 3000],
    ['multiplyDivide', 3000, 4000],
    ['mixed', 3000, 5000],
  ];
  for (const [preset, draws, seed] of plan) {
    const rng = mulberry32(seed);
    let avoid = null;
    const operators = new Set();
    const blanks = new Set();
    const families = new Set();
    const steps = new Set();
    for (let i = 0; i < draws; i++) {
      const p = makeSequenceProblem(preset, avoid, rng);
      checkProblem(p, preset);
      if (avoid) {
        // §18: no near-identical consecutive question.
        assert.notEqual(questionSignature(p), questionSignature(avoid),
          preset + ': repeated question signature back-to-back');
        // §10: mixed rotates families — never the same family twice in a row.
        if (preset === 'mixed') {
          assert.notEqual(p.family, avoid.family,
            'mixed repeated ' + p.family + ' back-to-back');
        }
      }
      operators.add(p.operator);
      blanks.add(p.blankIndex);
      families.add(p.family);
      steps.add(p.stepOrFactor);
      avoid = p;
    }
    // All five blank positions occur (§11 "use all five positions").
    assert.equal(blanks.size, 5, preset + ': all five blank positions occur');
    if (preset === 'count' || preset === 'skipCount' || preset === 'addSub') {
      // Ascending and descending both occur (§6–§8).
      assert.ok(operators.has('add') && operators.has('sub'),
        preset + ': both directions occur');
      assert.equal(families.size, 1, preset + ': only its own family');
    }
    if (preset === 'skipCount') {
      for (const s of [2, 3, 4, 5, 10]) {
        assert.ok(steps.has(s), 'skipCount: step ' + s + ' occurs');
      }
    }
    if (preset === 'addSub') {
      for (const s of steps) {
        assert.ok(s >= 2 && s <= 20, 'addSub step in 2–20, got ' + s);
      }
    }
    if (preset === 'multiplyDivide') {
      assert.ok(operators.has('multiply') && operators.has('divide'),
        'multiplyDivide: both × and ÷ occur');
      for (const f of [2, 3, 4, 5, 10]) {
        assert.ok(steps.has(f), 'multiplyDivide: factor ' + f + ' occurs');
      }
    }
    if (preset === 'mixed') {
      assert.equal(families.size, 4, 'mixed: all four families occur');
      assert.equal(operators.size, 4, 'mixed: all four operators occur');
    }
  }
});

// --- Blank-position weighting (§11) -------------------------------------------
//
// The requirement is the distribution, not variation: first 10%, second 20%,
// middle 30%, fourth 25%, last 15%, so the middle must be the commonest. At
// N = 40,000 the binomial σ of the widest cell (30%) is ~0.23pp, so the ±3pp
// windows hold >10σ from each target, and every adjacent pair in the required
// ordering 30 > 25 > 20 > 15 > 10 is separated by 5pp at ≥16σ. addSub is used
// because its attempts never fail the invariant gate, so the blank draw is
// uncensored; mixed is checked again for the same shape at a looser window.

test('blank positions follow §11 weights — middle commonest, full ordering', () => {
  const N = 40000;
  const rng = mulberry32(20260916);
  let avoid = null;
  const counts = [0, 0, 0, 0, 0];
  for (let i = 0; i < N; i++) {
    const p = makeSequenceProblem('addSub', avoid, rng);
    counts[p.blankIndex]++;
    avoid = p;
  }
  const expected = [0.10, 0.20, 0.30, 0.25, 0.15];
  for (let i = 0; i < 5; i++) {
    const share = counts[i] / N;
    assert.ok(Math.abs(share - expected[i]) <= 0.03,
      'position ' + i + ': ' + (share * 100).toFixed(2) + '% vs ' +
      (expected[i] * 100) + '% ±3pp');
  }
  assert.ok(counts[2] > counts[3] && counts[3] > counts[1] &&
    counts[1] > counts[4] && counts[4] > counts[0],
    'ordering middle > fourth > second > last > first — counts ' + counts.join(','));
});

test('mixed shows the same weighted blank shape', () => {
  const N = 15000;
  const rng = mulberry32(20260917);
  let avoid = null;
  const counts = [0, 0, 0, 0, 0];
  for (let i = 0; i < N; i++) {
    const p = makeSequenceProblem('mixed', avoid, rng);
    counts[p.blankIndex]++;
    avoid = p;
  }
  const expected = [0.10, 0.20, 0.30, 0.25, 0.15];
  for (let i = 0; i < 5; i++) {
    const share = counts[i] / N;
    assert.ok(Math.abs(share - expected[i]) <= 0.035,
      'position ' + i + ': ' + (share * 100).toFixed(2) + '% vs ' +
      (expected[i] * 100) + '% ±3.5pp');
  }
  const commonest = counts.indexOf(Math.max(...counts));
  assert.equal(commonest, 2, 'the middle is the commonest blank, got ' + commonest);
});

// --- The invariant gate and regeneration (§9, §18) ----------------------------

test('the invariant gate accepts §17/§16 objects and rejects every violation', () => {
  // §17's conceptual addSub object, §17's multiplication object, and §16's
  // subtraction and division examples all pass.
  assert.equal(validateSequenceProblem({
    family: 'addSub', operator: 'add', start: 7, stepOrFactor: 3,
    terms: [7, 10, 13, 16, 19], blankIndex: 3, answer: 16, ruleLabel: '+3',
  }), true);
  assert.equal(validateSequenceProblem({
    family: 'multiplyDivide', operator: 'multiply', start: 2, stepOrFactor: 3,
    terms: [2, 6, 18, 54, 162], blankIndex: 3, answer: 54, ruleLabel: '×3',
  }), true);
  assert.equal(validateSequenceProblem({
    family: 'addSub', operator: 'sub', start: 40, stepOrFactor: 5,
    terms: [40, 35, 30, 25, 20], blankIndex: 2, answer: 30, ruleLabel: '−5',
  }), true);
  assert.equal(validateSequenceProblem({
    family: 'multiplyDivide', operator: 'divide', start: 81, stepOrFactor: 3,
    terms: [81, 27, 9, 3, 1], blankIndex: 2, answer: 9, ruleLabel: '÷3',
  }), true);
  // The 2026-09-17 ruling's own shapes: ×10 and ÷10 pass at exactly four
  // terms, whole and under the cap...
  assert.equal(validateSequenceProblem({
    family: 'multiplyDivide', operator: 'multiply', start: 3, stepOrFactor: 10,
    terms: [3, 30, 300, 3000], blankIndex: 2, answer: 300, ruleLabel: '×10',
  }), true);
  assert.equal(validateSequenceProblem({
    family: 'multiplyDivide', operator: 'divide', start: 9000, stepOrFactor: 10,
    terms: [9000, 900, 90, 9], blankIndex: 1, answer: 900, ruleLabel: '÷10',
  }), true);
  // ...a five-term ×10 run is refused — it is the shape whose smallest top
  // term (1 × 10⁴ = 10,000) busts the cap — and the exception is ×10's alone:
  // a four-term ×2 row is refused too.
  assert.equal(validateSequenceProblem({
    family: 'multiplyDivide', operator: 'multiply', start: 1, stepOrFactor: 10,
    terms: [1, 10, 100, 1000, 10000], blankIndex: 3, answer: 1000, ruleLabel: '×10',
  }), false);
  assert.equal(validateSequenceProblem({
    family: 'multiplyDivide', operator: 'multiply', start: 2, stepOrFactor: 2,
    terms: [2, 4, 8, 16], blankIndex: 2, answer: 8, ruleLabel: '×2',
  }), false);
  assert.equal(validateSequenceProblem(null), false);
  assert.equal(validateSequenceProblem({}), false);

  const good = (over) => Object.assign({
    family: 'addSub', operator: 'add', start: 7, stepOrFactor: 3,
    terms: [7, 10, 13, 16, 19], blankIndex: 3, answer: 16, ruleLabel: '+3',
  }, over);
  // Structure (§18): term count, blank position.
  assert.equal(validateSequenceProblem(good({ terms: [7, 10, 13, 16] })), false);
  assert.equal(validateSequenceProblem(good({ terms: [7, 10, 13, 16, 19, 22] })), false);
  assert.equal(validateSequenceProblem(good({ blankIndex: 7 })), false);
  // Finiteness, sign, cap (§31).
  assert.equal(validateSequenceProblem(good({ terms: [7, 10, 13, 16, NaN] })), false);
  assert.equal(validateSequenceProblem(
    good({ terms: [7, 10, 13, 16, Infinity] })), false);
  assert.equal(validateSequenceProblem(
    good({ start: -2, terms: [-2, 1, 4, 7, 10] })), false);
  assert.equal(validateSequenceProblem(good({
    start: 9991, terms: [9991, 9994, 9997, 10000, 10003],
  })), false); // above the 9,999 maximum
  // Degenerate rules (§18) — each specimen is otherwise self-consistent, so
  // it is the degenerate step/factor itself that fails the gate.
  assert.equal(validateSequenceProblem(good({
    operator: 'multiply', family: 'multiplyDivide', start: 3, stepOrFactor: 1,
    terms: [3, 3, 3, 3, 3], blankIndex: 2, answer: 3, ruleLabel: '×1',
  })), false);
  assert.equal(validateSequenceProblem(good({
    operator: 'divide', family: 'multiplyDivide', start: 9, stepOrFactor: 1,
    terms: [9, 9, 9, 9, 9], blankIndex: 2, answer: 9, ruleLabel: '÷1',
  })), false);
  assert.equal(validateSequenceProblem(good({
    stepOrFactor: 0, terms: [5, 5, 5, 5, 5], blankIndex: 2, answer: 5,
    ruleLabel: '+0',
  })), false);
  // The answer is the hidden term (§17).
  assert.equal(validateSequenceProblem(good({ answer: 17 })), false);
  // The label is the proper symbol (§16).
  assert.equal(validateSequenceProblem(good({ ruleLabel: '*3' })), false);
  // The family is a Phase-1 family (§10).
  assert.equal(validateSequenceProblem(good({ family: 'fibonacci' })), false);
  // One constant rule throughout (§19): §19's own alternating example fails.
  assert.equal(validateSequenceProblem(good({
    stepOrFactor: 2, terms: [2, 4, 5, 10, 11], answer: 10, ruleLabel: '+2',
  })), false);
});

test('an over-cap draw is discarded and regenerated, never clamped (§9)', () => {
  // 0.85 at every draw of an attempt forces the worst case the module can
  // draw: ÷, factor 10 (the 0.66–0.88 window of FACTORS), the "any start"
  // branch, start 26 — whose four-term run 26, 260, 2600, 26000 busts the
  // 9,999 cap even on ×10's shorter row. Ten rigged calls cover two full
  // attempts (five rng draws each: operator, factor, start branch, start,
  // blank); the seeded rng takes over from the third. If the module returned
  // the busting attempt instead of discarding it, 26000 would appear in the
  // terms below; if it clamped the start instead, the rule check in
  // checkProblem would fail.
  const seeded = mulberry32(7);
  let rigLeft = 10;
  const rigged = () => (rigLeft-- > 0 ? 0.85 : seeded());
  const p = makeSequenceProblem('multiplyDivide', null, rigged);
  checkProblem(p, 'multiplyDivide');
  for (const t of p.terms) {
    assert.ok(t <= 9999, 'regenerated below the cap, got ' + t);
  }
});

// --- Division is a reversed multiplication (§9) --------------------------------

test('division runs read backwards as multiplications — exact, integer-only', () => {
  const rng = mulberry32(31415);
  let avoid = null;
  let divides = 0, multiplies = 0;
  for (let i = 0; i < 4000; i++) {
    const p = makeSequenceProblem('multiplyDivide', avoid, rng);
    checkProblem(p, 'multiplyDivide');
    if (p.operator === 'divide') {
      divides++;
      // The construction, verified: read backwards, a ÷ run is a valid ×
      // run with the same factor — only a reversed multiplication passes.
      const back = p.terms.slice().reverse();
      for (let j = 1; j < p.terms.length; j++) {
        assert.equal(back[j], back[j - 1] * p.stepOrFactor,
          'reversed terms multiply by the factor: ' + p.terms);
      }
      for (const t of p.terms) {
        assert.ok(Number.isInteger(t) && t >= 1,
          'division terms are whole numbers ≥ 1: ' + p.terms);
      }
    } else {
      multiplies++;
    }
    avoid = p;
  }
  // Both operators are real paths, not dead code (~50/50 by the coin;
  // σ ≈ 0.8pp at 4,000 draws, so 40% is >12σ of room).
  assert.ok(divides >= 1600 && multiplies >= 1600,
    '× and ÷ both common — divides ' + divides + ', multiplies ' + multiplies);
});

// --- ×10's shorter row (owner ruling "shorter row", 2026-09-17) ------------------
//
// A five-term whole-number ×10 run's smallest possible top term is 1 × 10⁴ =
// 10,000 — one digit past §9's 9,999 cap — so ×10/÷10 could not be drawn at
// five terms at all: unsatisfiable, not merely unused. The owner's ruling
// gives ×10 a four-term row and keeps the cap; these tests hold that down.

test('×10 and ÷10 run on exactly four terms; every other factor keeps five', () => {
  const rng = mulberry32(20260917);
  let avoid = null;
  const tens = { multiply: 0, divide: 0 };
  const blankCounts = [0, 0, 0, 0];
  const lengths = {};
  for (let i = 0; i < 12000; i++) {
    const p = makeSequenceProblem('multiplyDivide', avoid, rng);
    checkProblem(p, 'multiplyDivide');
    lengths[p.stepOrFactor] = lengths[p.stepOrFactor] || new Set();
    lengths[p.stepOrFactor].add(p.terms.length);
    if (p.stepOrFactor === 10) {
      tens[p.operator]++;
      blankCounts[p.blankIndex]++;
    }
    avoid = p;
  }
  // The ruling itself: 10 means four terms, and only 10 means four.
  assert.deepStrictEqual([...lengths[10]], [4],
    'every ×10/÷10 row is exactly four terms');
  for (const f of [2, 3, 4, 5]) {
    assert.deepStrictEqual([...lengths[f]], [5],
      'factor ' + f + ' rows are unchanged at five terms');
  }
  // Both directions of 10 really occur — a ÷10 is a ×10 run reversed (§9).
  assert.ok(tens.multiply > 0 && tens.divide > 0,
    '×10 and ÷10 both drawn: ' + JSON.stringify(tens));
  // 10 is a high-tier factor (§9): 0.22 of ×/÷ draws (σ ≈ 0.4pp at 12,000).
  const tenShare = (tens.multiply + tens.divide) / 12000;
  assert.ok(tenShare >= 0.15 && tenShare <= 0.30,
    '×10 common at its high-tier weight, got ' + (tenShare * 100).toFixed(2) + '%');
  // §11's shape holds on the four-position row: every position occurs, the
  // interior pair carries the majority (0.35 + 0.40), and the first term is
  // the rarest (0.10 vs the last's 0.15 — 5pp at σ ≈ 1pp over ~2,640 tens).
  assert.ok(blankCounts.every((c) => c > 0),
    'all four blank positions occur on ×10 rows: ' + blankCounts.join(','));
  const interior = (blankCounts[1] + blankCounts[2]) / (tens.multiply + tens.divide);
  assert.ok(interior >= 0.70, 'interior blanks carry most ×10 rows, got ' + interior);
  assert.equal(Math.min(...blankCounts), blankCounts[0],
    'the first position is the rarest ×10 blank: ' + blankCounts.join(','));
});

test('every ×10/÷10 term stays whole and ≤ 9,999 — the cap the shorter row honours', () => {
  const rng = mulberry32(20260918);
  let avoid = null;
  let tens = 0;
  let maxSeen = 0;
  for (let i = 0; i < 12000; i++) {
    const p = makeSequenceProblem('multiplyDivide', avoid, rng);
    checkProblem(p, 'multiplyDivide');
    if (p.stepOrFactor === 10) {
      tens++;
      for (const t of p.terms) {
        assert.ok(Number.isInteger(t), 'whole numbers only: ' + p.terms);
        assert.ok(t <= 9999, 'nothing above 9,999, got ' + t + ' in ' + p.terms);
        maxSeen = Math.max(maxSeen, t);
      }
      // The blank sits inside the four-term row, and the answer is its term.
      assert.ok(p.blankIndex >= 0 && p.blankIndex < 4,
        'blank inside the row, got ' + p.blankIndex);
      assert.equal(p.answer, p.terms[p.blankIndex]);
    }
    avoid = p;
  }
  // ~22% of ×/÷ draws are ×10 (σ ≈ 27 at this N), and the valid starts 1–9
  // put a 9,000 top term within easy reach — the cap is approached, not
  // merely never crossed.
  assert.ok(tens >= 1500, 'enough ×10 draws to mean it, got ' + tens);
  assert.ok(maxSeen >= 9000, 'the cap is approached, not just avoided: ' + maxSeen);
});

test('mixed draws ×10 too, on the same four-term row', () => {
  const rng = mulberry32(20260919);
  let avoid = null;
  let tens = 0;
  for (let i = 0; i < 15000; i++) {
    const p = makeSequenceProblem('mixed', avoid, rng);
    checkProblem(p, 'mixed');
    if (p.family === 'multiplyDivide' && p.stepOrFactor === 10) {
      tens++;
      assert.equal(p.terms.length, 4, 'a mixed ×10 row is four terms');
    }
    avoid = p;
  }
  // ×/÷ is ~25% of mixed (§10) and ×10 is 0.22 of ×/÷ → ~5.5%, ~825 of
  // 15,000 (σ ≈ 28); 400 is >15σ of room.
  assert.ok(tens >= 400, '×10 appears in mixed, got ' + tens + ' of 15000');
});

// --- Mixed composition (§10) ---------------------------------------------------

test('mixed draws all four families at §10 weights, never twice in a row', () => {
  const N = 15000;
  const rng = mulberry32(20260918);
  let avoid = null;
  const counts = { count: 0, skipCount: 0, addSub: 0, multiplyDivide: 0 };
  for (let i = 0; i < N; i++) {
    const p = makeSequenceProblem('mixed', avoid, rng);
    checkProblem(p, 'mixed');
    if (avoid) {
      assert.notEqual(p.family, avoid.family, 'no family twice in a row');
      assert.notEqual(questionSignature(p), questionSignature(avoid), '§18 repeat');
    }
    counts[p.family]++;
    avoid = p;
  }
  // §10's stated weights are 20/25/30/25; the never-twice-in-a-row redraw
  // settles the marginals ~2pp from those (addSub ~28%), which §10 permits
  // ("exact weighting is not critical") — hence ±5pp windows.
  const expected = { count: 0.20, skipCount: 0.25, addSub: 0.30, multiplyDivide: 0.25 };
  for (const fam of FAMS) {
    const share = counts[fam] / N;
    assert.ok(Math.abs(share - expected[fam]) <= 0.05,
      fam + ': ' + (share * 100).toFixed(2) + '% vs ' +
      (expected[fam] * 100) + '% ±5pp');
  }
});

// --- Per-family content distributions (§6, §7, §8, §27) -------------------------

test('count keeps to ±1, small numbers common, large occasional (§6)', () => {
  const N = 3000;
  const rng = mulberry32(60601);
  let avoid = null;
  let small = 0, large = 0, ups = 0, downs = 0;
  for (let i = 0; i < N; i++) {
    const p = makeSequenceProblem('count', avoid, rng);
    checkProblem(p, 'count');
    const top = Math.max(...p.terms);
    if (top <= 20) small++;
    if (top >= 101) large++;
    if (p.operator === 'add') ups++; else downs++;
    avoid = p;
  }
  assert.ok(ups > 0 && downs > 0, 'ascending and descending both occur');
  // Bands 0–20 / 0–100 / 100–1,000 at 55/30/15: max ≤ 20 lands ~60%, and a
  // top ≥ 101 only via the large band (~15%). σ ≈ 0.9pp at N = 3,000.
  assert.ok(small / N >= 0.45, 'small runs common, got ' + (small / N).toFixed(3));
  assert.ok(large / N >= 0.08 && large / N <= 0.22,
    'large runs occasional, got ' + (large / N).toFixed(3));
});

test('skip counting prefers 2, 5 and 10, permits 3 and 4 (§7)', () => {
  const N = 3000;
  const rng = mulberry32(70702);
  let avoid = null;
  const stepCounts = {};
  let ups = 0, downs = 0;
  for (let i = 0; i < N; i++) {
    const p = makeSequenceProblem('skipCount', avoid, rng);
    checkProblem(p, 'skipCount');
    stepCounts[p.stepOrFactor] = (stepCounts[p.stepOrFactor] || 0) + 1;
    if (p.operator === 'add') ups++; else downs++;
    avoid = p;
  }
  assert.ok(ups > 0 && downs > 0, 'ascending and descending both occur');
  // High-weight steps draw ~28% each; medium ones ~8% (σ ≈ 0.8pp at N = 3,000).
  for (const s of [2, 5, 10]) {
    const share = (stepCounts[s] || 0) / N;
    assert.ok(share >= 0.15, 'step ' + s + ' common, got ' + (share * 100).toFixed(2) + '%');
  }
  for (const s of [3, 4]) {
    const share = (stepCounts[s] || 0) / N;
    assert.ok(share >= 0.02 && share <= 0.20,
      'step ' + s + ' permitted but secondary, got ' + (share * 100).toFixed(2) + '%');
  }
});

test('+ / − draws a constant N in 2–20, smaller steps commoner (§8)', () => {
  const N = 3000;
  const rng = mulberry32(80803);
  let avoid = null;
  let small = 0, ups = 0, downs = 0;
  for (let i = 0; i < N; i++) {
    const p = makeSequenceProblem('addSub', avoid, rng);
    checkProblem(p, 'addSub');
    if (p.stepOrFactor <= 10) small++;
    if (p.operator === 'add') ups++; else downs++;
    avoid = p;
  }
  assert.ok(ups > 0 && downs > 0, 'ascending and descending both occur');
  // ADDSUB_SMALL_SHARE is 0.60 (σ ≈ 0.9pp at N = 3,000).
  assert.ok(small / N >= 0.50 && small / N <= 0.70,
    'steps 2–10 somewhat more common, got ' + (small / N * 100).toFixed(2) + '%');
});

// --- The question signature (§18) ----------------------------------------------

test('the signature covers family, rule, start and blank — and is honoured', () => {
  const rng = mulberry32(99);
  const base = makeSequenceProblem('addSub', null, rng);
  const moved = (base.blankIndex + 1) % 5;
  const movedBlank = Object.assign({}, base, {
    blankIndex: moved,
    answer: base.terms[moved],
  });
  assert.notEqual(questionSignature(movedBlank), questionSignature(base),
    'a moved blank is a different question');
  // And the generator refuses to return the previous question's signature.
  const next = makeSequenceProblem('addSub', base, rng);
  assert.notEqual(questionSignature(next), questionSignature(base));
  checkProblem(next, 'addSub');
});
