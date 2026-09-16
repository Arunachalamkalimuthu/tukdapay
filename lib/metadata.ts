import type { Metadata } from 'next';
import { SITE_NAME, SITE_URL } from './site';

export const OG_IMAGE = { url: '/og.png', width: 1200, height: 630, alt: 'TukdaPay: ₹5,000 → ₹1,999 + ₹1,999 + ₹1,002' };
export const FEED_URL = `${SITE_URL}/blog/feed.xml`;

interface PageMetaInput {
  /** Page title without the " – TukdaPay" suffix (the layout template adds it). */
  title: string;
  description: string;
  /** Site-relative path with trailing slash, e.g. "/use-cases/". */
  path: string;
  type?: 'website' | 'article';
  /** ISO date, articles only. */
  publishedTime?: string;
}

/**
 * Metadata for any page other than home. Next merges metadata shallowly, so a page
 * that doesn't set `alternates` and `openGraph` inherits the home page's canonical URL.
 */
export function pageMetadata({ title, description, path, type = 'website', publishedTime }: PageMetaInput): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path, types: { 'application/rss+xml': FEED_URL } },
    openGraph: {
      type,
      siteName: SITE_NAME,
      locale: 'en_IN',
      url: path,
      title,
      description,
      images: [OG_IMAGE],
      ...(type === 'article' && publishedTime ? { publishedTime, modifiedTime: publishedTime } : {}),
    },
    twitter: { card: 'summary_large_image', title, description, images: [OG_IMAGE.url] },
  };
}
