'use client';
import { useEffect, useRef } from 'react';

export function QrCode({ value, className }: { value: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || getComputedStyle(el).display === 'none') return;
    let cancelled = false;
    import('qrcode').then(async (QR) => {
      if (cancelled) return;
      const canvas = document.createElement('canvas');
      await QR.toCanvas(canvas, value, { width: 160, margin: 0 });
      if (!cancelled) el.replaceChildren(canvas);
    }).catch(() => {
      if (!cancelled) el.textContent = 'QR unavailable — use the link on your phone.';
    });
    return () => { cancelled = true; };
  }, [value]);

  return <div ref={ref} className={className} aria-label="QR code for this payment" />;
}
