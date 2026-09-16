import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPlan, breakdownText, parsePlan, countParts, MAX_PARTS, type Plan } from '../lib/plan.ts';
import { splitAmount } from '../lib/split.ts';

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

// ---- parsePlan -----------------------------------------------------------------

const roundTrip = <T>(v: T): T => JSON.parse(JSON.stringify(v));

test('parsePlan accepts a saved plan with some parts paid', () => {
  const plan = createPlan(input);
  plan.parts[0].paid = true;
  assert.deepEqual(parsePlan(roundTrip(plan)), plan);
});

test('parsePlan accepts a plan saved by the old static site', () => {
  // Exactly what src/app.js on the old site wrote to localStorage['tukdapay/plan'].
  const old = JSON.parse(
    '{"input":{"total":4000,"pa":"shop@okaxis","pn":"","note":"","maxPerTxn":1999},"parts":[' +
      '{"index":0,"amount":1999,"tn":"Part 1/3","url":"upi://pay?pa=shop%40okaxis&am=1999.00&cu=INR&tn=Part%201%2F3","paid":true},' +
      '{"index":1,"amount":1999,"tn":"Part 2/3","url":"upi://pay?pa=shop%40okaxis&am=1999.00&cu=INR&tn=Part%202%2F3","paid":false},' +
      '{"index":2,"amount":2,"tn":"Part 3/3","url":"upi://pay?pa=shop%40okaxis&am=2.00&cu=INR&tn=Part%203%2F3","paid":false}]}'
  );
  assert.deepEqual(parsePlan(old), old);
});

test('parsePlan fills in a missing name or note', () => {
  const saved = roundTrip(createPlan({ ...input, pn: '', note: '' })) as unknown as { input: Record<string, unknown> };
  delete saved.input.pn;
  delete saved.input.note;
  const plan = parsePlan(saved);
  assert.ok(plan);
  assert.equal(plan.input.pn, '');
  assert.equal(plan.input.note, '');
});

test('parsePlan drops unknown fields', () => {
  const saved = roundTrip(createPlan(input)) as Plan & { extra?: number };
  saved.extra = 1;
  assert.deepEqual(parsePlan(saved), createPlan(input));
});

test('parsePlan rejects malformed data', () => {
  const good = () => roundTrip(createPlan(input)) as unknown as { input: Record<string, unknown>; parts: Record<string, unknown>[] };
  const broken: [string, unknown][] = [
    ['null', null],
    ['string', 'plan'],
    ['number', 42],
    ['array', []],
    ['empty object', {}],
    ['no parts', { input: good().input }],
    ['empty parts', { input: good().input, parts: [] }],
    ['no input', { parts: good().parts }],
  ];
  const mutations: [string, (p: ReturnType<typeof good>) => void][] = [
    ['zero total', (p) => (p.input.total = 0)],
    ['string total', (p) => (p.input.total = '5000')],
    ['bad pa', (p) => (p.input.pa = 'not a upi id')],
    ['zero max', (p) => (p.input.maxPerTxn = 0)],
    ['NaN-ish max', (p) => (p.input.maxPerTxn = null)],
    ['numeric name', (p) => (p.input.pn = 5)],
    ['numeric note', (p) => (p.input.note = 5)],
    ['negative amount', (p) => (p.parts[1].amount = -1)],
    ['non-upi url', (p) => (p.parts[1].url = 'javascript:alert(1)')],
    ['string paid', (p) => (p.parts[1].paid = 'yes')],
    ['numeric tn', (p) => (p.parts[1].tn = 3)],
    ['index mismatch', (p) => (p.parts[1].index = 5)],
    ['null part', (p) => ((p.parts as unknown[])[2] = null)],
  ];
  for (const [name, mutate] of mutations) {
    const p = good();
    mutate(p);
    broken.push([name, p]);
  }
  for (const [name, value] of broken) assert.equal(parsePlan(value), null, name);
});

// ---- countParts ----------------------------------------------------------------

test('countParts matches splitAmount without building the parts', () => {
  const cases: [number, number][] = [
    [5000, 1999], [1999, 1999], [1998, 1999], [2000, 1999], [0.01, 1999], [100000, 1999],
    [4999.99, 1000.33], [10, 0.01], [123456.78, 999.99], [3998, 1999], [0.3, 0.1], [0.005, 1],
  ];
  for (const [total, max] of cases) {
    assert.equal(countParts(total, max), splitAmount(total, max).length, `${total} / ${max}`);
  }
});

test('countParts copes with huge amounts instantly', () => {
  assert.equal(countParts(1e12, 1999), Math.ceil(1e14 / 199900));
});

test('countParts is 0 when either amount is not a positive number of paise', () => {
  assert.equal(countParts(0, 1999), 0);
  assert.equal(countParts(5000, 0), 0);
  assert.equal(countParts(5000, 0.004), 0);
  assert.equal(countParts(NaN, 1999), 0);
  assert.equal(countParts(5000, Infinity), 0);
});

test('MAX_PARTS is a sane cap', () => {
  assert.ok(MAX_PARTS >= 50 && MAX_PARTS <= 500);
});
