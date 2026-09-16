import type { MetadataRoute } from 'next';
import { posts } from '@/content/posts';
import { SITE_URL } from '@/lib/site';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const today = '2026-09-17';
  return [
    { url: `${SITE_URL}/`, lastModified: today, changeFrequency: 'monthly', priority: 1 },
    { url: `${SITE_URL}/use-cases/`, lastModified: today, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/blog/`, lastModified: today, changeFrequency: 'weekly', priority: 0.8 },
    ...posts.map((p) => ({ url: `${SITE_URL}/blog/${p.slug}/`, lastModified: p.date, changeFrequency: 'monthly' as const, priority: 0.7 })),
  ];
}
