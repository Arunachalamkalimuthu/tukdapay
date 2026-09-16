import type { MDXComponents } from 'mdx/types';
import { Callout, CodeBlock, Cta, Lede, ScrollTable, SmartLink } from '@/components/blog/PostParts';

/** Available in every .mdx file without an import. */
const blogComponents: MDXComponents = {
  a: SmartLink,
  pre: CodeBlock,
  table: ScrollTable,
  Callout,
  Cta,
  Lede,
};

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return { ...blogComponents, ...components };
}
