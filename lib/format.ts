const inr = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const grouped = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });

export const formatInr = (n: number) => `₹${inr.format(n)}`;

/** "₹ 1,00,000" -> 100000. NaN when nothing numeric is left. */
export function parseAmount(s: string): number {
  const cleaned = s.replace(/[^\d.]/g, '');
  return cleaned === '' ? NaN : Number(cleaned);
}

/** Group digits Indian-style while typing; keeps a trailing "." or decimals as typed. */
export function formatInputAmount(s: string): string {
  const cleaned = s.replace(/[^\d.]/g, '');
  if (cleaned === '') return '';
  const [whole, ...rest] = cleaned.split('.');
  const dec = rest.join('').slice(0, 2);
  const wholeNum = whole === '' ? 0 : Number(whole);
  const head = grouped.format(wholeNum);
  if (rest.length === 0) return head;
  return `${head}.${dec}`;
}
