import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import Link from 'next/link';
import s from './Post.module.css';

/** Site-internal paths go through next/link; everything else (https:, mailto:, #…) stays a plain anchor. */
export function SmartLink({ href = '', ...rest }: ComponentPropsWithoutRef<'a'>) {
  if (href.startsWith('/') && !href.startsWith('//')) return <Link href={href} {...rest} />;
  return <a href={href} {...rest} />;
}

/** Code blocks scroll sideways on their own; tabIndex lets keyboard users focus and scroll them. */
export function CodeBlock(props: ComponentPropsWithoutRef<'pre'>) {
  return <pre tabIndex={0} {...props} />;
}

/** Markdown tables, wrapped so wide ones scroll inside the post instead of the page. */
export function ScrollTable(props: ComponentPropsWithoutRef<'table'>) {
  return (
    <div className={s.tableScroll}>
      <table {...props} />
    </div>
  );
}

/** The opening paragraph under the title. */
export function Lede({ children }: { children: ReactNode }) {
  return <p className={s.lede}>{children}</p>;
}

export function Callout({ children }: { children: ReactNode }) {
  return (
    <div className={s.callout} role="note">
      {children}
    </div>
  );
}

/** The call-to-action button at the end of a post. */
export function Cta({ href, children }: { href: string; children: ReactNode }) {
  return (
    <p className={s.ctaWrap}>
      <SmartLink className={s.cta} href={href}>
        {children}
      </SmartLink>
    </p>
  );
}
