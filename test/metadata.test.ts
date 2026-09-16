import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FEED_ALTERNATE, FEED_URL, jsonLdHtml, pageMetadata } from '../lib/metadata.ts';

test('jsonLdHtml never lets a string close the script element', () => {
  const data = { headline: 'Why </script><script>alert(1)</script> matters', text: '<!-- a < b -->' };
  const html = jsonLdHtml(data);
  assert.doesNotMatch(html, /</);
  assert.deepEqual(JSON.parse(html), data);
});

test('jsonLdHtml leaves other characters as JSON.stringify writes them', () => {
  const data = { name: 'TukdaPay', description: 'Split ₹5,000 & more “in parts”' };
  assert.equal(jsonLdHtml(data), JSON.stringify(data));
});

test('the RSS alternate link carries the feed title', () => {
  assert.deepEqual(FEED_ALTERNATE, { 'application/rss+xml': [{ url: FEED_URL, title: 'TukdaPay blog' }] });
});

test('pageMetadata sets the canonical path and the titled feed link', () => {
  const meta = pageMetadata({ title: 'Use cases', description: 'Bills.', path: '/use-cases/' });
  assert.deepEqual(meta.alternates, { canonical: '/use-cases/', types: FEED_ALTERNATE });
});
