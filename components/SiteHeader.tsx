import Link from 'next/link';
import { SiteHeaderNav } from './SiteHeaderNav';
import styles from './SiteHeader.module.css';

export function SiteHeader() {
  return (
    <header className={styles.bar}>
      <Link className={styles.wordmark} href="/" aria-label="TukdaPay home">
        {/* The favicon's cut bar in one line: two whole pieces and a remainder. */}
        <svg className={styles.mark} width="28" height="8" viewBox="0 0 28 8" aria-hidden="true" focusable="false">
          <rect x="0" y="0" width="11" height="8" rx="2" />
          <rect x="13" y="0" width="11" height="8" rx="2" />
          <rect x="26" y="0" width="2" height="8" rx="1" />
        </svg>
        TukdaPay
      </Link>
      <SiteHeaderNav className={styles.nav} />
    </header>
  );
}
