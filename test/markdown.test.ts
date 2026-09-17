import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement, Fragment, type ReactNode } from 'react';
import { absoluteUrl, inlineToMarkdown, mdxToMarkdown } from '../lib/markdown.ts';

const SITE = 'https://tukdapay.com';
const PAGE = `${SITE}/blog/a-post/`;
const convert = (source: string, headingOffset = 0) => mdxToMarkdown(source, { siteUrl: SITE, pageUrl: PAGE, headingOffset });

test('absoluteUrl makes site paths and #fragments absolute and leaves everything else alone', () => {
  assert.equal(absoluteUrl('/', SITE), 'https://tukdapay.com/');
  assert.equal(absoluteUrl('/blog/x/', SITE), 'https://tukdapay.com/blog/x/');
  assert.equal(absoluteUrl('/use-cases/#merchants', SITE), 'https://tukdapay.com/use-cases/#merchants');
  assert.equal(absoluteUrl('/?amount=4200', SITE), 'https://tukdapay.com/?amount=4200');
  assert.equal(absoluteUrl('#steps', SITE, PAGE), 'https://tukdapay.com/blog/a-post/#steps');
  assert.equal(absoluteUrl('#steps', SITE), 'https://tukdapay.com/#steps');
  for (const href of ['https://www.npci.org.in/', '//cdn.example.com/x', 'mailto:a@b.c', 'upi://pay?pa=a@b']) {
    assert.equal(absoluteUrl(href, SITE, PAGE), href);
  }
});

test('mdxToMarkdown drops the import and export statements a post starts with', () => {
  const md = convert(
    [
      "import { postLayout, postMetadata } from '@/components/blog/PostShell'",
      '',
      "export const metadata = postMetadata('a-post')",
      '',
      "export default postLayout('a-post')",
      '',
      'First paragraph.',
    ].join('\n'),
  );
  assert.equal(md, 'First paragraph.');
});

test('mdxToMarkdown drops a statement that runs over several lines, up to the blank line that ends it', () => {
  const md = convert(['export const metadata = {', "  title: 'x',", '}', '', 'Body.'].join('\n'));
  assert.equal(md, 'Body.');
});

test('<Lede> becomes a plain paragraph, on one line or several', () => {
  assert.equal(convert('<Lede>You try to pay a bill. It [fails](/blog/x/).</Lede>'), 'You try to pay a bill. It [fails](https://tukdapay.com/blog/x/).');
  assert.equal(convert('<Lede>\nOne.\nTwo.\n</Lede>\n\nNext.'), 'One.\nTwo.\n\nNext.');
});

test('<Callout> becomes a blockquote, keeping its blank lines inside the quote', () => {
  const md = convert('Before.\n\n<Callout>\n**Ask the shop first.** Really.\n\nSecond paragraph.\n</Callout>\n\nAfter.');
  assert.equal(md, 'Before.\n\n> **Ask the shop first.** Really.\n>\n> Second paragraph.\n\nAfter.');
});

test('<Cta> becomes a link to an absolute URL', () => {
  assert.equal(convert('<Cta href="/">Split a bill into UPI payments</Cta>'), '[Split a bill into UPI payments](https://tukdapay.com/)');
  assert.equal(
    convert('<Cta href="https://github.com/Arunachalamkalimuthu/tukdapay">Read the source</Cta>'),
    '[Read the source](https://github.com/Arunachalamkalimuthu/tukdapay)',
  );
});

test('site-relative Markdown links become absolute; external ones stay as they are', () => {
  const md = convert(
    "See [the splitter](/), [merchants](/use-cases/#merchants), [a step](#step-2) and [NPCI](https://www.npci.org.in/).",
  );
  assert.equal(
    md,
    'See [the splitter](https://tukdapay.com/), [merchants](https://tukdapay.com/use-cases/#merchants), [a step](https://tukdapay.com/blog/a-post/#step-2) and [NPCI](https://www.npci.org.in/).',
  );
});

test('headingOffset moves every heading down, up to level 6, but not # lines in code', () => {
  const md = convert('## Two\n\n### Three\n\n###### Six\n\n```sh\n# a shell comment\n```', 1);
  assert.equal(md, '### Two\n\n#### Three\n\n###### Six\n\n```sh\n# a shell comment\n```');
  assert.equal(convert('## Two'), '## Two');
});

test('code blocks come through untouched, even when they look like MDX', () => {
  const code = [
    '```ts',
    'export interface UpiParams {',
    '  pa: string;',
    '}',
    '',
    "import x from 'y';",
    'const a: Array<string> = [];',
    'const link = `[x](/y/)`;',
    '<Lede>not a component</Lede>',
    '',
    '',
    '// two blank lines above stay',
    '```',
  ].join('\n');
  assert.equal(convert(`Before.\n\n${code}\n\nAfter.`), `Before.\n\n${code}\n\nAfter.`);
});

test('inline code comes through untouched', () => {
  const md = convert('The `<Lede>` component and `[x](/y/)` and `{braces}` stay.');
  assert.equal(md, 'The `<Lede>` component and `[x](/y/)` and `{braces}` stay.');
});

test('GFM tables are kept as written', () => {
  const table = ['| Part     |    Amount |', '| -------- | --------: |', '| Part 1/3 | ₹1,999.00 |'].join('\n');
  assert.equal(convert(table), table);
});

test('escaped braces lose their backslash', () => {
  assert.equal(convert('A literal \\{brace\\}.'), 'A literal {brace}.');
});

test('mdxToMarkdown fails loudly on JSX or expressions it does not know, so nothing leaks into the output', () => {
  for (const source of [
    '<Foo>bar</Foo>',
    'Text with <abbr title="x">HTML</abbr> in it.',
    '<Cta href={url}>Label</Cta>',
    'An expression {1 + 1} here.',
    "{' '}",
  ]) {
    assert.throws(() => convert(source), /lib\/markdown\.ts/, source);
  }
});

test('mdxToMarkdown collapses runs of blank lines and trims the result', () => {
  assert.equal(convert('\n\n\nOne.\n\n\n\nTwo.\n\n'), 'One.\n\nTwo.');
  assert.equal(convert('One.\n\n\n\n```\ncode\n```\n\n\n\nTwo.'), 'One.\n\n```\ncode\n```\n\nTwo.');
  assert.equal(convert('One.\r\n\r\nTwo.'), 'One.\n\nTwo.');
});

test('inlineToMarkdown writes text, links, code and emphasis from a React element tree', () => {
  // Stands in for next/link: a component, not a tag, whose element carries the href in its props.
  const Link = (props: { href: string; children?: ReactNode }) => createElement('a', props);
  const node = createElement(
    Fragment,
    null,
    'No. TukdaPay only prepares ',
    createElement('code', null, 'upi://pay'),
    ' links. See ',
    createElement(Link, { href: '/blog/x/' }, 'what to check'),
    ' and ',
    createElement('a', { href: 'https://t.me/PIB_FactCheck' }, 'Telegram'),
    '. ',
    createElement('strong', null, 'Ask'),
    ' ',
    createElement('em', null, 'first'),
    '.',
    null,
    false,
    ' ',
    2,
  );
  assert.equal(
    inlineToMarkdown(node, SITE),
    'No. TukdaPay only prepares `upi://pay` links. See [what to check](https://tukdapay.com/blog/x/) and [Telegram](https://t.me/PIB_FactCheck). **Ask** *first*. 2',
  );
});

test('inlineToMarkdown handles plain strings, arrays and empty nodes', () => {
  assert.equal(inlineToMarkdown('Plain.', SITE), 'Plain.');
  assert.equal(inlineToMarkdown(['a', ['b', 'c']], SITE), 'abc');
  assert.equal(inlineToMarkdown(undefined, SITE), '');
  assert.equal(inlineToMarkdown(true, SITE), '');
});

test('inlineToMarkdown rejects values that are not React nodes', () => {
  assert.throws(() => inlineToMarkdown({ not: 'an element' }, SITE), TypeError);
  assert.throws(() => inlineToMarkdown(() => 'x', SITE), TypeError);
});
