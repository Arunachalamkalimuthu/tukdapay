import Link from 'next/link';
import { REPO_URL } from '@/lib/site';
import styles from './SiteFooter.module.css';

export function SiteFooter() {
  return (
    <footer className={styles.foot}>
      <p>
        TukdaPay is a free, open-source tool. It doesn&apos;t move money and can&apos;t see whether a payment went
        through. <a href={REPO_URL}>Source on GitHub</a> · <Link href="/use-cases/">Use cases</Link> ·{' '}
        <Link href="/blog/">Blog</Link> · <a href="/blog/feed.xml">RSS</a>
      </p>
    </footer>
  );
}
