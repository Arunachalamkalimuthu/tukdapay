import { test } from 'node:test';
import assert from 'node:assert/strict';
import { focusLeftBehind } from '../lib/routeFocus.ts';

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
