'use client';
import { Fragment, useEffect, useRef, useState, type CSSProperties, type ReactNode, type Ref } from 'react';
import { breakdownText, type Plan } from '@/lib/plan';
import { formatInr } from '@/lib/format';
import { planProgress } from '@/lib/splitter';
import { SITE_URL } from '@/lib/site';
import { TukdaStrip } from '@/components/TukdaStrip';
import { QrCode } from './QrCode';
import s from './Splitter.module.css';

interface Props {
  plan: Plan;
  sectionRef: Ref<HTMLElement>;
  headingRef: Ref<HTMLHeadingElement>;
  onTogglePaid: (index: number, paid: boolean) => void;
  onStartOver: () => void;
  /** How many plans were split in this visit. A new value mounts a fresh progress strip. */
  cut: number;
  /**
   * Play "the cut" on the progress strip: true only for a plan just split in this visit, and only
   * until it has played (onCutDone), so later ticks don't replay it.
   */
  animateCut: boolean;
  onCutDone: () => void;
}

/** "₹1,00,000.00" with a line-break opportunity after each comma, and nowhere else. */
function breakAfterCommas(figure: string): ReactNode {
  return figure.split(',').map((group, i, groups) => (
    <Fragment key={i}>
      {group}
      {i < groups.length - 1 && (
        <>
          ,<wbr />
        </>
      )}
    </Fragment>
  ));
}

type CopyState = 'Copied' | 'Copy failed' | null;
const COPY_LABELS = ['Copy breakdown', 'Copied', 'Copy failed'] as const;

export function PlanResult({ plan, sectionRef, headingRef, onTogglePaid, onStartOver, cut, animateCut, onCutDone }: Props) {
  const [copied, setCopied] = useState<CopyState>(null);
  const barRef = useRef<HTMLDivElement>(null);

  // The cut ends on the strip's animationend. If it never runs (reduced motion, a hidden tab),
  // stop waiting for it after a moment so it can't start later on a tick.
  useEffect(() => {
    if (!animateCut) return;
    const timer = setTimeout(onCutDone, 1000);
    return () => clearTimeout(timer);
  }, [animateCut, onCutDone]);

  // Keyboard focus is never hidden under the sticky bar: the page keeps the bar's real height clear
  // at the bottom when it scrolls a focused control into view (see .bar in the CSS). The bar grows
  // with its text (a wrapped label, the done message, bigger text settings), so it is measured.
  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const root = document.documentElement;
    const observer = new ResizeObserver(() => {
      root.style.setProperty('--bar-h', `${Math.ceil(bar.getBoundingClientRect().height)}px`);
    });
    observer.observe(bar);
    return () => {
      observer.disconnect();
      root.style.removeProperty('--bar-h');
    };
  }, []);

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
  const { n, paidCount, allPaid, nextIndex, toGo, status } = planProgress(parts);
  const nextPart = nextIndex >= 0 ? parts[nextIndex] : null;
  const waText = `${breakdownText(plan)}\n\nMade with ${SITE_URL}`;
  const copyLabel = copied ?? 'Copy breakdown';
  // The longest amount in the list sizes them all (see .partAmount).
  const amountChars = Math.max(...parts.map((p) => formatInr(p.amount).length));

  return (
    <section ref={sectionRef} className={s.result} aria-labelledby="result-title">
      <h2 id="result-title" ref={headingRef} tabIndex={-1} className={s.resultTitle}>
        {n} payment{n === 1 ? '' : 's'} for <span className="money">{formatInr(input.total)}</span>
      </h2>
      <p className={s.payee}>{input.pn ? `to ${input.pn} (${input.pa})` : `to ${input.pa}`}</p>

      <ol className={s.parts} style={{ '--amount-chars': amountChars } as CSSProperties}>
        {parts.map((p) => {
          const number = p.index + 1;
          const which = `part ${number} of ${n}, ${formatInr(p.amount)}`;
          const isNext = nextPart?.index === p.index;
          return (
            <li
              key={p.index}
              id={`part-${number}`}
              className={`${s.part} ${p.paid ? s.isPaid : isNext ? s.isNext : ''}`}
              aria-current={isNext ? 'step' : undefined}
            >
              {/* The whole column is the target; the box is a real checkbox. */}
              <label className={s.tick}>
                <span className={s.boxWrap}>
                  <input
                    type="checkbox"
                    className={s.box}
                    checked={p.paid}
                    onChange={(e) => onTogglePaid(p.index, e.target.checked)}
                    aria-label={`Paid ${which}`}
                  />
                  <svg className={s.check} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                    <path d="M3.4 8.3l3 3 6.2-6.6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className={s.tickLabel} aria-hidden="true">Paid</span>
              </label>
              {/* Figures left, Pay right; Pay drops under the figures when they need the room. */}
              <div className={s.partBody}>
                <div className={s.partFigures}>
                  <span className={`${s.partAmount} money`}>{breakAfterCommas(formatInr(p.amount))}</span>
                  <span className={s.partLabel}>Part {number} of {n}</span>
                </div>
                {p.paid ? (
                  <a className={`btn btn-tertiary ${s.partPay} ${s.payAgain}`} href={p.url} aria-label={`Pay again ${which}`}>
                    Pay again
                  </a>
                ) : (
                  <a className={`btn btn-outline ${s.partPay}`} href={p.url} aria-label={`Pay ${which}`}>
                    Pay
                  </a>
                )}
              </div>
              <div className={s.qrSlot}>
                <QrCode key={p.url} value={p.url} label={`QR code for ${which}`} className={s.qr} />
                {/* Dimmed with a label once paid, so nobody scans it twice. */}
                {p.paid && <span className={s.qrPaid} aria-hidden="true">Paid</span>}
              </div>
            </li>
          );
        })}
      </ol>

      {/* The one action bar: sticks to the bottom of the screen while the parts scroll past. */}
      <div ref={barRef} className={s.bar} data-result-bar="" data-done={allPaid || undefined}>
        <div
          onAnimationEnd={(e) => {
            // The gaps opening is the cut's last step (the other parts of it end at the same time).
            if (e.animationName.includes('open')) onCutDone();
          }}
          role="progressbar"
          aria-label="Payments made"
          aria-valuemin={0}
          aria-valuemax={n}
          aria-valuenow={paidCount}
          aria-valuetext={`${paidCount} of ${n} paid`}
        >
          <TukdaStrip
            key={cut}
            variant="progress"
            parts={parts.map((p) => p.amount)}
            paid={parts.map((p) => p.paid)}
            animateCut={animateCut}
          />
        </div>
        <div aria-live="polite">
          <p className={s.status}>
            <b>{status}</b>
            {!allPaid && (
              <span className={s.toGo}>
                <span className="money">{formatInr(toGo)}</span> to go
              </span>
            )}
          </p>
          {allPaid && <p className={s.done}>Done — all parts paid. Share the breakdown with the shop if they need it.</p>}
        </div>
        {nextPart && (
          <>
            {/* Phones pay through the link; computers scan the part's QR. The media query picks one. */}
            <a className={`btn btn-primary btn-lg ${s.nextBtn} ${s.nextPay}`} href={nextPart.url}>
              <span>Pay part {nextPart.index + 1} of {n}</span>{' '}
              <span className={`${s.nextFigure} money`}>{formatInr(nextPart.amount)}</span>
            </a>
            <a className={`btn btn-primary btn-lg ${s.nextBtn} ${s.nextScan}`} href={`#part-${nextPart.index + 1}`}>
              <span>Scan part {nextPart.index + 1} of {n}</span>{' '}
              <span className={`${s.nextFigure} money`}>{formatInr(nextPart.amount)}</span>
            </a>
          </>
        )}
      </div>

      <div className={s.actions}>
        <a
          className={`btn btn-secondary ${s.share}`}
          href={`https://wa.me/?text=${encodeURIComponent(waText)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Send on WhatsApp
        </a>
        <button type="button" className={`btn btn-secondary ${s.share}`} onClick={copy}>
          {/* Every label sits in the same cell, so the button keeps its width as the label changes. */}
          <span className={s.swap}>
            {COPY_LABELS.map((label) => (
              <span key={label} className={label === copyLabel ? undefined : s.swapHidden}>
                {label}
              </span>
            ))}
          </span>
        </button>
        <span className={s.actionsBreak} aria-hidden="true" />
        <button type="button" className={`btn btn-tertiary ${s.startOver}`} onClick={onStartOver}>
          Start over
        </button>
      </div>
      <p role="status" className="sr-only">
        {copied === 'Copied' ? 'Breakdown copied' : copied === 'Copy failed' ? 'Could not copy the breakdown' : ''}
      </p>

      <p className={s.fine}>
        Each Pay button opens your UPI app with the amount and note filled in. If your app won’t pay from a link,
        scan the shop’s QR in your UPI app instead and type the amount yourself. This page can’t see whether a
        payment went through, so tick each one off yourself. On a computer, scan the QR with your phone instead.
      </p>
    </section>
  );
}
