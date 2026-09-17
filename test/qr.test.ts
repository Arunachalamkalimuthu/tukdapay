import { test } from 'node:test';
import assert from 'node:assert/strict';
import { modulesToPath } from '../lib/qr.ts';

const grid = (rows: string[]) => ({
  size: rows.length,
  data: Uint8Array.from(rows.join('').split(''), (c) => (c === '#' ? 1 : 0)),
});

test('modulesToPath draws one rectangle per run of dark modules in a row', () => {
  const { size, data } = grid(['##.', '.#.', '###']);
  assert.equal(modulesToPath(size, data), 'M0 0h2v1h-2zM1 1h1v1h-1zM0 2h3v1h-3z');
});

test('modulesToPath handles runs that end at the row edge and gaps inside a row', () => {
  const { size, data } = grid(['#.#.', '....', '.##.', '...#']);
  assert.equal(modulesToPath(size, data), 'M0 0h1v1h-1zM2 0h1v1h-1zM1 2h2v1h-2zM3 3h1v1h-1z');
});

test('modulesToPath returns an empty path for a blank matrix', () => {
  const { size, data } = grid(['..', '..']);
  assert.equal(modulesToPath(size, data), '');
});
