import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatInr, parseAmount, formatInputAmount } from '../lib/format';

test('formatInr uses Indian grouping and two decimals', () => {
  assert.equal(formatInr(1999), '₹1,999.00');
  assert.equal(formatInr(100000), '₹1,00,000.00');
  assert.equal(formatInr(2.1), '₹2.10');
});

test('parseAmount strips currency, commas and spaces', () => {
  assert.equal(parseAmount('₹ 1,00,000'), 100000);
  assert.equal(parseAmount('4999.5'), 4999.5);
  assert.equal(parseAmount(''), NaN);
  assert.equal(parseAmount('abc'), NaN);
});

test('formatInputAmount groups digits without forcing decimals', () => {
  assert.equal(formatInputAmount('5000'), '5,000');
  assert.equal(formatInputAmount('100000'), '1,00,000');
  assert.equal(formatInputAmount('4999.5'), '4,999.5');
  assert.equal(formatInputAmount(''), '');
  assert.equal(formatInputAmount('abc'), '');
});
