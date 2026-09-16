import { splitAmount } from './split.js';
import { buildUpiUrl } from './upi.js';

const rupees = (n) => `₹${n.toFixed(2)}`;

/**
 * Turn form input into a payment plan: one part per chunk, each with
 * its own numbered note and UPI deep link.
 */
export function createPlan(input) {
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

export function breakdownText(plan) {
  const { total, pa, pn } = plan.input;
  const n = plan.parts.length;
  const payee = pn && pn.trim() ? `${pa} (${pn.trim()})` : pa;
  const header = `Total ${rupees(total)} to ${payee} in ${n} part${n === 1 ? '' : 's'}:`;
  const lines = plan.parts.map((p, i) => `Part ${i + 1}/${n}: ${rupees(p.amount)}`);
  return [header, ...lines].join('\n');
}
