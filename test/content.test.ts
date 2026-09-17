import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { isValidElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { faq, NPCI_MDR_FAQ_URL, PIB_FACT_CHECK_TELEGRAM_URL, PIB_FACT_CHECK_X_URL } from '../content/faq.tsx';
import { postPath, posts } from '../content/posts.ts';
import { tryHref, useCases } from '../content/useCases.ts';
import { formatRupees } from '../lib/format.ts';
import { readPrefill } from '../lib/prefill.ts';
import { newestFirst, toRfc822 } from '../lib/rss.ts';
import { DEFAULT_MAX } from '../lib/site.ts';
import { splitAmount } from '../lib/split.ts';
import { EXAMPLE_PARTS, EXAMPLE_TOTAL } from '../lib/strip.ts';

// next.config.ts sets trailingSlash: true, and the build hands that to next/link through this variable. Without it,
// FAQ links rendered here would lose the trailing slash that the exported pages have.
process.env.__NEXT_TRAILING_SLASH = 'true';

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

/** The FAQ entry with this exact question; fails the test if it's gone. */
function faqEntry(q: string) {
  const entry = faq.find((f) => f.q === q);
  assert.ok(entry, `no FAQ entry "${q}"`);
  return entry;
}

/** Every href in an FAQ answer's rendered markup. */
const faqHrefs = (f: (typeof faq)[number]) =>
  f.body === undefined ? [] : [...renderToStaticMarkup(f.body).matchAll(/href="([^"]*)"/g)].map((m) => m[1]);

test('the FAQ answers the questions people ask about splitting, charges and the ₹1,999 default', () => {
  for (const q of [
    'Is this the same as Split expenses in Google Pay or PhonePe?',
    'Is it OK to pay a shop in parts?',
    'Why ₹1,999?',
    'Will I be charged for a UPI payment above ₹2,000?',
  ]) {
    faqEntry(q);
  }
});

test('FAQ questions are unique, so the React keys and FAQPage questions are too', () => {
  assert.equal(new Set(faq.map((f) => f.q)).size, faq.length);
});

test('FAQ answers link only to pages and posts that exist', () => {
  const pages = new Set(['/', '/use-cases/', '/blog/', '/about/', ...posts.map((p) => postPath(p.slug))]);
  for (const f of faq) {
    for (const href of faqHrefs(f)) {
      if (href.startsWith('https://')) continue;
      assert.ok(pages.has(href), `${f.q}: links ${href}, which is not a page on the site`);
    }
  }
});

test('the ₹1,999 limit answer links what to check, so home always links the ₹2000 check post', () => {
  const f = faqEntry('Can I change the ₹1,999 limit?');
  assert.match(f.a, /Here’s what to check\.$/);
  assert.match(
    renderToStaticMarkup(f.body),
    /<a href="\/blog\/upi-2000-threshold-what-to-check\/">Here’s what to check<\/a>/,
  );
});

test('the FAQ links what to check when a payment above ₹2,000 won’t go through', () => {
  assert.ok(
    faq.some((f) => faqHrefs(f).includes(postPath('cant-pay-more-than-2000-upi'))),
    'no FAQ answer links /blog/cant-pay-more-than-2000-upi/',
  );
});

test('the charges answer points to NPCI’s FAQ question 15 and PIB Fact Check’s published checks instead of stating a rule', () => {
  const f = faqEntry('Will I be charged for a UPI payment above ₹2,000?');
  assert.match(f.a, /question 15\b/);
  const hrefs = faqHrefs(f);
  assert.ok(hrefs.includes(NPCI_MDR_FAQ_URL), 'does not link NPCI’s FAQ PDF');
  assert.ok(
    hrefs.includes(PIB_FACT_CHECK_TELEGRAM_URL) || hrefs.includes(PIB_FACT_CHECK_X_URL),
    'does not link where PIB Fact Check posts its checks (Telegram or X)',
  );
  assert.match(NPCI_MDR_FAQ_URL, /^https:\/\/www\.npci\.org\.in\/.+\.pdf$/);
  assert.equal(PIB_FACT_CHECK_TELEGRAM_URL, 'https://t.me/PIB_FactCheck');
  assert.equal(PIB_FACT_CHECK_X_URL, 'https://x.com/PIBFactCheck');
});

test('no FAQ answer sends readers to PIB Fact Check’s portal, which is a login form for sending in a claim', () => {
  for (const f of faq) {
    assert.ok(!faqHrefs(f).some((href) => href.includes('factcheck.pib.gov.in')), f.q);
  }
});

test('an FAQ link to a PDF says so in its link text, so its accessible name does too', () => {
  for (const f of faq) {
    if (f.body === undefined) continue;
    for (const [, href, text] of renderToStaticMarkup(f.body).matchAll(/<a href="([^"]*)"[^>]*>(.*?)<\/a>/g)) {
      if (/\.pdf$/i.test(href)) assert.match(text, /\(PDF\)$/, `${f.q}: link to ${href} reads "${text}"`);
    }
  }
});

const FEE_WORDS = /\b(fee|fees|charge|charges|charged|MDR)\b/i;

test('only the charges answer talks about fees or charges, and it says TukdaPay isn’t a way to avoid one', () => {
  // “Under ₹2,000” next to charges reads as “stay under the charge”, the fee-avoidance pitch TukdaPay never makes.
  assert.doesNotMatch(faqEntry('Why ₹1,999?').a, FEE_WORDS);
  const charges = faqEntry('Will I be charged for a UPI payment above ₹2,000?');
  assert.match(charges.a, /TukdaPay isn’t a way to avoid a fee\. Ask the shop before you split\./);
  for (const f of faq) {
    if (f === charges) continue;
    assert.doesNotMatch(`${f.q} ${f.a}`, FEE_WORDS, f.q);
  }
});

test('FAQ answers state no fee, rate or date, and never pitch splitting as a way around a fee', () => {
  for (const f of faq) {
    const text = `${f.q} ${f.a}`;
    for (const figure of ['%', 'per cent', 'percent', '₹300', '₹75,000', '15 October', '₹5 ', '₹1 lakh', 'lakh', '2025', '2026']) {
      assert.ok(!text.includes(figure), `${f.q} states "${figure}"`);
    }
    // A sentence about avoiding or saving on a fee must be a denial ("isn’t a way to avoid a fee").
    for (const sentence of f.a.split(/(?<=[.?!])\s+/)) {
      if (/\b(avoid|save|saves|saving|skip|dodge|around|cheaper)\b/i.test(sentence) && /\b(fee|fees|charge|charges|charged|MDR)\b/i.test(sentence)) {
        assert.match(sentence, /\b(isn’t|not|doesn’t|never|no)\b/i, `${f.q}: "${sentence}"`);
      }
    }
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
    // Only site-relative links (Markdown or JSX), so an external https://…/blog/…/ URL isn't mistaken for one.
    for (const [, slug] of postSource(p.slug).matchAll(/(?:\]\(|href=")\/blog\/([a-z0-9-]+)\//g)) {
      assert.ok(slugs.has(slug), `${p.slug} links /blog/${slug}/, which has no entry in content/posts.ts`);
    }
  }
});

test('links to a section of /use-cases/ point at an id on that page', () => {
  const page = readFileSync(new URL('../app/use-cases/page.tsx', import.meta.url), 'utf8');
  for (const p of posts) {
    for (const [, id] of postSource(p.slug).matchAll(/\/use-cases\/#([\w-]+)/g)) {
      assert.ok(page.includes(`id="${id}"`), `${p.slug} links /use-cases/#${id}, which app/use-cases/page.tsx has no id for`);
    }
  }
});

test('the how-to post’s worked examples are use cases that exist', () => {
  // app/blog/split-upi-payment-above-2000/page.mdx names a ₹4,200 kirana bill and ₹5,500 tuition fees
  // and sends readers to /use-cases/ for them.
  for (const amount of [4200, 5500]) {
    assert.ok(useCases.some((u) => u.amount === amount), `no use case for ₹${amount}`);
  }
});

const homeSource = () => readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');

test('home picks its three posts by date, so a newer post added anywhere in posts.ts shows first', () => {
  const src = homeSource();
  assert.match(src, /newestFirst\(posts\)\.slice\(0, 3\)/);
  assert.doesNotMatch(src, /\bposts\.slice\(/);
  const newer = { slug: 'newer-post', title: 'Newer', description: 'A newer post.', date: '2099-01-01' };
  assert.equal(newestFirst([...posts, newer]).slice(0, 3)[0].slug, 'newer-post');
});

/** Source without its comments, so a comment explaining a rule doesn't trip the check for that rule. */
const withoutComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

test('home renders the splitter outside any Suspense boundary, so its form and steps show without JavaScript', () => {
  // Once the page's HTML passes React's 12.8KB chunk size, a Suspense boundary is written into a hidden <div> and
  // moved into place by a script. The export check still finds id="total" in that hidden markup, so guard it here:
  // no Suspense (imported, as React.Suspense or in the splitter) in the files that render home, and no app/loading.tsx,
  // which wraps the page in one.
  const splitter = new URL('../components/splitter/', import.meta.url);
  const sources = [
    new URL('../app/page.tsx', import.meta.url),
    new URL('../app/layout.tsx', import.meta.url),
    ...readdirSync(splitter).filter((f) => f.endsWith('.tsx')).map((f) => new URL(f, splitter)),
  ];
  for (const file of sources) {
    assert.doesNotMatch(withoutComments(readFileSync(file, 'utf8')), /\bSuspense\b/, file.pathname);
  }
  for (const ext of ['tsx', 'ts', 'jsx', 'js']) {
    assert.ok(!existsSync(new URL(`../app/loading.${ext}`, import.meta.url)), `app/loading.${ext} wraps home in Suspense`);
  }
});

test('the home H1 breaks after “UPI bill” below 400px, so Bricolage and its fallbacks wrap it the same way', () => {
  // “UPI bill above ₹2,000?” fits a 358px column in Bricolage with 0.5px to spare but not in the Arial or Roboto
  // fallbacks, so without this break the H1 was 3 lines until the web font arrived and 2 after, moving the page
  // 37px at 390–399px. From 400px up it fits in every font, so the break is hidden there.
  const h1 = homeSource().match(/<h1>(.*?)<\/h1>/s)?.[1];
  assert.equal(h1, 'UPI bill <br className={s.narrowBreak} />above ₹2,000?<br />Pay it in tukde.');
  const css = readFileSync(new URL('../app/page.module.css', import.meta.url), 'utf8');
  assert.match(css, /\.narrowBreak \{ display: none; \}/);
  assert.match(css, /@media \(max-width: 399\.98px\) \{ \.narrowBreak \{ display: inline; \} \}/);
});

test('How it works gives the same worked example as the empty splitter', () => {
  const example = `${formatRupees(EXAMPLE_TOTAL)} becomes ${EXAMPLE_PARTS.map(formatRupees).join(' + ')}`;
  assert.equal(example, '₹5,000 becomes ₹1,999 + ₹1,999 + ₹1,002');
  assert.deepEqual(EXAMPLE_PARTS, splitAmount(5000, DEFAULT_MAX));
  assert.ok(homeSource().includes(`(${example})`), `app/page.tsx does not say "(${example})"`);
});

test('the home link to use cases names bills that are on that page', () => {
  // app/page.tsx: "See 8 bills people split, from kirana to tuition fees", counting useCases.
  assert.ok(useCases.some((u) => u.slug === 'kirana'), 'no kirana use case');
  assert.ok(useCases.some((u) => /tuition/i.test(u.title)), 'no tuition use case');
  assert.match(homeSource(), /See \$\{useCases\.length\} bills people split, from kirana to tuition fees/);
});
