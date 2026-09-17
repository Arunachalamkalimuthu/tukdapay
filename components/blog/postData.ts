/**
 * What a post page says about itself besides its body: metadata, JSON-LD, the date in the meta line and the posts
 * listed after it. Pure (no JSX or CSS), so it is tested directly in test/pages.test.ts.
 */
import type { Metadata } from 'next';
import { postPath, type PostMeta } from '@/content/posts';
import { pageMetadata } from '@/lib/metadata';
import { ogCards, ogImage } from '@/lib/og';
import { newestFirst } from '@/lib/rss';
import { AUTHOR, blogPosting, breadcrumbList, graph, type PersonNode } from '@/lib/schema';
import { SITE_URL } from '@/lib/site';

/** Where the byline links: the About page says who writes the posts. */
export const AUTHOR_PAGE = '/about/';

/** The posts' author in JSON-LD: the name the byline shows, with the page the byline links as the URL. */
export const POST_AUTHOR: PersonNode = { ...AUTHOR, url: `${SITE_URL}${AUTHOR_PAGE}` };

type Dated = Pick<PostMeta, 'date' | 'updated'>;

/** The last change in substance: `updated` once a post has one, otherwise the publish date (YYYY-MM-DD). */
export const lastModified = (post: Dated): string => post.updated ?? post.date;

/** The latest lastModified across posts, or undefined when there are none. */
export function newestModified(posts: readonly Dated[]): string | undefined {
  return posts.map(lastModified).sort().at(-1);
}

/** The date on the right of the meta line: the publish date, or "Updated" and the updated date once there is one. */
export function metaDate(post: Dated): { label: 'Updated' | undefined; iso: string } {
  return post.updated ? { label: 'Updated', iso: post.updated } : { label: undefined, iso: post.date };
}

/** "More from the blog": the newest other posts, by date rather than their order in content/posts.ts. */
export function morePosts<T extends Pick<PostMeta, 'slug' | 'date'>>(posts: readonly T[], slug: string, count = 3): T[] {
  return newestFirst(posts)
    .filter((p) => p.slug !== slug)
    .slice(0, count);
}

/** Title, description, canonical, article dates and the post's own share card (/og/<slug>.png). */
export function postPageMetadata(post: PostMeta): Metadata {
  return pageMetadata({
    title: post.title,
    description: post.description,
    path: postPath(post.slug),
    type: 'article',
    publishedTime: post.date,
    modifiedTime: lastModified(post),
    image: ogImage(ogCards([post])[0]),
  });
}

/** One JSON-LD graph: the BlogPosting (dates in IST, the share card, the author as the byline shows) and breadcrumbs. */
export function postStructuredData(post: PostMeta) {
  return graph(
    blogPosting({ ...post, author: POST_AUTHOR }),
    breadcrumbList([
      { name: 'Home', path: '/' },
      { name: 'Blog', path: '/blog/' },
      { name: post.title, path: postPath(post.slug) },
    ]),
  );
}
