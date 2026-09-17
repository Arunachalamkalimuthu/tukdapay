/**
 * Share cards, written at build time to out/og/<key>.png (1200×630): one per post in content/posts.ts,
 * plus blog.png, use-cases.png and about.png. A route handler rather than opengraph-image.tsx, because
 * that convention writes a file with no extension, which GitHub Pages serves as octet-stream.
 *
 * Satori needs TTF/OTF, so the two static Bricolage Grotesque instances are committed under assets/fonts
 * (Google Fonts API, v9, SIL Open Font License: assets/fonts/OFL.txt).
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { posts } from '@/content/posts';
import { OG_SIZE, OG_TITLE, fitTitle, ogCards, type OgCard } from '@/lib/og';

export const dynamic = 'force-static';
export const dynamicParams = false;

const PAPER = '#f1eef6';
const INK = '#1e1930';
const MAGENTA = '#a8256b';
const PADDING_X = (OG_SIZE.width - OG_TITLE.maxWidth) / 2;

export function generateStaticParams() {
  return ogCards(posts).map((card) => ({ image: `${card.key}.png` }));
}

const fonts = Promise.all([
  readFile(join(process.cwd(), 'assets/fonts/BricolageGrotesque-SemiBold.ttf')),
  readFile(join(process.cwd(), 'assets/fonts/BricolageGrotesque-ExtraBold.ttf')),
]);

/** The header's three-piece mark: two whole pieces and a remainder. */
function Mark() {
  const piece = (width: number) => (
    <div style={{ display: 'flex', width, height: 20, borderRadius: 5, background: MAGENTA }} />
  );
  return (
    <div style={{ display: 'flex', gap: 5 }}>
      {piece(28)}
      {piece(28)}
      {piece(6)}
    </div>
  );
}

/** A thin tukda strip: ₹5,000's pieces in proportion, without the figures. */
function Strip() {
  return (
    <div style={{ display: 'flex', gap: 12, width: '100%' }}>
      {[1999, 1999, 1002].map((part, i) => (
        <div key={i} style={{ display: 'flex', flexGrow: part, flexBasis: 0, height: 14, borderRadius: 5, background: MAGENTA }} />
      ))}
    </div>
  );
}

function Card({ card }: { card: OgCard }) {
  const { fontSize, lines } = fitTitle(card.title);
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: `60px ${PADDING_X}px 64px`,
        background: PAPER,
        color: INK,
        fontFamily: 'Bricolage Grotesque',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <Mark />
          <div style={{ fontSize: 46, fontWeight: 800, letterSpacing: -0.9 }}>TukdaPay</div>
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 32,
            fontWeight: 600,
            color: MAGENTA,
            border: `3px solid ${MAGENTA}`,
            borderRadius: 999,
            padding: '4px 24px 8px',
          }}
        >
          {card.label}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flexGrow: 1 }}>
        {lines.map((line, i) => (
          <div
            key={i}
            style={{
              fontSize,
              fontWeight: 800,
              lineHeight: OG_TITLE.lineHeight,
              letterSpacing: OG_TITLE.letterSpacing * fontSize,
              whiteSpace: 'nowrap',
            }}
          >
            {line}
          </div>
        ))}
      </div>
      <Strip />
    </div>
  );
}

export async function GET(_request: Request, { params }: { params: Promise<{ image: string }> }) {
  const { image } = await params;
  const card = ogCards(posts).find((c) => `${c.key}.png` === image);
  if (!card) return new Response('Not found', { status: 404 });
  const [semiBold, extraBold] = await fonts;
  return new ImageResponse(<Card card={card} />, {
    ...OG_SIZE,
    fonts: [
      { name: 'Bricolage Grotesque', data: semiBold, weight: 600, style: 'normal' },
      { name: 'Bricolage Grotesque', data: extraBold, weight: 800, style: 'normal' },
    ],
  });
}
