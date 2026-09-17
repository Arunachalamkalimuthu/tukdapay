import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cx } from '../lib/cx.ts';

test('cx joins class names with spaces and skips false, undefined and empty ones', () => {
  assert.equal(cx('form', undefined, false, '', 'tool'), 'form tool');
  assert.equal(cx('strip'), 'strip');
  assert.equal(cx(undefined, false), '');
});
