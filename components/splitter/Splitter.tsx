'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { splitAmount } from '@/lib/split';
import { isValidVpa } from '@/lib/upi';
import { createPlan, breakdownText, type Plan } from '@/lib/plan';
import { formatInr, formatInputAmount, parseAmount } from '@/lib/format';
import { readJson, writeJson } from '@/lib/storage';
import { DEFAULT_MAX, SITE_URL } from '@/lib/site';
import { QrCode } from './QrCode';
import s from './Splitter.module.css';

const PLAN_KEY = 'tukdapay/plan';
const RECENT_KEY = 'tukdapay/recent';
type Recent = { pa: string; pn: string };

function rememberMerchant(list: Recent[], m: Recent): Recent[] {
  return [m, ...list.filter((r) => r.pa !== m.pa)].slice(0, 5);
}

export function Splitter() {
  const params = useSearchParams();
  const [total, setTotal] = useState('');
  const [pa, setPa] = useState('');
  const [pn, setPn] = useState('');
  const [note, setNote] = useState('');
  const [max, setMax] = useState(String(DEFAULT_MAX));
  const [touched, setTouched] = useState<{ total?: boolean; pa?: boolean }>({});
  const [plan, setPlan] = useState<Plan | null>(null);
  const [recent, setRecent] = useState<Recent[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const resultRef = useRef<HTMLElement>(null);
  const focusResult = useRef(false);

  // Restore saved plan / recent merchants, then apply URL prefill on top.
  useEffect(() => {
    const saved = readJson<Plan>(PLAN_KEY);
    if (saved?.parts?.length) {
      setPlan(saved);
      setTotal(formatInputAmount(String(saved.input.total)));
      setPa(saved.input.pa);
      setPn(saved.input.pn ?? '');
      setNote(saved.input.note ?? '');
      setMax(String(saved.input.maxPerTxn));
    }
    setRecent(readJson<Recent[]>(RECENT_KEY) ?? []);

    const q = (k: string) => params.get(k)?.trim() ?? '';
    if (q('amount')) setTotal(formatInputAmount(q('amount')));
    if (q('pa')) setPa(q('pa'));
    if (q('pn')) setPn(q('pn'));
    if (q('note')) setNote(q('note'));
    if (q('max')) setMax(q('max'));
  }, [params]);

  useEffect(() => {
    if (plan && focusResult.current) {
      focusResult.current = false;
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      resultRef.current?.querySelector('h2')?.focus();
    }
  }, [plan]);

  const totalNum = parseAmount(total);
  const maxNum = parseAmount(max);
  const totalError = !Number.isFinite(totalNum) || totalNum <= 0 ? 'Enter the amount you need to pay.' : null;
  const maxError = !Number.isFinite(maxNum) || maxNum <= 0 ? 'Max per payment must be more than ₹0.' : null;
  const paError = !isValidVpa(pa.trim()) ? 'Enter the merchant’s UPI ID, like shopname@okaxis.' : null;
  const valid = !totalError && !maxError && !paError;

  const preview = useMemo(() => (!totalError && !maxError ? splitAmount(totalNum, maxNum) : null), [totalNum, maxNum, totalError, maxError]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ total: true, pa: true });
    if (!valid) return;
    const input = { total: totalNum, pa: pa.trim(), pn: pn.trim(), note: note.trim(), maxPerTxn: maxNum };
    const next = createPlan(input);
    focusResult.current = true;
    setPlan(next);
    writeJson(PLAN_KEY, next);
    const list = rememberMerchant(recent, { pa: input.pa, pn: input.pn });
    setRecent(list);
    writeJson(RECENT_KEY, list);
  }

  function togglePaid(i: number, paid: boolean) {
    if (!plan) return;
    const next = { ...plan, parts: plan.parts.map((p) => (p.index === i ? { ...p, paid } : p)) };
    setPlan(next);
    writeJson(PLAN_KEY, next);
  }

  function reset() {
    setPlan(null);
    writeJson(PLAN_KEY, null);
    setTotal(''); setPa(''); setPn(''); setNote(''); setMax(String(DEFAULT_MAX));
    setTouched({});
    document.getElementById('total')?.focus();
  }

  async function copy() {
    if (!plan) return;
    try {
      await navigator.clipboard.writeText(breakdownText(plan));
      setCopied('Copied');
    } catch {
      setCopied('Copy failed');
    }
    setTimeout(() => setCopied(null), 1500);
  }

  const paidCount = plan?.parts.filter((p) => p.paid).length ?? 0;
  const nextPart = plan?.parts.find((p) => !p.paid) ?? null;
  const waText = plan ? `${breakdownText(plan)}\n\nMade with ${SITE_URL}` : '';

  return (
    <>
      <form className={s.form} onSubmit={submit} noValidate>
        <div className={s.field}>
          <label className={s.label} htmlFor="total">Amount</label>
          <div className={s.amountWrap} data-invalid={touched.total && !!totalError}>
            <span className={s.rupee} aria-hidden="true">₹</span>
            <input
              id="total" className={s.amountInput} inputMode="decimal" autoComplete="off" placeholder="0"
              value={total}
              onChange={(e) => setTotal(formatInputAmount(e.target.value))}
              onBlur={() => setTouched((t) => ({ ...t, total: true }))}
              aria-invalid={touched.total && !!totalError}
              aria-describedby="total-hint"
            />
          </div>
          <div id="total-hint" className={s.preview} aria-live="polite">
            {touched.total && totalError ? (
              <p className={s.error}>{totalError}</p>
            ) : preview && preview.length > 1 ? (
              <>
                <span className={s.previewLabel}>{preview.length} payments:</span>
                {preview.map((c, i) => (
                  <span key={i} style={{ display: 'contents' }}>
                    <span className={`${s.chip} ${i === preview.length - 1 ? s.last : ''}`}>{formatInr(c).replace('.00', '')}</span>
                    {i < preview.length - 1 && <span className={s.plus} aria-hidden="true">+</span>}
                  </span>
                ))}
              </>
            ) : preview ? (
              <span className={s.previewLabel}>Under the limit — one payment</span>
            ) : null}
          </div>
        </div>

        <div className={s.field}>
          <label className={s.label} htmlFor="pa">Merchant UPI ID</label>
          <input
            id="pa" className={s.input} autoCapitalize="off" autoCorrect="off" spellCheck={false} placeholder="shopname@okaxis"
            value={pa} onChange={(e) => setPa(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, pa: true }))}
            aria-invalid={touched.pa && !!paError}
            aria-describedby={touched.pa && paError ? 'pa-error' : undefined}
          />
          {touched.pa && paError && <p id="pa-error" className={s.error}>{paError}</p>}
          {recent.length > 0 && (
            <div className={s.recent} aria-label="Recent merchants">
              {recent.map((r) => (
                <button key={r.pa} type="button" className={s.recentChip} onClick={() => { setPa(r.pa); setPn(r.pn); }}>
                  {r.pn ? `${r.pn} · ${r.pa}` : r.pa}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={s.row}>
          <div className={s.field}>
            <label className={s.label} htmlFor="pn">Merchant name <small>optional</small></label>
            <input id="pn" className={s.input} placeholder="Sri Tea Stall" value={pn} onChange={(e) => setPn(e.target.value)} />
          </div>
          <div className={s.field}>
            <label className={s.label} htmlFor="note">Note <small>optional</small></label>
            <input id="note" className={s.input} placeholder="Order 42" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>

        <details className={s.advanced} open={maxNum !== DEFAULT_MAX}>
          <summary>Max per payment</summary>
          <div className={s.field}>
            <label className={s.label} htmlFor="max">Each payment stays at or under</label>
            <div className={`${s.amountWrap} ${s.small}`} data-invalid={!!maxError}>
              <span className={s.rupee} aria-hidden="true">₹</span>
              <input id="max" className={s.amountInput} inputMode="decimal" value={max} onChange={(e) => setMax(e.target.value)} aria-invalid={!!maxError} />
            </div>
            {maxError && <p className={s.error}>{maxError}</p>}
          </div>
        </details>

        <button type="submit" className="btn btn-primary">Split into payments</button>
      </form>

      {plan && (
        <section ref={resultRef} className={s.result} aria-labelledby="result-title">
          <header className={s.resultHead}>
            <h2 id="result-title" tabIndex={-1}>
              {plan.parts.length} payment{plan.parts.length === 1 ? '' : 's'} for {formatInr(plan.input.total)}
            </h2>
            <p>{plan.input.pn ? `to ${plan.input.pn} (${plan.input.pa})` : `to ${plan.input.pa}`}</p>
            <div className={s.progress} role="progressbar" aria-valuemin={0} aria-valuemax={plan.parts.length} aria-valuenow={paidCount}>
              <span style={{ width: `${(paidCount / plan.parts.length) * 100}%` }} />
            </div>
            <p className={s.progressText} aria-live="polite">
              {paidCount === plan.parts.length ? `All ${plan.parts.length} paid` : `${paidCount} of ${plan.parts.length} paid`}
            </p>
            {nextPart ? (
              <a className={`btn btn-primary ${s.next}`} href={nextPart.url}>
                Pay Part {nextPart.index + 1} of {plan.parts.length} · {formatInr(nextPart.amount)}
              </a>
            ) : (
              <div className={s.done}>Done — all parts paid. Share the breakdown with the shop if they need it.</div>
            )}
          </header>

          <ol className={s.parts}>
            {plan.parts.map((p) => (
              <li key={p.index} className={`${s.part} ${p.paid ? s.isPaid : ''} ${nextPart?.index === p.index ? s.isNext : ''}`}>
                <span className={s.partAmount}>{formatInr(p.amount)}</span>
                <span className={s.partLabel}>Part {p.index + 1} of {plan.parts.length}</span>
                <a className={`btn btn-primary ${s.partPay}`} href={p.url}>{p.paid ? 'Pay again' : 'Pay'}</a>
                <QrCode value={p.url} className={s.partQr} />
                <label className={s.partPaid}>
                  <input type="checkbox" checked={p.paid} onChange={(e) => togglePaid(p.index, e.target.checked)} /> Paid
                </label>
              </li>
            ))}
          </ol>

          <div className={s.actions}>
            <a className="btn btn-secondary" href={`https://wa.me/?text=${encodeURIComponent(waText)}`} target="_blank" rel="noopener noreferrer">
              Send on WhatsApp
            </a>
            <button type="button" className="btn btn-secondary" onClick={copy}>{copied ?? 'Copy breakdown'}</button>
            <button type="button" className="btn btn-tertiary" onClick={reset}>Start over</button>
          </div>

          <p className={s.fine}>
            Each Pay button opens your UPI app with the amount and note filled in. This page can&apos;t see whether a
            payment went through, so tick each one off yourself. On a computer, scan the QR with your phone instead.
          </p>
        </section>
      )}
    </>
  );
}
