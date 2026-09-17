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
 * - Every indexable page has JSON-LD, and it parses; every tukdapay.com URL in it exists in out/ (pages,
 *   #fragments, logo and images); a node isn't defined twice with different values; "#" ids it refers to are
 *   defined on the same page. Home carries one WebSite and the Organization (the lib/schema.ts graph) plus
 *   WebApplication and FAQPage; /blog/ has Blog, each post BlogPosting and BreadcrumbList, /use-cases/ ItemList
 *   and /about/ AboutPage.
 * - Links in page markup (<a href>) on the indexable pages and 404.html that stay on tukdapay.com go to a page
 *   or file in out/, and a #fragment goes to an id on that page.
 * - Each page's RSS alternate link goes to a file in out/, and out/blog/feed.xml has exactly one <item> per post.
 * - out/llms.txt and out/llms-full.txt exist, aren't empty and start with the "# TukdaPay" H1, and every
 *   https://tukdapay.com link in them goes to a page, file or #fragment in out/, as links in page markup do.
 * - out/robots.txt exists, doesn't disallow the whole site for all crawlers (*), Googlebot or Bingbot, and
 *   points to the sitemap. out/CNAME names tukdapay.com.
 * - The home page keeps its form and the steps ("How to split a UPI payment") in the rendered HTML, not only
 *   in the RSC payload.
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
/**
 * JSON-LD types each page describes itself with, by its directory in out/. Home's WebSite and Organization are
 * checked on their own below.
 */
const REQUIRED_TYPES = [
  [/^$/, ['WebApplication', 'FAQPage']],
  [/^blog\/$/, ['Blog']],
  [/^blog\/[^/]+\/$/, ['BlogPosting', 'BreadcrumbList']],
  [/^use-cases\/$/, ['ItemList']],
  [/^about\/$/, ['AboutPage']],
];
/** User-agent groups in robots.txt that must never disallow the whole site. */
const SEARCH_AGENTS = ['*', 'googlebot', 'bingbot'];

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
const linksWithRel = (h, rel) => tags(h, 'link').filter((l) => (l.rel ?? '').toLowerCase().split(/\s+/).includes(rel));
const canonicals = (h) => linksWithRel(h, 'canonical');
/** Lower-case rules from every <meta name=`name`>, e.g. ["index", "max-snippet:-1"]. */
const robotsTokens = (h, name = 'robots') =>
  meta(h, 'name', name).flatMap((c) => c.split(',').map((t) => t.trim().toLowerCase().replace(/\s*:\s*/, ':')));
const blocksIndexing = (tokens) => tokens.some((t) => t === 'noindex' || t === 'none');
const chars = (s) => Array.from(s).length;
const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Whether markup (HTML without scripts) has an element with this id. */
const hasId = (markup, id) => new RegExp(`\\sid="${escapeRegExp(id)}"`).test(markup);

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
/** page file -> its directory in out/ ("" for home, "blog/" for /blog/) */
const dirByPage = new Map();
/** Pages whose <a href>s are checked once every page has been read: file, URL and markup. */
const linkSources = [];

for (const page of pages) {
  const where = `${OUT}/${page}`;
  const html = readFileSync(join(OUT, page), 'utf8');
  const h = head(html);
  const markup = withoutScripts(html);
  const dir = page.slice(0, -'index.html'.length);
  const expected = `${SITE}/${dir}`;
  markupByUrl.set(expected, markup);
  dirByPage.set(where, dir);
  linkSources.push({ where, url: expected, markup });

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
  for (const feed of linksWithRel(h, 'alternate').filter((l) => (l.type ?? '').toLowerCase() === 'application/rss+xml')) {
    checkFile(where, 'RSS alternate', new URL(feed.href ?? '', `${SITE}/`).href);
  }

  const documents = [];
  const blocks = scripts(html).filter((script) => (script.type ?? '').trim().toLowerCase() === 'application/ld+json');
  if (blocks.length === 0) fail(where, 'no JSON-LD: every indexable page renders <JsonLd> (built with lib/schema.ts)');
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
const readByPage = new Map();
for (const [where, documents] of jsonLdByPage) {
  const read = readJsonLd(documents);
  readByPage.set(where, read);

  const types = new Set(read.nodes.flatMap(typesOf));
  const dir = dirByPage.get(where);
  for (const [pattern, required] of REQUIRED_TYPES) {
    if (!pattern.test(dir)) continue;
    for (const type of required) if (!types.has(type)) fail(where, `JSON-LD has no ${type} node (expected ${required.join(' and ')})`);
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
    else if (hash && !hasId(markupByUrl.get(pageUrl), hash.slice(1))) {
      fail(where, `${property}: ${url} points at an id that isn't on that page`);
    }
  }
}

// Google reads the site name from a WebSite node on the home page (SEO-06).
{
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
  // GitHub Pages serves 404.html at any missing URL, so its links are root-relative; check them from the root.
  if (file === '404.html') linkSources.push({ where: path, url: `${SITE}/`, markup: withoutScripts(readFileSync(path, 'utf8')) });
}

// ---- Links in page markup ----
/**
 * Checks one link found in `where`, resolved against `pageUrl`: a tukdapay.com link must go to a page in out/ (and a
 * #fragment to an id on it; `markup` is the linking page's own, for "#id" links) or to a file in out/. Returns
 * whether it was a tukdapay.com link. Other sites, upi:, mailto: and tel: links aren't checked.
 */
function checkLink(where, href, pageUrl, markup = '') {
  let target;
  let pathname;
  let id;
  try {
    target = new URL(href, pageUrl);
    pathname = decodeURIComponent(target.pathname);
    id = decodeURIComponent(target.hash.slice(1));
  } catch {
    fail(where, `link to ${href}: not a valid URL`);
    return false;
  }
  if (target.origin !== SITE) return false;
  if (href.startsWith('#')) {
    if (id && !hasId(markup, id)) fail(where, `link to ${href}: no id="${id}" on this page`);
    return true;
  }
  if (pathname.endsWith('/')) {
    const linked = `${SITE}${pathname}`;
    if (!pageUrls.has(linked)) fail(where, `link to ${href}: not a page in ${OUT}/`);
    else if (id && !hasId(markupByUrl.get(linked), id)) fail(where, `link to ${href}: no id="${id}" on that page`);
    return true;
  }
  const file = join(OUT, pathname);
  if (!existsSync(file) || !statSync(file).isFile()) {
    const page = `${SITE}${pathname}/`;
    fail(where, `link to ${href}: not a file in ${OUT}/${pageUrls.has(page) ? `; link the page as ${pathname}/` : ''}`);
  }
  return true;
}

let linkCount = 0;
for (const { where, url: pageUrl, markup } of linkSources) {
  for (const href of new Set(tags(markup, 'a').map((a) => a.href).filter((href) => href !== undefined))) {
    if (checkLink(where, href, pageUrl, markup)) linkCount++;
  }
}

// ---- llms.txt and llms-full.txt ----
/** tukdapay.com URLs in plain text or Markdown, without the punctuation that ends a sentence or a link. */
const siteUrlsIn = (text) =>
  [...text.matchAll(/https:\/\/tukdapay\.com(?![\w.-])[^\s)<>"'`\]]*/g)].map(([url]) => url.replace(/[.,:;!?*_]+$/, ''));

let llmsLinkCount = 0;
for (const name of ['llms.txt', 'llms-full.txt']) {
  const file = join(OUT, name);
  if (!existsSync(file) || !statSync(file).isFile()) {
    fail(file, `missing: app/${name}/route.ts writes it`);
    continue;
  }
  const text = readFileSync(file, 'utf8');
  if (text.trim() === '') {
    fail(file, 'is empty');
    continue;
  }
  if (!text.startsWith(`# ${SITE_NAME}\n`)) fail(file, `doesn't start with "# ${SITE_NAME}", the H1 llmstxt.org asks for`);
  for (const url of new Set(siteUrlsIn(text))) {
    if (checkLink(file, url, `${SITE}/${name}`)) llmsLinkCount++;
  }
}

// ---- RSS feed ----
const feedFile = join(OUT, 'blog', 'feed.xml');
if (existsSync(feedFile)) {
  const items = [...readFileSync(feedFile, 'utf8').matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)];
  const itemLinks = items.map(([, item]) => decode(item.match(/<link>\s*([^<]*?)\s*<\/link>/i)?.[1] ?? ''));
  const postUrls = [...pageUrls].filter((url) => /^\/blog\/[^/]+\/$/.test(new URL(url).pathname));
  for (const url of postUrls) if (!itemLinks.includes(url)) fail(feedFile, `no <item> for ${url}, a post in ${OUT}/`);
  for (const url of itemLinks) {
    if (!postUrls.includes(url)) fail(feedFile, `<item> links ${url || 'nothing'}, which isn't a post in ${OUT}/`);
  }
  for (const url of new Set(itemLinks)) {
    const n = itemLinks.filter((link) => link === url).length;
    if (n > 1) fail(feedFile, `${n} <item>s link ${url || 'nothing'}`);
  }
}

// ---- robots.txt ----
const robotsFile = join(OUT, 'robots.txt');
if (!existsSync(robotsFile)) fail(robotsFile, 'missing: app/robots.ts writes it');
else {
  /** Runs of consecutive User-Agent lines, each with whether a rule after it disallows the whole site. */
  const groups = [];
  const sitemaps = [];
  let group;
  let readingAgents = false;
  for (const raw of readFileSync(robotsFile, 'utf8').split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim().match(/^([a-z-]+)\s*:\s*(.*)$/i);
    if (!line) continue;
    const name = line[1].toLowerCase();
    const value = line[2].trim();
    if (name === 'user-agent') {
      if (!readingAgents) groups.push((group = { agents: [], disallowsAll: false }));
      group.agents.push(value.toLowerCase());
      readingAgents = true;
      continue;
    }
    readingAgents = false;
    if (name === 'sitemap') sitemaps.push(value);
    else if (name === 'disallow' && group && (value === '/' || value === '/*')) group.disallowsAll = true;
  }
  for (const { agents, disallowsAll } of groups) {
    const blocked = agents.filter((agent) => SEARCH_AGENTS.includes(agent));
    if (disallowsAll && blocked.length > 0) {
      fail(robotsFile, `"Disallow: /" for User-Agent: ${blocked.join(', ')} keeps the whole site out of search`);
    }
  }
  if (!sitemaps.includes(`${SITE}/sitemap.xml`)) fail(robotsFile, `no "Sitemap: ${SITE}/sitemap.xml" line`);
}

// ---- CNAME ----
// Both workflows run this check, so a pull request that drops public/CNAME fails too, not only the deploy from main.
const cnameFile = join(OUT, 'CNAME');
const domain = new URL(SITE).host;
if (!existsSync(cnameFile)) fail(cnameFile, `missing: the build copies public/CNAME (${domain}) into ${OUT}/`);
else {
  const name = readFileSync(cnameFile, 'utf8').trim();
  if (name !== domain) fail(cnameFile, `is "${name}", expected "${domain}"`);
}

// ---- Home page content in the rendered HTML ----
{
  const where = `${OUT}/index.html`;
  const html = readFileSync(join(OUT, 'index.html'), 'utf8');
  // The RSC payload in <script> repeats the page's text, so the content checks read the markup only.
  const markup = withoutScripts(html);
  const steps = (markup.match(/\sid="steps-title"/g) ?? []).length;
  if (steps !== 1) fail(where, `expected exactly one id="steps-title" (the steps, "How to split a UPI payment"), found ${steps}`);
  if (!markup.includes('Enter the bill')) fail(where, '"Enter the bill" (step 1 of the steps) is not in the rendered HTML');
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
  `check-export: ok — ${plural(pages.length, 'indexable page')} match the sitemap, ${plural(linkCount, 'link')} resolve, ${plural(linkedFiles, 'linked file')} present, ${plural(jsonLdCount, 'JSON-LD block')} parse, robots.txt and the feed are in place, llms.txt and llms-full.txt are in place with ${plural(llmsLinkCount, 'site link')} resolving, 404 is noindex, home content is static.`,
);
