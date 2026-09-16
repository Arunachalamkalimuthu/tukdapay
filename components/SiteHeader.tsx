import Link from 'next/link';
import { REPO_URL } from '@/lib/site';
import styles from './SiteHeader.module.css';

export function SiteHeader() {
  return (
    <header className={styles.bar}>
      <Link className={styles.wordmark} href="/" aria-label="TukdaPay home">
        Tukda<span>Pay</span>
      </Link>
      <nav className={styles.nav} aria-label="Site">
        <Link href="/use-cases/">Use cases</Link>
        <Link href="/blog/">Blog</Link>
        <a href={REPO_URL}>GitHub</a>
      </nav>
    </header>
  );
}
