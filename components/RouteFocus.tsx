'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { focusLeftBehind } from '@/lib/routeFocus';

/**
 * After moving to another page from the header or footer, which stay mounted, focus would stay on that link while
 * the new page opens at the top, so the next Tab would jump down to the footer. This moves focus to the top of
 * <main> instead, without scrolling. <main> is focusable only until it loses focus: a permanent tabindex would take
 * focus on any click in the page, and the next Tab would then start from the top of the page, not from the click.
 */
export function RouteFocus() {
  const pathname = usePathname();
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const main = document.getElementById('main');
    if (!main || !focusLeftBehind<Node>(document.activeElement, document.body, main)) return;
    main.setAttribute('tabindex', '-1');
    main.addEventListener('blur', () => main.removeAttribute('tabindex'), { once: true });
    main.focus({ preventScroll: true });
  }, [pathname]);

  return null;
}
