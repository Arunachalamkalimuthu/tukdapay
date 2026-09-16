import { posts } from '@/content/posts';
import { buildRssFeed } from '@/lib/rss';

// Rendered once at build time and written to out/blog/feed.xml.
export const dynamic = 'force-static';

export function GET() {
  return new Response(buildRssFeed(posts), {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  });
}
