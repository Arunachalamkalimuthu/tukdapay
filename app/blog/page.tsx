import { JsonLd } from '@/components/JsonLd';
import { PostList } from '@/components/blog/PostList';
import { postPath, posts } from '@/content/posts';
import { pageMetadata } from '@/lib/metadata';
import { FEED_DESCRIPTION, FEED_TITLE, newestFirst } from '@/lib/rss';
import { SITE_NAME, SITE_URL } from '@/lib/site';
import s from './page.module.css';

export const metadata = pageMetadata({ title: 'Blog', description: FEED_DESCRIPTION, path: '/blog/' });

export default function BlogIndexPage() {
  const list = newestFirst(posts);
  return (
    <div className="page wide">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Blog',
          name: FEED_TITLE,
          description: FEED_DESCRIPTION,
          url: `${SITE_URL}/blog/`,
          inLanguage: 'en-IN',
          publisher: { '@type': 'Organization', name: SITE_NAME, url: `${SITE_URL}/` },
          blogPost: list.map((p) => ({
            '@type': 'BlogPosting',
            headline: p.title,
            description: p.description,
            datePublished: p.date,
            url: `${SITE_URL}${postPath(p.slug)}`,
          })),
        }}
      />

      <header className={s.intro}>
        <h1>Blog</h1>
        <p>Plain-language guides on UPI: splitting payments, what the rules actually say, and how the links under the hood work.</p>
      </header>

      <PostList posts={list} headingLevel={2} />

      <p className={s.feed}>
        New posts by RSS: <a href="/blog/feed.xml">subscribe to the feed</a>
      </p>
    </div>
  );
}
