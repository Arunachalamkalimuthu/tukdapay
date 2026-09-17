import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  amountReading,
  amountSize,
  planProgress,
  previewText,
  resumeNotice,
  splitLabel,
} from '../lib/splitter.ts';
import { createPlan, type Plan } from '../lib/plan.ts';
import { splitAmount } from '../lib/split.ts';

const input = { total: 5000, pa: 'shop@okaxis', pn: 'Sri Stores', note: '', maxPerTxn: 1999 };
const withPaid = (plan: Plan, paid: boolean[]): Plan => ({
  ...plan,
  parts: plan.parts.map((p, i) => ({ ...p, paid: paid[i] ?? false })),
});

// ---- amount size steps ---------------------------------------------------------------

test('amountSize keeps the full 56px size up to 12 characters', () => {
  assert.equal(amountSize(''), 'lg');
  assert.equal(amountSize('5,000'), 'lg');
  assert.equal(amountSize('1,99,999.00'), 'lg');
  assert.equal(amountSize('99,99,999.99'), 'lg'); // 12
});

test('amountSize steps down to md for 13 to 15 characters', () => {
  assert.equal(amountSize('9,99,99,999.99'), 'md'); // 14
  assert.equal(amountSize('1234567890123'), 'md'); // 13
  assert.equal(amountSize('1,00,00,00,000'), 'md'); // 14
  assert.equal(amountSize('123456789012345'), 'md'); // 15
});

test('amountSize steps down to sm from 16 characters', () => {
  assert.equal(amountSize('1,00,00,00,000.0'), 'sm'); // 16
  assert.equal(amountSize('1,00,00,00,000.00'), 'sm'); // 17
  assert.equal(amountSize('9'.repeat(40)), 'sm');
});

// ---- the reading and live text of the instrument --------------------------------------

test('amountReading shows the example when the field is empty', () => {
  assert.equal(amountReading({ empty: true, parts: null, error: false }), 'Example: ₹5,000');
  // An error never shows on an empty field without being left, but the error still wins.
  assert.equal(amountReading({ empty: true, parts: null, error: true }), '');
});

test('amountReading counts the payments for a valid amount', () => {
  assert.equal(amountReading({ empty: false, parts: splitAmount(5000), error: false }), '3 payments');
  assert.equal(amountReading({ empty: false, parts: splitAmount(14999), error: false }), '8 payments');
  assert.equal(amountReading({ empty: false, parts: [1500], error: false }), 'Under the limit — one payment');
});

test('amountReading is empty while an error or nothing usable is shown', () => {
  assert.equal(amountReading({ empty: false, parts: splitAmount(5000), error: true }), '');
  assert.equal(amountReading({ empty: false, parts: null, error: false }), '');
});

test('previewText reads the split the way the old preview did', () => {
  assert.equal(previewText(splitAmount(5000)), '3 payments: ₹1,999 + ₹1,999 + ₹1,002');
  assert.equal(previewText(splitAmount(14999)), '8 payments: 7 × ₹1,999 + ₹1,006');
  assert.equal(previewText(splitAmount(15992)), '8 payments: 8 × ₹1,999');
  assert.equal(previewText([1500]), 'Under the limit — one payment');
  assert.equal(previewText([]), '');
});

// ---- the Split button --------------------------------------------------------------------

test('splitLabel shows the live count only for a valid form with more than one part', () => {
  assert.equal(splitLabel(true, 3), 'Split into 3 payments');
  assert.equal(splitLabel(true, 100), 'Split into 100 payments');
  assert.equal(splitLabel(true, 1), 'Split into payments');
  assert.equal(splitLabel(false, 3), 'Split into payments');
  assert.equal(splitLabel(false, 0), 'Split into payments');
});

// ---- progress --------------------------------------------------------------------------

test('planProgress starts with nothing paid and part 1 next', () => {
  const p = planProgress(createPlan(input).parts);
  assert.deepEqual(p, { n: 3, paidCount: 0, allPaid: false, nextIndex: 0, toGo: 5000, status: '0 of 3 paid' });
});

test('planProgress skips paid parts and totals what is left to the paisa', () => {
  const plan = withPaid(createPlan({ ...input, total: 4000.3 }), [true, false, false]);
  const p = planProgress(plan.parts);
  assert.equal(p.paidCount, 1);
  assert.equal(p.nextIndex, 1);
  assert.equal(p.toGo, 2001.3);
  assert.equal(p.status, '1 of 3 paid');
});

test('planProgress picks the first unpaid part even when an earlier one is unticked later', () => {
  const plan = withPaid(createPlan(input), [false, true, false]);
  assert.equal(planProgress(plan.parts).nextIndex, 0);
});

test('planProgress reports all paid', () => {
  const plan = withPaid(createPlan(input), [true, true, true]);
  const p = planProgress(plan.parts);
  assert.equal(p.allPaid, true);
  assert.equal(p.nextIndex, -1);
  assert.equal(p.toGo, 0);
  assert.equal(p.status, 'All 3 paid');
});

test('planProgress sums many parts without float drift', () => {
  const plan = createPlan({ ...input, total: 1999.99 * 7, maxPerTxn: 1999.99 });
  assert.equal(planProgress(plan.parts).toGo, 13999.93);
});

// ---- resume banner -----------------------------------------------------------------------

test('resumeNotice names the next part of a restored plan with unpaid parts', () => {
  const plan = createPlan(input);
  assert.equal(resumeNotice(plan, true), 'You have a split in progress: part 1 of 3 is next.');
  assert.equal(
    resumeNotice(withPaid(plan, [true, false, false]), true),
    'You have a split in progress: part 2 of 3 is next.',
  );
});

test('resumeNotice stays hidden for a plan made in this session', () => {
  assert.equal(resumeNotice(createPlan(input), false), null);
});

test('resumeNotice hides once every part is paid, or when there is no plan', () => {
  assert.equal(resumeNotice(withPaid(createPlan(input), [true, true, true]), true), null);
  assert.equal(resumeNotice(null, true), null);
});
