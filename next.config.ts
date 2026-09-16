import type { NextConfig } from 'next';
import createMDX from '@next/mdx';

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  pageExtensions: ['ts', 'tsx', 'mdx'],
  turbopack: { root: import.meta.dirname },
};

// Plugins are named by string so Turbopack can pass them to the MDX loader.
// remark-gfm adds pipe tables (with column alignment) to the blog posts.
const withMDX = createMDX({
  options: { remarkPlugins: ['remark-gfm'] },
});

export default withMDX(nextConfig);
