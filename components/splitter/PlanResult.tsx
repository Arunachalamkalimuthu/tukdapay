'use client';
import { useEffect, useState, type Ref } from 'react';
import { breakdownText, type Plan } from '@/lib/plan';
import { formatInr } from '@/lib/format';
import { SITE_URL } from '@/lib/site';
import { QrCode } from './QrCode';
import s from './Splitter.module.css';

interface Props {
  plan: Plan;
  sectionRef: Ref<HTMLElement>;
  headingRef: Ref<HTMLHeadingElement>;
  onTogglePaid: (index: number, paid: boolean) => void;
  onStartOver: () => void;
}

type CopyState = 'Copied' | 'Copy failed' | null;

export function PlanResult({ plan, sectionRef, headingRef, onTogglePaid, onStartOver }: Props) {
  const [copied, setCopied] = useState<CopyState>(null);

  // Put the button label back after a moment; the timer is cleared on unmount.
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(null), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(breakdownText(plan));
      setCopied('Copied');
    } catch {
      setCopied('Copy failed');
    }
  }

  const { input, parts } = plan;
  const n = parts.length;
  const paidCount = parts.filter((p) => p.paid).length;
  const allPaid = paidCount === n;
  const nextPart = parts.find((p) => !p.paid) ?? null;
  const waText = `${breakdownText(plan)}\n\nMade with ${SITE_URL}`;

  return (
    <section ref={sectionRef} className={s.result} aria-labelledby="result-title">
      <header className={s.resultHead}>
        <h2 id="result-title" ref={headingRef} tabIndex={-1}>
          {n} payment{n === 1 ? '' : 's'} for {formatInr(input.total)}
        </h2>
        <p>{input.pn ? `to ${input.pn} (${input.pa})` : `to ${input.pa}`}</p>
        <div
          className={s.progress}
          role="progressbar"
          aria-label="Payments made"
          aria-valuemin={0}
          aria-valuemax={n}
          aria-valuenow={paidCount}
          aria-valuetext={`${paidCount} of ${n} paid`}
        >
          <span style={{ width: `${(paidCount / n) * 100}%` }} />
        </div>
        <div aria-live="polite">
          <p className={s.progressText}>{allPaid ? `All ${n} paid` : `${paidCount} of ${n} paid`}</p>
          {allPaid && <div className={s.done}>Done — all parts paid. Share the breakdown with the shop if they need it.</div>}
        </div>
        {nextPart && (
          <a className={`btn btn-primary ${s.next}`} href={nextPart.url}>
            Pay Part {nextPart.index + 1} of {n} · {formatInr(nextPart.amount)}
          </a>
        )}
      </header>

      <ol className={s.parts}>
        {parts.map((p) => {
          const which = `part ${p.index + 1} of ${n}, ${formatInr(p.amount)}`;
          const isNext = nextPart?.index === p.index;
          const payText = p.paid ? 'Pay again' : 'Pay';
          return (
            <li
              key={p.index}
              className={`${s.part} ${p.paid ? s.isPaid : ''} ${isNext ? s.isNext : ''}`}
              aria-current={isNext ? 'step' : undefined}
            >
              <span className={s.partAmount}>{formatInr(p.amount)}</span>
              <span className={s.partLabel}>Part {p.index + 1} of {n}</span>
              <a className={`btn btn-primary ${s.partPay}`} href={p.url} aria-label={`${payText} ${which}`}>
                {payText}
              </a>
              <QrCode key={p.url} value={p.url} label={`QR code for ${which}`} className={s.partQr} />
              <label className={s.partPaid}>
                <input
                  type="checkbox"
                  checked={p.paid}
                  onChange={(e) => onTogglePaid(p.index, e.target.checked)}
                  aria-label={`Paid ${which}`}
                />{' '}
                Paid
              </label>
            </li>
          );
        })}
      </ol>

      <div className={s.actions}>
        <a
          className="btn btn-secondary"
          href={`https://wa.me/?text=${encodeURIComponent(waText)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Send on WhatsApp
        </a>
        <button type="button" className="btn btn-secondary" onClick={copy}>
          {copied ?? 'Copy breakdown'}
        </button>
        <button type="button" className="btn btn-tertiary" onClick={onStartOver}>
          Start over
        </button>
      </div>
      <p role="status" className={s.srOnly}>
        {copied === 'Copied' ? 'Breakdown copied' : copied === 'Copy failed' ? 'Could not copy the breakdown' : ''}
      </p>

      <p className={s.fine}>
        Each Pay button opens your UPI app with the amount and note filled in. This page can&apos;t see whether a
        payment went through, so tick each one off yourself. On a computer, scan the QR with your phone instead.
      </p>
    </section>
  );
}
