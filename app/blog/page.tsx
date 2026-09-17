import { JsonLd } from '@/components/JsonLd';
import { PostList } from '@/components/blog/PostList';
import { lastModified } from '@/components/blog/postData';
import { postPath, posts } from '@/content/posts';
import { pageMetadata } from '@/lib/metadata';
import { ogCards, ogImage } from '@/lib/og';
import { FEED_TITLE, newestFirst } from '@/lib/rss';
import { PUBLISHER, istDateTime } from '@/lib/schema';
import { SITE_URL } from '@/lib/site';
import s from './page.module.css';

// ₹2000 without a comma in the title and description, the way people search for it; the page itself groups it.
const DESCRIPTION =
  'Plain-language UPI guides: what to check when a payment above ₹2000 won’t go through, how to pay in parts, where the rules are published, and upi://pay links.';

export const metadata = pageMetadata({
  title: 'UPI guides: payments above ₹2000 and upi:// links',
  description: DESCRIPTION,
  path: '/blog/',
  image: ogImage(ogCards(posts).find((c) => c.key === 'blog')!),
});

export default function BlogIndexPage() {
  const list = newestFirst(posts);
  return (
    <div className="page">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Blog',
          name: FEED_TITLE,
          description: DESCRIPTION,
          url: `${SITE_URL}/blog/`,
          inLanguage: 'en-IN',
          publisher: PUBLISHER,
          blogPost: list.map((p) => ({
            '@type': 'BlogPosting',
            headline: p.title,
            description: p.description,
            datePublished: istDateTime(p.date),
            dateModified: istDateTime(lastModified(p)),
            url: `${SITE_URL}${postPath(p.slug)}`,
          })),
        }}
      />

      <header className={s.intro}>
        <h1>UPI guides</h1>
        <p>
          Plain-language answers on what to check when a UPI payment won’t go through, how to pay a bill in parts,
          where the rules are published, and how upi:// links work.
        </p>
      </header>

      <div className={s.posts}>
        <PostList posts={list} headingLevel={2} />
      </div>

      <p className={s.feed}>
        New posts by RSS: <a href="/blog/feed.xml">subscribe to the feed</a>
      </p>
    </div>
  );
}
