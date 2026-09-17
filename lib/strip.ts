import { formatRupees } from './format.ts';
import { DEFAULT_MAX } from './site.ts';
import { splitAmount } from './split.ts';

/**
 * The tukda strip: a bill drawn as a bar cut into its parts. This file decides the layout
 * (piece weights, cuts, minimum widths, which figures show where); components/TukdaStrip.tsx
 * only draws it.
 */

/** The bill the empty amount field shows as an example (the `ghost` strip). */
export const EXAMPLE_TOTAL = 5000;
export const EXAMPLE_PARTS: readonly number[] = splitAmount(EXAMPLE_TOTAL, DEFAULT_MAX);

/** Up to this many parts each part is its own piece; above it the strip is one continuous bar. */
export const MAX_PIECES = 24;
/** Up to this many parts a progress strip prints each amount inside its piece. */
export const MAX_LABELLED_PIECES = 6;
/** Up to this many parts each figure sits under its piece; above it they collapse to one line. */
export const MAX_FIGURES = 3;
/**
 * The longest figure that still sits under its piece ("₹1,99,999", "₹1,998.50"). Longer ones
 * would run into the next figure on a 320px phone, so the strip uses the one-line summary instead.
 */
export const MAX_FIGURE_LENGTH = 9;

const MIN_PIECE_PX = 10;
/** A continuous bar has at most three runs; this keeps a 1% run visible. */
const MIN_RUN_PX = 4;

export type StripMode = 'pieces' | 'continuous';
export type SegmentState = 'paid' | 'next' | 'later';

export interface StripSegment {
  /** Stable React key. */
  key: string;
  /** Flex weight: this segment's share of the total, in percent. */
  weight: number;
  state: SegmentState;
  /** The part's figure ("₹1,999") in pieces mode; empty for the runs of a continuous bar. */
  label: string;
}

export interface StripModel {
  /** 'pieces': one segment per part. 'continuous': up to three runs (paid share, next part, the rest). */
  mode: StripMode;
  segments: StripSegment[];
  /** Width of the cut between pieces (0 for a continuous bar). */
  gapPx: number;
  /** No segment is drawn narrower than this, so a ₹2 remainder still shows. */
  minPx: number;
  /** A progress strip prints each amount inside its piece. */
  labelsInside: boolean;
  /** Each figure sits under its piece; otherwise `summary` is shown as one line. */
  figuresUnder: boolean;
  /** collapseText(parts) */
  summary: string;
}

export interface StripState {
  /** paid[i] is true when part i is ticked off. Missing entries count as unpaid. */
  paid?: readonly boolean[];
  /**
   * The part to pay next. Defaults to the first unpaid part when `paid` is given, and to none
   * (-1) otherwise. A paid part is never next.
   */
  nextIndex?: number;
}

/**
 * The figures of a split as the preview reads them: every figure for three parts or fewer
 * ("₹1,999", "₹1,999", "₹1,002"); otherwise a count and the remainder ("7 × ₹1,999", "₹1,006"),
 * or just the count when every part is the same ("8 × ₹1,999").
 */
export function collapseFigures(parts: readonly number[]): string[] {
  const n = parts.length;
  if (n <= MAX_FIGURES) return parts.map(formatRupees);
  const first = parts[0];
  const last = parts[n - 1];
  return last === first
    ? [`${n} × ${formatRupees(first)}`]
    : [`${n - 1} × ${formatRupees(first)}`, formatRupees(last)];
}

/** collapseFigures as one line: "₹1,999 + ₹1,999 + ₹1,002", "7 × ₹1,999 + ₹1,006", "8 × ₹1,999". */
export function collapseText(parts: readonly number[]): string {
  return collapseFigures(parts).join(' + ');
}

const percent = (amount: number, total: number) => Math.round((amount / total) * 100 * 1e4) / 1e4;

export function stripModel(parts: readonly number[], { paid, nextIndex }: StripState = {}): StripModel {
  const n = parts.length;
  const figures = collapseFigures(parts);
  const summary = figures.join(' + ');
  const total = parts.reduce((a, b) => a + b, 0);
  const isPaid = (i: number) => paid?.[i] === true;

  const wanted = nextIndex ?? (paid ? parts.findIndex((_, i) => !isPaid(i)) : -1);
  const next = wanted >= 0 && wanted < n && !isPaid(wanted) ? wanted : -1;

  if (n === 0 || !(total > 0)) {
    return { mode: 'pieces', segments: [], gapPx: 0, minPx: 0, labelsInside: false, figuresUnder: false, summary };
  }

  if (n > MAX_PIECES) {
    let paidSum = 0;
    for (let i = 0; i < n; i++) if (isPaid(i)) paidSum += parts[i];
    const nextSum = next >= 0 ? parts[next] : 0;
    const runs: StripSegment[] = [
      { key: 'paid', state: 'paid', weight: percent(paidSum, total), label: '' },
      { key: 'next', state: 'next', weight: percent(nextSum, total), label: '' },
      { key: 'later', state: 'later', weight: percent(total - paidSum - nextSum, total), label: '' },
    ];
    return {
      mode: 'continuous',
      segments: runs.filter((r) => r.weight > 0),
      gapPx: 0,
      minPx: MIN_RUN_PX,
      labelsInside: false,
      figuresUnder: false,
      summary,
    };
  }

  const segments = parts.map(
    (amount, i): StripSegment => ({
      key: String(i),
      weight: percent(amount, total),
      state: isPaid(i) ? 'paid' : i === next ? 'next' : 'later',
      label: formatRupees(amount),
    }),
  );
  return {
    mode: 'pieces',
    segments,
    gapPx: n <= 12 ? 3 : 2,
    minPx: MIN_PIECE_PX,
    labelsInside: n <= MAX_LABELLED_PIECES,
    figuresUnder: n <= MAX_FIGURES && figures.every((f) => f.length <= MAX_FIGURE_LENGTH),
    summary,
  };
}
