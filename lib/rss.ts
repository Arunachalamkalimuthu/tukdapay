import { SITE_URL } from './site.ts';

/** The fields of a blog post the feed needs (structurally a subset of content/posts.ts PostMeta). */
export interface RssPost {
  slug: string;
  title: string;
  description: string;
  /** YYYY-MM-DD, taken as a date in India. */
  date: string;
}

export const FEED_TITLE = 'TukdaPay blog';
export const FEED_DESCRIPTION =
  'Plain-language guides on UPI: splitting payments, per-transaction rules, and how upi:// links work.';

const XML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' };

export function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => XML_ESCAPES[ch]);
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-09-17" -> "Thu, 17 Sep 2026 09:00:00 +0530" (09:00 in India, the old feed's convention). */
export function toRfc822(isoDate: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!m) throw new RangeError(`expected YYYY-MM-DD, got: ${isoDate}`);
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) {
    throw new RangeError(`not a real date: ${isoDate}`);
  }
  return `${DAYS[d.getUTCDay()]}, ${m[3]} ${MONTHS[month - 1]} ${m[1]} 09:00:00 +0530`;
}

/** Newest first; posts with the same date keep their order (Array.prototype.sort is stable). */
export function newestFirst<T extends { date: string }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => b.date.localeCompare(a.date));
}

/** RSS 2.0 document for the blog. Links are absolute and end with a slash; guid is the link. */
export function buildRssFeed(posts: readonly RssPost[], siteUrl: string = SITE_URL): string {
  const blogUrl = `${siteUrl}/blog/`;
  const items = newestFirst(posts).map((p) => {
    const link = `${blogUrl}${p.slug}/`;
    return [
      '  <item>',
      `    <title>${escapeXml(p.title)}</title>`,
      `    <link>${escapeXml(link)}</link>`,
      `    <guid>${escapeXml(link)}</guid>`,
      `    <pubDate>${toRfc822(p.date)}</pubDate>`,
      `    <description>${escapeXml(p.description)}</description>`,
      '  </item>',
    ].join('\n');
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '<channel>',
    `  <title>${escapeXml(FEED_TITLE)}</title>`,
    `  <link>${escapeXml(blogUrl)}</link>`,
    `  <atom:link href="${escapeXml(`${blogUrl}feed.xml`)}" rel="self" type="application/rss+xml" />`,
    `  <description>${escapeXml(FEED_DESCRIPTION)}</description>`,
    '  <language>en-in</language>',
    ...items,
    '</channel>',
    '</rss>',
    '',
  ].join('\n');
}
