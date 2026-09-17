import type { MetadataRoute } from 'next';
import { posts } from '@/content/posts';
import { SITE_URL } from '@/lib/site';

export const dynamic = 'force-static';

/** Last content change on /about/ (YYYY-MM-DD). */
const ABOUT_UPDATED = '2026-09-17';

export default function sitemap(): MetadataRoute.Sitemap {
  // Pages without their own date change when content does, so they take the newest post date.
  // Never the build time: the sitemap should only change when the content does.
  const newest = posts.map((p) => p.date).sort().at(-1);
  const stamp = newest ? { lastModified: newest } : {};

  return [
    { url: `${SITE_URL}/`, ...stamp, changeFrequency: 'monthly', priority: 1 },
    { url: `${SITE_URL}/use-cases/`, ...stamp, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/blog/`, ...stamp, changeFrequency: 'weekly', priority: 0.8 },
    // The about page has its own date: change it only when the page's words change.
    { url: `${SITE_URL}/about/`, lastModified: ABOUT_UPDATED, changeFrequency: 'monthly', priority: 0.5 },
    ...posts.map((p) => ({
      url: `${SITE_URL}/blog/${p.slug}/`,
      lastModified: p.date,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ];
}
