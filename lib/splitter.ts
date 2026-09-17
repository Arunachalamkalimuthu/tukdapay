import { formatRupees } from './format.ts';
import type { Part, Plan } from './plan.ts';
import { collapseText, EXAMPLE_TOTAL } from './strip.ts';

/**
 * Small decisions the home splitter makes from its state: how big the amount is set, what
 * the instrument reads, the Split button's label, progress through a plan and the resume
 * banner. components/splitter only wires them up.
 */

export type AmountSize = 'lg' | 'md' | 'sm';

/**
 * How wide an amount is set, in tenths of a digit: Chrome measures a digit of the amount type at
 * 0.507em and a comma or point at about 0.16em, so each separator counts as 3.
 */
export function amountWidth(value: string): number {
  let width = 0;
  for (const ch of value) width += ch >= '0' && ch <= '9' ? 10 : 3;
  return width;
}

/** Up to this width the amount is set at its full size (56px): "99,99,999.99", 9 digits. */
export const AMOUNT_LG_WIDTH = 99;
/** Up to this width it is set at the middle size (44px), "1,00,00,00,000.0"; wider values get 36px. */
export const AMOUNT_MD_WIDTH = 125;

/**
 * The size step for the amount field's value, so long amounts step down instead of clipping.
 * It goes by width rather than length: "999999999.99" typed without commas is as wide as
 * "99,99,99,999.99" once formatted, so it steps down while it is being typed, not after blur.
 */
export function amountSize(value: string): AmountSize {
  const width = amountWidth(value);
  if (width <= AMOUNT_LG_WIDTH) return 'lg';
  if (width <= AMOUNT_MD_WIDTH) return 'md';
  return 'sm';
}

/** Characters of the name kept with the handle when a long UPI ID is shortened. */
const VPA_TAIL_NAME = 6;

/**
 * A UPI ID in two pieces for a chip too narrow to show it all: the head can be cut short with an
 * ellipsis while the tail stays whole, since the end of the name and the handle ("…abcdef@paytm")
 * are what tell two IDs from the same bank apart. head + tail is always the ID.
 */
export function vpaParts(pa: string): { head: string; tail: string } {
  const at = pa.lastIndexOf('@');
  const cut = at < 0 ? Math.max(0, pa.length - VPA_TAIL_NAME) : at > VPA_TAIL_NAME ? at - VPA_TAIL_NAME : 0;
  return { head: pa.slice(0, cut), tail: pa.slice(cut) };
}

const ONE_PAYMENT = 'Under the limit — one payment';

export interface ReadingState {
  /** The amount field is empty. */
  empty: boolean;
  /** The live split, or null when the amount can't be split. */
  parts: readonly number[] | null;
  /** An amount error is showing in place of the strip. */
  error: boolean;
}

/** The instrument's top-right reading: "3 payments", or the example while the field is empty. */
export function amountReading({ empty, parts, error }: ReadingState): string {
  if (error) return '';
  if (empty) return `Example: ${formatRupees(EXAMPLE_TOTAL)}`;
  if (!parts || parts.length === 0) return '';
  return parts.length === 1 ? ONE_PAYMENT : `${parts.length} payments`;
}

/**
 * The reading on an instrument too narrow to fit the one-payment reading beside the "Amount" label
 * (a phone under 360px), where it would wrap and push the form down as the amount is typed.
 */
export function shortReading(reading: string): string {
  return reading === ONE_PAYMENT ? 'One payment' : reading;
}

/** What screen readers hear as the split changes: "3 payments: ₹1,999 + ₹1,999 + ₹1,002". */
export function previewText(parts: readonly number[]): string {
  if (parts.length === 0) return '';
  if (parts.length === 1) return ONE_PAYMENT;
  return `${parts.length} payments: ${collapseText(parts)}`;
}

/** "Split into 3 payments" once the form is ready and the bill needs more than one payment. */
export function splitLabel(valid: boolean, partCount: number): string {
  return valid && partCount > 1 ? `Split into ${partCount} payments` : 'Split into payments';
}

export interface PlanProgress {
  n: number;
  paidCount: number;
  allPaid: boolean;
  /** The first unpaid part, or -1 when everything is paid. */
  nextIndex: number;
  /** Rupees still to pay, exact to the paisa. */
  toGo: number;
  /** "1 of 3 paid", or "All 3 paid". */
  status: string;
}

export function planProgress(parts: readonly Pick<Part, 'amount' | 'paid'>[]): PlanProgress {
  const n = parts.length;
  let paidCount = 0;
  let toGoPaise = 0;
  for (const p of parts) {
    if (p.paid) paidCount++;
    else toGoPaise += Math.round(p.amount * 100);
  }
  const allPaid = n > 0 && paidCount === n;
  return {
    n,
    paidCount,
    allPaid,
    nextIndex: parts.findIndex((p) => !p.paid),
    toGo: toGoPaise / 100,
    status: allPaid ? `All ${n} paid` : `${paidCount} of ${n} paid`,
  };
}

/**
 * The banner above the form when the page opens on a saved plan that still has parts to pay, in
 * two pieces so the page can keep "part 2 of 3 is next." together when the line wraps.
 * `restored` is true only for a plan read back from storage, never for one split in this visit.
 */
export function resumeNoticeParts(plan: Plan | null, restored: boolean): { lead: string; next: string } | null {
  if (!plan || !restored) return null;
  const { n, nextIndex } = planProgress(plan.parts);
  if (nextIndex < 0) return null;
  return { lead: 'You have a split in progress:', next: `part ${nextIndex + 1} of ${n} is next.` };
}

/** The resume banner as one sentence. */
export function resumeNotice(plan: Plan | null, restored: boolean): string | null {
  const parts = resumeNoticeParts(plan, restored);
  return parts && `${parts.lead} ${parts.next}`;
}
