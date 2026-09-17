import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { faq } from '@/content/faq';
import { posts } from '@/content/posts';
import { tryHref, useCases } from '@/content/useCases';
import { buildLlmsFullTxt } from '@/lib/llms';

// Rendered once at build time and written to out/llms-full.txt: llms.txt's notes plus the full text of the pages.
// Post bodies are read from their MDX files. The build runs from the project root, as the share cards' fonts
// (app/og/[image]/route.tsx) assume too.
export const dynamic = 'force-static';

export function GET() {
  const postSources = Object.fromEntries(
    posts.map((p) => [p.slug, readFileSync(join(process.cwd(), 'app', 'blog', p.slug, 'page.mdx'), 'utf8')]),
  );
  const text = buildLlmsFullTxt({
    posts,
    useCases: useCases.map((u) => ({ ...u, tryHref: tryHref(u) })),
    faq,
    postSources,
  });
  return new Response(text, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
