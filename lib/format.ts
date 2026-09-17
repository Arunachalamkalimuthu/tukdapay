const inr = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const grouped = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });

export const formatInr = (n: number) => `₹${inr.format(n)}`;

/** A figure as the strip and the use cases show it: 1999 -> "₹1,999", 4999.5 -> "₹4,999.50". */
export const formatRupees = (n: number) => formatInr(n).replace(/\.00$/, '');

/** The largest amount the splitter takes (₹100 crore). Far beyond any real split, well within exact paise. */
export const MAX_AMOUNT = 1_00_00_00_000;
/** With a no-break space, so an error message never leaves "crore" alone on the next line. */
export const MAX_AMOUNT_TEXT = '₹100\u00a0crore';

/**
 * "Rs.", "Re.", "INR" and "₹" as people write them before (or after) an amount. The dot
 * in "Rs.4999" is part of the currency, not a decimal point, so it goes with it. Not when the
 * letters end a longer word ("fare.50").
 */
const CURRENCY = /(?<![a-z])(?:rs|re|inr)\.?|₹/gi;

const stripCurrency = (s: string) => s.replace(CURRENCY, '');

/**
 * Each number in a piece of text, currency aside: "Rs 4,999 (incl. GST 18%)" -> ["4,999", "18"],
 * "2.5e4" -> ["2.5", "4"]. A number is a run of digits with the commas and points inside or around it.
 */
export function numberRuns(s: string): string[] {
  return stripCurrency(s).match(/[\d.,]*\d[\d.,]*/g) ?? [];
}

/**
 * What an amount field takes from pasted or typed text: its first number, so a pasted invoice line
 * ("4,999 for 2 items") isn't run together into a different amount (49992). Text with no number in
 * it keeps its "." and "," (a decimal point typed on its own).
 */
function amountText(s: string): string {
  const [first] = numberRuns(s);
  return first ?? stripCurrency(s).replace(/[^\d.,]/g, '');
}

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
  /**
   * Keys typed at the start of the field that left nothing in it ("R", then "s"), to pass back as
   * `carried` with the next change. Empty once a change is taken.
   */
  carry: string;
}

/**
 * Apply one change to an amount field. `before` is what the field held, `after` is what the
 * browser put there, and `caret` is where the browser left the caret (just after whatever was
 * typed or pasted). What was typed or pasted is cleaned up (no letters, spaces or "Rs.", and only
 * its first number), but the digits already in the field are never dropped or moved: a change that
 * would do that, like a second "." or a third decimal typed in the middle, is ignored and the caret
 * stays put.
 *
 * `carried` is the previous change's `carry`. It lets "Rs.4999" typed one key at a time read like
 * the pasted "Rs.4999": by the time "." is typed, "R" and "s" have each been dropped, and without
 * them the "." would be taken as a decimal point (₹0.49).
 */
export function editAmountInput(before: string, after: string, caret: number, carried = ''): AmountEdit {
  const tail = after.slice(caret);
  if (caret < 0 || caret > after.length || !before.endsWith(tail)) {
    // Not a plain insert or delete at the caret: clean up the whole value.
    const value = sanitizeAmountInput(amountText(after));
    return { value, caret: value.length, carry: '' };
  }
  // `before` is head + (replaced text) + tail, and `after` is head + (typed text) + tail.
  const limit = Math.min(caret, before.length - tail.length);
  let start = 0;
  while (start < limit && before[start] === after[start]) start++;
  const head = after.slice(0, start);
  const inserted = after.slice(start, caret);
  const text = head === '' ? carried + inserted : inserted;
  const typed = amountText(text);
  const carry = typed === '' && inserted !== '' ? text : '';
  const value = sanitizeAmountInput(head + typed + tail);
  if (value.length >= head.length + tail.length && value.startsWith(head) && value.endsWith(tail)) {
    return { value, caret: value.length - tail.length, carry };
  }
  return { value: before, caret: before.length - tail.length, carry };
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
