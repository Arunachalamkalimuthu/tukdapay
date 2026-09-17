import type { Metadata } from 'next';
import { OG_SIZE } from './og.ts';
import { FEED_TITLE } from './rss.ts';
import { SITE_NAME, SITE_URL } from './site.ts';

/** The site-wide share image. Pages with their own card pass `image` to pageMetadata (see lib/og.ts). */
export const OG_IMAGE = {
  url: '/og.png',
  ...OG_SIZE,
  type: 'image/png',
  alt: 'TukdaPay: ₹5,000 → ₹1,999 + ₹1,999 + ₹1,002',
};
export const FEED_URL = `${SITE_URL}/blog/feed.xml`;

/** `alternates.types` for every page: the RSS feed, with a title so feed readers can name it. */
export const FEED_ALTERNATE = { 'application/rss+xml': [{ url: FEED_URL, title: FEED_TITLE }] };

/**
 * JSON-LD for a `<script type="application/ld+json">`. `<` is written as < so a string
 * containing `</script>` can't end the element early; JSON.parse reads it back unchanged.
 */
export function jsonLdHtml(data: object): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

interface PageMetaInput {
  /** Page title without the " – TukdaPay" suffix (the layout template adds it). */
  title: string;
  description: string;
  /** Site-relative path with trailing slash, e.g. "/use-cases/". */
  path: string;
  type?: 'website' | 'article';
  /** ISO date, articles only. */
  publishedTime?: string;
  /** ISO date of the last change in substance, articles only. Defaults to publishedTime. */
  modifiedTime?: string;
  /** A 1200×630 PNG share card, e.g. ogImage(card) from lib/og.ts. Defaults to og.png. */
  image?: { url: string; alt: string };
}

/**
 * Metadata for any page other than home. Next merges metadata shallowly, so a page
 * that doesn't set `alternates` and `openGraph` inherits the home page's canonical URL.
 * Open Graph and X get the same image object, so twitter:image:alt is written too.
 */
export function pageMetadata({
  title,
  description,
  path,
  type = 'website',
  publishedTime,
  modifiedTime,
  image,
}: PageMetaInput): Metadata {
  if (image && !image.alt.trim()) throw new Error(`share image ${image.url} for ${path} needs alt text`);
  const img = image ? { url: image.url, alt: image.alt, ...OG_SIZE, type: 'image/png' } : OG_IMAGE;
  return {
    title,
    description,
    alternates: { canonical: path, types: FEED_ALTERNATE },
    openGraph: {
      type,
      siteName: SITE_NAME,
      locale: 'en_IN',
      url: path,
      title,
      description,
      images: [img],
      ...(type === 'article' && publishedTime ? { publishedTime, modifiedTime: modifiedTime ?? publishedTime } : {}),
    },
    twitter: { card: 'summary_large_image', title, description, images: [img] },
  };
}
