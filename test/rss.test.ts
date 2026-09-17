import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { buildRssFeed, escapeXml, newestFirst, toRfc822 } from '../lib/rss.ts';
import { posts } from '../content/posts.ts';

const post = (over: Partial<{ slug: string; title: string; description: string; date: string }> = {}) => ({
  slug: 'a-post',
  title: 'A post',
  description: 'About a thing.',
  date: '2026-09-17',
  ...over,
});

/** Contents of every <tag>…</tag> in document order. */
const all = (xml: string, tag: string) =>
  [...xml.matchAll(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'g'))].map((m) => m[1]);

test('escapeXml escapes the five XML special characters', () => {
  assert.equal(escapeXml(`Tom & Jerry's <"UPI"> tips`), 'Tom &amp; Jerry&apos;s &lt;&quot;UPI&quot;&gt; tips');
});

test('escapeXml escapes & first so existing entities are not left unescaped', () => {
  assert.equal(escapeXml('&lt;'), '&amp;lt;');
});

test('toRfc822 gives 09:00 IST on the given day with the right weekday', () => {
  assert.equal(toRfc822('2026-09-17'), 'Thu, 17 Sep 2026 09:00:00 +0530');
  assert.equal(toRfc822('2026-01-05'), 'Mon, 05 Jan 2026 09:00:00 +0530');
  assert.equal(toRfc822('2028-02-29'), 'Tue, 29 Feb 2028 09:00:00 +0530');
});

test('toRfc822 rejects anything that is not a real YYYY-MM-DD date', () => {
  for (const bad of ['', '17-09-2026', '2026-9-17', '2026-02-30', '2026-13-01', '2026-09-17T00:00:00Z']) {
    assert.throws(() => toRfc822(bad), RangeError, bad);
  }
});

test('feed is RSS 2.0 with the blog channel fields', () => {
  const xml = buildRssFeed([post()]);
  assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n'));
  assert.match(xml, /<rss version="2\.0" xmlns:atom="http:\/\/www\.w3\.org\/2005\/Atom">/);
  const channel = xml.slice(xml.indexOf('<channel>'), xml.indexOf('<item>'));
  assert.deepEqual(all(channel, 'title'), ['TukdaPay blog']);
  assert.deepEqual(all(channel, 'link'), ['https://tukdapay.com/blog/']);
  assert.deepEqual(all(channel, 'description'), [
    'Plain-language guides on UPI: splitting payments, per-transaction rules, and how upi:// links work.',
  ]);
  assert.deepEqual(all(channel, 'language'), ['en-in']);
  assert.match(channel, /<atom:link href="https:\/\/tukdapay\.com\/blog\/feed\.xml" rel="self" type="application\/rss\+xml" \/>/);
  assert.ok(xml.trimEnd().endsWith('</channel>\n</rss>'));
});

test('items have absolute trailing-slash links, guid equal to link, and RFC-822 pubDate', () => {
  const xml = buildRssFeed([post({ slug: 'split-upi-payment-above-2000' })]);
  const [item] = all(xml, 'item');
  assert.deepEqual(all(item, 'link'), ['https://tukdapay.com/blog/split-upi-payment-above-2000/']);
  assert.deepEqual(all(item, 'guid'), all(item, 'link'));
  assert.deepEqual(all(item, 'pubDate'), ['Thu, 17 Sep 2026 09:00:00 +0530']);
});

test('item titles and descriptions are XML-escaped', () => {
  const xml = buildRssFeed([post({ title: 'Split & save <₹2000>', description: `"Pay" it's done` })]);
  const [item] = all(xml, 'item');
  assert.deepEqual(all(item, 'title'), ['Split &amp; save &lt;₹2000&gt;']);
  assert.deepEqual(all(item, 'description'), ['&quot;Pay&quot; it&apos;s done']);
  assert.doesNotMatch(xml, /Split & save|<₹2000>/);
});

test('items are newest first and keep input order for equal dates', () => {
  const xml = buildRssFeed([
    post({ slug: 'old', date: '2026-01-01' }),
    post({ slug: 'new-a', date: '2026-09-17' }),
    post({ slug: 'new-b', date: '2026-09-17' }),
  ]);
  assert.deepEqual(
    all(xml, 'guid'),
    ['new-a', 'new-b', 'old'].map((s) => `https://tukdapay.com/blog/${s}/`)
  );
});

test('buildRssFeed does not reorder the array it is given', () => {
  const input = [post({ slug: 'old', date: '2026-01-01' }), post({ slug: 'new', date: '2026-09-17' })];
  buildRssFeed(input);
  assert.deepEqual(input.map((p) => p.slug), ['old', 'new']);
});

test('every post in the feed has an MDX page wired to the same slug', () => {
  assert.ok(posts.length > 0);
  for (const { slug } of posts) {
    const file = new URL(`../app/blog/${slug}/page.mdx`, import.meta.url);
    assert.ok(existsSync(file), `missing app/blog/${slug}/page.mdx`);
    const src = readFileSync(file, 'utf8');
    assert.ok(src.includes(`postMetadata('${slug}')`), `${slug}: metadata must use postMetadata('${slug}')`);
    assert.ok(src.includes(`postLayout('${slug}')`), `${slug}: default export must be postLayout('${slug}')`);
  }
});

test('every MDX post page has an entry in content/posts.ts', () => {
  const blogDir = new URL('../app/blog/', import.meta.url);
  const pages = readdirSync(blogDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(new URL(`${d.name}/page.mdx`, blogDir)))
    .map((d) => d.name);
  assert.ok(pages.length > 0);
  for (const slug of pages) {
    assert.ok(posts.some((p) => p.slug === slug), `app/blog/${slug}/page.mdx has no entry in content/posts.ts`);
  }
});

test('content/posts.ts lists posts newest first, as the home page and post footers assume', () => {
  assert.deepEqual(
    posts.map((p) => p.slug),
    newestFirst(posts).map((p) => p.slug)
  );
});
