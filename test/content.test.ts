import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isValidElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { faq } from '../content/faq.tsx';
import { posts } from '../content/posts.ts';
import { tryHref, useCases } from '../content/useCases.ts';
import { readPrefill } from '../lib/prefill.ts';
import { toRfc822 } from '../lib/rss.ts';
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

/** The layout's title template adds this to every post title. */
const TITLE_SUFFIX = ' – TukdaPay';
const chars = (s: string) => Array.from(s).length;
const postSource = (slug: string) => readFileSync(new URL(`../app/blog/${slug}/page.mdx`, import.meta.url), 'utf8');

test('post titles fit a search result with the site suffix, and descriptions fit a snippet', () => {
  for (const p of posts) {
    const title = chars(p.title + TITLE_SUFFIX);
    assert.ok(title <= 63, `${p.slug}: title is ${title} characters with the suffix`);
    const description = chars(p.description);
    assert.ok(description >= 70 && description <= 160, `${p.slug}: description is ${description} characters`);
  }
});

test('post titles and descriptions write ₹2000 the way people search for it', () => {
  for (const p of posts) {
    assert.doesNotMatch(`${p.title} ${p.description}`, /₹2,000/, p.slug);
  }
});

test('a post’s updated date, when set, is a real date on or after its publish date', () => {
  for (const p of posts) {
    assert.doesNotThrow(() => toRfc822(p.date), `${p.slug}: date`);
    if (p.updated === undefined) continue;
    const updated = p.updated;
    assert.doesNotThrow(() => toRfc822(updated), `${p.slug}: updated`);
    assert.ok(updated >= p.date, `${p.slug}: updated ${updated} is before the publish date ${p.date}`);
  }
});

test('posts point to NPCI’s FAQ instead of restating its figures and dates', () => {
  for (const p of posts) {
    const src = postSource(p.slug);
    for (const figure of ['0.4%', '₹300', '₹75,000', '15 October', '₹5 ', '₹1 lakh']) {
      assert.ok(!src.includes(figure), `${p.slug} restates "${figure}"`);
    }
  }
});

test('post links to the splitter say what they open', () => {
  for (const p of posts) {
    const src = postSource(p.slug);
    assert.doesNotMatch(src, /\[(Open )?TukdaPay\]\(/, p.slug);
    assert.doesNotMatch(src, /<Cta href="[^"]*">\s*(Open )?TukdaPay\s*<\/Cta>/, p.slug);
  }
});

test('every post body links the splitter or the use cases', () => {
  for (const p of posts) {
    assert.match(postSource(p.slug), /\]\(\/(use-cases\/[^)]*)?\)|href="\/(use-cases\/[^"]*)?"/, p.slug);
  }
});

test('links between posts point at posts that exist', () => {
  const slugs = new Set(posts.map((p) => p.slug));
  for (const p of posts) {
    for (const [, slug] of postSource(p.slug).matchAll(/\/blog\/([a-z0-9-]+)\//g)) {
      assert.ok(slugs.has(slug), `${p.slug} links /blog/${slug}/, which has no entry in content/posts.ts`);
    }
  }
});
