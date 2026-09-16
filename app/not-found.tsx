import type { Metadata } from 'next';
import Link from 'next/link';
import s from './not-found.module.css';

export const metadata: Metadata = {
  title: 'Page not found',
  description: 'This page doesn’t exist on TukdaPay. Split a UPI payment, see use cases or read the blog instead.',
  robots: { index: false },
  // Don't inherit the home page's canonical and og:url: this page is served for every unknown path.
  alternates: { canonical: null },
  openGraph: null,
};

export default function NotFound() {
  return (
    <div className={`page ${s.wrap}`}>
      <p className={s.code}>404</p>
      <h1 className={s.title}>We couldn’t find that page</h1>
      <p className={s.lead}>
        The link may be old or have a typo. If you came to split a bill, the splitter is one tap away.
      </p>
      <Link className={`btn btn-primary ${s.primary}`} href="/">
        Split a payment
      </Link>
      <nav className={s.more} aria-label="Other pages">
        <Link className="btn btn-secondary" href="/use-cases/">
          Use cases
        </Link>
        <Link className="btn btn-secondary" href="/blog/">
          Blog
        </Link>
      </nav>
    </div>
  );
}
