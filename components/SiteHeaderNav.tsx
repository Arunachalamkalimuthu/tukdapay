'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { navCurrent } from '@/lib/nav';
import { REPO_URL } from '@/lib/site';

/**
 * The header's links, with aria-current on the section you're in (the header shows it in ink). Each page's HTML is
 * prerendered with its own value, so the mark is there before any JavaScript runs.
 */
export function SiteHeaderNav({ className }: { className?: string }) {
  const pathname = usePathname();
  return (
    <nav className={className} aria-label="Site">
      <Link href="/use-cases/" aria-current={navCurrent(pathname, '/use-cases/')}>
        Use cases
      </Link>
      <Link href="/blog/" aria-current={navCurrent(pathname, '/blog/')}>
        Blog
      </Link>
      <a href={REPO_URL}>GitHub</a>
    </nav>
  );
}
