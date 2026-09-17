/**
 * Whether keyboard focus was left behind outside `main` after moving to another page. The header and footer stay
 * mounted between pages, so a link there keeps focus while the new page opens at the top, and the next Tab jumps
 * back to it. Focus on the body is left alone: that's where it is after a link inside the page, and a #fragment link
 * keeps its place in the page from there.
 */
export function focusLeftBehind<T>(active: T | null, body: T | null, main: { contains(other: T): boolean } | null): boolean {
  return Boolean(main && active && active !== body && !main.contains(active));
}
