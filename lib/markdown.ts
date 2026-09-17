/**
 * Plain Markdown from the site's own sources, for /llms-full.txt: blog posts written in MDX, and answers written as
 * JSX (content/faq.tsx). Links come out absolute, because the Markdown is read away from the site. Pure: no React,
 * no file system.
 */

/** A site-relative href ("/blog/x/", "#id") as an absolute URL. Anything else (https:, mailto:, //host) is returned as it is. */
export function absoluteUrl(href: string, siteUrl: string, pageUrl = `${siteUrl}/`): string {
  if (href.startsWith('/') && !href.startsWith('//')) return `${siteUrl}${href}`;
  if (href.startsWith('#')) return `${pageUrl.split('#')[0]}${href}`;
  return href;
}

export interface MdxOptions {
  siteUrl: string;
  /** The URL the MDX page is published at, for #fragment links. */
  pageUrl: string;
  /** Levels added to every heading (at most ######), so a post's ## can sit under a ## that introduces the post. */
  headingOffset?: number;
}

const FENCE = /^ {0,3}(`{3,}|~{3,})/;

interface Segment {
  code: boolean;
  lines: string[];
}

/** Lines split into fenced code blocks (fences included) and everything else. An unclosed fence runs to the end. */
function segments(lines: string[]): Segment[] {
  const out: Segment[] = [];
  let fence: string | null = null;
  const push = (code: boolean, line: string) => {
    const last = out.at(-1);
    if (last && last.code === code) last.lines.push(line);
    else out.push({ code, lines: [line] });
  };
  for (const line of lines) {
    const m = FENCE.exec(line);
    if (fence === null) {
      if (m) {
        fence = m[1];
        push(true, line);
      } else push(false, line);
    } else {
      push(true, line);
      if (m && m[1][0] === fence[0] && m[1].length >= fence.length && line.trim() === m[1]) fence = null;
    }
  }
  return out;
}

/** MDX ESM: a paragraph that starts with import or export, up to the blank line that ends it. */
function dropEsm(lines: string[]): string[] {
  const kept: string[] = [];
  let inEsm = false;
  let atParagraphStart = true;
  for (const line of lines) {
    if (line.trim() === '') {
      inEsm = false;
      atParagraphStart = true;
      kept.push(line);
      continue;
    }
    if (atParagraphStart && /^(import|export)\s/.test(line)) inEsm = true;
    atParagraphStart = false;
    if (!inEsm) kept.push(line);
  }
  return kept;
}

const fail = (what: string, source: string): never => {
  throw new Error(`mdxToMarkdown can't convert ${what} in "${source.trim().slice(0, 80)}"; teach lib/markdown.ts about it`);
};

function convertProse(text: string, { siteUrl, pageUrl, headingOffset = 0 }: MdxOptions): string {
  // Park inline code so nothing inside it is read as a link, a component or an expression.
  const spans: string[] = [];
  let out = text.replace(/(`+)[\s\S]*?\1/g, (span) => `\u0000${spans.push(span) - 1}\u0000`);

  out = out
    .replace(/<Lede>([\s\S]*?)<\/Lede>/g, (_m, inner: string) => inner.trim())
    .replace(/<Callout>([\s\S]*?)<\/Callout>/g, (_m, inner: string) =>
      inner
        .trim()
        .split('\n')
        .map((line) => (line.trim() === '' ? '>' : `> ${line}`))
        .join('\n'),
    )
    .replace(/<Cta href="([^"]*)">([\s\S]*?)<\/Cta>/g, (_m, href: string, label: string) => `[${label.trim()}](${absoluteUrl(href, siteUrl, pageUrl)})`)
    .replace(/\]\(([^)\s]+)\)/g, (_m, href: string) => `](${absoluteUrl(href, siteUrl, pageUrl)})`)
    .replace(/^(#{1,6})(?=\s)/gm, (hashes: string) => '#'.repeat(Math.min(6, hashes.length + headingOffset)));

  const tag = /<\/?[A-Za-z][^>]*>/.exec(out);
  if (tag) fail(`the tag ${tag[0]}`, out.slice(Math.max(0, tag.index - 20)));
  const brace = /(?<!\\)[{}]/.exec(out);
  if (brace) fail('an MDX expression', out.slice(Math.max(0, brace.index - 20)));
  out = out.replace(/\\([{}])/g, '$1');

  return out.replace(/\u0000(\d+)\u0000/g, (_m, i: string) => spans[Number(i)]);
}

/**
 * A blog post's MDX as plain Markdown: import and export statements dropped, <Lede> as a paragraph, <Callout> as a
 * blockquote, <Cta href> as a link, site-relative links made absolute and headings moved down by headingOffset.
 * Code blocks, inline code and tables come through as written. Throws on any other JSX or {expression}, so a new
 * component can't leak into the output unconverted.
 */
export function mdxToMarkdown(source: string, options: MdxOptions): string {
  return segments(source.replace(/\r\n?/g, '\n').split('\n'))
    .map((segment) =>
      segment.code
        ? segment.lines.join('\n')
        : convertProse(dropEsm(segment.lines).join('\n'), options)
            .replace(/\n[ \t]*(?:\n[ \t]*){2,}/g, '\n\n')
            .trim(),
    )
    .filter((block) => block !== '')
    .join('\n\n');
}

interface ElementLike {
  type: unknown;
  props: { children?: unknown; href?: unknown };
}

const isElement = (node: object): node is ElementLike =>
  'type' in node && 'props' in node && typeof (node as { props: unknown }).props === 'object' && (node as { props: unknown }).props !== null;

/**
 * Inline Markdown from a React node such as an FAQ answer's `body`: text as it is, anything with an href as a link
 * (next/link and <a> alike), <code> as inline code, <strong> and <em> as emphasis, and other elements as their
 * children. Walks the element tree without rendering it.
 */
export function inlineToMarkdown(node: unknown, siteUrl: string): string {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map((child) => inlineToMarkdown(child, siteUrl)).join('');
  if (typeof node === 'object' && isElement(node)) {
    const { type, props } = node;
    const inner = inlineToMarkdown(props.children, siteUrl);
    if (typeof props.href === 'string') return `[${inner}](${absoluteUrl(props.href, siteUrl)})`;
    if (type === 'code') return `\`${inner}\``;
    if (type === 'strong' || type === 'b') return `**${inner}**`;
    if (type === 'em' || type === 'i') return `*${inner}*`;
    return inner;
  }
  throw new TypeError(`inlineToMarkdown: not a React node: ${typeof node}`);
}
