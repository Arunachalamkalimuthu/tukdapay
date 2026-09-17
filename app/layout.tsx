import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque } from 'next/font/google';
import { SITE_NAME, SITE_URL } from '@/lib/site';
import { FEED_ALTERNATE, OG_IMAGE } from '@/lib/metadata';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import './globals.css';

// Variable weight plus the width axis: money is set condensed (see .money in globals.css).
// latin-ext carries the ₹ sign, so both subsets are preloaded. No opsz axis: it would add ~70KB.
const sans = Bricolage_Grotesque({
  subsets: ['latin', 'latin-ext'],
  axes: ['wdth'],
  variable: '--font-sans',
  display: 'swap',
});

// Home title and description lead with what people search for; ₹2000 stays ungrouped because that's how
// they type it. Other pages set their own through pageMetadata (lib/metadata.ts).
const HOME_DESCRIPTION =
  'Split a bill over ₹2000 into UPI payments of ₹1,999 or less and pay each from GPay, PhonePe, Paytm or any UPI app. Free, no signup, nothing leaves your phone.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Split a UPI payment above ₹2000 into parts – TukdaPay',
    template: '%s – TukdaPay',
  },
  description: HOME_DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: { canonical: '/', types: FEED_ALTERNATE },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    locale: 'en_IN',
    url: '/',
    title: 'Split a UPI payment above ₹2000 into parts',
    description: HOME_DESCRIPTION,
    images: [OG_IMAGE],
  },
  // Title and description come from openGraph; the image is set so its alt text is written too.
  twitter: { card: 'summary_large_image', images: [OG_IMAGE] },
  // Google Search doesn't use SVG favicons, so the PNG comes first; browsers that read SVG still get it.
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
  },
  manifest: '/manifest.webmanifest',
  // Inherited by every page that doesn't set its own; the 404 page drops it and Next writes noindex there.
  robots: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 },
};

// The browser bar matches the page's paper colour in each theme.
export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f1eef6' },
    { media: '(prefers-color-scheme: dark)', color: '#15121e' },
  ],
  colorScheme: 'light dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={sans.variable}>
      <body>
        <a className="skip" href="#main">Skip to content</a>
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
