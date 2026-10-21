import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  missingExpressionRobotClips,
  UnsupportedExpressionSpeech,
} from './missing-expression-reader.js';

const n = (value) => ({ k: 'int', n: value });
const op = (value) => ({ k: 'op', op: value });
const q = { k: 'q' };
const ids = (slots) => missingExpressionRobotClips(slots).map((clip) => clip.id);

test('addition reads a blank in each legal value position, in visible order', () => {
  assert.deepEqual(ids([q, op('+'), n(5), op('='), n(12)]),
    ['wm-blank', 'wm-op-plus', 'tt-n-5', 'wm-op-equals', 'tt-n-12']);
  assert.deepEqual(ids([n(7), op('+'), q, op('='), n(12)]),
    ['tt-n-7', 'wm-op-plus', 'wm-blank', 'wm-op-equals', 'tt-n-12']);
  assert.deepEqual(ids([n(7), op('+'), n(5), op('='), q]),
    ['tt-n-7', 'wm-op-plus', 'tt-n-5', 'wm-op-equals', 'wm-blank']);
});

test('subtraction, multiplication and division preserve operator and blank order', () => {
  assert.deepEqual(ids([q, op('−'), n(5), op('='), n(7)]),
    ['wm-blank', 'wm-op-minus', 'tt-n-5', 'wm-op-equals', 'tt-n-7']);
  assert.deepEqual(ids([n(4), op('×'), q, op('='), n(20)]),
    ['tt-n-4', 'wm-op-times', 'wm-blank', 'wm-op-equals', 'tt-n-20']);
  assert.deepEqual(ids([n(20), op('÷'), q, op('='), n(5)]),
    ['tt-n-20', 'wm-op-divided-by', 'wm-blank', 'wm-op-equals', 'tt-n-5']);
});

test('Count Block equations use the same reader without family special cases', () => {
  assert.deepEqual(ids([q, op('+'), n(8), op('='), n(31)]),
    ['wm-blank', 'wm-op-plus', 'tt-n-8', 'wm-op-equals', 'tt-n-31']);
  assert.deepEqual(ids([n(47), op('−'), q, op('='), n(35)]),
    ['tt-n-47', 'wm-op-minus', 'wm-blank', 'wm-op-equals', 'tt-n-35']);
});

test('new whole-number ranges need clips, not reader code', () => {
  assert.deepEqual(ids([n(1234), op('+'), q, op('='), n(5678)]),
    ['tt-n-1234', 'wm-op-plus', 'wm-blank', 'wm-op-equals', 'tt-n-5678']);
});

test('fraction and decimal readings fail explicitly pending an owner-approved scheme', () => {
  for (const token of [
    { k: 'frac', n: 1, d: 2 },
    { k: 'frac', n: null, d: 4, hidePart: 'n' },
    { k: 'dec', digits: 7, places: 1 },
  ]) {
    assert.throws(() => missingExpressionRobotClips([token]),
      (error) => error instanceof UnsupportedExpressionSpeech && error.kind === token.k);
  }
});
