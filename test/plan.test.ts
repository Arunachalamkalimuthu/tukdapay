import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPlan, breakdownText } from '../lib/plan';

const input = { total: 5000, pa: 'shop@upi', pn: 'Tea Shop', note: 'Table 4', maxPerTxn: 1999 };

test('createPlan produces one part per chunk with numbered notes and upi urls', () => {
  const plan = createPlan(input);
  assert.equal(plan.parts.length, 3);
  assert.deepEqual(plan.parts.map((p) => p.amount), [1999, 1999, 1002]);
  assert.equal(plan.parts[0].tn, 'Part 1/3 - Table 4');
  assert.equal(plan.parts[2].tn, 'Part 3/3 - Table 4');
  assert.match(plan.parts[0].url, /^upi:\/\/pay\?pa=shop%40upi&pn=Tea%20Shop&am=1999\.00&cu=INR&tn=Part%201%2F3/);
  assert.deepEqual(plan.parts.map((p) => p.paid), [false, false, false]);
});

test('createPlan without a note uses just the part label', () => {
  const plan = createPlan({ ...input, note: '' });
  assert.equal(plan.parts[1].tn, 'Part 2/3');
});

test('createPlan keeps the inputs for persistence', () => {
  const plan = createPlan(input);
  assert.deepEqual(plan.input, input);
});

test('breakdownText lists every part on its own line', () => {
  assert.equal(
    breakdownText(createPlan(input)),
    'Total ₹5,000.00 to shop@upi (Tea Shop) in 3 parts:\nPart 1/3: ₹1,999.00\nPart 2/3: ₹1,999.00\nPart 3/3: ₹1,002.00'
  );
});

test('breakdownText omits the name when not given', () => {
  assert.equal(breakdownText(createPlan({ ...input, pn: '', total: 100 })), 'Total ₹100.00 to shop@upi in 1 part:\nPart 1/1: ₹100.00');
});
