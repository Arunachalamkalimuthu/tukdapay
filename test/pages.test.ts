import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import sitemap, { sitemapEntries } from '../app/sitemap.ts';
import {
  POST_AUTHOR,
  lastModified,
  metaDate,
  morePosts,
  newestModified,
  postPageMetadata,
  postStructuredData,
} from '../components/blog/postData.ts';
import { posts, type PostMeta } from '../content/posts.ts';
import { PAGE_CARDS } from '../lib/og.ts';
import { toRfc822 } from '../lib/rss.ts';
import { AUTHOR, PUBLISHER } from '../lib/schema.ts';
import { PAGE_UPDATED } from '../lib/site.ts';

const post = (slug: string, date: string, updated?: string): PostMeta => ({
  slug,
  title: `Title of ${slug}`,
  description: `Description of ${slug}.`,
  date,
  ...(updated ? { updated } : {}),
});

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

// ---- Post dates (SEO-07) ----

test('lastModified is the updated date when a post has one, otherwise the publish date', () => {
  assert.equal(lastModified(post('a', '2026-09-17')), '2026-09-17');
  assert.equal(lastModified(post('a', '2026-09-17', '2026-10-03')), '2026-10-03');
});

test('newestModified is the latest updated-or-published date across posts', () => {
  assert.equal(newestModified([]), undefined);
  assert.equal(newestModified([post('a', '2026-09-17'), post('b', '2026-09-20')]), '2026-09-20');
  // An older post that was updated later wins over a newer post that wasn't.
  assert.equal(newestModified([post('a', '2026-09-17', '2026-11-01'), post('b', '2026-10-01')]), '2026-11-01');
});

test('the meta line shows the publish date, or "Updated" with the updated date once a post has changed', () => {
  assert.deepEqual(metaDate(post('a', '2026-09-17')), { label: undefined, iso: '2026-09-17' });
  assert.deepEqual(metaDate(post('a', '2026-09-17', '2026-10-03')), { label: 'Updated', iso: '2026-10-03' });
});

// ---- "More from the blog" (SEO-12) ----

test('more posts are the three newest others, by date rather than array order', () => {
  const list = [post('a', '2026-09-17'), post('b', '2026-09-17'), post('c', '2026-09-17'), post('d', '2026-09-17'), post('new', '2026-10-01')];
  assert.deepEqual(morePosts(list, 'a').map((p) => p.slug), ['new', 'b', 'c']);
  assert.deepEqual(morePosts(list, 'new').map((p) => p.slug), ['a', 'b', 'c']);
  assert.deepEqual(morePosts([post('only', '2026-09-17')], 'only'), []);
});

test('more posts never reorder the list they are given', () => {
  const list = [post('a', '2026-09-17'), post('new', '2026-10-01')];
  morePosts(list, 'x');
  assert.deepEqual(list.map((p) => p.slug), ['a', 'new']);
});

// ---- Post metadata and JSON-LD (D6, SEO-06, SEO-07, SEO-08) ----

test('a post shares its own card, as Open Graph and X images with alt text', () => {
  const meta = postPageMetadata(post('a-post', '2026-09-17'));
  const expected = [{ url: '/og/a-post.png', alt: 'TukdaPay blog: Title of a-post', width: 1200, height: 630, type: 'image/png' }];
  assert.deepEqual(meta.openGraph?.images, expected);
  assert.deepEqual(meta.twitter?.images, expected);
  assert.equal(meta.alternates?.canonical, '/blog/a-post/');
});

test('a post’s article modified time is its updated date, or the publish date until it has one', () => {
  const og = (p: PostMeta) => postPageMetadata(p).openGraph as { type?: string; publishedTime?: string; modifiedTime?: string };
  assert.deepEqual(
    [og(post('a', '2026-09-17')).type, og(post('a', '2026-09-17')).publishedTime, og(post('a', '2026-09-17')).modifiedTime],
    ['article', '2026-09-17', '2026-09-17'],
  );
  const edited = og(post('a', '2026-09-17', '2026-10-03'));
  assert.equal(edited.publishedTime, '2026-09-17');
  assert.equal(edited.modifiedTime, '2026-10-03');
});

test('the post author is the person named on the page, with the About page as their URL', () => {
  assert.deepEqual(POST_AUTHOR, { '@type': 'Person', name: AUTHOR.name, url: 'https://tukdapay.com/about/' });
  assert.equal(POST_AUTHOR.name, 'Arunachalam Kalimuthu');
});

test('a post’s JSON-LD is one graph: the BlogPosting and its breadcrumbs', () => {
  const data = postStructuredData(post('a-post', '2026-09-17', '2026-10-03'));
  assert.equal(data['@context'], 'https://schema.org');
  const [article, crumbs] = data['@graph'];
  assert.equal(article['@type'], 'BlogPosting');
  assert.equal(article.headline, 'Title of a-post');
  assert.equal(article.datePublished, '2026-09-17T09:00:00+05:30');
  assert.equal(article.dateModified, '2026-10-03T09:00:00+05:30');
  assert.deepEqual(article.author, POST_AUTHOR);
  assert.deepEqual(article.publisher, PUBLISHER);
  assert.equal(article.image.url, 'https://tukdapay.com/og/a-post.png');
  assert.deepEqual(
    crumbs.itemListElement.map((i) => [i.name, i.item]),
    [
      ['Home', 'https://tukdapay.com/'],
      ['Blog', 'https://tukdapay.com/blog/'],
      ['Title of a-post', 'https://tukdapay.com/blog/a-post/'],
    ],
  );
});

test('a post without an updated date has dateModified equal to datePublished', () => {
  const [article] = postStructuredData(post('a-post', '2026-09-17'))['@graph'];
  assert.equal(article.dateModified, article.datePublished);
});

// ---- Sitemap lastmod (SEO-07, about note 2) ----

test('page dates are real YYYY-MM-DD dates', () => {
  for (const [path, date] of Object.entries(PAGE_UPDATED)) {
    assert.doesNotThrow(() => toRfc822(date), path);
  }
});

test('sitemap: posts use updated or date, /blog/ the newest of those, other pages their own date', () => {
  const list = [post('old', '2026-09-17', '2026-12-01'), post('new', '2026-10-01')];
  const lastmod = new Map(sitemapEntries(list).map((e) => [e.url, e.lastModified]));
  assert.equal(lastmod.get('https://tukdapay.com/blog/old/'), '2026-12-01');
  assert.equal(lastmod.get('https://tukdapay.com/blog/new/'), '2026-10-01');
  assert.equal(lastmod.get('https://tukdapay.com/blog/'), '2026-12-01');
  assert.equal(lastmod.get('https://tukdapay.com/use-cases/'), PAGE_UPDATED['/use-cases/']);
  assert.equal(lastmod.get('https://tukdapay.com/about/'), PAGE_UPDATED['/about/']);
  // Home lists the newest posts, so it changes when they do.
  assert.equal(lastmod.get('https://tukdapay.com/'), '2026-12-01');
});

test('sitemap: home keeps its own date when it is later than every post', () => {
  const home = (list: PostMeta[]) => sitemapEntries(list).find((e) => e.url === 'https://tukdapay.com/')?.lastModified;
  assert.equal(home([post('a', '2000-01-01')]), PAGE_UPDATED['/']);
  assert.equal(home([]), PAGE_UPDATED['/']);
});

test('sitemap lists home, use cases, blog, about and every post once, with about monthly at 0.5', () => {
  const entries = sitemap();
  const urls = entries.map((e) => e.url);
  assert.equal(new Set(urls).size, urls.length);
  assert.deepEqual(urls.slice(0, 4), [
    'https://tukdapay.com/',
    'https://tukdapay.com/use-cases/',
    'https://tukdapay.com/blog/',
    'https://tukdapay.com/about/',
  ]);
  for (const p of posts) assert.ok(urls.includes(`https://tukdapay.com/blog/${p.slug}/`), p.slug);
  assert.equal(entries.length, 4 + posts.length);
  const about = entries.find((e) => e.url === 'https://tukdapay.com/about/');
  assert.equal(about?.changeFrequency, 'monthly');
  assert.equal(about?.priority, 0.5);
});

// ---- Pages ----

const h1 = (path: string) => {
  const m = /<h1\b[^>]*>([^<{]+)<\/h1>/.exec(source(path));
  assert.ok(m, `${path}: no plain-text <h1>`);
  return m[1].trim();
};

test('the About and use cases share cards carry the page’s own heading', () => {
  const title = (key: string) => PAGE_CARDS.find((c) => c.key === key)?.title;
  assert.equal(title('about'), h1('app/about/page.tsx'));
  assert.equal(title('use-cases'), h1('app/use-cases/page.tsx'));
});

test('the blog index is headed "UPI guides" and the use cases intro explains tukde first', () => {
  assert.equal(h1('app/blog/page.tsx'), 'UPI guides');
  assert.equal(h1('app/use-cases/page.tsx'), 'Bills people pay in tukde');
  assert.match(source('app/use-cases/page.tsx'), /<\/h1>\s*<p>\s*Tukde means pieces:/);
});

test('the merchant section on /use-cases/ can be linked as #merchants', () => {
  assert.match(source('app/use-cases/page.tsx'), /<section id="merchants"[^>]*aria-labelledby="merchants-title"/);
});

test('/use-cases/ links the how-to, the ₹2000 check and the save-money posts', () => {
  const page = source('app/use-cases/page.tsx');
  for (const slug of ['split-upi-payment-above-2000', 'upi-2000-threshold-what-to-check', 'does-splitting-upi-save-money']) {
    assert.ok(posts.some((p) => p.slug === slug), `${slug} is not a post`);
    assert.ok(page.includes(`href="/blog/${slug}/"`), `/use-cases/ doesn't link ${slug}`);
  }
});

test('/use-cases/ never offers splitting as a way to keep payments small or to save money (D1)', () => {
  const page = source('app/use-cases/page.tsx');
  assert.doesNotMatch(page, /keep each payment small/i);
  // The plan's first draft of the save-money link read as a promise; the link says what the post covers instead.
  assert.doesNotMatch(page, /splitting a UPI payment saves money/i);
  assert.match(page, /Ask the shop first\./);
});
