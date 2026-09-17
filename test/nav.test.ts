import { test } from 'node:test';
import assert from 'node:assert/strict';
import { navCurrent } from '../lib/nav.ts';

test('navCurrent marks the link to the page you are on as the current page, with or without the trailing slash', () => {
  assert.equal(navCurrent('/use-cases/', '/use-cases/'), 'page');
  assert.equal(navCurrent('/use-cases', '/use-cases/'), 'page');
  assert.equal(navCurrent('/blog/', '/blog/'), 'page');
  assert.equal(navCurrent('/blog', '/blog/'), 'page');
});

test('navCurrent marks a section link as current, not as the page, on a page inside that section', () => {
  assert.equal(navCurrent('/blog/split-upi-payment-above-2000/', '/blog/'), 'true');
  assert.equal(navCurrent('/blog/split-upi-payment-above-2000', '/blog/'), 'true');
});

test('navCurrent leaves other links unmarked', () => {
  assert.equal(navCurrent('/', '/blog/'), undefined);
  assert.equal(navCurrent('/', '/use-cases/'), undefined);
  assert.equal(navCurrent('/about/', '/blog/'), undefined);
  assert.equal(navCurrent('/use-cases/', '/blog/'), undefined);
  assert.equal(navCurrent('/blog/', '/use-cases/'), undefined);
  // A path that only starts with the same letters isn't in the section.
  assert.equal(navCurrent('/blogroll/', '/blog/'), undefined);
  assert.equal(navCurrent('/use-cases-old/', '/use-cases/'), undefined);
});

test('navCurrent marks nothing when the path is unknown', () => {
  assert.equal(navCurrent(null, '/blog/'), undefined);
  assert.equal(navCurrent(undefined, '/blog/'), undefined);
  assert.equal(navCurrent('', '/blog/'), undefined);
});

test('navCurrent never marks every page as inside the home link’s section', () => {
  assert.equal(navCurrent('/', '/'), 'page');
  assert.equal(navCurrent('/blog/', '/'), undefined);
});
