import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rememberMerchant, parseRecent, MAX_RECENT } from '../lib/recent.ts';

const shop = { pa: 'shop@okaxis', pn: 'Sri Tea Stall' };
const chemist = { pa: 'chemist@ybl', pn: '' };

test('rememberMerchant puts the newest merchant first', () => {
  assert.deepEqual(rememberMerchant([shop], chemist), [chemist, shop]);
  assert.deepEqual(rememberMerchant([], shop), [shop]);
});

test('rememberMerchant dedupes by UPI ID ignoring case', () => {
  const next = rememberMerchant([shop, chemist], { pa: 'Chemist@YBL', pn: 'City Chemist' });
  assert.deepEqual(next, [{ pa: 'Chemist@YBL', pn: 'City Chemist' }, shop]);
});

test('rememberMerchant keeps a remembered name when the new entry has none', () => {
  assert.deepEqual(rememberMerchant([chemist, shop], { pa: 'shop@okaxis', pn: '' }), [shop, chemist]);
});

test('rememberMerchant keeps at most five', () => {
  assert.equal(MAX_RECENT, 5);
  let list: { pa: string; pn: string }[] = [];
  for (let i = 1; i <= 7; i++) list = rememberMerchant(list, { pa: `shop${i}@upi`, pn: '' });
  assert.deepEqual(list.map((r) => r.pa), ['shop7@upi', 'shop6@upi', 'shop5@upi', 'shop4@upi', 'shop3@upi']);
});

test('rememberMerchant ignores an invalid UPI ID and does not mutate the list', () => {
  const list = [shop];
  assert.deepEqual(rememberMerchant(list, { pa: 'not a upi id', pn: 'x' }), [shop]);
  rememberMerchant(list, chemist);
  assert.deepEqual(list, [shop]);
});

test('parseRecent returns an empty list for anything that is not an array', () => {
  for (const bad of [null, undefined, 'shop@okaxis', 42, { pa: 'shop@okaxis', pn: '' }]) {
    assert.deepEqual(parseRecent(bad), []);
  }
});

test('parseRecent keeps valid entries and drops malformed ones', () => {
  const stored = [
    shop,
    { pa: 'not a upi id', pn: 'x' },
    { pa: 'a@b', pn: 5 },
    null,
    'x@y',
    { pa: 'tea@ybl' },
    { pa: 'chemist@ybl', pn: '', extra: true },
  ];
  assert.deepEqual(parseRecent(stored), [shop, { pa: 'tea@ybl', pn: '' }, chemist]);
});

test('parseRecent dedupes and caps what it restores', () => {
  const stored = [shop, { pa: 'SHOP@okaxis', pn: 'dupe' }, ...[1, 2, 3, 4, 5].map((i) => ({ pa: `s${i}@upi`, pn: '' }))];
  assert.deepEqual(parseRecent(stored).map((r) => r.pa), ['shop@okaxis', 's1@upi', 's2@upi', 's3@upi', 's4@upi']);
});
