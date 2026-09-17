import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { JsonLd } from '@/components/JsonLd';
import { formatDate, getPost, posts, type PostMeta } from '@/content/posts';
import { REPO_URL } from '@/lib/site';
import { PostList } from './PostList';
import { AUTHOR_PAGE, POST_AUTHOR, metaDate, morePosts, postPageMetadata, postStructuredData } from './postData';
import s from './Post.module.css';

/**
 * `export const metadata = postMetadata('<slug>')` in app/blog/<slug>/page.mdx.
 * Title, description and dates come from content/posts.ts; an unknown slug throws and fails the build.
 */
export function postMetadata(slug: string): Metadata {
  return postPageMetadata(getPost(slug));
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

export function PostShell({ post, children }: { post: PostMeta; children?: ReactNode }) {
  const others = morePosts(posts, post.slug);
  const date = metaDate(post);
  return (
    <div className="page">
      <JsonLd data={postStructuredData(post)} />
      <article className={s.post}>
        {/* The way back on the left, the date on the right: space separates them, not a dot. */}
        <p className={s.meta}>
          <Link href="/blog/">Blog</Link>{' '}
          <span>
            {date.label && `${date.label} `}
            <time dateTime={date.iso}>{formatDate(date.iso)}</time>
          </span>
        </p>
        <h1>{post.title}</h1>
        {children}
        {/* The byline names the author in the JSON-LD (POST_AUTHOR), and links the page that is their URL there. */}
        <p className={s.issue}>
          By{' '}
          <Link href={AUTHOR_PAGE} rel="author">
            {POST_AUTHOR.name}
          </Link>
          , who builds TukdaPay. Found a mistake? <a href={`${REPO_URL}/issues`}>Open an issue</a> — this post lives in
          the repo too.
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
