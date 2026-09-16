import type { Metadata } from 'next';
import Link from 'next/link';
import { posts, formatDate } from '@/content/posts';
import { JsonLd } from '@/components/JsonLd';
import { REPO_URL, SITE_URL } from '@/lib/site';
import s from './PostLayout.module.css';

export function postMetadata(slug: string): Metadata {
  const p = posts.find((x) => x.slug === slug)!;
  return {
    title: p.title,
    description: p.description,
    alternates: { canonical: `/blog/${slug}/` },
    openGraph: { type: 'article', url: `/blog/${slug}/`, title: p.title, description: p.description, publishedTime: p.date },
  };
}

export function PostLayout({ slug, children }: { slug: string; children: React.ReactNode }) {
  const p = posts.find((x) => x.slug === slug)!;
  return (
    <div className="page">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: p.title,
          description: p.description,
          datePublished: p.date,
          dateModified: p.date,
          author: { '@type': 'Person', name: 'Arunachalam Kalimuthu', url: 'https://github.com/Arunachalamkalimuthu' },
          publisher: { '@type': 'Organization', name: 'TukdaPay', url: `${SITE_URL}/` },
          mainEntityOfPage: `${SITE_URL}/blog/${slug}/`,
          image: `${SITE_URL}/og.png`,
          inLanguage: 'en-IN',
        }}
      />
      <article className={s.post}>
        <p className={s.meta}>
          <Link href="/blog/">Blog</Link> · <time dateTime={p.date}>{formatDate(p.date)}</time>
        </p>
        <h1>{p.title}</h1>
        {children}
        <p className={s.foot}>
          Found a mistake? <a href={`${REPO_URL}/issues`}>Open an issue</a> — this post lives in the repo too.
        </p>
      </article>
    </div>
  );
}
