import { isValidAmount, numberRuns, parseAmount } from './format.ts';
import { resumablePlan, type Plan, type PlanInput } from './plan.ts';
import { DEFAULT_MAX } from './site.ts';

/** Query params that prefill the splitter, e.g. /?amount=14999&pa=shop@okaxis */
export const PREFILL_KEYS = ['amount', 'pa', 'pn', 'note', 'max'] as const;

/**
 * The most kept from a prefilled name or note, in UTF-16 code units: what the form's name and note
 * fields count with maxLength, so a link can't fill in more than anyone could type.
 */
export const MAX_TEXT = 100;

// Cut between characters as people see them, so a cut never splits an emoji or an accent from its letter.
// Browsers without Intl.Segmenter (Firefox before 125) cut between code points instead.
const graphemes = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter('en', { granularity: 'grapheme' }) : null;

/** The whole characters of `value` that fit in `max` UTF-16 code units. */
function clip(value: string, max: number): string {
  const chars = graphemes ? Array.from(graphemes.segment(value), (g) => g.segment) : Array.from(value);
  let out = '';
  for (const char of chars) {
    if (out.length + char.length > max) break;
    out += char;
  }
  return out;
}

export interface Prefill {
  /** True when at least one usable value was found. */
  present: boolean;
  amount?: number;
  max?: number;
  pa?: string;
  pn?: string;
  note?: string;
}

export interface ParamSource {
  get(key: string): string | null;
}

function text(source: ParamSource, key: string): string | undefined {
  const value = source.get(key)?.trim();
  if (!value) return undefined;
  return clip(value, MAX_TEXT).trimEnd();
}

function amount(source: ParamSource, key: string): number | undefined {
  const raw = source.get(key)?.trim();
  if (!raw) return undefined;
  // "5000x2" or "2.5e4" isn't one amount; running the digits together would make a different one.
  if (numberRuns(raw).length !== 1) return undefined;
  const n = parseAmount(raw);
  return isValidAmount(n) ? Math.round(n * 100) / 100 : undefined;
}

/** Read the prefill from URL search params. Only usable values are returned. */
export function readPrefill(source: ParamSource): Prefill {
  const prefill: Prefill = { present: false };
  const total = amount(source, 'amount');
  const pa = text(source, 'pa');
  const pn = text(source, 'pn');
  const note = text(source, 'note');
  const max = amount(source, 'max');
  if (total !== undefined) prefill.amount = total;
  if (pa !== undefined) prefill.pa = pa;
  if (pn !== undefined) prefill.pn = pn;
  if (note !== undefined) prefill.note = note;
  if (max !== undefined) prefill.max = max;
  prefill.present = Object.keys(prefill).length > 1;
  return prefill;
}

/**
 * The payment a prefill describes, as the form would split it once it has both the amount and the
 * UPI ID (the name and note default to empty, the max to DEFAULT_MAX). Null otherwise.
 */
export function prefillInput(prefill: Prefill): PlanInput | null {
  if (prefill.amount === undefined || prefill.pa === undefined) return null;
  return {
    total: prefill.amount,
    pa: prefill.pa,
    pn: prefill.pn ?? '',
    note: prefill.note ?? '',
    maxPerTxn: prefill.max ?? DEFAULT_MAX,
  };
}

export interface OpeningPlan {
  plan: Plan | null;
  /**
   * True when a prefill link brought the saved plan back. The page then drops the prefill from the URL, as a split
   * does: once the last part is ticked the link no longer resumes the plan, so a reload with it would hide the plan.
   */
  fromLink: boolean;
}

/**
 * The plan a page load shows. Without a prefill, the saved plan. With one, the saved plan only when the link is for
 * that payment and a part is still to pay (the same link opened again from a chat, mid-way through paying); any other
 * link fills in a fresh form, and the saved plan stays in storage untouched.
 */
export function openingPlan(prefill: Prefill, saved: Plan | null): OpeningPlan {
  if (!prefill.present) return { plan: saved, fromLink: false };
  const linked = prefillInput(prefill);
  const plan = linked && resumablePlan(saved, linked);
  return { plan, fromLink: plan !== null };
}

/** Remove the prefill params from a query string, keeping any others. Returns "" or "?rest". */
export function stripPrefill(search: string): string {
  const params = new URLSearchParams(search);
  for (const key of PREFILL_KEYS) params.delete(key);
  const rest = params.toString();
  return rest ? `?${rest}` : '';
}
