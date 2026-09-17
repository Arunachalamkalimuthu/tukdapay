import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createElement, Fragment } from 'react';
import * as llmsFullRoute from '../app/llms-full.txt/route.ts';
import * as llmsRoute from '../app/llms.txt/route.ts';
import { faq, NPCI_MDR_FAQ_URL, PIB_FACT_CHECK_TELEGRAM_URL, PIB_FACT_CHECK_X_URL } from '../content/faq.tsx';
import { posts } from '../content/posts.ts';
import { tryHref, useCases } from '../content/useCases.ts';
import {
  buildLlmsFullTxt,
  buildLlmsTxt,
  LLMS_LINKS,
  PAGE_COPY,
  PREFILL_EXAMPLE,
  type LlmsFullData,
  type LlmsPost,
  type LlmsUseCase,
} from '../lib/llms.ts';
import { inlineToMarkdown } from '../lib/markdown.ts';
import { createPlan, MAX_PARTS } from '../lib/plan.ts';
import { MAX_TEXT, PREFILL_KEYS, readPrefill } from '../lib/prefill.ts';
import { REPO_URL, SITE_URL } from '../lib/site.ts';

// ---- fixtures and helpers ----

const post = (over: Partial<LlmsPost> = {}): LlmsPost => ({
  slug: 'a-post',
  title: 'A post',
  description: 'About a thing.',
  date: '2026-09-17',
  ...over,
});

const scenario = (over: Partial<LlmsUseCase> = {}): LlmsUseCase => ({
  slug: 'kirana',
  title: 'Monthly kirana bill',
  amount: 4200,
  who: 'Households',
  story: 'Groceries come to ₹4,200.',
  tip: 'Put “Sept khata” in the note.',
  note: 'Sept khata',
  ...over,
});

const POST_SOURCE = [
  "import { postLayout, postMetadata } from '@/components/blog/PostShell'",
  '',
  "export const metadata = postMetadata('a-post')",
  '',
  "export default postLayout('a-post')",
  '',
  '<Lede>Hello.</Lede>',
  '',
  '## Step',
  '',
  'See [use cases](/use-cases/).',
  '',
  '<Cta href="/">Split a payment</Cta>',
].join('\n');

const fullData = (over: Partial<LlmsFullData> = {}): LlmsFullData => ({
  posts: [post()],
  useCases: [{ ...scenario(), tryHref: '/?amount=4200&note=Sept%20khata' }],
  faq: [{ q: 'Does it move money?', a: 'No.' }],
  postSources: { 'a-post': POST_SOURCE },
  ...over,
});

/** H2 headings in document order. */
const h2s = (md: string) => [...md.matchAll(/^## (.+)$/gm)].map((m) => m[1]);

/** The text under one H2, up to the next H2, trimmed. Fails the test if the heading is missing. */
function section(md: string, title: string): string {
  const heading = `\n## ${title}\n`;
  const start = md.indexOf(heading);
  assert.ok(start !== -1, `no "## ${title}" section`);
  const rest = md.slice(start + heading.length);
  const end = rest.search(/^## /m);
  return (end === -1 ? rest : rest.slice(0, end)).trim();
}

/** Lines outside fenced code blocks. */
function proseLines(md: string): string[] {
  const lines: string[] = [];
  let inFence = false;
  for (const line of md.split('\n')) {
    if (/^ {0,3}(```|~~~)/.test(line)) inFence = !inFence;
    else if (!inFence) lines.push(line);
  }
  return lines;
}

/** Every http(s) URL, bare or in a Markdown link, without trailing punctuation. */
const urlsIn = (md: string) => [...md.matchAll(/https?:\/\/[^\s)<>"]+/g)].map((m) => m[0].replace(/[.,:;]+$/, ''));

/** Markdown as the words a reader sees: link text kept, markup and list or heading markers dropped. */
const mdText = (md: string) =>
  md
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\*\*|\*|`/g, '')
    .replace(/^(#{1,6} |- |\d+\. |> ?)/gm, '');

const collapse = (s: string) => s.replace(/\s+/g, ' ').trim();

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const realTxt = () => buildLlmsTxt({ posts, useCases });
const realFullTxt = async () => (await llmsFullRoute.GET().text()) as string;

// ---- llms.txt ----

test('llms.txt starts with the site name as its H1 and a one-line blockquote summary', () => {
  const [h1, blank, quote, blank2] = buildLlmsTxt({ posts: [post()], useCases: [scenario()] }).split('\n');
  assert.equal(h1, '# TukdaPay');
  assert.equal(blank, '');
  assert.match(quote, /^> \S/);
  assert.equal(blank2, '');
  for (const fact of [/\bfree\b/, /open-source \(MIT\)/, /no signup/i, /UPI app/, /nothing the user types is sent to TukdaPay/, /never touches the money/]) {
    assert.match(quote, fact);
  }
});

test('between the summary and the first H2 there are notes but no headings, as llmstxt.org lays out', () => {
  const txt = buildLlmsTxt({ posts: [post()], useCases: [scenario()] });
  const notes = txt.slice(0, txt.indexOf('\n## '));
  assert.deepEqual(
    notes.split('\n').filter((line) => line.startsWith('#')),
    ['# TukdaPay'],
  );
  for (const label of ['How it works:', 'When TukdaPay fits:', 'When it doesn’t fit:', 'Privacy:', 'What TukdaPay doesn’t do:', 'Prefill links for agents:']) {
    assert.ok(notes.split('\n').includes(label), `no "${label}" notes`);
  }
});

test('llms.txt file lists are Tool, Guides, Use cases, About and Optional, each only "- [name](absolute URL): notes" lines', () => {
  const txt = buildLlmsTxt({ posts: [post()], useCases: [scenario()] });
  assert.deepEqual(h2s(txt), ['Tool', 'Guides', 'Use cases', 'About', 'Optional']);
  for (const title of h2s(txt)) {
    for (const line of section(txt, title).split('\n')) {
      assert.match(line, /^- \[[^\]]+\]\(https:\/\/[^)\s]+\): \S.*[.?]$/, `${title}: ${line}`);
    }
  }
});

test('Tool links the splitter on the home page', () => {
  const txt = buildLlmsTxt({ posts: [], useCases: [] });
  assert.deepEqual(urlsIn(section(txt, 'Tool')), ['https://tukdapay.com/']);
});

test('Guides links the blog and every post, newest first, with its description', () => {
  const txt = buildLlmsTxt({
    posts: [
      post({ slug: 'old', title: 'Old', date: '2026-01-01' }),
      post({ slug: 'new', title: 'New', description: 'Newer thing.', date: '2026-09-17' }),
    ],
    useCases: [],
  });
  const lines = section(txt, 'Guides').split('\n');
  assert.match(lines[0], /^- \[UPI guides\]\(https:\/\/tukdapay\.com\/blog\/\): /);
  assert.deepEqual(lines.slice(1), [
    '- [New](https://tukdapay.com/blog/new/): Newer thing.',
    '- [Old](https://tukdapay.com/blog/old/): About a thing.',
  ]);
});

test('Use cases links the page and each bill by its anchor, with the amount and number of payments', () => {
  const txt = buildLlmsTxt({
    posts: [],
    useCases: [
      scenario(),
      scenario({ slug: 'electronics', title: 'Phone, mixer or appliance', amount: 14999, who: 'Shopping' }),
      scenario({ slug: 'small', title: 'Small bill', amount: 1500, who: 'Test' }),
    ],
  });
  const lines = section(txt, 'Use cases').split('\n');
  assert.match(lines[0], /^- \[Bills people pay in tukde\]\(https:\/\/tukdapay\.com\/use-cases\/\): 3 everyday bills /);
  assert.deepEqual(lines.slice(1, 4), [
    '- [Monthly kirana bill](https://tukdapay.com/use-cases/#kirana): Households: ₹4,200 in 3 payments.',
    '- [Phone, mixer or appliance](https://tukdapay.com/use-cases/#electronics): Shopping: ₹14,999 in 8 payments.',
    '- [Small bill](https://tukdapay.com/use-cases/#small): Test: ₹1,500 in 1 payment.',
  ]);
  assert.match(lines[4], /^- \[If you’re the merchant\]\(https:\/\/tukdapay\.com\/use-cases\/#merchants\): /);
  assert.equal(lines.length, 5);
});

test('About links the About page, the source code, the licence and issues; Optional the feed, full text and sitemap', () => {
  const txt = buildLlmsTxt({ posts: [], useCases: [] });
  assert.deepEqual(urlsIn(section(txt, 'About')), [
    'https://tukdapay.com/about/',
    REPO_URL,
    `${REPO_URL}/blob/main/LICENSE`,
    `${REPO_URL}/issues`,
  ]);
  assert.deepEqual(urlsIn(section(txt, 'Optional')), [
    'https://tukdapay.com/blog/feed.xml',
    'https://tukdapay.com/llms-full.txt',
    'https://tukdapay.com/sitemap.xml',
  ]);
});

test('the prefill example fills in every field, and each parameter is explained', () => {
  const txt = buildLlmsTxt({ posts: [], useCases: [] });
  assert.equal(PREFILL_EXAMPLE, '/?amount=4200&pa=shop@okaxis&pn=Sri%20Stores&note=Sept%20khata&max=1999');
  assert.ok(txt.split('\n').includes(`${SITE_URL}${PREFILL_EXAMPLE}`), 'the example link is not on a line of its own');
  assert.deepEqual(readPrefill(new URL(PREFILL_EXAMPLE, SITE_URL).searchParams), {
    present: true,
    amount: 4200,
    pa: 'shop@okaxis',
    pn: 'Sri Stores',
    note: 'Sept khata',
    max: 1999,
  });
  for (const key of PREFILL_KEYS) assert.match(txt, new RegExp(`^- \`${key}\`: \\S`, 'm'), key);
  assert.match(txt, /URL-encode/);
  assert.match(txt, new RegExp(`first ${MAX_TEXT} characters`));
  assert.match(txt, /₹1,999 when left out/);
  assert.match(txt, /₹100 crore/);
  assert.match(txt, /only fills in the form/);
  assert.match(txt, /UPI PIN/);
});

test('the notes describe how a split works with the splitter’s own numbers', () => {
  const txt = buildLlmsTxt({ posts: [], useCases: [] });
  assert.ok(txt.includes('₹5,000 becomes ₹1,999 + ₹1,999 + ₹1,002'));
  assert.ok(txt.includes(`at most ${MAX_PARTS} parts`));
  const note = createPlan({ total: 4200, pa: 'shop@okaxis', pn: '', note: 'Sept khata', maxPerTxn: 1999 }).parts[0].tn;
  assert.ok(txt.includes(`“${note}”`), `does not show the note as the splitter writes it: ${note}`);
});

test('the notes say when TukdaPay fits, when it doesn’t, and what it can’t do', () => {
  const txt = buildLlmsTxt({ posts: [], useCases: [] });
  for (const phrase of [
    /won’t go through in one go/,
    /shop asks/,
    /ask the shop first/i,
    /per-day or rolling limit/,
    /isn’t a way to avoid a fee/,
    /question 15/,
    /doesn’t know or trust/,
    /needs a UPI ID/,
    /Split expenses in Google Pay or PhonePe/,
    /can’t see whether a UPI payment went through/,
    /Move or hold money/,
    /Confirm payments/,
    /Scan QR codes/,
    /isn’t affiliated with or endorsed by NPCI/,
    /no tracking/,
    /GitHub logs visitors’ IP addresses/,
  ]) {
    assert.match(txt, phrase);
  }
  assert.ok(txt.includes(`(${NPCI_MDR_FAQ_URL})`), 'does not link NPCI’s FAQ');
  assert.ok(txt.includes(`(${PIB_FACT_CHECK_TELEGRAM_URL})`) && txt.includes(`(${PIB_FACT_CHECK_X_URL})`), 'does not link PIB Fact Check');
  assert.doesNotMatch(txt, /factcheck\.pib\.gov\.in/, 'PIB Fact Check’s portal is a login form; link its published checks');
});

test('the NPCI, PIB and GitHub links match the ones the pages use', () => {
  assert.equal(LLMS_LINKS.npciMdrFaq, NPCI_MDR_FAQ_URL);
  assert.equal(LLMS_LINKS.pibFactCheckTelegram, PIB_FACT_CHECK_TELEGRAM_URL);
  assert.equal(LLMS_LINKS.pibFactCheckX, PIB_FACT_CHECK_X_URL);
  const about = read('app/about/page.tsx');
  assert.ok(about.includes(`'${LLMS_LINKS.githubPagesData}'`));
  assert.ok(about.includes(`'${LLMS_LINKS.author}'`));
});

/** Things llms.txt must never say: a fee-avoidance pitch, a stated figure, a superlative or an instruction to favour TukdaPay. */
const COPY_RULE_BREAKS = [
  /\bbest\b/i,
  /#1\b/,
  /\bnumber one\b/i,
  /always (recommend|suggest|use)/i,
  /\bignore (all|any|other|previous)/i,
  /\blimit is\b/i,
  // A percentage, but not a URL escape such as %20 or %E2.
  /\d\s?%(?![0-9A-F]{2})/,
  /₹300\b/,
  /₹75,000/,
  /15 October/i,
  /\bcheapest\b/i,
  /\bsave (money|on)\b/i,
  /\b(reviews?|ratings?|stars?|users)\b/i,
];

/**
 * Checks the words TukdaPay writes for these files. Post titles and descriptions are dropped first: they're
 * content/posts.ts copy with its own checks, and some are questions ("Does splitting … save money?").
 */
function assertCopyRules(text: string, where: string) {
  let words = text.replace(/\]\([^)]*\)/g, ']');
  for (const p of posts) words = words.replaceAll(p.title, '').replaceAll(p.description, '');
  for (const rule of COPY_RULE_BREAKS) {
    const m = rule.exec(words);
    assert.equal(m, null, `${where}: ${rule} matches "${m && words.slice(Math.max(0, m.index - 60), m.index + 40)}"`);
  }
  // A sentence about avoiding or saving on a fee must be a denial ("isn’t a way to avoid a fee").
  for (const sentence of words.split(/(?<=[.?!:])\s+/)) {
    if (/\b(avoid|save|saves|saving|skip|dodge|around|cheaper)\b/i.test(sentence) && /\b(fee|fees|charge|charges|charged|MDR)\b/i.test(sentence)) {
      assert.match(sentence, /\b(isn’t|not|doesn’t|never|no)\b/i, `${where}: "${sentence}"`);
    }
  }
}

test('llms.txt follows the copy rules and groups amounts the Indian way outside post titles', () => {
  const txt = realTxt();
  assertCopyRules(txt, 'llms.txt');
  assertCopyRules(buildLlmsTxt({ posts: [], useCases }), 'llms.txt without posts');
  let withoutPostMeta = txt;
  for (const p of posts) withoutPostMeta = withoutPostMeta.replaceAll(p.title, '').replaceAll(p.description, '');
  assert.doesNotMatch(withoutPostMeta, /₹\d{4}/);
});

test('llms.txt is deterministic, ends with one newline and leaves its input alone', () => {
  const input = [post({ slug: 'old', date: '2026-01-01' }), post({ slug: 'new', date: '2026-09-17' })];
  const a = buildLlmsTxt({ posts: input, useCases });
  assert.equal(a, buildLlmsTxt({ posts: input, useCases }));
  assert.deepEqual(input.map((p) => p.slug), ['old', 'new']);
  assert.ok(a.endsWith('.\n') && !a.endsWith('\n\n'));
});

// ---- llms-full.txt ----

test('llms-full.txt starts with the same header and notes as llms.txt', () => {
  const data = fullData();
  const txt = buildLlmsTxt(data);
  assert.ok(buildLlmsFullTxt(data).startsWith(txt.slice(0, txt.indexOf('\n## ') + 1)));
});

test('llms-full.txt has a section for home, use cases and About, then each post newest first', () => {
  const full = buildLlmsFullTxt(
    fullData({
      posts: [post({ slug: 'old', title: 'Old', date: '2026-01-01' }), post({ slug: 'new', title: 'New' })],
      postSources: { old: 'Old body.', new: 'New body.' },
    }),
  );
  assert.deepEqual(h2s(full), [PAGE_COPY.home.title, PAGE_COPY.useCases.title, PAGE_COPY.about.title, 'New', 'Old']);
  assert.ok(section(full, PAGE_COPY.home.title).startsWith('URL: https://tukdapay.com/\n\n'));
  assert.ok(section(full, PAGE_COPY.useCases.title).startsWith('URL: https://tukdapay.com/use-cases/\n\n'));
  assert.ok(section(full, PAGE_COPY.about.title).startsWith('URL: https://tukdapay.com/about/\n\n'));
  assert.equal(section(full, 'Old'), 'URL: https://tukdapay.com/blog/old/\nPublished: 2026-01-01\n\nOld body.');
});

test('a post with an updated date gives it under the publish date', () => {
  const full = buildLlmsFullTxt(fullData({ posts: [post({ date: '2026-09-17', updated: '2026-10-01' })] }));
  assert.ok(section(full, 'A post').startsWith('URL: https://tukdapay.com/blog/a-post/\nPublished: 2026-09-17\nUpdated: 2026-10-01\n\n'));
});

test('post bodies come from their MDX as Markdown, with headings under the post’s title', () => {
  const full = buildLlmsFullTxt(fullData());
  assert.equal(
    section(full, 'A post'),
    [
      'URL: https://tukdapay.com/blog/a-post/',
      'Published: 2026-09-17',
      '',
      'Hello.',
      '',
      '### Step',
      '',
      'See [use cases](https://tukdapay.com/use-cases/).',
      '',
      '[Split a payment](https://tukdapay.com/)',
    ].join('\n'),
  );
});

test('a post without its MDX source stops the build', () => {
  assert.throws(() => buildLlmsFullTxt(fullData({ postSources: {} })), /a-post/);
});

test('home carries the FAQ, as Markdown with absolute links when an answer has markup', () => {
  const body = createElement(Fragment, null, 'See ', createElement('a', { href: '/blog/x/' }, 'this'), '.');
  const full = buildLlmsFullTxt(fullData({ faq: [{ q: 'Q one?', a: 'Plain one.' }, { q: 'Q two?', a: 'See this.', body }] }));
  const home = section(full, PAGE_COPY.home.title);
  assert.ok(
    home.endsWith(`### ${PAGE_COPY.home.faqTitle}\n\n#### Q one?\n\nPlain one.\n\n#### Q two?\n\nSee [this](https://tukdapay.com/blog/x/).`),
    home,
  );
});

test('each use case has its anchor, split, story, tip and a link that opens the splitter with it', () => {
  const full = buildLlmsFullTxt(fullData());
  const page = section(full, PAGE_COPY.useCases.title);
  const expected = [
    '### Monthly kirana bill',
    '',
    'URL: https://tukdapay.com/use-cases/#kirana',
    '',
    'Households: ₹4,200 in 3 payments (₹1,999 + ₹1,999 + ₹202).',
    '',
    'Groceries come to ₹4,200.',
    '',
    '**Tip:** Put “Sept khata” in the note.',
    '',
    '[Try with ₹4,200](https://tukdapay.com/?amount=4200&note=Sept%20khata)',
  ].join('\n');
  assert.ok(page.includes(expected), page);
  assert.ok(page.includes(`### ${PAGE_COPY.useCases.merchantsTitle}\n\nURL: https://tukdapay.com/use-cases/#merchants\n\n`));
  assert.ok(page.includes('(https://tukdapay.com/blog/upi-2000-threshold-what-to-check/)'), 'merchant links are not absolute');
});

test('llms-full.txt is deterministic and ends with one newline', () => {
  const data = fullData();
  const full = buildLlmsFullTxt(data);
  assert.equal(full, buildLlmsFullTxt(data));
  assert.ok(full.endsWith('\n') && !full.endsWith('\n\n'));
});

// ---- the routes and the real content ----

test('the routes are static and serve UTF-8 plain text', async () => {
  assert.equal(llmsRoute.dynamic, 'force-static');
  assert.equal(llmsFullRoute.dynamic, 'force-static');
  const res = llmsRoute.GET();
  assert.equal(res.headers.get('content-type'), 'text/plain; charset=utf-8');
  assert.equal(await res.text(), realTxt());
  assert.equal(llmsFullRoute.GET().headers.get('content-type'), 'text/plain; charset=utf-8');
});

test('the real llms-full.txt has every post, use case and FAQ question', async () => {
  const full = await realFullTxt();
  for (const p of posts) {
    const dates = `Published: ${p.date}\n${p.updated ? `Updated: ${p.updated}\n` : ''}`;
    assert.ok(full.includes(`\n## ${p.title}\n\nURL: ${SITE_URL}/blog/${p.slug}/\n${dates}\n`), p.slug);
  }
  for (const u of useCases) {
    assert.ok(full.includes(`\n### ${u.title}\n\nURL: ${SITE_URL}/use-cases/#${u.slug}\n`), u.slug);
    assert.ok(full.includes(`(${SITE_URL}${tryHref(u)})`), `${u.slug}: no Try link`);
  }
  for (const f of faq) assert.ok(full.includes(`\n#### ${f.q}\n`), f.q);
  // Code blocks survive as written.
  assert.ok(full.includes('\nexport function buildUpiUrl({ pa, pn, am, tn }: UpiParams): string {\n'));
});

test('the real llms-full.txt has no MDX, JSX or relative links left outside code blocks', async () => {
  for (const line of proseLines(await realFullTxt())) {
    assert.doesNotMatch(line, /^(<|import |export )/, line);
    assert.doesNotMatch(line, /<\/?[A-Za-z][A-Za-z]*[\s/>]/, line);
    assert.doesNotMatch(line, /\]\((?!https:\/\/)/, line);
  }
});

test('every tukdapay.com link in both files points at a page, file or section the site has', async () => {
  const pages: Record<string, string> = {
    '/': 'app/page.tsx',
    '/use-cases/': 'app/use-cases/page.tsx',
    '/about/': 'app/about/page.tsx',
    '/blog/': 'app/blog/page.tsx',
    '/blog/feed.xml': 'app/blog/feed.xml/route.ts',
    '/sitemap.xml': 'app/sitemap.ts',
    '/llms.txt': 'app/llms.txt/route.ts',
    '/llms-full.txt': 'app/llms-full.txt/route.ts',
  };
  for (const [name, text] of [['llms.txt', realTxt()], ['llms-full.txt', await realFullTxt()]]) {
    for (const url of urlsIn(text).filter((u) => u.startsWith(SITE_URL))) {
      const { pathname, hash } = new URL(url);
      assert.ok(pathname.endsWith('/') || /\.(xml|txt)$/.test(pathname), `${name}: ${url} has no trailing slash`);
      const slug = /^\/blog\/([a-z0-9-]+)\/$/.exec(pathname)?.[1];
      const file = pages[pathname] ?? (slug ? `app/blog/${slug}/page.mdx` : undefined);
      assert.ok(file && existsSync(new URL(`../${file}`, import.meta.url)), `${name}: ${url} is not a page on the site`);
      if (hash) {
        const id = hash.slice(1);
        const found = read(file).includes(`id="${id}"`) || (pathname === '/use-cases/' && useCases.some((u) => u.slug === id));
        assert.ok(found, `${name}: ${url} points at an id ${file} doesn’t have`);
      }
    }
  }
});

test('the page copy in lib/llms.ts still reads as the pages do (update PAGE_COPY when a page’s words change)', () => {
  for (const [name, page] of Object.entries(PAGE_COPY)) {
    const src = read(page.source);
    // The page's words: comments, line breaks and tags dropped. Home defines its steps above the component, so the
    // whole file is read.
    const words = collapse(
      src
        .replace(/\{?\/\*[\s\S]*?\*\/\}?/g, '')
        .replace(/^\s*\/\/.*$/gm, '')
        .replace(/\{' '\}/g, ' ')
        .replace(/<br\b[^>]*\/>/g, ' ')
        .replace(/<\/?[A-Za-z][^>]*>/g, ''),
    );
    for (const [field, value] of Object.entries(page)) {
      if (field === 'source' || field === 'path') continue;
      for (const line of mdText(value).split('\n')) {
        if (line.trim() === '') continue;
        assert.ok(words.includes(collapse(line)), `PAGE_COPY.${name}.${field}: "${collapse(line)}" is not on ${page.source}`);
      }
      for (const [, href] of value.matchAll(/\]\(([^)]+)\)/g)) {
        const linked = href.startsWith('/')
          ? src.includes(`href="${href}"`)
          : src.includes(`'${href}'`) || (href === REPO_URL && src.includes('{REPO_URL}')) || (href === `${REPO_URL}/issues` && src.includes('${REPO_URL}/issues'));
        assert.ok(linked, `PAGE_COPY.${name}.${field} links ${href}, which ${page.source} doesn’t`);
      }
    }
    assert.ok(existsSync(new URL(`../${page.source}`, import.meta.url)));
  }
});

test('FAQ answers in llms-full.txt read the same as their plain-text answers', async () => {
  const full = await realFullTxt();
  for (const f of faq) {
    const answer = f.body === undefined ? f.a : inlineToMarkdown(f.body, SITE_URL);
    assert.equal(collapse(mdText(answer)), f.a, f.q);
    assert.ok(full.includes(`\n#### ${f.q}\n\n${answer}\n`), f.q);
  }
});

test('llms-full.txt follows the copy rules outside the posts, which have their own checks', async () => {
  const full = await realFullTxt();
  const firstPost = full.indexOf(`\n## ${posts[0].title}\n`);
  assert.ok(firstPost !== -1);
  // Use case tips are the page's own words; the fee check still applies to them.
  assertCopyRules(full.slice(0, firstPost), 'llms-full.txt');
});
