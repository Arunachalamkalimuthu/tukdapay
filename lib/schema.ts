/**
 * schema.org JSON-LD builders. Render with <JsonLd data={graph(...)} /> (components/JsonLd.tsx).
 *
 * Home emits one graph: organization(), website(), webApplication({...}) and faqPage(faq). Google reads the
 * site name from the WebSite node, which must be on the home page. Posts use blogPosting() and breadcrumbList().
 */
import { ogImagePath, OG_SIZE } from './og.ts';
import { toRfc822 } from './rss.ts';
import { REPO_URL, SITE_NAME, SITE_URL } from './site.ts';

const HOME = `${SITE_URL}/`;
const LANGUAGE = 'en-IN';

export const ORG_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;
export const APP_ID = `${SITE_URL}/#app`;

export const LOGO = {
  '@type': 'ImageObject',
  url: `${SITE_URL}/icons/icon-512.png`,
  width: 512,
  height: 512,
} as const;

export interface PersonNode {
  '@type': 'Person';
  name: string;
  url: string;
}

/**
 * Author of the posts. SEO-08: the post footer must name this person (or switch author to the Organization) so the
 * markup matches what readers see.
 */
export const AUTHOR: PersonNode = {
  '@type': 'Person',
  name: 'Arunachalam Kalimuthu',
  url: 'https://github.com/Arunachalamkalimuthu',
};

/** The organization as a publisher: referenced by @id, with name, URL and logo inline for Article parsers. */
export const PUBLISHER = { '@type': 'Organization', '@id': ORG_ID, name: SITE_NAME, url: HOME, logo: LOGO } as const;

const ref = (id: string) => ({ '@id': id });

/** Absolute URL for a site-relative path ("/blog/"); absolute URLs pass through. */
const absolute = (url: string) => (url.startsWith('/') ? `${SITE_URL}${url}` : url);

/** One JSON-LD document holding several nodes that refer to each other by @id. */
export function graph<T extends object[]>(...nodes: T) {
  return { '@context': 'https://schema.org', '@graph': nodes };
}

export function organization() {
  return {
    '@type': 'Organization',
    '@id': ORG_ID,
    name: SITE_NAME,
    url: HOME,
    logo: { ...LOGO },
    sameAs: [REPO_URL],
  };
}

export function website() {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    name: SITE_NAME,
    url: HOME,
    inLanguage: LANGUAGE,
    publisher: ref(ORG_ID),
  };
}

/** The splitter as a WebApplication. Pass the app's own fields; id, publisher and provider are fixed. */
export function webApplication<T extends Record<string, unknown>>(fields: T) {
  return {
    ...fields,
    '@type': 'WebApplication',
    '@id': APP_ID,
    publisher: ref(ORG_ID),
    provider: ref(ORG_ID),
  };
}

/** FAQ entries as an FAQPage that belongs to the website. `a` is the plain-text answer. */
export function faqPage(entries: readonly { q: string; a: string }[]) {
  return {
    '@type': 'FAQPage',
    isPartOf: ref(WEBSITE_ID),
    mainEntity: entries.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

/**
 * "2026-09-17" -> "2026-09-17T09:00:00+05:30": 09:00 in India, as in the RSS feed. Throws RangeError on anything
 * but a real YYYY-MM-DD date. The feed's parser does the checking, so the markup and the feed can't disagree.
 */
export function istDateTime(isoDate: string): string {
  toRfc822(isoDate);
  return `${isoDate}T09:00:00+05:30`;
}

export interface BlogPostingInput {
  slug: string;
  title: string;
  description: string;
  /** YYYY-MM-DD */
  date: string;
  /** YYYY-MM-DD, when the post was last changed in substance. */
  updated?: string;
  author?: PersonNode;
  /** Defaults to the post's share card, /og/<slug>.png. */
  image?: { url: string; width: number; height: number };
}

export function blogPosting({ slug, title, description, date, updated, author = AUTHOR, image }: BlogPostingInput) {
  const url = `${SITE_URL}/blog/${slug}/`;
  const img = image ?? { url: ogImagePath(slug), ...OG_SIZE };
  return {
    '@type': 'BlogPosting',
    headline: title,
    description,
    url,
    datePublished: istDateTime(date),
    dateModified: istDateTime(updated ?? date),
    author,
    publisher: PUBLISHER,
    image: { '@type': 'ImageObject', url: absolute(img.url), width: img.width, height: img.height },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    inLanguage: LANGUAGE,
  };
}

/** Breadcrumbs from the home page down; each path is site-relative with a trailing slash. */
export function breadcrumbList(items: readonly { name: string; path: string }[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => {
      if (!/^\/(?:[^/]+\/)*$/.test(item.path)) {
        throw new RangeError(`breadcrumb path must be site-relative and end with "/", got: "${item.path}"`);
      }
      return { '@type': 'ListItem', position: i + 1, name: item.name, item: `${SITE_URL}${item.path}` };
    }),
  };
}
