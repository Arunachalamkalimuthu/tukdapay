#!/usr/bin/env node
/**
 * Checks the static export in out/ before it is deployed (npm run check:export, after npm run build).
 *
 * - Every out/**\/index.html except 404/ and _not-found/ is an indexable page: its canonical is
 *   https://tukdapay.com/<dir>/, its robots meta allows indexing (with large image previews and full snippets),
 *   and the set of canonicals is exactly the set of <loc> in out/sitemap.xml.
 * - The 404 page is noindex and has no canonical.
 * - Each indexable page has one <h1>, a title of 30–65 characters, a description of 50–160 characters,
 *   og:image and twitter:image:alt; every share image on tukdapay.com exists in out/, and share cards
 *   are 1200×630 PNGs of 300KB or less (WhatsApp skips larger previews).
 * - The home page keeps its form and "How it works" in the static HTML.
 *
 * No dependencies. Exits 1 and lists every failure.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const SITE = 'https://tukdapay.com';
const OUT = process.argv[2] ?? 'out';
const TITLE_CHARS = [30, 65];
const DESCRIPTION_CHARS = [50, 160];
const ROBOTS_REQUIRED = ['index', 'follow', 'max-image-preview:large', 'max-snippet:-1', 'max-video-preview:-1'];
const SHARE_CARD = { width: 1200, height: 630, maxBytes: 300 * 1024 };
const NOT_PAGES = new Set(['404', '_not-found']);

const failures = [];
const fail = (where, message) => failures.push(`${where}: ${message}`);

if (!existsSync(join(OUT, 'index.html'))) {
  console.error(`check-export: ${join(OUT, 'index.html')} not found. Run npm run build first.`);
  process.exit(1);
}

/** Every index.html under dir, as paths relative to OUT with "/" separators. */
function findPages(dir) {
  const found = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...findPages(path));
    else if (entry.name === 'index.html') found.push(relative(OUT, path).split(sep).join('/'));
  }
  return found;
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const decode = (s) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') return String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : Number(e.slice(1)));
    return ENTITIES[e.toLowerCase()] ?? m;
  });

/** Attributes of every <tag ...> in html, as objects with lower-case names and decoded values. */
function tags(html, tag) {
  return [...html.matchAll(new RegExp(`<${tag}\\b([^>]*)>`, 'gi'))].map(([, attrs]) => {
    const out = {};
    for (const [, name, dq, sq, bare] of attrs.matchAll(/([^\s=/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
      out[name.toLowerCase()] = decode(dq ?? sq ?? bare ?? '');
    }
    return out;
  });
}

function head(html) {
  const end = html.search(/<\/head>/i);
  return end === -1 ? html : html.slice(0, end);
}

const meta = (h, key, value) => tags(h, 'meta').filter((m) => m[key] === value).map((m) => m.content ?? '');
const canonicals = (h) => tags(h, 'link').filter((l) => (l.rel ?? '').toLowerCase().split(/\s+/).includes('canonical'));
const robotsTokens = (h) =>
  meta(h, 'name', 'robots').flatMap((c) => c.split(',').map((t) => t.trim().toLowerCase().replace(/\s*:\s*/, ':')));
const chars = (s) => Array.from(s).length;

/** Width and height from a PNG's IHDR, or null if the file isn't a PNG. */
function pngSize(buf) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buf.length < 24 || !buf.subarray(0, 8).equals(signature) || buf.toString('latin1', 12, 16) !== 'IHDR') return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

const checkedImages = new Map();
function checkImage(where, property, url) {
  if (!url.startsWith(`${SITE}/`)) return;
  const file = join(OUT, decodeURIComponent(new URL(url).pathname));
  if (!checkedImages.has(file)) {
    const problems = [];
    if (!existsSync(file) || !statSync(file).isFile()) problems.push(`${url} is not in ${OUT}/`);
    else if (/^\/og\/[^/]+\.png$/.test(new URL(url).pathname)) {
      const buf = readFileSync(file);
      const size = pngSize(buf);
      if (!size) problems.push(`${url} is not a PNG`);
      else if (size.width !== SHARE_CARD.width || size.height !== SHARE_CARD.height) {
        problems.push(`${url} is ${size.width}×${size.height}, expected ${SHARE_CARD.width}×${SHARE_CARD.height}`);
      }
      if (buf.length > SHARE_CARD.maxBytes) problems.push(`${url} is ${Math.round(buf.length / 1024)}KB, over 300KB`);
    }
    checkedImages.set(file, problems);
  }
  for (const problem of checkedImages.get(file)) fail(where, `${property}: ${problem}`);
}

// ---- Indexable pages ----
const pages = findPages(OUT).filter((p) => !NOT_PAGES.has(p.split('/')[0]));
const pageUrls = new Set(pages.map((p) => `${SITE}/${p.slice(0, -'index.html'.length)}`));
/** canonical URL -> the pages that declare it */
const pageCanonicals = new Map();

for (const page of pages) {
  const where = `${OUT}/${page}`;
  const html = readFileSync(join(OUT, page), 'utf8');
  const h = head(html);
  const dir = page.slice(0, -'index.html'.length);
  const expected = `${SITE}/${dir}`;

  const links = canonicals(h);
  if (links.length !== 1) fail(where, `expected one canonical link, found ${links.length}`);
  const canonical = links[0]?.href;
  if (canonical !== undefined) {
    pageCanonicals.set(canonical, [...(pageCanonicals.get(canonical) ?? []), where]);
    if (canonical !== expected) fail(where, `canonical is ${canonical}, expected ${expected}`);
  }

  const robots = robotsTokens(h);
  const robotsText = meta(h, 'name', 'robots').join(' | ');
  if (robots.length === 0) fail(where, 'no robots meta: indexable pages inherit it from app/layout.tsx');
  else if (robots.some((t) => t === 'noindex' || t === 'none')) {
    fail(where, `robots is "${robotsText}": every exported page except the 404 must be indexable and in the sitemap`);
  } else {
    const missing = ROBOTS_REQUIRED.filter((token) => !robots.includes(token));
    if (missing.length > 0) fail(where, `robots meta "${robotsText}" is missing ${missing.join(', ')}`);
  }

  const titles = [...h.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title>/gi)].map((m) => decode(m[1]).trim());
  if (titles.length !== 1) fail(where, `expected one <title>, found ${titles.length}`);
  else if (chars(titles[0]) < TITLE_CHARS[0] || chars(titles[0]) > TITLE_CHARS[1]) {
    fail(where, `title is ${chars(titles[0])} characters, expected ${TITLE_CHARS.join('–')}: "${titles[0]}"`);
  }

  const descriptions = meta(h, 'name', 'description');
  if (descriptions.length !== 1) fail(where, `expected one meta description, found ${descriptions.length}`);
  else if (chars(descriptions[0]) < DESCRIPTION_CHARS[0] || chars(descriptions[0]) > DESCRIPTION_CHARS[1]) {
    fail(where, `description is ${chars(descriptions[0])} characters, expected ${DESCRIPTION_CHARS.join('–')}: "${descriptions[0]}"`);
  }

  const h1s = (html.match(/<h1[\s>]/gi) ?? []).length;
  if (h1s !== 1) fail(where, `expected one <h1>, found ${h1s}`);

  const ogImages = meta(h, 'property', 'og:image');
  if (ogImages.length === 0) fail(where, 'no og:image');
  for (const url of ogImages) checkImage(where, 'og:image', url);
  const twitterImages = meta(h, 'name', 'twitter:image');
  for (const url of twitterImages) checkImage(where, 'twitter:image', url);
  if (meta(h, 'name', 'twitter:image:alt').filter((alt) => alt.trim()).length === 0) fail(where, 'no twitter:image:alt');
}

// ---- Sitemap ----
const sitemapFile = join(OUT, 'sitemap.xml');
if (!existsSync(sitemapFile)) fail(sitemapFile, 'missing');
else {
  const locs = [...readFileSync(sitemapFile, 'utf8').matchAll(/<loc>\s*([^<]*?)\s*<\/loc>/g)].map((m) => decode(m[1]));
  const inSitemap = new Set(locs);
  if (inSitemap.size !== locs.length) fail(sitemapFile, 'lists a URL more than once');
  // Pages by where they are in out/, and by the canonical they declare: both must match the sitemap exactly.
  for (const url of new Set([...pageUrls, ...pageCanonicals.keys()])) {
    if (!inSitemap.has(url)) {
      fail(sitemapFile, `missing ${url}, an indexable page in ${OUT}/ (add it to app/sitemap.ts, or don't export the page)`);
    }
  }
  for (const url of inSitemap) {
    if (!pageUrls.has(url)) fail(sitemapFile, `lists ${url}, but ${OUT}/ has no page there`);
    else if (!pageCanonicals.has(url)) fail(sitemapFile, `lists ${url}, but no page in ${OUT}/ has that canonical`);
  }
  for (const [url, where] of pageCanonicals) {
    if (where.length > 1) fail(sitemapFile, `${where.length} pages declare the canonical ${url}: ${where.join(', ')}`);
  }
}

// ---- 404 ----
for (const file of ['404.html', '404/index.html', '_not-found/index.html']) {
  const path = join(OUT, file);
  if (!existsSync(path)) {
    if (file === '404.html') fail(path, 'missing');
    continue;
  }
  const h = head(readFileSync(path, 'utf8'));
  if (!robotsTokens(h).includes('noindex')) {
    const robots = meta(h, 'name', 'robots');
    fail(path, `must be noindex, ${robots.length ? `robots is "${robots.join(' | ')}"` : 'has no robots meta'}`);
  }
  if (canonicals(h).length > 0) fail(path, `must not have a canonical, has ${canonicals(h).map((l) => l.href).join(', ')}`);
}

// ---- Home page content in the static HTML ----
{
  const where = `${OUT}/index.html`;
  const html = readFileSync(join(OUT, 'index.html'), 'utf8');
  const steps = (html.match(/id="steps-title"/g) ?? []).length;
  if (steps !== 1) fail(where, `expected exactly one id="steps-title" ("How it works"), found ${steps}`);
  if (!html.includes('Enter the bill')) fail(where, '"Enter the bill" (How it works, step 1) is not in the static HTML');
  if (!html.includes('id="total"')) fail(where, 'the amount input (id="total") is not in the static HTML');
  if (html.includes('BAILOUT_TO_CLIENT_SIDE_RENDERING')) {
    fail(where, 'contains BAILOUT_TO_CLIENT_SIDE_RENDERING: part of the page only renders in the browser');
  }
}

if (failures.length > 0) {
  console.error(`\ncheck-export: ${failures.length} problem${failures.length === 1 ? '' : 's'} in ${OUT}/\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  console.error('');
  process.exit(1);
}
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
console.log(
  `check-export: ok — ${plural(pages.length, 'indexable page')} match the sitemap, ${plural(checkedImages.size, 'share image')} present, 404 is noindex, home content is static.`,
);
