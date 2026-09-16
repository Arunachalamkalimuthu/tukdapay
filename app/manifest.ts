import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'TukdaPay – UPI payment splitter',
    short_name: 'TukdaPay',
    description: 'Split a UPI payment above ₹2000 into parts and pay each from any UPI app.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f0edf5',
    theme_color: '#a8256b',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
