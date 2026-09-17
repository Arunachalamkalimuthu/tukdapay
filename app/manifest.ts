import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'TukdaPay – UPI payment splitter',
    short_name: 'TukdaPay',
    description:
      'Split a big UPI bill into smaller payments and pay each one from your own UPI app. Free, no signup, nothing leaves your phone.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#f1eef6',
    theme_color: '#f1eef6',
    lang: 'en-IN',
    dir: 'ltr',
    categories: ['finance', 'utilities'],
    icons: [
      { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
