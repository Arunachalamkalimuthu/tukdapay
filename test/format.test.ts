import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatInr, parseAmount, formatInputAmount, sanitizeAmountInput, amountToInput, isPositiveAmount } from '../lib/format.ts';

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

test('formatInputAmount tidies a typed amount for display on blur', () => {
  assert.equal(formatInputAmount('1,99,9'), '1,999');
  assert.equal(formatInputAmount('4999.50'), '4,999.50');
  assert.equal(formatInputAmount('12.345'), '12.34');
  assert.equal(formatInputAmount('.5'), '0.5');
  assert.equal(formatInputAmount('007'), '7');
  assert.equal(formatInputAmount('5.'), '5');
  assert.equal(formatInputAmount('.'), '');
});

test('sanitizeAmountInput keeps digits, commas and one dot with at most two decimals', () => {
  assert.equal(sanitizeAmountInput('1,999'), '1,999');
  assert.equal(sanitizeAmountInput('₹ 5000'), '5000');
  assert.equal(sanitizeAmountInput('12.345'), '12.34');
  assert.equal(sanitizeAmountInput('1.2.3'), '1.23');
  assert.equal(sanitizeAmountInput('1.2,3'), '1.23');
  assert.equal(sanitizeAmountInput('5.'), '5.');
  assert.equal(sanitizeAmountInput('.5'), '.5');
  assert.equal(sanitizeAmountInput('-12a3'), '123');
  assert.equal(sanitizeAmountInput('abc'), '');
  assert.equal(sanitizeAmountInput(''), '');
});

test('amountToInput shows a number the way the amount field displays it', () => {
  assert.equal(amountToInput(14999), '14,999');
  assert.equal(amountToInput(100000), '1,00,000');
  assert.equal(amountToInput(4999.5), '4,999.5');
  assert.equal(amountToInput(1999), '1,999');
  const huge = amountToInput(1e21);
  assert.doesNotMatch(huge, /e/i);
  assert.equal(parseAmount(huge), 1e21);
});

test('isPositiveAmount needs at least one paisa', () => {
  assert.equal(isPositiveAmount(1), true);
  assert.equal(isPositiveAmount(0.01), true);
  assert.equal(isPositiveAmount(0.005), true);
  assert.equal(isPositiveAmount(0.004), false);
  assert.equal(isPositiveAmount(0), false);
  assert.equal(isPositiveAmount(-5), false);
  assert.equal(isPositiveAmount(NaN), false);
  assert.equal(isPositiveAmount(Infinity), false);
});
