import { test } from 'node:test';
import assert from 'node:assert/strict';
import { focusLeftBehind, focusToRestore } from '../lib/routeFocus.ts';

/** A stand-in for a DOM element: `contains` is true for itself and the children given. */
function node(name: string, children: object[] = []) {
  const self = { name, contains: (other: unknown) => other === self || children.includes(other as object) };
  return self;
}

const body = node('body');
const inMain = node('link in main');
const main = node('main', [inMain]);
const footerLink = node('footer link');

test('focusLeftBehind is true when focus stayed on a link outside main, such as the footer or header', () => {
  assert.equal(focusLeftBehind(footerLink, body, main), true);
});

test('focusLeftBehind is false when focus is on the body, so a #fragment link keeps its place', () => {
  assert.equal(focusLeftBehind(body, body, main), false);
});

test('focusLeftBehind is false when focus is already in main or on main', () => {
  assert.equal(focusLeftBehind(inMain, body, main), false);
  assert.equal(focusLeftBehind(main, body, main), false);
});

test('focusLeftBehind is false when there is no focus or no main', () => {
  assert.equal(focusLeftBehind(null, body, main), false);
  assert.equal(focusLeftBehind(footerLink, body, null), false);
});

// ---- coming back ----

/** A stand-in for the link that moved to another page, with `isConnected` as the DOM has it. */
const link = (isConnected = true) => ({ name: 'footer link', isConnected });

test('focusToRestore is the link that left a page, on coming back to that page with focus still on main', () => {
  const footer = link();
  assert.equal(focusToRestore({ path: '/about/', element: footer }, '/about/', main, main), footer);
});

test('focusToRestore is null once focus has moved on from main, so a Tab or click after the page change is kept', () => {
  const footer = link();
  assert.equal(focusToRestore({ path: '/about/', element: footer }, '/about/', inMain, main), null);
  assert.equal(focusToRestore({ path: '/about/', element: footer }, '/about/', body, main), null);
});

test('focusToRestore is null on a page other than the one the link left', () => {
  assert.equal(focusToRestore({ path: '/about/', element: link() }, '/use-cases/', main, main), null);
});

test('focusToRestore is null when no link left a page, the link is gone, or there is no main', () => {
  assert.equal(focusToRestore(null, '/about/', main, main), null);
  assert.equal(focusToRestore({ path: '/about/', element: link(false) }, '/about/', main, main), null);
  assert.equal(focusToRestore({ path: '/about/', element: link() }, '/about/', null, null), null);
});
