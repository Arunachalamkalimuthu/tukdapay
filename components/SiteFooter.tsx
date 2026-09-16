import Link from 'next/link';
import { REPO_URL } from '@/lib/site';
import styles from './SiteFooter.module.css';

export function SiteFooter() {
  return (
    <footer className={styles.foot}>
      <div className={styles.inner}>
        <p>
          TukdaPay is a free, open-source tool. It doesn&apos;t move money and can&apos;t see whether a payment went
          through.
        </p>
        <ul className={styles.links}>
          <li>
            <a href={REPO_URL}>Source on GitHub</a>
          </li>
          <li>
            <Link href="/use-cases/">Use cases</Link>
          </li>
          <li>
            <Link href="/blog/">Blog</Link>
          </li>
          <li>
            <a href="/blog/feed.xml">RSS</a>
          </li>
        </ul>
      </div>
    </footer>
  );
}
