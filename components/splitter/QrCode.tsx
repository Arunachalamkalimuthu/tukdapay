'use client';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { modulesToPath } from '@/lib/qr';

/** Keep in sync with the media queries that show .qrSlot and .nextScan in Splitter.module.css. */
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
  return wide ? <QrSvg {...props} /> : null;
}

interface QrSymbol {
  size: number;
  path: string;
}

/** The light margin scanners need around a QR code, in modules. */
const QUIET_ZONE = 4;

/**
 * Drawn as SVG so it stays crisp at whatever size the layout gives the tile. The view box takes in
 * the quiet zone, so the tile always has exactly four modules of white around the code, whatever
 * the tile size and however many modules the link needs.
 */
function QrSvg({ value, label, className }: Props) {
  const [symbol, setSymbol] = useState<QrSymbol | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    import('qrcode')
      .then((QR) => {
        const { modules } = QR.create(value, { errorCorrectionLevel: 'M' });
        if (!cancelled) setSymbol({ size: modules.size, path: modulesToPath(modules.size, modules.data) });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [value]);

  if (failed) return <p className={className} data-failed="">QR unavailable — use the link on your phone.</p>;
  const size = symbol?.size ?? 1;
  const box = size + 2 * QUIET_ZONE;
  return (
    <div className={className}>
      <svg role="img" aria-label={label} viewBox={`${-QUIET_ZONE} ${-QUIET_ZONE} ${box} ${box}`} shapeRendering="crispEdges">
        {symbol && <path d={symbol.path} fill="currentColor" />}
      </svg>
    </div>
  );
}
