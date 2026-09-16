import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { JsonLd } from '@/components/JsonLd';
import { formatDate, getPost, postPath, posts, type PostMeta } from '@/content/posts';
import { pageMetadata } from '@/lib/metadata';
import { REPO_URL, SITE_NAME, SITE_URL } from '@/lib/site';
import { PostList } from './PostList';
import s from './Post.module.css';

/**
 * `export const metadata = postMetadata('<slug>')` in app/blog/<slug>/page.mdx.
 * Title, description and date come from content/posts.ts; an unknown slug throws and fails the build.
 */
export function postMetadata(slug: string): Metadata {
  const post = getPost(slug);
  return pageMetadata({
    title: post.title,
    description: post.description,
    path: postPath(slug),
    type: 'article',
    publishedTime: post.date,
  });
}

/**
 * `export default postLayout('<slug>')` in app/blog/<slug>/page.mdx.
 * MDX treats a default export as the layout that wraps the post body.
 */
export function postLayout(slug: string) {
  const post = getPost(slug);
  return function PostLayout({ children }: { children?: ReactNode }) {
    return <PostShell post={post}>{children}</PostShell>;
  };
}

function structuredData(post: PostMeta) {
  const url = `${SITE_URL}${postPath(post.slug)}`;
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.description,
      datePublished: post.date,
      dateModified: post.date,
      author: { '@type': 'Person', name: 'Arunachalam Kalimuthu', url: 'https://github.com/Arunachalamkalimuthu' },
      publisher: { '@type': 'Organization', name: SITE_NAME, url: `${SITE_URL}/` },
      mainEntityOfPage: url,
      image: `${SITE_URL}/og.png`,
      inLanguage: 'en-IN',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
        { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog/` },
        { '@type': 'ListItem', position: 3, name: post.title, item: url },
      ],
    },
  ];
}

export function PostShell({ post, children }: { post: PostMeta; children?: ReactNode }) {
  const others = posts.filter((p) => p.slug !== post.slug).slice(0, 3);
  return (
    <div className="page">
      <JsonLd data={structuredData(post)} />
      <article className={s.post}>
        {/* The way back on the left, the date on the right: space separates them, not a dot. */}
        <p className={s.meta}>
          <Link href="/blog/">Blog</Link>{' '}
          <time dateTime={post.date}>{formatDate(post.date)}</time>
        </p>
        <h1>{post.title}</h1>
        {children}
        <p className={s.issue}>
          Found a mistake? <a href={`${REPO_URL}/issues`}>Open an issue</a> — this post lives in the repo too.
        </p>
      </article>
      {others.length > 0 && (
        <section className={s.more} aria-labelledby="more-posts">
          <h2 id="more-posts">More from the blog</h2>
          <PostList posts={others} headingLevel={3} compact />
        </section>
      )}
    </div>
  );
}
