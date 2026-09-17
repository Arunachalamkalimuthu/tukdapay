/**
 * Share cards: the 1200×630 PNGs that app/og/[image]/route.tsx writes to /og/<key>.png at build time.
 * Everything here is pure so the card list and the title fitting can be tested without rendering.
 */

export const OG_SIZE = { width: 1200, height: 630 } as const;

export interface OgCard {
  /** File name without .png: a post slug, or a page key. */
  key: string;
  /** Short label on the card: Blog, Use cases or About. */
  label: string;
  /** The large text. Says what the page is; never a fee, rate or limit. */
  title: string;
  /** Alt text for og:image:alt and twitter:image:alt. */
  alt: string;
}

/** Cards for pages that aren't posts. Titles use the page's own words (its H1 or description). */
export const PAGE_CARDS: readonly OgCard[] = [
  { key: 'blog', label: 'Blog', title: 'Plain-language UPI guides', alt: 'TukdaPay blog: Plain-language UPI guides' },
  { key: 'use-cases', label: 'Use cases', title: 'Bills people pay in tukde', alt: 'TukdaPay use cases: Bills people pay in tukde' },
  { key: 'about', label: 'About', title: 'About TukdaPay', alt: 'About TukdaPay' },
];

const KEY = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Site-relative URL of a card, e.g. ogImagePath('blog') -> "/og/blog.png". */
export function ogImagePath(key: string): string {
  if (!KEY.test(key)) throw new RangeError(`share card key must be a lower-case slug, got: "${key}"`);
  return `/og/${key}.png`;
}

/**
 * Every card the build writes: one per post (so a new post in content/posts.ts gets one), then the pages.
 * A post's card shows its cardTitle when it has one, and its title otherwise; the alt text always names the post.
 * Throws if two cards share a file, or if a title or label has a character the card fonts can't draw.
 */
export function ogCards(posts: readonly { slug: string; title: string; cardTitle?: string }[]): OgCard[] {
  const cards: OgCard[] = [
    ...posts.map((p) => ({ key: p.slug, label: 'Blog', title: p.cardTitle ?? p.title, alt: `TukdaPay blog: ${p.title}` })),
    ...PAGE_CARDS,
  ];
  const seen = new Set<string>();
  for (const card of cards) {
    ogImagePath(card.key);
    if (seen.has(card.key)) throw new Error(`two share cards would both write /og/${card.key}.png`);
    seen.add(card.key);
    const missing = unsupportedCharacters(`${card.label} ${card.title}`);
    if (missing.length > 0) {
      throw new Error(
        `share card ${card.key}: ${missing.map((ch) => `"${ch}"`).join(', ')} not in the card fonts. Card text stays ` +
          'Latin plus ₹ and → (the committed Bricolage Grotesque TTFs); add a width in lib/og.ts only if the font has the glyph.',
      );
    }
  }
  return cards;
}

/** The `image` for pageMetadata (and the Open Graph / X image fields) for a card. */
export function ogImage(card: OgCard) {
  return { url: ogImagePath(card.key), alt: card.alt, ...OG_SIZE, type: 'image/png' };
}

/** Title box on the card, in px. Sizes are tried largest first. */
export const OG_TITLE = {
  maxWidth: 1040,
  maxLines: 3,
  sizes: [84, 76, 68, 60, 54] as readonly number[],
  /** In em, as on the site's display headings. */
  letterSpacing: -0.02,
  lineHeight: 1.06,
};

/*
 * Advance widths of Bricolage Grotesque ExtraBold (assets/fonts/BricolageGrotesque-ExtraBold.ttf), in
 * 1/1000 em, for U+0020–U+007E, read from its hmtx table. Kerning only narrows text, so these are safe.
 */
const ASCII_WIDTHS = [
  223, 303, 381, 633, 647, 992, 754, 187, 329, 329, 456, 534, 212, 359, 252, 365, 670, 360, 613, 611, 638, 615, 662,
  517, 661, 658, 262, 237, 534, 534, 534, 425, 1004, 712, 692, 685, 705, 632, 601, 729, 730, 303, 382, 697, 509, 955,
  790, 725, 654, 726, 688, 658, 579, 733, 682, 1001, 719, 662, 576, 329, 365, 329, 585, 543, 283, 595, 648, 571, 649,
  587, 408, 607, 643, 286, 288, 605, 283, 963, 643, 612, 648, 649, 446, 549, 406, 634, 585, 881, 587, 608, 537, 347,
  277, 347, 534,
];
const OTHER_WIDTHS: Record<string, number> = {
  '₹': 575, '–': 545, '—': 821, '‘': 219, '’': 219, '“': 426, '”': 426, '→': 640, '…': 795,
};
/** Anything else (a glyph the table doesn't list) is counted as a wide letter. ogCards rejects such text. */
const UNKNOWN_WIDTH = 1004;

const hasWidth = (ch: string) => {
  const code = ch.codePointAt(0)!;
  return (code >= 0x20 && code <= 0x7e) || Object.hasOwn(OTHER_WIDTHS, ch);
};

/**
 * Characters in `text` with no width above, each listed once. The card fonts are Latin subsets, so satori would
 * draw these as missing glyphs (or fetch another font at build time), and the title fitting would guess.
 */
export function unsupportedCharacters(text: string): string[] {
  return [...new Set(Array.from(text).filter((ch) => !hasWidth(ch)))];
}

/** Rendered width in px of `text` at `fontSize`, with letter spacing in em added after every character. */
export function textWidth(text: string, fontSize: number, letterSpacing: number = OG_TITLE.letterSpacing): number {
  let units = 0;
  let chars = 0;
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    units += code >= 0x20 && code <= 0x7e ? ASCII_WIDTHS[code - 0x20] : (OTHER_WIDTHS[ch] ?? UNKNOWN_WIDTH);
    chars += 1;
  }
  return (units / 1000) * fontSize + chars * letterSpacing * fontSize;
}

/** Fewest lines the words need at this size (greedy), or Infinity if one word is wider than the box. */
function lineCount(words: string[], size: number): number {
  const fits = (s: string) => textWidth(s, size) <= OG_TITLE.maxWidth;
  let lines = 1;
  let current = '';
  for (const word of words) {
    if (!fits(word)) return Infinity;
    const next = current ? `${current} ${word}` : word;
    if (fits(next)) current = next;
    else {
      lines += 1;
      current = word;
    }
  }
  return lines;
}

/** Splits words into exactly `n` lines so the longest line is as short as possible (like text-wrap: balance). */
function balance(words: string[], n: number, size: number): string[] {
  const k = words.length;
  const width = (i: number, j: number) => textWidth(words.slice(i, j).join(' '), size);
  // best[i][m] = smallest possible longest-line width for words[i..] in m lines, with the split that gives it.
  const best: { cost: number; cut: number }[][] = Array.from({ length: k + 1 }, () => []);
  best[k][0] = { cost: 0, cut: k };
  for (let m = 1; m <= n; m++) {
    for (let i = k - 1; i >= 0; i--) {
      let top = { cost: Infinity, cut: k };
      for (let j = i + 1; j <= k - (m - 1); j++) {
        const rest = best[j][m - 1];
        if (!rest) continue;
        const cost = Math.max(width(i, j), rest.cost);
        if (cost < top.cost) top = { cost, cut: j };
      }
      best[i][m] = top;
    }
  }
  const lines: string[] = [];
  for (let i = 0, m = n; m > 0; m--) {
    const { cut } = best[i][m];
    lines.push(words.slice(i, cut).join(' '));
    i = cut;
  }
  return lines;
}

/** The largest size at which the title fits in three balanced lines; otherwise the smallest size, cut with "…". */
export function fitTitle(
  title: string,
  sizes: readonly number[] = OG_TITLE.sizes,
): { fontSize: number; lines: string[]; truncated: boolean } {
  const words = title.trim().split(/\s+/);
  for (const size of sizes) {
    const n = lineCount(words, size);
    if (n <= OG_TITLE.maxLines) return { fontSize: size, lines: balance(words, n, size), truncated: false };
  }
  const size = sizes[sizes.length - 1];
  const fits = (s: string) => textWidth(s, size) <= OG_TITLE.maxWidth;
  const cut = (s: string) => {
    let chars = Array.from(s);
    while (chars.length > 0 && !fits(`${chars.join('')}…`)) chars = Array.from(chars.slice(0, -1).join('').trimEnd());
    return `${chars.join('')}…`;
  };
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (fits(next)) {
      current = next;
      continue;
    }
    if (current) lines.push(current);
    current = word;
    if (lines.length === OG_TITLE.maxLines) break;
  }
  if (lines.length < OG_TITLE.maxLines) lines.push(current);
  // The last line always gets the ellipsis; a line that is one over-wide word is cut to fit as well.
  return {
    fontSize: size,
    lines: lines.map((line, i) => (i === lines.length - 1 || !fits(line) ? cut(line) : line)),
    truncated: true,
  };
}
