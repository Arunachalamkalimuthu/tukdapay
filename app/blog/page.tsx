import type { Metadata } from 'next';
import Link from 'next/link';
import { posts, formatDate } from '@/content/posts';
import s from './page.module.css';

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Plain-language guides on UPI: splitting payments, per-transaction rules, and how upi:// links work.',
  alternates: { canonical: '/blog/' },
  openGraph: { url: '/blog/', title: 'TukdaPay blog' },
};

export default function BlogIndex() {
  return (
    <div className="page">
      <h1 style={{ fontSize: 34, fontWeight: 800 }}>Blog</h1>
      <p className="muted" style={{ maxWidth: '42ch' }}>
        Plain-language guides on UPI: splitting payments, what the rules actually say, and how the links under the hood work.
      </p>
      <ul className={s.list}>
        {posts.map((p) => (
          <li key={p.slug}>
            <h2><Link href={`/blog/${p.slug}/`}>{p.title}</Link></h2>
            <p>{p.description}</p>
            <span className={s.meta}><time dateTime={p.date}>{formatDate(p.date)}</time></span>
          </li>
        ))}
      </ul>
    </div>
  );
}
