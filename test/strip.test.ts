import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitAmount } from '../lib/split.ts';
import {
  collapseFigures,
  collapseText,
  EXAMPLE_PARTS,
  EXAMPLE_TOTAL,
  MAX_FIGURE_LENGTH,
  MAX_LABELLED_PIECES,
  MAX_PIECES,
  stripModel,
} from '../lib/strip.ts';

const equal = (n: number, amount = 1999) => Array.from({ length: n }, () => amount);
const sum = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0);
const near = (actual: number, expected: number, message?: string) =>
  assert.ok(Math.abs(actual - expected) < 0.001, `${message ?? ''} expected ${expected}, got ${actual}`);

// ---- collapse rule (moved from the splitter preview; output must not change) -------------

test('collapseFigures lists every figure for three parts or fewer', () => {
  assert.deepEqual(collapseFigures([1500]), ['₹1,500']);
  assert.deepEqual(collapseFigures([1999, 2]), ['₹1,999', '₹2']);
  assert.deepEqual(collapseFigures(splitAmount(5000)), ['₹1,999', '₹1,999', '₹1,002']);
  assert.deepEqual(collapseFigures([1999, 1999, 1999]), ['₹1,999', '₹1,999', '₹1,999']);
  assert.deepEqual(collapseFigures([1999, 1000.5]), ['₹1,999', '₹1,000.50']);
  assert.deepEqual(collapseFigures([]), []);
});

test('collapseFigures folds longer splits into a count and the remainder', () => {
  assert.deepEqual(collapseFigures(splitAmount(14999)), ['7 × ₹1,999', '₹1,006']);
  assert.deepEqual(collapseFigures(splitAmount(50000)), ['25 × ₹1,999', '₹25']);
  assert.deepEqual(collapseFigures(splitAmount(9998.5)), ['5 × ₹1,999', '₹3.50']);
});

test('collapseFigures folds all-equal parts into one figure', () => {
  assert.deepEqual(collapseFigures(equal(4)), ['4 × ₹1,999']);
  assert.deepEqual(collapseFigures(equal(8)), ['8 × ₹1,999']);
  assert.deepEqual(collapseFigures(equal(100)), ['100 × ₹1,999']);
});

test('collapseText joins the figures with plus signs', () => {
  assert.equal(collapseText(splitAmount(5000)), '₹1,999 + ₹1,999 + ₹1,002');
  assert.equal(collapseText(splitAmount(14999)), '7 × ₹1,999 + ₹1,006');
  assert.equal(collapseText(equal(8)), '8 × ₹1,999');
  assert.equal(collapseText([1500]), '₹1,500');
  assert.equal(collapseText([]), '');
});

test('the empty-field example is ₹5,000 at the default max', () => {
  assert.equal(EXAMPLE_TOTAL, 5000);
  assert.deepEqual(EXAMPLE_PARTS, [1999, 1999, 1002]);
  assert.equal(collapseText(EXAMPLE_PARTS), '₹1,999 + ₹1,999 + ₹1,002');
});

// ---- piece layout --------------------------------------------------------------------------

test('one part is one full-width piece with its figure under it', () => {
  const m = stripModel([1500]);
  assert.equal(m.mode, 'pieces');
  assert.equal(m.segments.length, 1);
  near(m.segments[0].weight, 100);
  assert.equal(m.segments[0].label, '₹1,500');
  assert.equal(m.gapPx, 3);
  assert.equal(m.minPx, 10);
  assert.equal(m.figuresUnder, true);
  assert.equal(m.labelsInside, true);
  assert.equal(m.summary, '₹1,500');
});

test('three parts: weights follow the amounts and figures sit under the pieces', () => {
  const m = stripModel(splitAmount(5000));
  assert.equal(m.mode, 'pieces');
  assert.deepEqual(
    m.segments.map((s) => s.label),
    ['₹1,999', '₹1,999', '₹1,002'],
  );
  near(m.segments[0].weight, 39.98);
  near(m.segments[1].weight, 39.98);
  near(m.segments[2].weight, 20.04);
  near(sum(m.segments.map((s) => s.weight)), 100);
  assert.equal(m.gapPx, 3);
  assert.equal(m.figuresUnder, true);
  assert.deepEqual(m.figures, ['₹1,999', '₹1,999', '₹1,002']);
  assert.equal(m.summary, '₹1,999 + ₹1,999 + ₹1,002');
});

test('segments have stable, distinct keys', () => {
  const keys = stripModel(equal(12)).segments.map((s) => s.key);
  assert.equal(new Set(keys).size, 12);
  assert.deepEqual(stripModel(equal(12)).segments.map((s) => s.key), keys);
});

test('a tiny remainder keeps a proportional weight; the minimum width keeps it visible', () => {
  const m = stripModel(splitAmount(4000));
  assert.deepEqual(m.figures, ['₹1,999', '₹1,999', '₹2']);
  near(m.segments[2].weight, 0.05);
  assert.equal(m.minPx, 10);
  assert.equal(m.figuresUnder, true);
});

test('labels go inside pieces up to six parts', () => {
  assert.equal(MAX_LABELLED_PIECES, 6);
  assert.equal(stripModel(equal(6)).labelsInside, true);
  assert.equal(stripModel(equal(7)).labelsInside, false);
});

test('figures sit under pieces up to three parts, then collapse to one line', () => {
  assert.equal(stripModel(equal(3)).figuresUnder, true);
  const m = stripModel(splitAmount(14999));
  assert.equal(m.segments.length, 8);
  assert.equal(m.figuresUnder, false);
  assert.equal(m.summary, '7 × ₹1,999 + ₹1,006');
});

test('figures too long to sit under a third of the strip collapse to one line', () => {
  assert.equal(MAX_FIGURE_LENGTH, 9);
  assert.equal(stripModel(equal(3, 199999)).figuresUnder, true); // ₹1,99,999
  assert.equal(stripModel([1999, 1998.5]).figuresUnder, true); // ₹1,998.50
  const long = stripModel([199999.5, 199999.5, 1]);
  assert.equal(long.figuresUnder, false);
  assert.equal(long.summary, '₹1,99,999.50 + ₹1,99,999.50 + ₹1');
});

test('twelve parts keep 3px cuts', () => {
  const m = stripModel(splitAmount(12 * 1999 - 500));
  assert.equal(m.segments.length, 12);
  assert.equal(m.mode, 'pieces');
  assert.equal(m.gapPx, 3);
  assert.equal(m.labelsInside, false);
  assert.equal(m.figuresUnder, false);
  assert.equal(m.summary, '11 × ₹1,999 + ₹1,499');
});

test('13 to 24 parts use 2px cuts and keep the 10px minimum', () => {
  for (const n of [13, 24]) {
    const m = stripModel(equal(n));
    assert.equal(m.mode, 'pieces', `${n}`);
    assert.equal(m.segments.length, n);
    assert.equal(m.gapPx, 2, `${n}`);
    assert.equal(m.minPx, 10, `${n}`);
  }
  assert.equal(MAX_PIECES, 24);
});

test('more than 24 parts draw one continuous bar', () => {
  for (const n of [25, 100]) {
    const parts = splitAmount(n * 1999 - 999);
    assert.equal(parts.length, n);
    const m = stripModel(parts);
    assert.equal(m.mode, 'continuous', `${n}`);
    assert.equal(m.gapPx, 0);
    assert.equal(m.labelsInside, false);
    assert.equal(m.figuresUnder, false);
    assert.deepEqual(
      m.segments.map((s) => [s.key, s.state]),
      [['later', 'later']],
    );
    near(m.segments[0].weight, 100);
    assert.equal(m.summary, `${n - 1} × ₹1,999 + ₹1,000`);
  }
  assert.equal(stripModel(equal(100)).summary, '100 × ₹1,999');
});

// ---- states --------------------------------------------------------------------------------

test('without paid info nothing is paid and nothing is next', () => {
  assert.deepEqual(
    stripModel(splitAmount(5000)).segments.map((s) => s.state),
    ['later', 'later', 'later'],
  );
});

test('the first unpaid part is next by default', () => {
  const parts = splitAmount(5000);
  assert.deepEqual(
    stripModel(parts, { paid: [true, false, false] }).segments.map((s) => s.state),
    ['paid', 'next', 'later'],
  );
  assert.deepEqual(
    stripModel(parts, { paid: [false, true, false] }).segments.map((s) => s.state),
    ['next', 'paid', 'later'],
  );
  assert.deepEqual(
    stripModel(parts, { paid: [false, false, false] }).segments.map((s) => s.state),
    ['next', 'later', 'later'],
  );
});

test('all paid leaves no next piece', () => {
  assert.deepEqual(
    stripModel(splitAmount(5000), { paid: [true, true, true] }).segments.map((s) => s.state),
    ['paid', 'paid', 'paid'],
  );
});

test('a short paid array counts the missing entries as unpaid', () => {
  assert.deepEqual(
    stripModel(splitAmount(5000), { paid: [true] }).segments.map((s) => s.state),
    ['paid', 'next', 'later'],
  );
});

test('nextIndex overrides the default next part, but never over a paid one', () => {
  const parts = splitAmount(5000);
  assert.deepEqual(
    stripModel(parts, { paid: [false, false, false], nextIndex: 2 }).segments.map((s) => s.state),
    ['later', 'later', 'next'],
  );
  assert.deepEqual(
    stripModel(parts, { paid: [true, false, false], nextIndex: 0 }).segments.map((s) => s.state),
    ['paid', 'later', 'later'],
  );
  assert.deepEqual(
    stripModel(parts, { nextIndex: -1, paid: [true, false, false] }).segments.map((s) => s.state),
    ['paid', 'later', 'later'],
  );
});

test('a continuous bar shows the paid share, then the next part, then the rest', () => {
  const parts = equal(100);
  const paid = parts.map((_, i) => i === 3 || i < 2); // parts 1, 2 and 4 paid
  const m = stripModel(parts, { paid });
  assert.equal(m.mode, 'continuous');
  assert.deepEqual(
    m.segments.map((s) => s.state),
    ['paid', 'next', 'later'],
  );
  near(m.segments[0].weight, 3);
  near(m.segments[1].weight, 1);
  near(m.segments[2].weight, 96);
  assert.ok(m.minPx > 0, 'a 1% run still shows');
});

test('a continuous bar drops empty runs', () => {
  const parts = splitAmount(25 * 1999 + 500);
  const none = stripModel(parts, { paid: parts.map(() => false) });
  assert.deepEqual(
    none.segments.map((s) => s.state),
    ['next', 'later'],
  );
  const all = stripModel(parts, { paid: parts.map(() => true) });
  assert.deepEqual(
    all.segments.map((s) => s.state),
    ['paid'],
  );
  near(all.segments[0].weight, 100);
  const lastLeft = stripModel(parts, { paid: parts.map((_, i) => i < parts.length - 1) });
  assert.deepEqual(
    lastLeft.segments.map((s) => s.state),
    ['paid', 'next'],
  );
  near(sum(lastLeft.segments.map((s) => s.weight)), 100);
});

test('no parts gives an empty strip', () => {
  const m = stripModel([]);
  assert.deepEqual(m.segments, []);
  assert.deepEqual(m.figures, []);
  assert.equal(m.summary, '');
  assert.equal(m.figuresUnder, false);
  assert.equal(m.labelsInside, false);
});
