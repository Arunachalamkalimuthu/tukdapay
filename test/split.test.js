import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitAmount } from '../src/split.js';

test('amount at or below the threshold is a single chunk', () => {
  assert.deepEqual(splitAmount(1999), [1999]);
  assert.deepEqual(splitAmount(500), [500]);
});

test('amount above the threshold is split greedily with the remainder last', () => {
  assert.deepEqual(splitAmount(5000), [1999, 1999, 1002]);
});

test('exact multiples produce no remainder chunk', () => {
  assert.deepEqual(splitAmount(3998), [1999, 1999]);
});

test('chunks always sum to the total with paise precision', () => {
  const chunks = splitAmount(4000.1);
  assert.deepEqual(chunks, [1999, 1999, 2.1]);
  assert.equal(chunks.reduce((a, b) => a + b, 0).toFixed(2), '4000.10');
});

test('custom threshold is honoured', () => {
  assert.deepEqual(splitAmount(2500, 1000), [1000, 1000, 500]);
});

test('invalid totals throw RangeError', () => {
  for (const bad of [0, -1, NaN, Infinity]) {
    assert.throws(() => splitAmount(bad), RangeError);
  }
});

test('invalid threshold throws RangeError', () => {
  assert.throws(() => splitAmount(100, 0), RangeError);
  assert.throws(() => splitAmount(100, -5), RangeError);
});
