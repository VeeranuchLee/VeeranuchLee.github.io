import {
  describe, it
} from 'node:test';
import assert from 'node:assert/strict';
import {
  OrderNumbersEngine,
  rat,
  ratFromFloat,
  compare,
  equals,
  toNumber,
  displayOf,
  makeProblem,
  markerRational,
  markerPosition,
  isCorrectForBox,
  lineBoundsFor,
} from './order-numbers.js';

function rng(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hasMixedKinds(cards, count) {
  const kinds = new Set(cards.map(card => card.kind));
  if (!kinds.has('fraction')) return false;
  return count >= 3
    ? kinds.has('decimal') && kinds.has('whole')
    : kinds.has('decimal') || kinds.has('whole');
}

describe('rational arithmetic', () => {
  it('reduces fractions', () => {
    assert.deepEqual(rat(2, 4), { n: 1, d: 2 });
    assert.deepEqual(rat(-3, 6), { n: -1, d: 2 });
    assert.deepEqual(rat(5, 1), { n: 5, d: 1 });
  });

  it('converts decimals exactly', () => {
    assert.deepEqual(ratFromFloat(1.5), { n: 3, d: 2 });
    assert.deepEqual(ratFromFloat(0.75), { n: 3, d: 4 });
    assert.deepEqual(ratFromFloat(2), { n: 2, d: 1 });
  });

  it('compares by cross multiplication', () => {
    assert.equal(compare(rat(1, 2), rat(2, 4)), 0);
    assert.equal(compare(rat(1, 3), rat(1, 2)), -1);
    assert.equal(compare(rat(5, 4), rat(1, 1)), 1);
  });

  it('detects equality without floats', () => {
    assert.ok(equals(ratFromFloat(0.5), rat(1, 2)));
    assert.ok(!equals(ratFromFloat(0.5), rat(1, 3)));
  });
});

describe('display forms', () => {
  it('shows whole numbers', () => {
    assert.deepEqual(displayOf(rat(7, 1)), { kind: 'whole', text: '7', n: 7, d: 1 });
  });

  it('shows decimals cleanly', () => {
    assert.deepEqual(displayOf(rat(3, 2)), { kind: 'decimal', text: '1.5', n: 3, d: 2 });
    assert.deepEqual(displayOf(rat(3, 4)), { kind: 'decimal', text: '0.75', n: 3, d: 4 });
  });

  it('shows fractions otherwise', () => {
    const d = displayOf(rat(5, 8));
    assert.equal(d.kind, 'fraction');
    assert.equal(d.text, '5/8');
  });

  it('keeps a generated improper fraction distinct from a decimal card', () => {
    const value = rat(3, 2);
    assert.equal(displayOf(value, 'fraction').kind, 'fraction');
    assert.equal(displayOf(value, 'fraction').text, '3/2');
    assert.equal(displayOf(value, 'decimal').kind, 'decimal');
    assert.equal(displayOf(value, 'decimal').text, '1.5');
  });
});

describe('generator invariants', () => {
  it('produces distinct values for 1000 seeds', () => {
    for (let count = 2; count <= 7; count++) {
      for (let seed = 1; seed <= 1000; seed++) {
        const p = makeProblem(count, rng(seed));
        assert.equal(p.count, count);
        assert.equal(p.values.length, count);
        assert.equal(p.sorted.length, count);
        // distinct by equality
        for (let i = 0; i < count; i++) {
          for (let j = i + 1; j < count; j++) {
            assert.ok(!equals(p.values[i], p.values[j]), `duplicate values at seed ${seed}`);
          }
        }
      }
    }
  });

  it('keeps all values inside the friendly bounds', () => {
    for (let seed = 1; seed <= 500; seed++) {
      const p = makeProblem(5, rng(seed));
      for (const v of p.sorted) {
        const x = toNumber(v);
        assert.ok(x >= p.bounds.min - 1e-9, `${x} below ${p.bounds.min}`);
        assert.ok(x <= p.bounds.max + 1e-9, `${x} above ${p.bounds.max}`);
      }
    }
  });

  it('respects the spacing rule', () => {
    for (let seed = 1; seed <= 500; seed++) {
      const p = makeProblem(5, rng(seed));
      const span = p.bounds.max - p.bounds.min;
      for (let i = 0; i < p.sorted.length; i++) {
        for (let j = i + 1; j < p.sorted.length; j++) {
          const a = (toNumber(p.sorted[i]) - p.bounds.min) / span;
          const b = (toNumber(p.sorted[j]) - p.bounds.min) / span;
          assert.ok(Math.abs(a - b) >= OrderNumbersEngine.MIN_SPACING - 1e-9,
            `values too close: ${a}, ${b}`);
        }
      }
    }
  });

  it('contains at least one fraction across a sample', () => {
    let seen = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const p = makeProblem(5, rng(seed));
      if (p.values.some(v => v.d !== 1)) seen++;
    }
    assert.ok(seen >= 150, `only ${seen} problems had a fraction`);
  });

  it('keeps a display form beside every tray value without duplicating values', () => {
    for (let count = 2; count <= 7; count++) {
      for (let seed = 1; seed <= 250; seed++) {
        const p = makeProblem(count, rng(seed));
        assert.equal(p.cards.length, count);
        assert.equal(p.forms.length, count);
        p.cards.forEach((card, index) => {
          assert.deepEqual(card.value, p.values[index]);
          assert.equal(card.display.kind, card.kind);
        });
        const keys = new Set(p.values.map(v => `${v.n}/${v.d}`));
        assert.equal(keys.size, count);
      }
    }
  });

  it('deals genuinely mixed types, including an improper fraction opportunity', () => {
    for (let count = 2; count <= 7; count++) {
      for (let seed = 1; seed <= 250; seed++) {
        const kinds = new Set(makeProblem(count, rng(seed)).cards.map(card => card.kind));
        assert.ok(kinds.has('fraction'), `count ${count}, seed ${seed}: ${[...kinds]}`);
        assert.ok(kinds.size >= (count >= 3 ? 3 : 2), `count ${count}, seed ${seed}: ${[...kinds]}`);
      }
    }
    let improper = 0;
    for (let seed = 1; seed <= 250; seed++) {
      if (makeProblem(5, rng(seed)).cards.some(card => card.kind === 'fraction' && card.value.n >= card.value.d)) improper++;
    }
    assert.ok(improper > 0, 'no generated fraction was improper');
  });

  it('has a deterministic fallback for a constant RNG', () => {
    for (let count = 2; count <= 7; count++) {
      const p = makeProblem(count, () => 0);
      assert.equal(p.count, count);
      assert.equal(new Set(p.values.map(v => `${v.n}/${v.d}`)).size, count);
      assert.ok(hasMixedKinds(p.cards, count), `count ${count}: ${p.cards.map(c => c.kind)}`);
    }
  });

  it('uses only the friendly bounds pool', () => {
    const friendly = new Set(OrderNumbersEngine.ON_BOUNDS.map(b => `${b.min}-${b.max}-${b.step}`));
    for (let seed = 1; seed <= 500; seed++) {
      const p = makeProblem(7, rng(seed));
      assert.ok(friendly.has(`${p.bounds.min}-${p.bounds.max}-${p.bounds.step}`));
    }
  });
});

describe('number line marker maths', () => {
  it('places 5/8 on 0-2 at exactly 0.3125', () => {
    const pos = markerPosition(rat(5, 8), { min: 0, max: 2 });
    assert.equal(pos, 0.3125);
  });

  it('places 1 at 0.5 on 0-2', () => {
    assert.equal(markerPosition(rat(1, 1), { min: 0, max: 2 }), 0.5);
  });

  it('places 7/4 at 0.875 on 0-2', () => {
    assert.equal(markerPosition(rat(7, 4), { min: 0, max: 2 }), 0.875);
  });

  it('keeps the marker position rational until the SVG measures it', () => {
    assert.deepEqual(markerRational(rat(5, 8), { min: 0, max: 2 }), { n: 5, d: 16 });
    assert.deepEqual(markerRational(rat(7, 4), { min: 0, max: 2 }), { n: 7, d: 8 });
  });

  it('adds a friendly line tick when the largest answer is the upper bound', () => {
    const bounds = { min: 0, max: 3, step: 0.5 };
    assert.deepEqual(lineBoundsFor(bounds, [rat(1), rat(3)]), { min: 0, max: 3.5, step: 0.5 });
    assert.deepEqual(lineBoundsFor(bounds, [rat(1), rat(2)]), bounds);
    assert.deepEqual(lineBoundsFor({ min: 0, max: 10, step: 1 }, [rat(10)]), { min: 0, max: 12, step: 2 });
  });
});

describe('correctness rule', () => {
  it('accepts the i-th smallest value in box i', () => {
    const sorted = [rat(1, 2), rat(1, 1), rat(3, 2)];
    assert.ok(isCorrectForBox(rat(1, 2), sorted, 0));
    assert.ok(isCorrectForBox(rat(1, 1), sorted, 1));
    assert.ok(isCorrectForBox(rat(3, 2), sorted, 2));
    assert.ok(!isCorrectForBox(rat(1, 1), sorted, 0));
  });
});

/* ══ WHAT A SPOKEN LINE IS TRUE OF ══ Added 2026-09-27, with o1's six companion lines.

   ORDER_VOICE.hint says "The smallest number goes first. Look for the number closest to
   zero." The first sentence is true of the mode for ever. The second is true of the
   GENERATOR, and only of the generator: over the reals the number closest to zero is not
   the smallest — with −5 and −2 on the table, −2 is closest to zero and −5 is smaller — so
   the moment a negative value is allowed in, the line becomes something a seven-year-old
   is told and finds false. That is not a risk to write down; it is a thing to make go red.

   Every bounds entry in ON_BOUNDS has min: 0, and lineBoundsFor can only RAISE max, so
   this holds by construction today. A future rung with negative values would be a
   deliberate extension, and the right outcome of extending it is this test failing, which
   is what it is here for. The same reasoning is why ORDER-NUMBERS-SPEC.md §5 still lists
   negatives under "Open / next" rather than as settled.
*/
describe('the generator keeps the spoken hint true', () => {
  it('never deals a negative value, so "closest to zero" names the smallest', () => {
    let checked = 0;
    for (let seed = 1; seed <= 1000; seed++) {
      const count = 2 + (seed % 6);
      const p = makeProblem(count, rng(seed));
      for (const card of p.cards) {
        assert.ok(card.value.n >= 0,
          `seed ${seed} dealt ${card.value.n}/${card.value.d}, and the second-miss hint `
          + 'tells the child the smallest is the one closest to zero');
        checked++;
      }
    }
    assert.ok(checked >= 4500, `only ${checked} values checked; the loop is not drawing`);
  });

  /* The companion's second miss chains ORDER_VOICE.fraction — "Same top number, bigger
     bottom number, smaller fraction" — after the rule, unconditionally, because the UI
     has no branch that withholds it. That is only defensible while every round holds a
     fraction to be about, which makeProblem guarantees through hasRequiredMix(). So the
     guarantee gets its own assertion here rather than being trusted in a comment: an
     engine that could deal five whole numbers would leave the line talking about nothing,
     and this is the test that notices.

     Asserted on the DISPLAY kind, not on `value.d !== 1`, because a 1.5 card and a 3/2
     card carry the same exact rational value while the child sees one as a decimal and
     the other as a fraction — the same distinction the UI reads. */
  it('always deals a fraction card, so the fractions rule is never about nothing', () => {
    for (let seed = 1; seed <= 600; seed++) {
      for (let count = 2; count <= 7; count++) {
        const p = makeProblem(count, rng(seed * 31 + count));
        const kinds = new Set(p.cards.map(card => card.display.kind));
        assert.ok(kinds.has('fraction'),
          `count ${count} seed ${seed} dealt ${p.cards.map(c => c.display.text).join(', ')} `
          + 'with no fraction card, and the second-miss line is said unconditionally');
      }
    }
  });
});
