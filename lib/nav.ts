/** Drops trailing slashes, so "/blog/" and "/blog" compare equal and "/" becomes "". */
const trim = (path: string) => path.replace(/\/+$/, '');

/**
 * aria-current for a header link to `href` when the reader is on `pathname`: "page" on that page, "true" on a page
 * inside its section (a post under /blog/), and undefined otherwise. The header shows both in ink.
 */
export function navCurrent(pathname: string | null | undefined, href: string): 'page' | 'true' | undefined {
  if (!pathname) return undefined;
  const path = trim(pathname);
  const target = trim(href);
  if (path === target) return 'page';
  if (target !== '' && path.startsWith(`${target}/`)) return 'true';
  return undefined;
}
