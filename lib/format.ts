const inr = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const grouped = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });

export const formatInr = (n: number) => `₹${inr.format(n)}`;

/** The largest amount the splitter takes (₹100 crore). Far beyond any real split, well within exact paise. */
export const MAX_AMOUNT = 1_00_00_00_000;
export const MAX_AMOUNT_TEXT = '₹100 crore';

/**
 * "Rs.", "Re.", "INR" and "₹" as people write them before (or after) an amount. The dot
 * in "Rs.4999" is part of the currency, not a decimal point, so it goes with it.
 */
const CURRENCY = /(?:rs|re|inr)\.?|₹/gi;

const stripCurrency = (s: string) => s.replace(CURRENCY, '');

/** "₹ 1,00,000" -> 100000, "Rs. 4,999/-" -> 4999. NaN when nothing numeric is left. */
export function parseAmount(s: string): number {
  const cleaned = stripCurrency(s).replace(/[^\d.]/g, '');
  return cleaned === '' ? NaN : Number(cleaned);
}

/** True when `n` is an amount the splitter takes: at least one paisa once rounded, and no more than MAX_AMOUNT. */
export function isValidAmount(n: number): boolean {
  return Number.isFinite(n) && Math.round(n * 100) > 0 && n <= MAX_AMOUNT;
}

/**
 * Clean an amount while the user types, without moving digits around:
 * keeps digits and the user's commas, one ".", and at most two decimals.
 */
export function sanitizeAmountInput(s: string): string {
  let out = '';
  let seenDot = false;
  let decimals = 0;
  for (const ch of stripCurrency(s)) {
    if (ch >= '0' && ch <= '9') {
      if (seenDot) {
        if (decimals === 2) continue;
        decimals++;
      }
      out += ch;
    } else if (ch === '.' && !seenDot) {
      seenDot = true;
      out += ch;
    } else if (ch === ',' && !seenDot) {
      out += ch;
    }
  }
  return out;
}

export interface AmountEdit {
  value: string;
  /** Where the caret belongs in `value`. */
  caret: number;
}

/**
 * Apply one change to an amount field. `before` is what the field held, `after` is what the
 * browser put there, and `caret` is where the browser left the caret (just after whatever was
 * typed or pasted). What was typed or pasted is cleaned up (no letters, spaces or "Rs."), but
 * the digits already in the field are never dropped or moved: a change that would do that,
 * like a second "." or a third decimal typed in the middle, is ignored and the caret stays put.
 */
export function editAmountInput(before: string, after: string, caret: number): AmountEdit {
  const tail = after.slice(caret);
  if (caret < 0 || caret > after.length || !before.endsWith(tail)) {
    // Not a plain insert or delete at the caret: clean up the whole value.
    const value = sanitizeAmountInput(after);
    return { value, caret: value.length };
  }
  // `before` is head + (replaced text) + tail, and `after` is head + (typed text) + tail.
  const limit = Math.min(caret, before.length - tail.length);
  let start = 0;
  while (start < limit && before[start] === after[start]) start++;
  const head = after.slice(0, start);
  const typed = stripCurrency(after.slice(start, caret)).replace(/[^\d.,]/g, '');
  const value = sanitizeAmountInput(head + typed + tail);
  if (value.length >= head.length + tail.length && value.startsWith(head) && value.endsWith(tail)) {
    return { value, caret: value.length - tail.length };
  }
  return { value: before, caret: before.length - tail.length };
}

/**
 * Tidy a typed amount for display (on blur): Indian digit grouping, keeps up to
 * two decimals as typed ("4,999.50"), drops a dangling ".".
 */
export function formatInputAmount(s: string): string {
  const cleaned = stripCurrency(s).replace(/[^\d.]/g, '');
  if (cleaned === '' || cleaned === '.') return '';
  const [whole, ...rest] = cleaned.split('.');
  const dec = rest.join('').slice(0, 2);
  // BigInt keeps every digit; a Number would round anything past 2^53.
  const head = grouped.format(BigInt(whole));
  return dec ? `${head}.${dec}` : head;
}

/** A number as the amount field shows it: 14999 -> "14,999", 4999.5 -> "4,999.5". */
export function amountToInput(n: number): string {
  return grouped.format(n);
}
