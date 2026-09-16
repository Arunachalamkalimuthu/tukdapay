import { posts } from '@/content/posts';
import { SITE_URL } from '@/lib/site';

export const dynamic = 'force-static';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function GET() {
  const items = posts
    .map(
      (p) => `  <item>
    <title>${esc(p.title)}</title>
    <link>${SITE_URL}/blog/${p.slug}/</link>
    <guid>${SITE_URL}/blog/${p.slug}/</guid>
    <pubDate>${new Date(`${p.date}T09:00:00+05:30`).toUTCString()}</pubDate>
    <description>${esc(p.description)}</description>
  </item>`
    )
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>TukdaPay blog</title>
  <link>${SITE_URL}/blog/</link>
  <atom:link href="${SITE_URL}/blog/feed.xml" rel="self" type="application/rss+xml" />
  <description>Plain-language guides on UPI: splitting payments, per-transaction rules, and how upi:// links work.</description>
  <language>en-in</language>
${items}
</channel>
</rss>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
}
