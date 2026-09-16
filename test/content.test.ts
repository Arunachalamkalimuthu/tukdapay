import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isValidElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { faq } from '../content/faq.tsx';
import { tryHref, useCases } from '../content/useCases.ts';
import { readPrefill } from '../lib/prefill.ts';
import { DEFAULT_MAX } from '../lib/site.ts';
import { splitAmount } from '../lib/split.ts';

/** Visible text of rendered markup: tags dropped, the few entities React writes decoded. */
const textOf = (html: string) =>
  html
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

test('an FAQ body with markup reads the same as its plain answer (used for JSON-LD)', () => {
  const withBody = faq.filter((f) => f.body !== undefined);
  assert.ok(withBody.length > 0);
  for (const f of withBody) {
    assert.ok(isValidElement(f.body), `${f.q}: body should be JSX`);
    assert.equal(textOf(renderToStaticMarkup(f.body)), f.a, f.q);
  }
});

test('FAQ copy groups amounts the Indian way', () => {
  for (const f of faq) {
    assert.doesNotMatch(`${f.q} ${f.a}`, /₹\d{4}/, f.q);
  }
});

test('use case notes are short and not blank', () => {
  for (const u of useCases) {
    if (u.note === undefined) continue;
    assert.ok(u.note.trim().length > 0, `${u.slug}: blank note`);
    assert.ok(Array.from(u.note).length < 30, `${u.slug}: note "${u.note}" is 30 characters or more`);
  }
});

test('"Try with" links prefill the splitter with the amount and note', () => {
  for (const u of useCases) {
    const href = tryHref(u);
    assert.ok(href.startsWith('/?'), `${u.slug}: ${href}`);
    const expected = { present: true, amount: u.amount, ...(u.note ? { note: u.note } : {}) };
    assert.deepEqual(readPrefill(new URL(href, 'https://tukdapay.com').searchParams), expected, u.slug);
  }
});

test('tryHref percent-encodes the note', () => {
  assert.equal(tryHref({ amount: 5500, note: 'Priya – Oct fees' }), '/?amount=5500&note=Priya%20%E2%80%93%20Oct%20fees');
  assert.equal(tryHref({ amount: 3650, note: 'Bill 1042 & tip' }), '/?amount=3650&note=Bill%201042%20%26%20tip');
  assert.equal(tryHref({ amount: 4200 }), '/?amount=4200');
});

test('no use case ends in a token last payment', () => {
  // A split like ₹1,999 × 3 + ₹3 makes a poor example for someone about to try it.
  for (const u of useCases) {
    const parts = splitAmount(u.amount, DEFAULT_MAX);
    const last = parts[parts.length - 1];
    assert.ok(last >= 100, `${u.slug}: last payment is only ₹${last}`);
  }
});
