'use client';
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import { splitAmount } from '@/lib/split';
import { isValidVpa } from '@/lib/upi';
import { countParts, createPlan, MAX_PARTS, parsePlan, shouldKeepPlan, type Plan } from '@/lib/plan';
import {
  amountToInput,
  editAmountInput,
  formatInputAmount,
  formatRupees,
  isValidAmount,
  MAX_AMOUNT,
  MAX_AMOUNT_TEXT,
  parseAmount,
} from '@/lib/format';
import { MAX_TEXT, readPrefill, stripPrefill, type ParamSource } from '@/lib/prefill';
import { parseRecent, rememberMerchant, type RecentMerchant } from '@/lib/recent';
import { readJson, writeJson } from '@/lib/storage';
import { DEFAULT_MAX } from '@/lib/site';
import { collapseText, EXAMPLE_PARTS, EXAMPLE_TOTAL } from '@/lib/strip';
import { amountReading, amountSize, previewText, resumeNotice, splitLabel } from '@/lib/splitter';
import { TukdaStrip } from '@/components/TukdaStrip';
import { PlanResult } from './PlanResult';
import s from './Splitter.module.css';

const PLAN_KEY = 'tukdapay/plan';
const RECENT_KEY = 'tukdapay/recent';

type Field = 'total' | 'pa' | 'max';
type Touched = Partial<Record<Field, boolean>>;

interface Initial {
  total: string;
  pa: string;
  pn: string;
  note: string;
  max: string;
  touched: Touched;
  plan: Plan | null;
  recent: RecentMerchant[];
}

const EMPTY: Initial = { total: '', pa: '', pn: '', note: '', max: amountToInput(DEFAULT_MAX), touched: {}, plan: null, recent: [] };

/**
 * Browser only. A URL prefill (?amount=&pa=&pn=&note=&max=) starts a fresh form and
 * leaves the saved plan in storage untouched; without one, the saved plan comes back.
 */
function loadInitial(params: ParamSource): Initial {
  const recent = parseRecent(readJson(RECENT_KEY));
  const prefill = readPrefill(params);
  if (prefill.present) {
    return {
      ...EMPTY,
      recent,
      total: prefill.amount === undefined ? '' : amountToInput(prefill.amount),
      pa: prefill.pa ?? '',
      pn: prefill.pn ?? '',
      note: prefill.note ?? '',
      max: amountToInput(prefill.max ?? DEFAULT_MAX),
      // Point out a bad prefilled value (say, a mistyped UPI ID) straight away.
      touched: { total: prefill.amount !== undefined, pa: prefill.pa !== undefined, max: prefill.max !== undefined },
    };
  }
  const plan = parsePlan(readJson(PLAN_KEY));
  if (!plan) return { ...EMPTY, recent };
  const { input } = plan;
  return {
    ...EMPTY,
    recent,
    plan,
    total: amountToInput(input.total),
    pa: input.pa,
    pn: input.pn,
    note: input.note,
    max: amountToInput(input.maxPerTxn),
  };
}

const subscribeNothing = () => () => {};

/** Class names from the page's grid, so each part of the splitter lands in its place. */
export interface SplitterLayout {
  form?: string;
  /** Holds the result, or `howItWorks` while there is no plan. */
  side?: string;
  /** Holds `howItWorks` once a plan has taken the side column. */
  below?: string;
}

export interface SplitterProps {
  /** The server-rendered "How it works" section. It is rendered in one place at a time. */
  howItWorks?: ReactNode;
  layout?: SplitterLayout;
}

/**
 * The form depends on localStorage and the URL, which only exist in the browser.
 * Until the page has hydrated, render the empty form as an inert placeholder (so the
 * static HTML has the right shape), then swap in the live form, which reads both once.
 */
export function Splitter(props: SplitterProps) {
  const hydrated = useSyncExternalStore(subscribeNothing, () => true, () => false);
  return hydrated ? <LiveSplitter {...props} /> : <SplitterForm initial={EMPTY} placeholder {...props} />;
}

/**
 * Reads the URL and storage once per mount. If the prefill changes while the page stays
 * mounted (back/forward, the logo link, or a link to /?amount= from this page), start again
 * from the new URL, just as a reload would. The one exception is the form stripping the
 * prefill itself after a split, which keeps the form and its new plan as they are.
 */
function LiveSplitter(props: SplitterProps) {
  const params = useSearchParams();
  const prefill = readPrefill(params);
  const prefillKey = prefill.present ? JSON.stringify(prefill) : '';
  const [seenKey, setSeenKey] = useState(prefillKey);
  const [generation, setGeneration] = useState(0);
  const [stripping, setStripping] = useState(false);
  if (prefillKey !== seenKey) {
    setSeenKey(prefillKey);
    if (prefillKey || !stripping) setGeneration((g) => g + 1);
    setStripping(false);
  }
  return <LoadedForm key={generation} params={params} onStripPrefill={() => setStripping(true)} {...props} />;
}

function LoadedForm({ params, ...rest }: SplitterProps & { params: ParamSource; onStripPrefill: () => void }) {
  const [initial] = useState(() => loadInitial(params));
  return <SplitterForm initial={initial} {...rest} />;
}

/** Bring the plan into view and move focus to its heading. */
function revealResult(section: HTMLElement | null, heading: HTMLHeadingElement | null) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  section?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  heading?.focus({ preventScroll: true });
}

/**
 * Apply a change to an amount field without letting React's rewrite of the value throw the
 * caret to the end (say, when a second "." is ignored).
 */
function changeAmount(e: React.ChangeEvent<HTMLInputElement>, before: string, set: (value: string) => void) {
  const el = e.target;
  const raw = el.value;
  const { value, caret } = editAmountInput(before, raw, el.selectionStart ?? raw.length);
  set(value);
  if (value !== raw) requestAnimationFrame(() => el.setSelectionRange(caret, caret));
}

function FieldError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className={s.error}>
      <svg className={s.errorIcon} viewBox="0 0 18 18" aria-hidden="true" focusable="false">
        <circle cx="9" cy="9" r="7.75" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M9 4.9v4.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle cx="9" cy="12.8" r="1.15" fill="currentColor" />
      </svg>
      <span>{children}</span>
    </p>
  );
}

const EXAMPLE_TEXT = `Example: ${formatRupees(EXAMPLE_TOTAL)} becomes ${collapseText(EXAMPLE_PARTS)}.`;

const cx = (...names: (string | false | undefined)[]) => names.filter(Boolean).join(' ');

interface FormProps extends SplitterProps {
  initial: Initial;
  placeholder?: boolean;
  /** Called just before the form removes the prefill params from the URL. */
  onStripPrefill?: () => void;
}

function SplitterForm({ initial, placeholder = false, onStripPrefill, howItWorks, layout = {} }: FormProps) {
  const [total, setTotal] = useState(initial.total);
  const [pa, setPa] = useState(initial.pa);
  const [pn, setPn] = useState(initial.pn);
  const [note, setNote] = useState(initial.note);
  const [max, setMax] = useState(initial.max);
  const [touched, setTouched] = useState<Touched>(initial.touched);
  const [plan, setPlan] = useState<Plan | null>(initial.plan);
  const [recent, setRecent] = useState(initial.recent);
  const [advancedOpen, setAdvancedOpen] = useState(() => parseAmount(initial.max) !== DEFAULT_MAX);
  // True while the plan on screen was read back from storage rather than split in this visit.
  const [restored, setRestored] = useState(initial.plan !== null);
  // Plans split in this visit. Each new one plays "the cut" on the result strip; a restored plan never does.
  const [cuts, setCuts] = useState(0);

  const totalRef = useRef<HTMLInputElement>(null);
  const paRef = useRef<HTMLInputElement>(null);
  const maxRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const focusResult = useRef(false);

  // After a split: bring the result into view and move focus to its heading.
  useEffect(() => {
    if (!plan || !focusResult.current) return;
    focusResult.current = false;
    revealResult(resultRef.current, headingRef.current);
  }, [plan]);

  const totalNum = parseAmount(total);
  const maxNum = parseAmount(max);
  const partCount = countParts(totalNum, maxNum);
  const tooManyParts = partCount > MAX_PARTS;
  const tooLarge = totalNum > MAX_AMOUNT;
  const errors: Record<Field, string | null> = {
    total: tooLarge
      ? `Enter an amount up to ${MAX_AMOUNT_TEXT}.`
      : !isValidAmount(totalNum)
        ? 'Enter the amount you need to pay.'
        : tooManyParts
          ? `That would be ${partCount.toLocaleString('en-IN')} payments. Use a smaller amount or a higher max per payment to keep it to ${MAX_PARTS} or fewer.`
          : null,
    pa: isValidVpa(pa.trim()) ? null : 'Enter the merchant’s UPI ID, like shopname@okaxis.',
    max:
      maxNum > MAX_AMOUNT
        ? `Max per payment must be ${MAX_AMOUNT_TEXT} or less.`
        : isValidAmount(maxNum)
          ? null
          : 'Max per payment must be more than ₹0.',
  };
  const valid = !errors.total && !errors.pa && !errors.max;
  // Errors show once a field has been left (or on a split attempt). Too many parts, or an
  // amount over the cap, shows straight away in place of the live preview it replaces.
  const shows = (f: Field) => !!errors[f] && (!!touched[f] || (f === 'total' && (tooManyParts || tooLarge)));
  const preview = partCount > 0 && !tooManyParts ? splitAmount(totalNum, maxNum) : null;
  const totalEmpty = total.trim() === '';
  const totalError = shows('total');
  const reading = amountReading({ empty: totalEmpty, parts: preview, error: totalError });
  const notice = resumeNotice(plan, restored);

  const leave = (f: Field) => setTouched((t) => ({ ...t, [f]: true }));
  // Once a field is fine, editing it again hides its error until it is left again.
  const editing = (f: Field) => {
    if (!errors[f]) setTouched((t) => ({ ...t, [f]: false }));
  };

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (placeholder) return;
    const firstInvalid = (['total', 'pa', 'max'] as const).find((f) => errors[f]);
    if (firstInvalid) {
      flushSync(() => {
        setTouched({ total: true, pa: true, max: true });
        if (errors.max) setAdvancedOpen(true);
      });
      const inputs = { total: totalRef, pa: paRef, max: maxRef };
      inputs[firstInvalid].current?.focus();
      return;
    }

    setTotal(formatInputAmount(total));
    setMax(formatInputAmount(max));
    setRestored(false);
    const input = { total: totalNum, pa: pa.trim(), pn: pn.trim(), note: note.trim(), maxPerTxn: maxNum };
    // Splitting the same payment again (say, tapping Split above a restored plan) keeps its paid ticks.
    const next = shouldKeepPlan(plan, input) ? plan : createPlan(input);
    if (next === plan) {
      revealResult(resultRef.current, headingRef.current);
    } else {
      focusResult.current = true;
      setCuts((c) => c + 1);
      setPlan(next);
    }
    const saved = writeJson(PLAN_KEY, next);
    const list = rememberMerchant(recent, { pa: input.pa, pn: input.pn });
    setRecent(list);
    writeJson(RECENT_KEY, list);

    // Drop ?amount= and friends so a reload (say, after switching to the UPI app) shows this plan.
    // If the plan couldn't be saved, a reload can't show it, so keep them to at least refill the form.
    const { pathname, search, hash } = window.location;
    const rest = stripPrefill(search);
    if (saved && rest !== search) {
      onStripPrefill?.();
      window.history.replaceState(null, '', `${pathname}${rest}${hash}`);
    }
  }

  function togglePaid(index: number, paid: boolean) {
    if (!plan) return;
    const next = { ...plan, parts: plan.parts.map((p) => (p.index === index ? { ...p, paid } : p)) };
    setPlan(next);
    writeJson(PLAN_KEY, next);
  }

  function startOver() {
    setPlan(null);
    setRestored(false);
    writeJson(PLAN_KEY, null);
    setTotal('');
    setPa('');
    setPn('');
    setNote('');
    setMax(amountToInput(DEFAULT_MAX));
    setTouched({});
    setAdvancedOpen(false);
    totalRef.current?.focus();
  }

  const submitHint = [errors.total, errors.pa, errors.max].filter(Boolean).join(' ');

  return (
    <>
      <form
        className={cx(s.form, layout.form)}
        onSubmit={submit}
        noValidate
        inert={placeholder}
        aria-busy={placeholder || undefined}
      >
        {notice && (
          <p className={s.resume}>
            <span>{notice}</span>{' '}
            <a
              href="#result-title"
              onClick={(e) => {
                e.preventDefault();
                revealResult(resultRef.current, headingRef.current);
              }}
            >
              Go to payments
            </a>
          </p>
        )}

        {/* The instrument: the amount and the strip it cuts into. A click anywhere on it goes to the amount. */}
        <div
          className={s.instrument}
          data-invalid={totalError}
          onClick={(e) => {
            if (e.target !== totalRef.current) totalRef.current?.focus();
          }}
        >
          <div className={s.instHead}>
            <label className={s.label} htmlFor="total">Amount</label>
            <span className={s.reading} aria-hidden="true">{reading}</span>
          </div>
          <div className={s.amountRow}>
            <span className={`${s.rupee} money`} aria-hidden="true">₹</span>
            <input
              ref={totalRef}
              id="total"
              className={s.amountInput}
              data-size={amountSize(total)}
              inputMode="decimal"
              autoComplete="off"
              placeholder="0"
              value={total}
              onChange={(e) => {
                changeAmount(e, total, setTotal);
                editing('total');
              }}
              onBlur={() => {
                setTotal(formatInputAmount);
                leave('total');
              }}
              aria-invalid={totalError}
              aria-describedby={totalError ? 'total-error' : totalEmpty ? 'total-example' : 'total-hint'}
            />
          </div>
          {/* One slot for the example, the live split or the amount error, so nothing below jumps as they swap. */}
          <div className={s.stripSlot}>
            <div id="total-hint" aria-live="polite">
              {totalError ? (
                <FieldError id="total-error">{errors.total}</FieldError>
              ) : preview ? (
                <span className="sr-only">{previewText(preview)}</span>
              ) : null}
            </div>
            {!totalError &&
              (totalEmpty ? (
                <>
                  <p id="total-example" className="sr-only">{EXAMPLE_TEXT}</p>
                  <TukdaStrip variant="ghost" />
                </>
              ) : (
                preview && <TukdaStrip variant="preview" parts={preview} />
              ))}
          </div>
        </div>

        <div className={s.field}>
          <label className={s.label} htmlFor="pa">Merchant UPI ID</label>
          <input
            ref={paRef}
            id="pa"
            className={s.input}
            inputMode="email"
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            placeholder="shopname@okaxis"
            value={pa}
            onChange={(e) => {
              setPa(e.target.value);
              editing('pa');
            }}
            onBlur={() => leave('pa')}
            aria-invalid={shows('pa')}
            aria-describedby={shows('pa') ? 'pa-error' : undefined}
          />
          {shows('pa') && <FieldError id="pa-error">{errors.pa}</FieldError>}
          {recent.length > 0 && (
            <div className={s.recent} role="group" aria-label="Recent merchants">
              {recent.map((r) => (
                <button
                  key={r.pa.toLowerCase()}
                  type="button"
                  className={s.recentChip}
                  title={r.pn ? `${r.pn} ${r.pa}` : r.pa}
                  onClick={() => {
                    setPa(r.pa);
                    setPn(r.pn);
                  }}
                >
                  {r.pn && <span className={s.chipName}>{r.pn} </span>}
                  <span className={s.chipId}>{r.pa}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={s.row}>
          <div className={s.field}>
            <label className={s.label} htmlFor="pn">
              <span className={s.nowrap}>Merchant name</span> <span className={s.opt}>optional</span>
            </label>
            <input
              id="pn"
              className={s.input}
              placeholder="Sri Tea Stall"
              maxLength={MAX_TEXT}
              value={pn}
              onChange={(e) => setPn(e.target.value)}
            />
          </div>
          <div className={s.field}>
            <label className={s.label} htmlFor="note">
              <span className={s.nowrap}>Note</span> <span className={s.opt}>optional</span>
            </label>
            <input
              id="note"
              className={s.input}
              placeholder="Order 42"
              maxLength={MAX_TEXT}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>

        <details className={s.advanced} open={advancedOpen} onToggle={(e) => setAdvancedOpen(e.currentTarget.open)}>
          <summary>
            <span>Max per payment</span>
            {isValidAmount(maxNum) && <span className={`${s.summaryValue} money`}>{formatRupees(maxNum)}</span>}
            <svg className={s.chevron} width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
              <path d="M3.5 6l4.5 4.5L12.5 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </summary>
          <div className={`${s.field} ${s.advancedBody}`}>
            <label className={s.label} htmlFor="max">Each payment stays at or under</label>
            <div className={s.maxWrap} data-invalid={shows('max')}>
              <span className={`${s.maxRupee} money`} aria-hidden="true">₹</span>
              <input
                ref={maxRef}
                id="max"
                className={s.maxInput}
                inputMode="decimal"
                autoComplete="off"
                value={max}
                onChange={(e) => {
                  changeAmount(e, max, setMax);
                  editing('max');
                }}
                onBlur={() => {
                  setMax(formatInputAmount);
                  leave('max');
                }}
                aria-invalid={shows('max')}
                aria-describedby={shows('max') ? 'max-error' : undefined}
              />
            </div>
            {shows('max') && <FieldError id="max-error">{errors.max}</FieldError>}
          </div>
        </details>

        {/* aria-disabled rather than disabled: it stays focusable, and pressing it explains what's missing. */}
        <button
          type="submit"
          className={`btn btn-primary btn-lg ${s.submit}`}
          aria-disabled={!valid}
          aria-describedby={valid ? undefined : 'submit-hint'}
        >
          {splitLabel(valid, partCount)}
        </button>
        {!valid && <span id="submit-hint" className="sr-only">{submitHint}</span>}
      </form>

      <div className={cx(s.side, layout.side)}>
        {plan ? (
          <PlanResult
            plan={plan}
            sectionRef={resultRef}
            headingRef={headingRef}
            onTogglePaid={togglePaid}
            onStartOver={startOver}
            cut={cuts}
          />
        ) : (
          howItWorks
        )}
      </div>
      {plan && howItWorks && <div className={layout.below}>{howItWorks}</div>}
    </>
  );
}
