import { splitAmount } from './split.ts';
import { buildUpiUrl, isValidVpa } from './upi.ts';
import { formatInr, isValidAmount } from './format.ts';

export interface PlanInput {
  total: number;
  pa: string;
  pn: string;
  note: string;
  maxPerTxn: number;
}

export interface Part {
  index: number;
  amount: number;
  tn: string;
  url: string;
  paid: boolean;
}

export interface Plan {
  input: PlanInput;
  parts: Part[];
}

/** More parts than this is almost certainly a typo, and would make the page slow. */
export const MAX_PARTS = 100;

const paise = (n: number) => Math.round(n * 100);

/** Turn form input into a payment plan: one part per chunk with its own note and UPI link. */
export function createPlan(input: PlanInput): Plan {
  const { total, pa, pn, note, maxPerTxn } = input;
  const chunks = splitAmount(total, maxPerTxn);
  const n = chunks.length;

  const parts = chunks.map((amount, i) => {
    const label = `Part ${i + 1}/${n}`;
    const tn = note && note.trim() ? `${label} - ${note.trim()}` : label;
    return { index: i, amount, tn, url: buildUpiUrl({ pa, pn, am: amount, tn }), paid: false };
  });

  return { input, parts };
}

/**
 * How many parts splitAmount(total, maxPerTxn) would produce, worked out in paise
 * without building them. 0 when either amount is not one the splitter takes (see isValidAmount).
 */
export function countParts(total: number, maxPerTxn: number): number {
  if (!isValidAmount(total) || !isValidAmount(maxPerTxn)) return 0;
  return Math.ceil(paise(total) / paise(maxPerTxn));
}

/** True when two plan inputs describe the same payment. Amounts are compared to the paisa. */
export function sameInput(a: PlanInput, b: PlanInput): boolean {
  return (
    paise(a.total) === paise(b.total) &&
    paise(a.maxPerTxn) === paise(b.maxPerTxn) &&
    a.pa === b.pa &&
    a.pn === b.pn &&
    a.note === b.note
  );
}

/**
 * True when splitting `input` again should keep `plan` as it is: the plan was made from the
 * same inputs and has parts ticked as paid, which a fresh plan would lose.
 */
export function shouldKeepPlan(plan: Plan | null, input: PlanInput): plan is Plan {
  return !!plan && plan.parts.some((p) => p.paid) && sameInput(plan.input, input);
}

export function breakdownText(plan: Plan): string {
  const { total, pa, pn } = plan.input;
  const n = plan.parts.length;
  const payee = pn && pn.trim() ? `${pa} (${pn.trim()})` : pa;
  const header = `Total ${formatInr(total)} to ${payee} in ${n} part${n === 1 ? '' : 's'}:`;
  const lines = plan.parts.map((p, i) => `Part ${i + 1}/${n}: ${formatInr(p.amount)}`);
  return [header, ...lines].join('\n');
}

// ---- restoring from storage ------------------------------------------------------

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isPositive = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0;
const isAmount = (v: unknown): v is number => typeof v === 'number' && isValidAmount(v);
const optionalText = (v: unknown): string | null => (v === undefined || v === null ? '' : typeof v === 'string' ? v : null);

function parsePart(value: unknown, i: number): Part | null {
  if (!isRecord(value)) return null;
  const { index, amount, tn, url, paid } = value;
  if (index !== i || !isPositive(amount) || typeof tn !== 'string' || typeof paid !== 'boolean') return null;
  if (typeof url !== 'string' || !url.startsWith('upi://pay?')) return null;
  return { index, amount, tn, url, paid };
}

/**
 * Validate a plan read back from localStorage (including plans saved by the old
 * static site, which used the same key and shape). Returns a clean copy, or null
 * when the data is malformed so the page starts fresh instead of crashing.
 */
export function parsePlan(value: unknown): Plan | null {
  if (!isRecord(value) || !isRecord(value.input) || !Array.isArray(value.parts)) return null;
  // The old site had no cap on parts. A plan the form would refuse to make isn't restored either.
  if (value.parts.length === 0 || value.parts.length > MAX_PARTS) return null;
  const { total, pa, maxPerTxn } = value.input;
  const pn = optionalText(value.input.pn);
  const note = optionalText(value.input.note);
  if (!isAmount(total) || !isValidVpa(pa) || !isAmount(maxPerTxn) || pn === null || note === null) return null;

  const parts: Part[] = [];
  for (let i = 0; i < value.parts.length; i++) {
    const part = parsePart(value.parts[i], i);
    if (!part) return null;
    parts.push(part);
  }
  return { input: { total, pa, pn, note, maxPerTxn }, parts };
}
