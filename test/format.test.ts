import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatInr,
  formatRupees,
  parseAmount,
  formatInputAmount,
  sanitizeAmountInput,
  editAmountInput,
  amountToInput,
  isValidAmount,
  MAX_AMOUNT,
  MAX_AMOUNT_TEXT,
  numberRuns,
} from '../lib/format.ts';

test('formatInr uses Indian grouping and two decimals', () => {
  assert.equal(formatInr(1999), '₹1,999.00');
  assert.equal(formatInr(100000), '₹1,00,000.00');
  assert.equal(formatInr(2.1), '₹2.10');
});

test('formatRupees drops .00 but keeps paise when there are any', () => {
  assert.equal(formatRupees(1999), '₹1,999');
  assert.equal(formatRupees(4999.5), '₹4,999.50');
  assert.equal(formatRupees(100000), '₹1,00,000');
  assert.equal(formatRupees(2), '₹2');
  assert.equal(formatRupees(0.05), '₹0.05');
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

test('isValidAmount needs at least one paisa', () => {
  assert.equal(isValidAmount(1), true);
  assert.equal(isValidAmount(0.01), true);
  assert.equal(isValidAmount(0.005), true);
  assert.equal(isValidAmount(0.004), false);
  assert.equal(isValidAmount(0), false);
  assert.equal(isValidAmount(-5), false);
  assert.equal(isValidAmount(NaN), false);
  assert.equal(isValidAmount(Infinity), false);
});

test('MAX_AMOUNT_TEXT keeps “₹100” and “crore” on one line', () => {
  assert.equal(MAX_AMOUNT_TEXT, '₹100\u00a0crore');
});

test('isValidAmount rejects amounts over MAX_AMOUNT', () => {
  assert.equal(MAX_AMOUNT, 1_00_00_00_000);
  assert.equal(isValidAmount(MAX_AMOUNT), true);
  assert.equal(isValidAmount(MAX_AMOUNT + 0.01), false);
  assert.equal(isValidAmount(1e21), false);
  assert.equal(isValidAmount(1e307), false);
});

test('rs, re and inr inside a word are not read as currency', () => {
  assert.equal(parseAmount('fare.50'), 0.5);
  assert.equal(sanitizeAmountInput('Figure.50'), '.50');
});

test('amounts written with Rs., Re., INR or ₹ keep their digits', () => {
  assert.equal(sanitizeAmountInput('Rs. 4,999'), '4,999');
  assert.equal(sanitizeAmountInput('Rs.4999'), '4999');
  assert.equal(sanitizeAmountInput('Rs.4999.00'), '4999.00');
  assert.equal(sanitizeAmountInput('Rs. 4,999/-'), '4,999');
  assert.equal(sanitizeAmountInput('RS.12000'), '12000');
  assert.equal(sanitizeAmountInput('Re.1'), '1');
  assert.equal(sanitizeAmountInput('INR 12,000.50'), '12,000.50');
  assert.equal(sanitizeAmountInput('4,999 Rs.'), '4,999');
  assert.equal(parseAmount('Rs. 4,999/-'), 4999);
  assert.equal(parseAmount('rs.4999'), 4999);
  assert.equal(parseAmount('Rs.4,999.50'), 4999.5);
  assert.equal(parseAmount('INR.500'), 500);
  assert.equal(sanitizeAmountInput('4999Rs.'), '4999');
  assert.equal(formatInputAmount('Rs.4999'), '4,999');
});

test('formatInputAmount keeps every digit of a very long amount', () => {
  assert.equal(formatInputAmount('9007199254740993'), '9,00,71,99,25,47,40,993');
  assert.equal(formatInputAmount('9007199254740993.25'), '9,00,71,99,25,47,40,993.25');
});

// ---- editAmountInput -----------------------------------------------------------

/** The value and caret of an edit, as the older tests compare them. */
const edit = (before: string, after: string, caret: number, carried?: string) => {
  const { value, caret: at } = editAmountInput(before, after, caret, carried);
  return { value, caret: at };
};

test('editAmountInput takes ordinary typing and deleting as it is', () => {
  assert.deepEqual(edit('', '5', 1), { value: '5', caret: 1 });
  assert.deepEqual(edit('5000', '59000', 2), { value: '59000', caret: 2 });
  assert.deepEqual(edit('1,999', '1,9999', 3), { value: '1,9999', caret: 3 });
  assert.deepEqual(edit('4999', '49.99', 3), { value: '49.99', caret: 3 });
  assert.deepEqual(edit('4999.5', '4999.50', 7), { value: '4999.50', caret: 7 });
  assert.deepEqual(edit('4,999.50', '4,99950', 5), { value: '4,99950', caret: 5 });
  assert.deepEqual(edit('4,999', '', 0), { value: '', caret: 0 });
});

test('editAmountInput ignores a second "." rather than dropping digits', () => {
  assert.deepEqual(edit('4999.50', '49.99.50', 3), { value: '4999.50', caret: 2 });
  assert.deepEqual(edit('14,999', '14.,999', 3), { value: '14,999', caret: 2 });
  assert.deepEqual(edit('12.5', '12.5.', 5), { value: '12.5', caret: 4 });
});

test('editAmountInput ignores a digit that has no room after the decimal point', () => {
  assert.deepEqual(edit('12.34', '12.534', 4), { value: '12.34', caret: 3 });
  assert.deepEqual(edit('49999', '49.999', 3), { value: '49999', caret: 2 });
  assert.deepEqual(edit('12.34', '12.345', 6), { value: '12.34', caret: 5 });
});

test('editAmountInput keeps the caret where it was when a key is not taken', () => {
  assert.deepEqual(edit('5000', '5x000', 2), { value: '5000', caret: 1 });
  assert.deepEqual(edit('5000', '5 000', 2), { value: '5000', caret: 1 });
  assert.deepEqual(edit('12.5', '12.5,', 5), { value: '12.5', caret: 4 });
});

test('editAmountInput cleans up a pasted amount', () => {
  assert.deepEqual(edit('', 'Rs. 4,999/-', 11), { value: '4,999', caret: 5 });
  assert.deepEqual(edit('', '₹ 1,00,000.00', 13), { value: '1,00,000.00', caret: 11 });
  assert.deepEqual(edit('1,000', 'Rs.4999', 7), { value: '4999', caret: 4 });
  assert.deepEqual(edit('', '12.345', 6), { value: '12.34', caret: 5 });
  assert.deepEqual(edit('100', '1Rs. 5000', 9), { value: '15000', caret: 5 });
});

test('editAmountInput cleans the whole value when the edit is not a plain insert or delete', () => {
  assert.deepEqual(edit('5000', 'ab12', 0), { value: '12', caret: 2 });
  assert.deepEqual(edit('5000', 'Rs.12', 1), { value: '12', caret: 2 });
});

test('numberRuns finds each number in a line of text, currency aside', () => {
  assert.deepEqual(numberRuns('Rs. 4,999/-'), ['4,999']);
  assert.deepEqual(numberRuns('Rs.4999.00'), ['4999.00']);
  assert.deepEqual(numberRuns('Rs 4,999 (incl. GST 18%)'), ['4,999', '18']);
  assert.deepEqual(numberRuns('2.5e4'), ['2.5', '4']);
  assert.deepEqual(numberRuns('1.2.3'), ['1.2.3']);
  assert.deepEqual(numberRuns('.'), []);
  assert.deepEqual(numberRuns('abc'), []);
});

test('editAmountInput keeps only the first number of a pasted line, rather than running every number together', () => {
  for (const [pasted, value] of [
    ['Rs 4,999 (incl. GST 18%)', '4,999'],
    ['Total: 4,999 for 2 items', '4,999'],
    ['₹4,999 - 10% off', '4,999'],
    ['Amount 12,500 Inv no. 318', '12,500'],
    ['5000 x 2', '5000'],
  ]) {
    assert.deepEqual(edit('', pasted, pasted.length), { value, caret: value.length }, pasted);
  }
  assert.deepEqual(edit('1,000', '15000x2', 7), { value: '15000', caret: 5 });
  assert.deepEqual(edit('5000', '12 x 3', 0), { value: '12', caret: 2 });
});

/**
 * Type `keys` one at a time into a field holding `start`, the first key replacing all of it (as after
 * select-all), carrying dropped keys from one edit to the next as the amount field does.
 */
function typeKeys(keys: string, start = ''): string {
  let value = start;
  let carry = '';
  let first = true;
  for (const key of keys) {
    const after = first ? key : value + key;
    ({ value, carry } = editAmountInput(value, after, after.length, carry));
    first = false;
  }
  return value;
}

test('editAmountInput reads “Rs.” typed one key at a time as currency, not as a decimal point', () => {
  assert.deepEqual(edit('', '.', 1, 'Rs'), { value: '', caret: 0 });
  assert.equal(typeKeys('Rs.4999'), '4999');
  assert.equal(typeKeys('Rs. 4,999/-'), '4,999');
  assert.equal(typeKeys('rs.12000'), '12000');
  assert.equal(typeKeys('Re.1'), '1');
  assert.equal(typeKeys('INR.500'), '500');
  assert.equal(typeKeys('Rs.4999', '1,000'), '4999');
  // Nothing else changes: other letters are still dropped, and a “.” of its own is still a decimal point.
  assert.equal(typeKeys('Rs 4999'), '4999');
  assert.equal(typeKeys('₹4999'), '4999');
  assert.equal(typeKeys('a4999'), '4999');
  assert.equal(typeKeys('.50'), '.50');
  assert.equal(typeKeys('fare.50'), '.50');
});

test('editAmountInput carries dropped keys only until a key is taken, and only at the start of the field', () => {
  assert.equal(editAmountInput('', 'R', 1).carry, 'R');
  assert.equal(editAmountInput('', 's', 1, 'R').carry, 'Rs');
  assert.deepEqual(editAmountInput('', '4', 1, 'Rs.'), { value: '4', caret: 1, carry: '' });
  assert.deepEqual(editAmountInput('4,999', 'R', 1), { value: '', caret: 0, carry: 'R' });
  assert.equal(editAmountInput('4999.50', '49.99.50', 3).carry, '');
  assert.deepEqual(edit('12', '12.', 3, 'Rs'), { value: '12.', caret: 3 });
  assert.equal(editAmountInput('5000', 'ab12', 0, 'Rs').carry, '');
});
