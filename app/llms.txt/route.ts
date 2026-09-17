import { posts } from '@/content/posts';
import { useCases } from '@/content/useCases';
import { buildLlmsTxt } from '@/lib/llms';

// Rendered once at build time and written to out/llms.txt (the llmstxt.org index for AI systems and agents).
export const dynamic = 'force-static';

export function GET() {
  return new Response(buildLlmsTxt({ posts, useCases }), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
