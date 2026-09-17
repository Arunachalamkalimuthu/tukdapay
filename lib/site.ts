export const SITE_URL = 'https://tukdapay.com';
export const SITE_NAME = 'TukdaPay';
export const REPO_URL = 'https://github.com/Arunachalamkalimuthu/tukdapay';
export const DEFAULT_MAX = 1999;

/**
 * Last change to what each page says (YYYY-MM-DD), for the sitemap's lastmod. Change a date only when the page's
 * words change, never for design or CSS. Home's sitemap date is the later of this and the newest post's, because
 * home lists the newest posts; /blog/ and the posts take theirs from content/posts.ts.
 */
export const PAGE_UPDATED = {
  '/': '2026-09-17',
  '/use-cases/': '2026-09-17',
  '/about/': '2026-09-17',
} as const satisfies Record<string, string>;
