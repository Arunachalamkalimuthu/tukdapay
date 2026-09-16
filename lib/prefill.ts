import { isPositiveAmount, parseAmount } from './format.ts';

/** Query params that prefill the splitter, e.g. /?amount=14999&pa=shop@okaxis */
export const PREFILL_KEYS = ['amount', 'pa', 'pn', 'note', 'max'] as const;

const MAX_TEXT = 100;

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
  return Array.from(value).slice(0, MAX_TEXT).join('').trimEnd();
}

function amount(source: ParamSource, key: string): number | undefined {
  const raw = source.get(key)?.trim();
  if (!raw) return undefined;
  const n = parseAmount(raw);
  return isPositiveAmount(n) ? Math.round(n * 100) / 100 : undefined;
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

/** Remove the prefill params from a query string, keeping any others. Returns "" or "?rest". */
export function stripPrefill(search: string): string {
  const params = new URLSearchParams(search);
  for (const key of PREFILL_KEYS) params.delete(key);
  const rest = params.toString();
  return rest ? `?${rest}` : '';
}
