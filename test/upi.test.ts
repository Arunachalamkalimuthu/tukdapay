import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildUpiUrl, isValidVpa } from '../lib/upi.ts';

test('minimal url has pa, am with two decimals, and cu=INR', () => {
  assert.equal(buildUpiUrl({ pa: 'shop@upi', am: 1999 }), 'upi://pay?pa=shop%40upi&am=1999.00&cu=INR');
});

test('optional pn and tn are included when given', () => {
  assert.equal(
    buildUpiUrl({ pa: 'shop@upi', pn: 'Tea Shop', am: 2.1, tn: 'Part 1/3' }),
    'upi://pay?pa=shop%40upi&pn=Tea%20Shop&am=2.10&cu=INR&tn=Part%201%2F3'
  );
});

test('empty pn and tn are omitted', () => {
  assert.equal(buildUpiUrl({ pa: 'shop@upi', pn: '', am: 10, tn: '   ' }), 'upi://pay?pa=shop%40upi&am=10.00&cu=INR');
});

test('rejects malformed VPA', () => {
  for (const bad of ['', 'shop', '@upi', 'shop@', 'sh op@upi']) {
    assert.throws(() => buildUpiUrl({ pa: bad, am: 1 }), TypeError, bad);
    assert.equal(isValidVpa(bad), false, bad);
  }
  assert.equal(isValidVpa('a.b-c_1@ok-bank'), true);
});

test('rejects non-positive amount', () => {
  assert.throws(() => buildUpiUrl({ pa: 'shop@upi', am: 0 }), RangeError);
  assert.throws(() => buildUpiUrl({ pa: 'shop@upi', am: NaN }), RangeError);
});
