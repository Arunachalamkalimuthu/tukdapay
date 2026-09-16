import Link from 'next/link';
import { formatDate, postPath, type PostMeta } from '@/content/posts';
import s from './PostList.module.css';

interface Props {
  posts: readonly PostMeta[];
  /** Level of each post title: 2 on the blog index, 3 under a "More from the blog" heading. */
  headingLevel: 2 | 3;
  /** Smaller titles and no dates, for the list at the end of a post. */
  compact?: boolean;
}

export function PostList({ posts, headingLevel, compact = false }: Props) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  return (
    <ul className={compact ? `${s.list} ${s.compact}` : s.list}>
      {posts.map((p) => (
        <li key={p.slug}>
          <Heading className={s.title}>
            <Link href={postPath(p.slug)}>{p.title}</Link>
          </Heading>
          <p className={s.description}>{p.description}</p>
          {!compact && (
            <p className={s.date}>
              <time dateTime={p.date}>{formatDate(p.date)}</time>
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
