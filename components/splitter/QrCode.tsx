'use client';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

/** Keep in sync with the media query that shows .partQr in Splitter.module.css. */
const WIDE_QUERY = '(min-width: 700px) and (hover: hover)';

function subscribeWide(onChange: () => void) {
  const mq = window.matchMedia(WIDE_QUERY);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}
const isWide = () => window.matchMedia(WIDE_QUERY).matches;
const isWideOnServer = () => false;

interface Props {
  value: string;
  /** Accessible name, e.g. "QR code for part 1 of 3, ₹1,999.00". */
  label: string;
  className?: string;
}

/**
 * QR for a UPI link, only on wide screens with a mouse (a computer, where the Pay
 * link can't open a UPI app). Follows the media query live, so resizing or rotating
 * into a wide layout draws it. The qrcode library loads only when a QR is needed.
 */
export function QrCode(props: Props) {
  const wide = useSyncExternalStore(subscribeWide, isWide, isWideOnServer);
  return wide ? <QrCanvas {...props} /> : null;
}

function QrCanvas({ value, label, className }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    import('qrcode')
      .then((QR) => {
        const canvas = ref.current;
        if (!cancelled && canvas) return QR.toCanvas(canvas, value, { width: 160, margin: 0 });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [value]);

  if (failed) return <p className={className}>QR unavailable — use the link on your phone.</p>;
  return (
    <div className={className}>
      <canvas ref={ref} role="img" aria-label={label} width={160} height={160} />
    </div>
  );
}
