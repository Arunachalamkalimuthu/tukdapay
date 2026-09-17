import type { MetadataRoute } from 'next';
import { lastModified, newestModified } from '@/components/blog/postData';
import { postPath, posts, type PostMeta } from '@/content/posts';
import { PAGE_UPDATED, SITE_URL } from '@/lib/site';

export const dynamic = 'force-static';

/**
 * Dates come from content, never the build time, so the sitemap changes only when the words do. Posts use their
 * updated date when they have one; /blog/ takes the newest of those; home and the other pages have their own date in
 * lib/site.ts, and home also moves with the newest post because it lists the newest posts.
 */
export function sitemapEntries(list: readonly PostMeta[]): MetadataRoute.Sitemap {
  const newest = newestModified(list);
  const home = [PAGE_UPDATED['/'], newest].filter((d) => d !== undefined).sort().at(-1);
  return [
    { url: `${SITE_URL}/`, lastModified: home, changeFrequency: 'monthly', priority: 1 },
    { url: `${SITE_URL}/use-cases/`, lastModified: PAGE_UPDATED['/use-cases/'], changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/blog/`, ...(newest ? { lastModified: newest } : {}), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/about/`, lastModified: PAGE_UPDATED['/about/'], changeFrequency: 'monthly', priority: 0.5 },
    ...list.map((p) => ({
      url: `${SITE_URL}${postPath(p.slug)}`,
      lastModified: lastModified(p),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ];
}

export default function sitemap(): MetadataRoute.Sitemap {
  return sitemapEntries(posts);
}
