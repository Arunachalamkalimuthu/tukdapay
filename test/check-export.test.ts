/*
 * scripts/check-export.mjs against a small hand-made export: a good one passes, and each kind of breakage fails.
 * The fixture is the least that passes every check, so a new check may need it extended.
 */
import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT = fileURLToPath(new URL('../scripts/check-export.mjs', import.meta.url));
const SITE = 'https://tukdapay.com';
const ORG = {
  '@type': 'Organization',
  '@id': `${SITE}/#organization`,
  name: 'TukdaPay',
  url: `${SITE}/`,
  logo: { '@type': 'ImageObject', url: `${SITE}/icons/icon-512.png`, width: 512, height: 512 },
};

/** Just enough of a PNG for the check to read its size: the signature and the IHDR chunk. */
function png(width: number, height: number) {
  const buf = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buf, 0);
  buf.writeUInt32BE(13, 8);
  buf.write('IHDR', 12, 'latin1');
  buf.writeUInt32BE(width, 16);
  buf.writeUInt32BE(height, 20);
  return buf;
}

const CHROME_TOP = `<a class="skip" href="#main">Skip to content</a>
<header><a href="/" aria-label="TukdaPay home">TukdaPay</a>
<nav aria-label="Site"><a href="/use-cases/">Use cases</a><a href="/blog/">Blog</a><a href="https://github.com/Arunachalamkalimuthu/tukdapay">GitHub</a></nav></header>`;
const CHROME_BOTTOM = `<footer><ul><li><a href="/use-cases/">Use cases</a></li><li><a href="/blog/">Blog</a></li>
<li><a href="/about/">About</a></li><li><a href="/blog/feed.xml">RSS</a></li></ul></footer>`;

function page({ dir, name, jsonLd, body }: { dir: string; name: string; jsonLd: object[]; body: string }) {
  const title = `${name} of the export check fixture – TukdaPay`;
  const description = `A ${name.toLowerCase()} in the export that test/check-export.test.ts builds to check a good export passes.`;
  return `<!DOCTYPE html><html lang="en-IN"><head><meta charSet="utf-8"/>
<title>${title}</title>
<meta name="description" content="${description}"/>
<meta name="robots" content="index, follow, max-video-preview:-1, max-image-preview:large, max-snippet:-1"/>
<link rel="canonical" href="${SITE}/${dir}"/>
<link rel="alternate" type="application/rss+xml" href="${SITE}/blog/feed.xml" title="TukdaPay blog"/>
<meta property="og:title" content="${title}"/>
<meta property="og:image" content="${SITE}/og/card.png"/>
<meta name="twitter:title" content="${title}"/>
<meta name="twitter:image" content="${SITE}/og/card.png"/>
<meta name="twitter:image:alt" content="${name}"/>
</head><body>${CHROME_TOP}<main id="main">
${jsonLd.map((doc) => `<script type="application/ld+json">${JSON.stringify(doc)}</script>`).join('')}
<h1>${name}</h1>${body}</main>${CHROME_BOTTOM}
<script>self.__next_f.push([1,"<a href=\\"/not-a-page/\\">in the RSC payload, not the markup</a>"])</script>
</body></html>`;
}

const ld = (node: object) => ({ '@context': 'https://schema.org', ...node });

/** Writes a small export that passes every check, and returns its directory. */
function fixture(t: TestContext) {
  const out = mkdtempSync(join(tmpdir(), 'check-export-'));
  t.after(() => rmSync(out, { recursive: true, force: true }));
  const files: Record<string, string | Buffer> = {
    'index.html': page({
      dir: '',
      name: 'Home page',
      jsonLd: [
        ld({
          '@graph': [
            ORG,
            { '@type': 'WebSite', '@id': `${SITE}/#website`, name: 'TukdaPay', url: `${SITE}/`, publisher: { '@id': ORG['@id'] } },
            { '@type': 'WebApplication', '@id': `${SITE}/#app`, name: 'TukdaPay', url: `${SITE}/` },
            { '@type': 'FAQPage', mainEntity: [{ '@type': 'Question', name: 'Q?', acceptedAnswer: { '@type': 'Answer', text: 'A.' } }] },
          ],
        }),
      ],
      body: `<form><label for="total">Amount</label><input id="total"/></form>
<h2 id="steps-title">How to split a UPI payment</h2><ol><li>Enter the bill</li></ol>
<p><a href="/?amount=4200&amp;note=Rent">Try it</a> <a href="upi://pay?pa=shop@okaxis&amp;am=1999.00">Pay</a>
<a href="mailto:someone@example.com">Mail</a> <a href="#steps-title">Steps</a> <a href="/og.png">Card</a></p>`,
    }),
    'use-cases/index.html': page({
      dir: 'use-cases/',
      name: 'Use cases page',
      jsonLd: [ld({ '@type': 'ItemList', url: `${SITE}/use-cases/`, itemListElement: [{ '@type': 'ListItem', position: 1, url: `${SITE}/use-cases/#merchants` }] })],
      body: `<section id="merchants"><h2>For shops</h2><a href="/blog/a-post/">A post</a></section>`,
    }),
    'about/index.html': page({
      dir: 'about/',
      name: 'About page',
      jsonLd: [ld({ '@type': 'AboutPage', url: `${SITE}/about/`, about: ORG })],
      body: '<p><a href="/blog/">The blog</a></p>',
    }),
    'blog/index.html': page({
      dir: 'blog/',
      name: 'Blog page',
      jsonLd: [ld({ '@type': 'Blog', url: `${SITE}/blog/`, publisher: ORG })],
      body: '<ul><li><a href="/blog/a-post/">A post</a></li></ul>',
    }),
    'blog/a-post/index.html': page({
      dir: 'blog/a-post/',
      name: 'Post page',
      jsonLd: [
        ld({
          '@graph': [
            { '@type': 'BlogPosting', url: `${SITE}/blog/a-post/`, image: `${SITE}/og/card.png`, publisher: ORG },
            {
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Blog', item: `${SITE}/blog/` },
                { '@type': 'ListItem', position: 2, name: 'A post', item: `${SITE}/blog/a-post/` },
              ],
            },
          ],
        }),
      ],
      body: '<p>See <a href="/use-cases/#merchants">what shops can do</a> or <a href="../../about/">about</a>.</p>',
    }),
    '404.html': `<!DOCTYPE html><html><head><meta name="robots" content="noindex"/><title>Page not found</title></head>
<body>${CHROME_TOP}<main id="main"><h1>Page not found</h1><a href="/">Home</a></main>${CHROME_BOTTOM}</body></html>`,
    'sitemap.xml': `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[
      '',
      'use-cases/',
      'about/',
      'blog/',
      'blog/a-post/',
    ]
      .map((dir) => `<url><loc>${SITE}/${dir}</loc></url>`)
      .join('')}</urlset>`,
    'robots.txt': `User-Agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`,
    'blog/feed.xml': `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>TukdaPay blog</title>
<link>${SITE}/blog/</link><item><title>A post</title><link>${SITE}/blog/a-post/</link><guid>${SITE}/blog/a-post/</guid></item>
</channel></rss>`,
    CNAME: 'tukdapay.com',
    'og/card.png': png(1200, 630),
    'og.png': png(1200, 630),
    'icons/icon-512.png': png(512, 512),
  };
  for (const [file, content] of Object.entries(files)) {
    mkdirSync(dirname(join(out, file)), { recursive: true });
    writeFileSync(join(out, file), content);
  }
  return out;
}

function edit(out: string, file: string, change: (text: string) => string) {
  const path = join(out, file);
  const before = readFileSync(path, 'utf8');
  const after = change(before);
  assert.notEqual(after, before, `the edit to ${file} changed nothing`);
  writeFileSync(path, after);
}

function check(out: string) {
  const run = spawnSync(process.execPath, [SCRIPT, out], { encoding: 'utf8' });
  return { status: run.status, output: `${run.stdout}${run.stderr}` };
}

function assertFails(out: string, message: RegExp) {
  const { status, output } = check(out);
  assert.equal(status, 1, `expected the check to fail, got:\n${output}`);
  assert.match(output, message);
}

test('check-export passes the fixture export', (t) => {
  const { status, output } = check(fixture(t));
  assert.equal(status, 0, output);
  assert.match(output, /check-export: ok/);
});

// ---- robots.txt ----

test('check-export fails without robots.txt', (t) => {
  const out = fixture(t);
  rmSync(join(out, 'robots.txt'));
  assertFails(out, /robots\.txt: missing/);
});

test('check-export fails when robots.txt disallows the whole site', (t) => {
  const out = fixture(t);
  edit(out, 'robots.txt', (s) => s.replace('Allow: /', 'Disallow: /'));
  assertFails(out, /robots\.txt: .*Disallow: \/.*User-Agent: \*/);

  const google = fixture(t);
  edit(google, 'robots.txt', (s) => `User-agent: Googlebot\nUser-agent: Bingbot\nDisallow: /\n\n${s}`);
  assertFails(google, /robots\.txt: .*Disallow: \/.*googlebot/i);
});

test('check-export allows robots.txt to disallow part of the site', (t) => {
  const out = fixture(t);
  edit(out, 'robots.txt', (s) => s.replace('Allow: /', 'Allow: /\nDisallow: /private/  # comment'));
  assert.equal(check(out).status, 0, check(out).output);
});

test('check-export fails when robots.txt doesn’t point to the sitemap', (t) => {
  const out = fixture(t);
  edit(out, 'robots.txt', (s) => s.replace(/Sitemap: .*\n/, ''));
  assertFails(out, /robots\.txt: no "Sitemap: https:\/\/tukdapay\.com\/sitemap\.xml"/);
});

// ---- RSS feed ----

test('check-export fails when the feed that pages advertise is missing', (t) => {
  const out = fixture(t);
  rmSync(join(out, 'blog/feed.xml'));
  assertFails(out, /index\.html: RSS alternate: https:\/\/tukdapay\.com\/blog\/feed\.xml is not a file/);
});

test('check-export fails when the feed misses a post or lists a page that isn’t one', (t) => {
  const out = fixture(t);
  edit(out, 'blog/feed.xml', (s) => s.replace(/<item>[\s\S]*<\/item>/, '<item><link>https://tukdapay.com/blog/old-post/</link></item>'));
  assertFails(out, /feed\.xml: no <item> for https:\/\/tukdapay\.com\/blog\/a-post\//);
  assertFails(out, /feed\.xml: <item> links https:\/\/tukdapay\.com\/blog\/old-post\/, which isn't a post/);
});

// ---- Links in page markup ----

test('check-export fails on a link to a page that isn’t in the export', (t) => {
  const out = fixture(t);
  edit(out, 'about/index.html', (s) => s.replace('<a href="/blog/">The blog</a>', '<a href="/blgo/">The blog</a>'));
  assertFails(out, /about\/index\.html: link to \/blgo\/: not a page/);
});

test('check-export fails on a link without its trailing slash or to a missing file', (t) => {
  const out = fixture(t);
  edit(out, 'index.html', (s) => s.replace('<a href="/og.png">', '<a href="/about">'));
  assertFails(out, /index\.html: link to \/about: not a file .*\/about\//);

  const file = fixture(t);
  edit(file, 'index.html', (s) => s.replace('<a href="/og.png">', '<a href="/og-old.png">'));
  assertFails(file, /index\.html: link to \/og-old\.png: not a file/);
});

test('check-export fails on a link to an id that isn’t on the page', (t) => {
  const out = fixture(t);
  edit(out, 'use-cases/index.html', (s) => s.replace('<section id="merchants">', '<section id="shops">'));
  assertFails(out, /blog\/a-post\/index\.html: link to \/use-cases\/#merchants: no id="merchants" on that page/);

  const samePage = fixture(t);
  edit(samePage, 'index.html', (s) => s.replace('href="#steps-title"', 'href="#how-it-works"'));
  assertFails(samePage, /index\.html: link to #how-it-works: no id="how-it-works" on this page/);
});

test('check-export checks the links on the 404 page too', (t) => {
  const out = fixture(t);
  edit(out, '404.html', (s) => s.replace('<a href="/">Home</a>', '<a href="/home/">Home</a>'));
  assertFails(out, /404\.html: link to \/home\/: not a page/);
});

// ---- JSON-LD ----

test('check-export fails on a page with no JSON-LD', (t) => {
  const out = fixture(t);
  edit(out, 'about/index.html', (s) => s.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, ''));
  assertFails(out, /about\/index\.html: no JSON-LD/);
});

test('check-export fails when home loses its WebSite and Organization, even with no "#" ids left', (t) => {
  const out = fixture(t);
  const home = ld({ '@graph': [{ '@type': 'WebApplication', name: 'TukdaPay', url: `${SITE}/` }, { '@type': 'FAQPage', mainEntity: [] }] });
  edit(out, 'index.html', (s) =>
    s.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, `<script type="application/ld+json">${JSON.stringify(home)}</script>`),
  );
  assertFails(out, /index\.html: JSON-LD: expected one WebSite node, found 0/);
  assertFails(out, /index\.html: JSON-LD: no Organization with @id https:\/\/tukdapay\.com\/#organization/);
});

test('check-export fails when a page’s JSON-LD loses the type it describes the page with', (t) => {
  const out = fixture(t);
  edit(out, 'about/index.html', (s) => s.replace('"@type":"AboutPage"', '"@type":"WebPage"'));
  assertFails(out, /about\/index\.html: JSON-LD has no AboutPage node/);

  const post = fixture(t);
  edit(post, 'blog/a-post/index.html', (s) => s.replace('"@type":"BreadcrumbList"', '"@type":"ItemList"'));
  assertFails(post, /blog\/a-post\/index\.html: JSON-LD has no BreadcrumbList node/);
});

// ---- CNAME ----

test('check-export fails when CNAME is missing or names another domain', (t) => {
  const out = fixture(t);
  rmSync(join(out, 'CNAME'));
  assertFails(out, /CNAME: missing/);

  const other = fixture(t);
  writeFileSync(join(other, 'CNAME'), 'www.tukdapay.com\n');
  assertFails(other, /CNAME: is "www\.tukdapay\.com", expected "tukdapay\.com"/);
});
