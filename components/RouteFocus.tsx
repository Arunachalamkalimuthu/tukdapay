'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { focusLeftBehind, focusToRestore, type LeftFrom } from '@/lib/routeFocus';

/**
 * After moving to another page from the header or footer, which stay mounted, focus would stay on that link while
 * the new page opens at the top, so the next Tab would jump down to the footer. This moves focus to the top of
 * <main> instead, without scrolling. <main> is focusable only until it loses focus or is clicked: a permanent
 * tabindex would take focus on any click in the page, and the next Tab would then start from the top of the page,
 * not from the click.
 *
 * Coming back to the page the link left (Back) while focus is still on <main> puts focus back on that link, where
 * the restored scroll position is, so the next Tab carries on from there.
 */
export function RouteFocus() {
  const pathname = usePathname();
  const previous = useRef<string | null>(null);
  const leftFrom = useRef<LeftFrom<HTMLElement> | null>(null);

  useEffect(() => {
    const from = previous.current;
    previous.current = pathname;
    // The first render is the page as loaded: nothing has moved.
    if (from === null) return;
    const main = document.getElementById('main');
    if (!main) return;

    const back = focusToRestore(leftFrom.current, pathname, document.activeElement, main);
    leftFrom.current = null;
    if (back) {
      back.focus({ preventScroll: true });
      return;
    }

    const active = document.activeElement;
    if (!focusLeftBehind<Node>(active, document.body, main)) return;
    if (active instanceof HTMLElement) leftFrom.current = { path: from, element: active };
    const listeners = new AbortController();
    const drop = () => {
      main.removeAttribute('tabindex');
      listeners.abort();
    };
    main.addEventListener('blur', drop, { signal: listeners.signal });
    main.addEventListener('pointerdown', drop, { signal: listeners.signal });
    main.setAttribute('tabindex', '-1');
    main.focus({ preventScroll: true });
  }, [pathname]);

  return null;
}
