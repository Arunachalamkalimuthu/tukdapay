'use client';
import { Fragment, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { flushSync } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import { splitAmount } from '@/lib/split';
import { isValidVpa } from '@/lib/upi';
import { countParts, createPlan, MAX_PARTS, parsePlan, shouldKeepPlan, type Plan } from '@/lib/plan';
import {
  amountToInput,
  editAmountInput,
  formatInputAmount,
  formatInr,
  isValidAmount,
  MAX_AMOUNT,
  MAX_AMOUNT_TEXT,
  parseAmount,
} from '@/lib/format';
import { MAX_TEXT, readPrefill, stripPrefill, type ParamSource } from '@/lib/prefill';
import { parseRecent, rememberMerchant, type RecentMerchant } from '@/lib/recent';
import { readJson, writeJson } from '@/lib/storage';
import { DEFAULT_MAX } from '@/lib/site';
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

/**
 * The form depends on localStorage and the URL, which only exist in the browser.
 * Until the page has hydrated, render the empty form as an inert placeholder (so the
 * static HTML has the right shape), then swap in the live form, which reads both once.
 */
export function Splitter() {
  const hydrated = useSyncExternalStore(subscribeNothing, () => true, () => false);
  return hydrated ? <LiveSplitter /> : <SplitterForm initial={EMPTY} placeholder />;
}

/**
 * Reads the URL and storage once per mount. If the prefill changes while the page stays
 * mounted (back/forward, the logo link, or a link to /?amount= from this page), start again
 * from the new URL, just as a reload would. The one exception is the form stripping the
 * prefill itself after a split, which keeps the form and its new plan as they are.
 */
function LiveSplitter() {
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
  return <LoadedForm key={generation} params={params} onStripPrefill={() => setStripping(true)} />;
}

function LoadedForm({ params, onStripPrefill }: { params: ParamSource; onStripPrefill: () => void }) {
  const [initial] = useState(() => loadInitial(params));
  return <SplitterForm initial={initial} onStripPrefill={onStripPrefill} />;
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

interface FormProps {
  initial: Initial;
  placeholder?: boolean;
  /** Called just before the form removes the prefill params from the URL. */
  onStripPrefill?: () => void;
}

function SplitterForm({ initial, placeholder = false, onStripPrefill }: FormProps) {
  const [total, setTotal] = useState(initial.total);
  const [pa, setPa] = useState(initial.pa);
  const [pn, setPn] = useState(initial.pn);
  const [note, setNote] = useState(initial.note);
  const [max, setMax] = useState(initial.max);
  const [touched, setTouched] = useState<Touched>(initial.touched);
  const [plan, setPlan] = useState<Plan | null>(initial.plan);
  const [recent, setRecent] = useState(initial.recent);
  const [advancedOpen, setAdvancedOpen] = useState(() => parseAmount(initial.max) !== DEFAULT_MAX);

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
    const input = { total: totalNum, pa: pa.trim(), pn: pn.trim(), note: note.trim(), maxPerTxn: maxNum };
    // Splitting the same payment again (say, tapping Split above a restored plan) keeps its paid ticks.
    const next = shouldKeepPlan(plan, input) ? plan : createPlan(input);
    if (next === plan) {
      revealResult(resultRef.current, headingRef.current);
    } else {
      focusResult.current = true;
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
      <form className={s.form} onSubmit={submit} noValidate inert={placeholder} aria-busy={placeholder || undefined}>
        <div className={s.field}>
          <label className={s.label} htmlFor="total">Amount</label>
          <div className={s.amountWrap} data-invalid={shows('total')}>
            <span className={s.rupee} aria-hidden="true">₹</span>
            <input
              ref={totalRef}
              id="total"
              className={s.amountInput}
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
              aria-invalid={shows('total')}
              aria-describedby={shows('total') ? 'total-error' : 'total-hint'}
            />
          </div>
          <div id="total-hint" className={s.preview} aria-live="polite">
            {shows('total') ? (
              <p id="total-error" className={s.error}>{errors.total}</p>
            ) : preview ? (
              <SplitPreview chunks={preview} />
            ) : null}
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
          {shows('pa') && <p id="pa-error" className={s.error}>{errors.pa}</p>}
          {recent.length > 0 && (
            <div className={s.recent} role="group" aria-label="Recent merchants">
              {recent.map((r) => (
                <button
                  key={r.pa.toLowerCase()}
                  type="button"
                  className={s.recentChip}
                  onClick={() => {
                    setPa(r.pa);
                    setPn(r.pn);
                  }}
                >
                  {r.pn ? `${r.pn} · ${r.pa}` : r.pa}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={s.row}>
          <div className={s.field}>
            <label className={s.label} htmlFor="pn">Merchant name <small>optional</small></label>
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
            <label className={s.label} htmlFor="note">Note <small>optional</small></label>
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
          <summary>Max per payment</summary>
          <div className={s.field}>
            <label className={s.label} htmlFor="max">Each payment stays at or under</label>
            <div className={`${s.amountWrap} ${s.small}`} data-invalid={shows('max')}>
              <span className={s.rupee} aria-hidden="true">₹</span>
              <input
                ref={maxRef}
                id="max"
                className={s.amountInput}
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
            {shows('max') && <p id="max-error" className={s.error}>{errors.max}</p>}
          </div>
        </details>

        {/* aria-disabled rather than disabled: it stays focusable, and pressing it explains what's missing. */}
        <button
          type="submit"
          className={`btn btn-primary ${s.submit}`}
          aria-disabled={!valid}
          aria-describedby={valid ? undefined : 'submit-hint'}
        >
          Split into payments
        </button>
        {!valid && <span id="submit-hint" className={s.srOnly}>{submitHint}</span>}
      </form>

      {plan && (
        <PlanResult
          plan={plan}
          sectionRef={resultRef}
          headingRef={headingRef}
          onTogglePaid={togglePaid}
          onStartOver={startOver}
        />
      )}
    </>
  );
}

const chipAmount = (n: number) => formatInr(n).replace(/\.00$/, '');

/** "3 payments: ₹1,999 + ₹1,999 + ₹1,002"; longer splits collapse to "25 × ₹1,999 + ₹25". */
function SplitPreview({ chunks }: { chunks: number[] }) {
  const n = chunks.length;
  if (n === 1) return <span className={s.previewLabel}>Under the limit — one payment</span>;
  const first = chunks[0];
  const last = chunks[n - 1];
  const chips =
    n <= 3
      ? chunks.map(chipAmount)
      : last === first
        ? [`${n} × ${chipAmount(first)}`]
        : [`${n - 1} × ${chipAmount(first)}`, chipAmount(last)];
  return (
    <>
      <span className={s.previewLabel}>{n} payments:</span>
      {chips.map((text, i) => (
        <Fragment key={i}>
          <span className={`${s.chip} ${i === chips.length - 1 ? s.last : ''}`}>{text}</span>
          {i < chips.length - 1 && <span className={s.plus} aria-hidden="true">+</span>}
        </Fragment>
      ))}
    </>
  );
}
