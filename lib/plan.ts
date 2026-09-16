import { splitAmount } from './split.ts';
import { buildUpiUrl } from './upi.ts';
import { formatInr } from './format.ts';

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

export function breakdownText(plan: Plan): string {
  const { total, pa, pn } = plan.input;
  const n = plan.parts.length;
  const payee = pn && pn.trim() ? `${pa} (${pn.trim()})` : pa;
  const header = `Total ${formatInr(total)} to ${payee} in ${n} part${n === 1 ? '' : 's'}:`;
  const lines = plan.parts.map((p, i) => `Part ${i + 1}/${n}: ${formatInr(p.amount)}`);
  return [header, ...lines].join('\n');
}
