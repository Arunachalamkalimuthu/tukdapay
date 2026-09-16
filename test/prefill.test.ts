import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readPrefill, stripPrefill, PREFILL_KEYS } from '../lib/prefill.ts';

const p = (query: string) => readPrefill(new URLSearchParams(query));

test('no params means no prefill', () => {
  assert.deepEqual(p(''), { present: false });
  assert.deepEqual(p('utm_source=blog'), { present: false });
});

test('amount and max are parsed and kept only when positive', () => {
  assert.deepEqual(p('amount=14999'), { present: true, amount: 14999 });
  assert.deepEqual(p(`amount=${encodeURIComponent(' ₹ 1,00,000 ')}`), { present: true, amount: 100000 });
  assert.deepEqual(p('max=1000'), { present: true, max: 1000 });
  assert.deepEqual(p('amount=5000&max=2500.5'), { present: true, amount: 5000, max: 2500.5 });
  assert.deepEqual(p('amount=0'), { present: false });
  assert.deepEqual(p('amount=abc&max='), { present: false });
  assert.deepEqual(p('amount=1.2.3'), { present: false });
  assert.deepEqual(p('amount=0.001'), { present: false });
});

test('amounts are rounded to paise', () => {
  assert.equal(p('amount=4999.555').amount, 4999.56);
  assert.equal(p('max=0.009').max, 0.01);
});

test('text params are trimmed and ignored when empty', () => {
  assert.deepEqual(p(`pa=${encodeURIComponent(' shop@okaxis ')}&pn=Tea%20Shop&note=Table%204`), {
    present: true,
    pa: 'shop@okaxis',
    pn: 'Tea Shop',
    note: 'Table 4',
  });
  assert.deepEqual(p('pa=%20%20&pn=&note='), { present: false });
});

test('text params are capped at 100 characters', () => {
  assert.equal(p(`note=${'x'.repeat(150)}`).note, 'x'.repeat(100));
  assert.equal(p(`pn=${'y'.repeat(99)}%20z`).pn, 'y'.repeat(99));
});

test('an invalid UPI ID is still prefilled so the form can point it out', () => {
  assert.deepEqual(p('pa=not-a-upi-id'), { present: true, pa: 'not-a-upi-id' });
});

test('accepts anything with a get(key) method', () => {
  const source = { get: (key: string) => (key === 'amount' ? '500' : null) };
  assert.deepEqual(readPrefill(source), { present: true, amount: 500 });
});

test('PREFILL_KEYS lists every supported param', () => {
  assert.deepEqual([...PREFILL_KEYS].sort(), ['amount', 'max', 'note', 'pa', 'pn']);
});

test('stripPrefill removes only the prefill params from a query string', () => {
  assert.equal(stripPrefill('?amount=1&pa=x@y&utm_source=blog'), '?utm_source=blog');
  assert.equal(stripPrefill('?amount=1&pn=a&note=b&max=2'), '');
  assert.equal(stripPrefill('amount=1'), '');
  assert.equal(stripPrefill(''), '');
  assert.equal(stripPrefill('?ref=x'), '?ref=x');
});
