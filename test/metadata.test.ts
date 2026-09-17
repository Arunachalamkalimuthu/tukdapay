import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FEED_ALTERNATE, FEED_URL, OG_IMAGE, jsonLdHtml, pageMetadata } from '../lib/metadata.ts';

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

test('the default share image is og.png with its size, type and alt text', () => {
  assert.deepEqual(OG_IMAGE, {
    url: '/og.png',
    width: 1200,
    height: 630,
    type: 'image/png',
    alt: 'TukdaPay: ₹5,000 → ₹1,999 + ₹1,999 + ₹1,002',
  });
});

test('pageMetadata gives Open Graph and X the same image, with alt text, by default og.png', () => {
  const meta = pageMetadata({ title: 'Split UPI bills above ₹2000: 8 everyday examples', description: 'Bills.', path: '/use-cases/' });
  assert.deepEqual(meta.openGraph?.images, [OG_IMAGE]);
  assert.deepEqual(meta.twitter?.images, [OG_IMAGE]);
  assert.equal((meta.twitter as { card?: string }).card, 'summary_large_image');
});

test('pageMetadata uses a page image when given one, as a 1200×630 PNG', () => {
  const image = { url: '/og/use-cases.png', alt: 'TukdaPay use cases: Bills people pay in tukde' };
  const meta = pageMetadata({ title: 'Use cases', description: 'Bills.', path: '/use-cases/', image });
  const expected = [{ ...image, width: 1200, height: 630, type: 'image/png' }];
  assert.deepEqual(meta.openGraph?.images, expected);
  assert.deepEqual(meta.twitter?.images, expected);
});

test('pageMetadata rejects a page image without alt text', () => {
  assert.throws(() => pageMetadata({ title: 'T', description: 'D', path: '/t/', image: { url: '/og/t.png', alt: ' ' } }), /alt/);
});

test('pageMetadata keeps the page title unsuffixed for Open Graph and X', () => {
  const meta = pageMetadata({ title: 'UPI guides', description: 'Guides.', path: '/blog/' });
  assert.equal(meta.title, 'UPI guides');
  assert.equal((meta.openGraph as { title?: string }).title, 'UPI guides');
  assert.equal((meta.twitter as { title?: string }).title, 'UPI guides');
});

test('pageMetadata dates an article, with the modified time defaulting to the published time', () => {
  const og = (m: ReturnType<typeof pageMetadata>) =>
    m.openGraph as { publishedTime?: string; modifiedTime?: string; type?: string };
  const first = pageMetadata({ title: 'T', description: 'D', path: '/blog/t/', type: 'article', publishedTime: '2026-09-17' });
  assert.equal(og(first).type, 'article');
  assert.equal(og(first).publishedTime, '2026-09-17');
  assert.equal(og(first).modifiedTime, '2026-09-17');
  const edited = pageMetadata({
    title: 'T',
    description: 'D',
    path: '/blog/t/',
    type: 'article',
    publishedTime: '2026-09-17',
    modifiedTime: '2026-10-03',
  });
  assert.equal(og(edited).modifiedTime, '2026-10-03');
  const page = pageMetadata({ title: 'T', description: 'D', path: '/t/', publishedTime: '2026-09-17' });
  assert.equal(og(page).publishedTime, undefined, 'only articles carry dates');
});
