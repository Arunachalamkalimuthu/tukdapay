import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  amountReading,
  amountSize,
  planProgress,
  previewText,
  resumeNoticeParts,
  shortReading,
  splitLabel,
  vpaParts,
} from '../lib/splitter.ts';
import { createPlan, type Plan } from '../lib/plan.ts';
import { splitAmount } from '../lib/split.ts';

const input = { total: 5000, pa: 'shop@okaxis', pn: 'Sri Stores', note: '', maxPerTxn: 1999 };
const withPaid = (plan: Plan, paid: boolean[]): Plan => ({
  ...plan,
  parts: plan.parts.map((p, i) => ({ ...p, paid: paid[i] ?? false })),
});

// ---- amount size steps ---------------------------------------------------------------

test('amountSize keeps the full 56px size up to 9 digits with their separators', () => {
  assert.equal(amountSize(''), 'lg');
  assert.equal(amountSize('5,000'), 'lg');
  assert.equal(amountSize('1,99,999.00'), 'lg');
  assert.equal(amountSize('99,99,999.99'), 'lg'); // 9 digits, formatted
  assert.equal(amountSize('9999999.99'), 'lg'); // the same while typing
  assert.equal(amountSize('999999999'), 'lg');
});

test('amountSize steps down to md for 10 and 11 digits with their separators', () => {
  assert.equal(amountSize('9,99,99,999.99'), 'md'); // 11
  assert.equal(amountSize('1,00,00,00,000'), 'md'); // 11
  assert.equal(amountSize('99,99,99,999.99'), 'md'); // 11
  assert.equal(amountSize('1,00,00,00,000.0'), 'md'); // 11, on the way to the largest amount
  assert.equal(amountSize('9999999999'), 'md'); // 10, typed without commas
});

test('amountSize goes by width, so a value typed without commas steps down before it overflows', () => {
  // 12 characters, like "99,99,999.99", but 11 digits: the full size would overflow while typing.
  assert.equal(amountSize('999999999.99'), 'md');
  assert.equal(amountSize('99999999.99'), 'md'); // 10 digits
  assert.equal(amountSize('99999999999'), 'md');
  assert.equal(amountSize('1000000000.00'), 'md'); // the largest amount while typing: narrower than formatted
});

test('amountSize counts commas and points too, at about a third of a digit each', () => {
  assert.equal(amountSize('1,0,0,0,0,0,0,0,0'), 'md'); // 9 digits, but 8 commas typed between them
  assert.equal(amountSize('9,9,9,9,9,9,9,9,9,9'), 'sm');
  assert.equal(amountSize('999999999999'), 'md'); // 12 digits and nothing else is no wider than md allows
});

test('amountSize steps down to sm for the largest amounts', () => {
  assert.equal(amountSize('1,00,00,00,000.00'), 'sm'); // 12, the largest amount
  assert.equal(amountSize('99999999999.99'), 'sm');
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

test('shortReading shortens only the one-payment reading, for an instrument too narrow for it', () => {
  assert.equal(shortReading('Under the limit — one payment'), 'One payment');
  assert.equal(shortReading('3 payments'), '3 payments');
  assert.equal(shortReading('Example: ₹5,000'), 'Example: ₹5,000');
  assert.equal(shortReading(''), '');
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

/** The resume banner as it reads on the page: its two pieces with a space between. */
const noticeText = (plan: Plan | null, restored: boolean) => {
  const n = resumeNoticeParts(plan, restored);
  return n && `${n.lead} ${n.next}`;
};

test('resumeNoticeParts names the next part of a restored plan with unpaid parts', () => {
  const plan = createPlan(input);
  assert.equal(noticeText(plan, true), 'You have a split in progress: part 1 of 3 is next.');
  assert.equal(noticeText(withPaid(plan, [true, false, false]), true), 'You have a split in progress: part 2 of 3 is next.');
});

test('resumeNoticeParts splits the notice so "part 2 of 3 is next." can stay on one line', () => {
  const plan = withPaid(createPlan(input), [true, false, false]);
  assert.deepEqual(resumeNoticeParts(plan, true), { lead: 'You have a split in progress:', next: 'part 2 of 3 is next.' });
  assert.equal(resumeNoticeParts(plan, false), null);
  assert.equal(resumeNoticeParts(withPaid(plan, [true, true, true]), true), null);
});

test('resumeNoticeParts stays hidden for a plan made in this session', () => {
  assert.equal(resumeNoticeParts(createPlan(input), false), null);
});

test('resumeNoticeParts hides once every part is paid, or when there is no plan', () => {
  assert.equal(resumeNoticeParts(withPaid(createPlan(input), [true, true, true]), true), null);
  assert.equal(resumeNoticeParts(null, true), null);
});

// ---- recent merchant chips ------------------------------------------------------------

test('vpaParts keeps the end of the UPI ID whole: the last few characters of the name and the handle', () => {
  assert.deepEqual(vpaParts('paytmqr2810050501011ooxyz12345678abcdef@paytm'), {
    head: 'paytmqr2810050501011ooxyz12345678',
    tail: 'abcdef@paytm',
  });
  assert.deepEqual(vpaParts('sharmastores@okhdfcbank'), { head: 'sharma', tail: 'stores@okhdfcbank' });
});

test('vpaParts leaves a short UPI ID in one piece', () => {
  assert.deepEqual(vpaParts('shop@okaxis'), { head: '', tail: 'shop@okaxis' });
  assert.deepEqual(vpaParts('sritea@okaxis'), { head: '', tail: 'sritea@okaxis' });
});

test('vpaParts joins back into the UPI ID it was given', () => {
  for (const pa of ['a@b', 'paytmqr2810050501011ooxyz12345678abcdef@paytm', 'noatsign', '']) {
    const { head, tail } = vpaParts(pa);
    assert.equal(head + tail, pa);
  }
});
