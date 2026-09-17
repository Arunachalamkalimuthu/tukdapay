import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OG_TITLE, PAGE_CARDS, fitTitle, ogCards, ogImage, ogImagePath, textWidth, unsupportedCharacters } from '../lib/og.ts';
import { posts } from '../content/posts.ts';

const post = (slug: string, title: string) => ({ slug, title, description: 'x', date: '2026-09-17' });

test('ogImagePath names the PNG after its key under /og/', () => {
  assert.equal(ogImagePath('blog'), '/og/blog.png');
  assert.equal(ogImagePath('split-upi-payment-above-2000'), '/og/split-upi-payment-above-2000.png');
});

test('ogImagePath rejects keys that are not lower-case slugs', () => {
  for (const bad of ['', 'Blog', 'a/b', '../x', 'a b', 'x.png']) {
    assert.throws(() => ogImagePath(bad), RangeError, bad);
  }
});

test('there is a card for every post, labelled Blog and titled like the post (or its card title)', () => {
  const cards = ogCards(posts);
  for (const p of posts) {
    const card = cards.find((c) => c.key === p.slug);
    assert.ok(card, `no card for ${p.slug}`);
    assert.equal(card.label, 'Blog');
    assert.equal(card.title, p.cardTitle ?? p.title);
    assert.equal(card.alt, `TukdaPay blog: ${p.title}`);
  }
});

test('a post’s card title replaces its title on the card only; the alt text still names the post', () => {
  const [card] = ogCards([{ slug: 'a-post', title: 'UPI charges above ₹2000: what applies', cardTitle: 'Heard about UPI charges?' }]);
  assert.deepEqual(card, {
    key: 'a-post',
    label: 'Blog',
    title: 'Heard about UPI charges?',
    alt: 'TukdaPay blog: UPI charges above ₹2000: what applies',
  });
});

test('a card title with a character the fonts can’t draw stops the build too', () => {
  assert.throws(() => ogCards([{ slug: 'a-post', title: 'Fine', cardTitle: 'Café bills' }]), /a-post.*"é"/s);
});

test('no post card reads as a fee or a limit when it is forwarded without the page (D6)', () => {
  // A share card travels alone on WhatsApp: “UPI charges above ₹2000” in 84px type looks like the rumour itself.
  for (const card of ogCards(posts)) {
    assert.doesNotMatch(card.title, /\b(charges?|fees?|limit)\b.*₹|₹\d+ limit/i, card.key);
  }
});

test('there are cards for the blog index, use cases and about pages', () => {
  const cards = ogCards(posts);
  assert.deepEqual(
    PAGE_CARDS.map((c) => [c.key, c.label]),
    [
      ['blog', 'Blog'],
      ['use-cases', 'Use cases'],
      ['about', 'About'],
    ],
  );
  for (const page of PAGE_CARDS) assert.ok(cards.some((c) => c.key === page.key), page.key);
  assert.equal(cards.length, posts.length + PAGE_CARDS.length);
});

test('a post added to posts.ts gets a card without any other change', () => {
  const cards = ogCards([...posts, post('a-new-post', 'A new post')]);
  assert.deepEqual(
    cards.find((c) => c.key === 'a-new-post'),
    { key: 'a-new-post', label: 'Blog', title: 'A new post', alt: 'TukdaPay blog: A new post' },
  );
});

test('two cards can never write the same file', () => {
  assert.throws(() => ogCards([post('blog', 'Clashes with the blog index card')]), /blog/);
  assert.throws(() => ogCards([post('same', 'One'), post('same', 'Two')]), /same/);
});

test('every card title and label is drawn from the committed Latin fonts', () => {
  for (const card of ogCards(posts)) {
    assert.deepEqual(unsupportedCharacters(`${card.label} ${card.title}`), [], card.key);
  }
});

test('unsupportedCharacters lists each character the card fonts have no width for, once', () => {
  assert.deepEqual(unsupportedCharacters("Can't pay more than ₹2000? What to check → “now” – done…"), []);
  assert.deepEqual(unsupportedCharacters('UPI से ₹2000 से ज़्यादा'), ['स', 'े', 'ज', '़', '्', 'य', 'ा', 'द']);
  assert.deepEqual(unsupportedCharacters('Café × 2'), ['é', '×']);
});

test('a card with text the fonts cannot draw stops the build instead of rendering missing glyphs', () => {
  assert.throws(() => ogCards([post('hindi-how-to', 'UPI से ₹2000 से ज़्यादा कैसे भेजें')]), /hindi-how-to.*Latin/s);
  assert.throws(() => ogCards([post('cafe', 'Café bills')]), /cafe.*"é"/s);
});

test('card copy states no fee, rate or limit', () => {
  for (const c of PAGE_CARDS) {
    assert.doesNotMatch(`${c.title} ${c.alt}`, /₹|%|\bfees?\b|charge|limit|cap\b|MDR/i, c.key);
  }
});

test('ogImage gives the metadata image for a card: path, alt, size and type', () => {
  const card = ogCards(posts).find((c) => c.key === 'use-cases')!;
  assert.deepEqual(ogImage(card), {
    url: '/og/use-cases.png',
    alt: card.alt,
    width: 1200,
    height: 630,
    type: 'image/png',
  });
});

test('textWidth scales with font size and counts letter spacing per character', () => {
  const at100 = textWidth('UPI', 100, 0);
  assert.ok(at100 > 150 && at100 < 250, String(at100));
  assert.equal(textWidth('UPI', 50, 0), at100 / 2);
  assert.equal(textWidth('UPI', 100, -0.02), at100 - 3 * 2);
  assert.ok(textWidth('₹', 100, 0) > 0);
  assert.ok(textWidth('मराठी', 100, 0) > 0, 'unknown characters still take space');
});

test('every post card title fits in three lines, in the widest size that allows it', () => {
  for (const p of posts) {
    const title = p.cardTitle ?? p.title;
    const { fontSize, lines } = fitTitle(title);
    assert.ok(lines.length <= OG_TITLE.maxLines, `${p.slug}: ${lines.length} lines`);
    assert.equal(lines.join(' '), title, p.slug);
    for (const line of lines) {
      assert.ok(textWidth(line, fontSize, OG_TITLE.letterSpacing) <= OG_TITLE.maxWidth, `${p.slug}: "${line}" overflows`);
    }
    for (const size of OG_TITLE.sizes.filter((s) => s > fontSize)) {
      assert.equal(fitTitle(title, [size]).truncated, true, `${p.slug} would fit at ${size}px`);
    }
  }
});

test('a short title gets the largest size on one line', () => {
  assert.deepEqual(fitTitle('UPI guides'), { fontSize: OG_TITLE.sizes[0], lines: ['UPI guides'], truncated: false });
});

test('lines are balanced rather than leaving one word on its own', () => {
  const { lines } = fitTitle("Can't pay more than ₹2000 by UPI? What to check and what to try");
  assert.ok(lines.length >= 2 && lines.length <= 3);
  const words = lines.map((l) => l.split(' ').length);
  assert.ok(Math.min(...words) >= 2, JSON.stringify(lines));
});

test('a title too long for three lines at the smallest size is cut with an ellipsis', () => {
  const long = Array.from({ length: 40 }, (_, i) => `word${i}`).join(' ');
  const { fontSize, lines, truncated } = fitTitle(long);
  assert.equal(fontSize, OG_TITLE.sizes.at(-1));
  assert.equal(truncated, true);
  assert.equal(lines.length, OG_TITLE.maxLines);
  assert.match(lines.at(-1)!, /…$/);
  for (const line of lines) assert.ok(textWidth(line, fontSize, OG_TITLE.letterSpacing) <= OG_TITLE.maxWidth, line);
});
