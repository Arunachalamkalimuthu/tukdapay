import { formatRupees } from './format.ts';
import type { Part, Plan } from './plan.ts';
import { collapseText, EXAMPLE_TOTAL } from './strip.ts';

/**
 * Small decisions the home splitter makes from its state: how big the amount is set, what
 * the instrument reads, the Split button's label, progress through a plan and the resume
 * banner. components/splitter only wires them up.
 */

export type AmountSize = 'lg' | 'md' | 'sm';

/** Up to this many characters the amount is set at its full size (56px). */
export const AMOUNT_LG_CHARS = 12;
/** Up to this many characters it is set at the middle size (44px); longer values get 36px. */
export const AMOUNT_MD_CHARS = 15;

/** The size step for the amount field's value, so long amounts step down instead of clipping. */
export function amountSize(value: string): AmountSize {
  const n = value.length;
  if (n <= AMOUNT_LG_CHARS) return 'lg';
  if (n <= AMOUNT_MD_CHARS) return 'md';
  return 'sm';
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
 * The banner above the form when the page opens on a saved plan that still has parts to pay.
 * `restored` is true only for a plan read back from storage, never for one split in this visit.
 */
export function resumeNotice(plan: Plan | null, restored: boolean): string | null {
  if (!plan || !restored) return null;
  const { n, nextIndex } = planProgress(plan.parts);
  if (nextIndex < 0) return null;
  return `You have a split in progress: part ${nextIndex + 1} of ${n} is next.`;
}
