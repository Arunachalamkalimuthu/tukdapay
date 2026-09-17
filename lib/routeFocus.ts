/**
 * Whether keyboard focus was left behind outside `main` after moving to another page. The header and footer stay
 * mounted between pages, so a link there keeps focus while the new page opens at the top, and the next Tab jumps
 * back to it. Focus on the body is left alone: that's where it is after a link inside the page, and a #fragment link
 * keeps its place in the page from there.
 */
export function focusLeftBehind<T>(active: T | null, body: T | null, main: { contains(other: T): boolean } | null): boolean {
  return Boolean(main && active && active !== body && !main.contains(active));
}

/** The header or footer link that moved focus to <main> on leaving a page, and that page's path. */
export interface LeftFrom<T> {
  path: string;
  element: T;
}

/**
 * The link to put focus back on after coming back (say, with Back) to the page a header or footer link left. Focus
 * went to <main> on the way out, and stays there when nothing has moved it since, so without this the next Tab would
 * start from the top of the restored page instead of from the link. Null when focus has moved on from <main> (a Tab
 * or a click is kept), on any other page, or when the link is no longer in the document.
 */
export function focusToRestore<T extends { isConnected: boolean }>(
  left: LeftFrom<T> | null,
  pathname: string,
  active: unknown,
  main: unknown,
): T | null {
  if (!left || main === null || active !== main || left.path !== pathname || !left.element.isConnected) return null;
  return left.element;
}
