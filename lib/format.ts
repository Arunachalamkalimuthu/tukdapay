const inr = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const grouped = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });

export const formatInr = (n: number) => `₹${inr.format(n)}`;

/** "₹ 1,00,000" -> 100000. NaN when nothing numeric is left. */
export function parseAmount(s: string): number {
  const cleaned = s.replace(/[^\d.]/g, '');
  return cleaned === '' ? NaN : Number(cleaned);
}

/** True when `n` is at least one paisa once rounded to two decimals. */
export function isPositiveAmount(n: number): boolean {
  return Number.isFinite(n) && Math.round(n * 100) > 0;
}

/**
 * Clean an amount while the user types, without moving digits around:
 * keeps digits and the user's commas, one ".", and at most two decimals.
 */
export function sanitizeAmountInput(s: string): string {
  let out = '';
  let seenDot = false;
  let decimals = 0;
  for (const ch of s) {
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

/**
 * Tidy a typed amount for display (on blur): Indian digit grouping, keeps up to
 * two decimals as typed ("4,999.50"), drops a dangling ".".
 */
export function formatInputAmount(s: string): string {
  const cleaned = s.replace(/[^\d.]/g, '');
  if (cleaned === '' || cleaned === '.') return '';
  const [whole, ...rest] = cleaned.split('.');
  const dec = rest.join('').slice(0, 2);
  const head = grouped.format(whole === '' ? 0 : Number(whole));
  return dec ? `${head}.${dec}` : head;
}

/** A number as the amount field shows it: 14999 -> "14,999", 4999.5 -> "4,999.5". */
export function amountToInput(n: number): string {
  return grouped.format(n);
}
