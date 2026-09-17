#!/usr/bin/env node
/**
 * Checks the static export in out/ before it is deployed (npm run check:export, after npm run build).
 *
 * - Every out/**\/index.html except 404/ and _not-found/ is an indexable page: its canonical is
 *   https://tukdapay.com/<dir>/, no robots, googlebot or bingbot meta says noindex, the robots meta allows
 *   large image previews and full snippets, and the pages in out/ are exactly the <loc>s in out/sitemap.xml.
 * - The 404 page is noindex and has no canonical.
 * - Each indexable page has one <h1>, a title of 30–65 characters, a description of 70–160 characters, an
 *   og:title that says more than "Blog" or "Use cases" (and the same twitter:title), og:image and
 *   twitter:image:alt. Share images on tukdapay.com exist in out/, and share cards are 1200×630 PNGs of
 *   300KB or less (WhatsApp skips larger previews).
 * - JSON-LD parses; every tukdapay.com URL in it exists in out/ (pages, #fragments, logo and images); a node
 *   isn't defined twice with different values; "#" ids it refers to are defined on the same page. Once home
 *   uses the site's "#" ids (the lib/schema.ts graph), it must carry one WebSite and the Organization.
 * - The home page keeps its form and "How it works" in the rendered HTML, not only in the RSC payload.
 *
 * No dependencies. Exits 1 and lists every failure.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const SITE = 'https://tukdapay.com';
const OUT = process.argv[2] ?? 'out';
const TITLE_CHARS = [30, 65];
const DESCRIPTION_CHARS = [70, 160];
const ROBOTS_REQUIRED = ['index', 'follow', 'max-image-preview:large', 'max-snippet:-1', 'max-video-preview:-1'];
/** Crawler-specific robots metas Next can write (robots.googleBot) or a page could add. Any noindex drops the page. */
const ROBOTS_NAMES = ['robots', 'googlebot', 'bingbot'];
/** og:title values that only name a section or the site: a share preview with these says nothing. */
const BARE_OG_TITLES = ['Blog', 'Use cases', 'About', 'TukdaPay'];
const SHARE_CARD = { width: 1200, height: 630, maxBytes: 300 * 1024 };
/** Google's minimum for an Organization logo. */
const LOGO_MIN_PX = 112;
const NOT_PAGES = new Set(['404', '_not-found']);
const SITE_NAME = 'TukdaPay';
const ORG_ID = `${SITE}/#organization`;

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

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const decode = (s) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') return String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : Number(e.slice(1)));
    return ENTITIES[e.toLowerCase()] ?? m;
  });

/** An attribute string (` name="x" async`) as an object with lower-case names and decoded values. */
function parseAttrs(attrs) {
  const out = {};
  for (const [, name, dq, sq, bare] of attrs.matchAll(/([^\s=/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
    out[name.toLowerCase()] = decode(dq ?? sq ?? bare ?? '');
  }
  return out;
}

/** Attributes of every <tag ...> in html. */
const tags = (html, tag) => [...html.matchAll(new RegExp(`<${tag}\\b([^>]*)>`, 'gi'))].map(([, attrs]) => parseAttrs(attrs));

/**
 * Every <script> element in document order, with its attributes and raw text. Matching element by element
 * means text inside one script (such as the RSC payload) is never read as the start of another.
 */
const scripts = (html) =>
  [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)].map(([, attrs, text]) => ({ ...parseAttrs(attrs), text }));

/** The page without its scripts: what a crawler reads as content before any JavaScript runs. */
const withoutScripts = (html) => html.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '');

function head(html) {
  const end = html.search(/<\/head>/i);
  return end === -1 ? html : html.slice(0, end);
}

/** content of every <meta> whose attribute `key` equals `value` (case-insensitively). */
const meta = (h, key, value) =>
  tags(h, 'meta')
    .filter((m) => (m[key] ?? '').toLowerCase() === value.toLowerCase())
    .map((m) => m.content ?? '');
const canonicals = (h) => tags(h, 'link').filter((l) => (l.rel ?? '').toLowerCase().split(/\s+/).includes('canonical'));
/** Lower-case rules from every <meta name=`name`>, e.g. ["index", "max-snippet:-1"]. */
const robotsTokens = (h, name = 'robots') =>
  meta(h, 'name', name).flatMap((c) => c.split(',').map((t) => t.trim().toLowerCase().replace(/\s*:\s*/, ':')));
const blocksIndexing = (tokens) => tokens.some((t) => t === 'noindex' || t === 'none');
const chars = (s) => Array.from(s).length;

/** Width and height from a PNG's IHDR, or null if the file isn't a PNG. */
function pngSize(buf) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buf.length < 24 || !buf.subarray(0, 8).equals(signature) || buf.toString('latin1', 12, 16) !== 'IHDR') return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

/** Problems with a file on tukdapay.com (a share image, logo, feed…), cached per file. Other hosts are skipped. */
const checkedFiles = new Map();
function checkFile(where, property, url, { minPx } = {}) {
  if (!url.startsWith(`${SITE}/`)) return;
  const { pathname } = new URL(url);
  const file = join(OUT, decodeURIComponent(pathname));
  const key = `${file}|${minPx ?? ''}`;
  if (!checkedFiles.has(key)) {
    const problems = [];
    if (pathname.endsWith('/') || !existsSync(file) || !statSync(file).isFile()) problems.push(`${url} is not a file in ${OUT}/`);
    else if (/^\/og\/[^/]+\.png$/.test(pathname)) {
      const buf = readFileSync(file);
      const size = pngSize(buf);
      if (!size) problems.push(`${url} is not a PNG`);
      else if (size.width !== SHARE_CARD.width || size.height !== SHARE_CARD.height) {
        problems.push(`${url} is ${size.width}×${size.height}, expected ${SHARE_CARD.width}×${SHARE_CARD.height}`);
      }
      if (buf.length > SHARE_CARD.maxBytes) problems.push(`${url} is ${Math.round(buf.length / 1024)}KB, over 300KB`);
    } else if (minPx && pathname.endsWith('.png')) {
      const size = pngSize(readFileSync(file));
      if (!size) problems.push(`${url} is not a PNG`);
      else if (size.width < minPx || size.height < minPx) {
        problems.push(`${url} is ${size.width}×${size.height}, expected at least ${minPx}×${minPx}`);
      }
    }
    checkedFiles.set(key, problems);
  }
  for (const problem of checkedFiles.get(key)) fail(where, `${property}: ${problem}`);
}

// ---- Indexable pages ----
const pages = findPages(OUT).filter((p) => !NOT_PAGES.has(p.split('/')[0]));
const pageUrls = new Set(pages.map((p) => `${SITE}/${p.slice(0, -'index.html'.length)}`));
/** canonical URL -> the pages that declare it */
const pageCanonicals = new Map();
/** page URL -> its HTML without scripts, for #fragment checks */
const markupByUrl = new Map();
/** page file -> JSON-LD documents that parsed */
const jsonLdByPage = new Map();

for (const page of pages) {
  const where = `${OUT}/${page}`;
  const html = readFileSync(join(OUT, page), 'utf8');
  const h = head(html);
  const markup = withoutScripts(html);
  const dir = page.slice(0, -'index.html'.length);
  const expected = `${SITE}/${dir}`;
  markupByUrl.set(expected, markup);

  const links = canonicals(h);
  if (links.length !== 1) fail(where, `expected one canonical link, found ${links.length}`);
  const canonical = links[0]?.href;
  if (canonical !== undefined) {
    pageCanonicals.set(canonical, [...(pageCanonicals.get(canonical) ?? []), where]);
    if (canonical !== expected) fail(where, `canonical is ${canonical}, expected ${expected}`);
  }

  const noindex = ROBOTS_NAMES.filter((name) => blocksIndexing(robotsTokens(h, name)));
  for (const name of noindex) {
    fail(
      where,
      `${name} meta is "${meta(h, 'name', name).join(' | ')}": every exported page except the 404 must be indexable and in the sitemap`,
    );
  }
  const robots = robotsTokens(h);
  if (robots.length === 0) fail(where, 'no robots meta: indexable pages inherit it from app/layout.tsx');
  else if (noindex.length === 0) {
    const missing = ROBOTS_REQUIRED.filter((token) => !robots.includes(token));
    if (missing.length > 0) fail(where, `robots meta "${meta(h, 'name', 'robots').join(' | ')}" is missing ${missing.join(', ')}`);
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

  const ogTitles = meta(h, 'property', 'og:title');
  if (ogTitles.length !== 1) fail(where, `expected one og:title, found ${ogTitles.length}`);
  else {
    const ogTitle = ogTitles[0].trim();
    if (!ogTitle || BARE_OG_TITLES.some((bare) => bare.toLowerCase() === ogTitle.toLowerCase())) {
      fail(where, `og:title is "${ogTitles[0]}": a share preview needs the page's descriptive title`);
    }
    const twitterTitles = meta(h, 'name', 'twitter:title');
    if (twitterTitles.length !== 1 || twitterTitles[0] !== ogTitles[0]) {
      fail(where, `twitter:title should be the og:title "${ogTitles[0]}", found ${twitterTitles.length ? `"${twitterTitles.join('" | "')}"` : 'none'}`);
    }
  }

  const h1s = (markup.match(/<h1[\s>]/gi) ?? []).length;
  if (h1s !== 1) fail(where, `expected one <h1>, found ${h1s}`);

  const ogImages = meta(h, 'property', 'og:image');
  if (ogImages.length === 0) fail(where, 'no og:image');
  for (const url of ogImages) checkFile(where, 'og:image', url);
  for (const url of meta(h, 'name', 'twitter:image')) checkFile(where, 'twitter:image', url);
  if (meta(h, 'name', 'twitter:image:alt').filter((alt) => alt.trim()).length === 0) fail(where, 'no twitter:image:alt');

  const documents = [];
  const blocks = scripts(html).filter((script) => (script.type ?? '').trim().toLowerCase() === 'application/ld+json');
  for (const [i, block] of blocks.entries()) {
    try {
      documents.push(JSON.parse(block.text));
    } catch (error) {
      fail(where, `JSON-LD block ${i + 1} of ${blocks.length} doesn't parse: ${error.message}`);
    }
  }
  jsonLdByPage.set(where, documents);
}

// ---- Sitemap ----
const sitemapFile = join(OUT, 'sitemap.xml');
if (!existsSync(sitemapFile)) fail(sitemapFile, 'missing');
else {
  const locs = [...readFileSync(sitemapFile, 'utf8').matchAll(/<loc>\s*([^<]*?)\s*<\/loc>/g)].map((m) => decode(m[1]));
  const inSitemap = new Set(locs);
  if (inSitemap.size !== locs.length) fail(sitemapFile, 'lists a URL more than once');
  for (const url of pageUrls) {
    if (!inSitemap.has(url)) {
      fail(sitemapFile, `missing ${url}, an indexable page in ${OUT}/ (add it to app/sitemap.ts, or don't export the page)`);
    }
  }
  // A canonical that isn't a page URL is already reported by the page's own canonical check.
  for (const url of inSitemap) {
    if (!pageUrls.has(url)) fail(sitemapFile, `lists ${url}, but ${OUT}/ has no page there`);
    else if (!pageCanonicals.has(url)) fail(sitemapFile, `lists ${url}, but no page in ${OUT}/ has that canonical`);
  }
  for (const [url, where] of pageCanonicals) {
    if (where.length > 1) fail(sitemapFile, `${where.length} pages declare the canonical ${url}: ${where.join(', ')}`);
  }
}

// ---- JSON-LD ----
const IMAGE_KEYS = new Set(['image', 'logo', 'thumbnailUrl', 'screenshot', 'contentUrl']);
const typesOf = (node) => [].concat(node['@type'] ?? []);
/** Stable JSON for comparing two definitions of the same value. */
const stable = (value) =>
  JSON.stringify(value, (_key, v) =>
    v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b))) : v,
  );

/** Nodes (objects with @type or more than an @id), "@id"-only references and site URLs in one page's JSON-LD. */
function readJsonLd(documents) {
  const nodes = [];
  const refs = [];
  const urls = [];
  const walk = (value, path, inImage) => {
    if (Array.isArray(value)) return value.forEach((v, i) => walk(v, `${path}[${i}]`, inImage));
    if (value && typeof value === 'object') {
      const keys = Object.keys(value);
      if (keys.length === 1 && keys[0] === '@id') refs.push(value['@id']);
      else if (keys.some((k) => k !== '@context')) nodes.push(value);
      for (const k of keys) {
        if (k === '@id' || k === '@context' || k === '@type') continue;
        walk(value[k], path ? `${path}.${k}` : k, inImage || IMAGE_KEYS.has(k));
      }
      return;
    }
    if (typeof value === 'string' && value.startsWith(`${SITE}/`) && !value.includes('{')) {
      urls.push({ url: value, path, isImage: inImage, isLogo: /(^|\.)logo(\.|\[|$)/.test(path) });
    }
  };
  for (const doc of documents) walk(doc, '', false);
  return { nodes, refs, urls };
}

const HOME_FILE = `${OUT}/index.html`;
/** Whether home's JSON-LD is the site graph from lib/schema.ts (it uses the "#" ids) or has a WebSite node. */
let homeUsesSiteGraph = false;
const readByPage = new Map();
for (const [where, documents] of jsonLdByPage) {
  const read = readJsonLd(documents);
  readByPage.set(where, read);
  if (where === HOME_FILE) {
    const ids = [...read.nodes.map((n) => n['@id']), ...read.refs].filter((id) => typeof id === 'string');
    homeUsesSiteGraph = ids.some((id) => id.startsWith(`${SITE}/#`)) || read.nodes.some((n) => typesOf(n).includes('WebSite'));
  }

  // The same @id defined twice is one node to a parser; two different values for a property is a bug.
  const byId = new Map();
  for (const node of read.nodes) {
    const id = node['@id'];
    if (typeof id !== 'string') continue;
    const seen = byId.get(id) ?? new Map();
    for (const [k, v] of Object.entries(node)) {
      if (k === '@id' || k === '@context') continue;
      if (seen.has(k) && seen.get(k) !== stable(v)) fail(where, `JSON-LD defines ${id} twice with different "${k}"`);
      seen.set(k, stable(v));
    }
    byId.set(id, seen);
  }
  // Crawlers read each page on its own, so a "#" id it points at must be defined on that page.
  for (const id of new Set(read.refs)) {
    if (typeof id === 'string' && id.includes('#') && !byId.has(id)) fail(where, `JSON-LD refers to ${id}, which this page doesn't define`);
  }

  for (const { url, path, isImage, isLogo } of read.urls) {
    const property = `JSON-LD ${path}`;
    const { pathname, hash } = new URL(url);
    if (isImage || !pathname.endsWith('/')) {
      checkFile(where, property, url, isLogo ? { minPx: LOGO_MIN_PX } : {});
      continue;
    }
    const pageUrl = `${SITE}${pathname}`;
    if (!pageUrls.has(pageUrl)) fail(where, `${property}: ${url} is not an indexable page in ${OUT}/`);
    else if (hash && !new RegExp(`\\sid="${hash.slice(1).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`).test(markupByUrl.get(pageUrl))) {
      fail(where, `${property}: ${url} points at an id that isn't on that page`);
    }
  }
}

// Google reads the site name from a WebSite node on the home page. Checked once home carries the site graph
// (SEO-06); until then home has only its WebApplication and FAQPage blocks.
if (homeUsesSiteGraph) {
  const where = HOME_FILE;
  const home = readByPage.get(where);
  const websites = home.nodes.filter((n) => typesOf(n).includes('WebSite'));
  if (websites.length !== 1) fail(where, `JSON-LD: expected one WebSite node, found ${websites.length}`);
  else if (websites[0].url !== `${SITE}/` || websites[0].name !== SITE_NAME) {
    fail(where, `JSON-LD: WebSite should have url "${SITE}/" and name "${SITE_NAME}", has "${websites[0].url}" and "${websites[0].name}"`);
  }
  if (!home.nodes.some((n) => n['@id'] === ORG_ID && typesOf(n).includes('Organization'))) {
    fail(where, `JSON-LD: no Organization with @id ${ORG_ID}`);
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
  // The generic robots meta is the one every crawler reads; googlebot or bingbot can't loosen it.
  if (!blocksIndexing(robotsTokens(h))) {
    const robots = meta(h, 'name', 'robots');
    fail(path, `must be noindex, ${robots.length ? `robots is "${robots.join(' | ')}"` : 'has no robots meta'}`);
  }
  if (canonicals(h).length > 0) fail(path, `must not have a canonical, has ${canonicals(h).map((l) => l.href).join(', ')}`);
}

// ---- Home page content in the rendered HTML ----
{
  const where = `${OUT}/index.html`;
  const html = readFileSync(join(OUT, 'index.html'), 'utf8');
  // The RSC payload in <script> repeats the page's text, so the content checks read the markup only.
  const markup = withoutScripts(html);
  const steps = (markup.match(/\sid="steps-title"/g) ?? []).length;
  if (steps !== 1) fail(where, `expected exactly one id="steps-title" ("How it works"), found ${steps}`);
  if (!markup.includes('Enter the bill')) fail(where, '"Enter the bill" (How it works, step 1) is not in the rendered HTML');
  if (!/\sid="total"/.test(markup)) fail(where, 'the amount input (id="total") is not in the rendered HTML');
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
const linkedFiles = new Set([...checkedFiles.keys()].map((k) => k.split('|')[0])).size;
const jsonLdCount = [...jsonLdByPage.values()].reduce((n, docs) => n + docs.length, 0);
console.log(
  `check-export: ok — ${plural(pages.length, 'indexable page')} match the sitemap, ${plural(linkedFiles, 'linked file')} present, ${plural(jsonLdCount, 'JSON-LD block')} parse, 404 is noindex, home content is static.`,
);
