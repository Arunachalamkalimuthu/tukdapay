import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readPrefill, stripPrefill, prefillInput, PREFILL_KEYS, MAX_TEXT } from '../lib/prefill.ts';
import { DEFAULT_MAX } from '../lib/site.ts';

const p = (query: string) => readPrefill(new URLSearchParams(query));
const enc = encodeURIComponent;

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

test('amounts written with Rs. in front keep their digits', () => {
  assert.equal(p('amount=Rs.4999').amount, 4999);
  assert.equal(p(`amount=${encodeURIComponent('Rs. 4,999/-')}`).amount, 4999);
  assert.equal(p('max=Rs.1000').max, 1000);
});

test('an amount with more than one number in it is ignored, not run together into a different amount', () => {
  assert.deepEqual(p('amount=5000x2'), { present: false });
  assert.deepEqual(p('amount=2.5e4'), { present: false });
  assert.deepEqual(p('amount=1e5'), { present: false });
  assert.deepEqual(p(`amount=${enc('4,999 for 2 items')}`), { present: false });
  assert.deepEqual(p(`max=${enc('1000 x 2')}`), { present: false });
  assert.equal(p(`amount=${enc('₹ 1,00,000.50 ')}`).amount, 100000.5);
});

test('amounts over the most the page splits are ignored', () => {
  assert.deepEqual(p('amount=1000000000000000000000'), { present: false });
  assert.deepEqual(p(`max=1${'0'.repeat(307)}`), { present: false });
  assert.equal(p('amount=1000000000').amount, 1000000000);
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

test('text params are capped at 100 UTF-16 units, as the form’s fields count them, without splitting an emoji or an accent', () => {
  assert.equal(MAX_TEXT, 100);
  const family = '\u{1F468}‍\u{1F469}‍\u{1F467}';
  assert.equal(family.length, 8);
  assert.equal(p(`note=${enc('x'.repeat(92) + family + 'y')}`).note, 'x'.repeat(92) + family);
  assert.equal(p(`note=${enc('x'.repeat(98) + family + 'y')}`).note, 'x'.repeat(98));
  assert.equal(p(`note=${enc('x'.repeat(99) + family + 'y')}`).note, 'x'.repeat(99));
  assert.equal(p(`pn=${enc('x'.repeat(100) + family)}`).pn, 'x'.repeat(100));
  assert.equal(p(`note=${enc('x'.repeat(98) + 'e\u0301' + 'y')}`).note, 'x'.repeat(98) + 'e\u0301');
  assert.equal(p(`note=${enc('x'.repeat(99) + 'e\u0301' + 'y')}`).note, 'x'.repeat(99));
});

test('a name or note of many long emoji stays within what the form’s fields take', () => {
  // A four-person family is 11 UTF-16 units: counted as characters, 100 of them would be 1,100 units.
  const family = '\u{1F468}‍\u{1F469}‍\u{1F467}‍\u{1F466}';
  const { pn, note } = p(`pn=${enc(family.repeat(120))}&note=${enc(family.repeat(120))}`);
  assert.equal(note, family.repeat(9));
  assert.equal(pn, family.repeat(9));
  assert.ok(note!.length <= MAX_TEXT);
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

test('prefillInput is the payment a link describes, once it has both the amount and the UPI ID', () => {
  assert.deepEqual(prefillInput(p('amount=14999&pa=shop@okaxis')), {
    total: 14999,
    pa: 'shop@okaxis',
    pn: '',
    note: '',
    maxPerTxn: DEFAULT_MAX,
  });
  assert.deepEqual(prefillInput(p('amount=5000&pa=shop@okaxis&pn=Tea%20Shop&note=Bill%2042&max=1000')), {
    total: 5000,
    pa: 'shop@okaxis',
    pn: 'Tea Shop',
    note: 'Bill 42',
    maxPerTxn: 1000,
  });
  assert.equal(prefillInput(p('amount=5000&pn=Tea%20Shop')), null);
  assert.equal(prefillInput(p('pa=shop@okaxis')), null);
  assert.equal(prefillInput(p('')), null);
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
