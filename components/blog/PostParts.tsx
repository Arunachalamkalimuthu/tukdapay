import { isValidElement, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import Link from 'next/link';
import s from './Post.module.css';

/** Site-internal paths go through next/link; everything else (https:, mailto:, #…) stays a plain anchor. */
export function SmartLink({ href = '', ...rest }: ComponentPropsWithoutRef<'a'>) {
  if (href.startsWith('/') && !href.startsWith('//')) return <Link href={href} {...rest} />;
  return <a href={href} {...rest} />;
}

const LANGUAGE_NAMES: Record<string, string> = {
  ts: 'TypeScript',
  tsx: 'TypeScript',
  js: 'JavaScript',
  jsx: 'JavaScript',
  json: 'JSON',
  sh: 'Shell',
  bash: 'Shell',
};

/** "TypeScript code" for a ```ts block, "Code" when the block names no language. */
function codeLabel(children: ReactNode): string {
  if (!isValidElement<{ className?: string }>(children)) return 'Code';
  const language = /(?:^|\s)language-(\S+)/.exec(children.props.className ?? '')?.[1];
  return language ? `${LANGUAGE_NAMES[language] ?? language} code` : 'Code';
}

/**
 * Code blocks scroll sideways on their own; tabIndex lets keyboard users focus and scroll them,
 * and the region role gives that focus stop a name.
 */
export function CodeBlock(props: ComponentPropsWithoutRef<'pre'>) {
  return <pre tabIndex={0} role="region" aria-label={codeLabel(props.children)} {...props} />;
}

/**
 * Markdown tables, wrapped so wide ones scroll inside the post instead of the page.
 * Like CodeBlock, the wrapper takes focus so keyboard users can scroll it (Safari won't on its own).
 */
export function ScrollTable(props: ComponentPropsWithoutRef<'table'>) {
  return (
    <div className={s.tableScroll} tabIndex={0} role="region" aria-label="Scrollable table">
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
      <SmartLink className="btn btn-primary" href={href}>
        {children}
      </SmartLink>
    </p>
  );
}
