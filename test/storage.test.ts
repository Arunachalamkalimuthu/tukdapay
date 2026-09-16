import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readJson, writeJson } from '../lib/storage.ts';

/** Run `fn` with `storage` as the global localStorage (Node has none of its own). */
function withStorage(storage: unknown, fn: () => void) {
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true, writable: true });
  try {
    fn();
  } finally {
    delete (globalThis as { localStorage?: unknown }).localStorage;
  }
}

function memoryStorage() {
  const items = new Map<string, string>();
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
  };
}

const deny = () => {
  throw new DOMException('The operation is insecure.', 'SecurityError');
};
const blocked = { getItem: deny, setItem: deny, removeItem: deny };

test('writeJson returns true once the value is saved or removed', () => {
  withStorage(memoryStorage(), () => {
    assert.equal(writeJson('k', { a: 1 }), true);
    assert.deepEqual(readJson('k'), { a: 1 });
    assert.equal(writeJson('k', null), true);
    assert.equal(readJson('k'), null);
  });
});

test('writeJson returns false when storage is blocked or missing', () => {
  withStorage(blocked, () => {
    assert.equal(writeJson('k', { a: 1 }), false);
    assert.equal(writeJson('k', null), false);
    assert.equal(readJson('k'), null);
  });
  assert.equal(writeJson('k', { a: 1 }), false);
});
