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

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'TukdaPay – Split UPI payments above ₹2000 into smaller parts',
    template: '%s – TukdaPay',
  },
  description:
    'Free UPI payment splitter. Break a bill over ₹2000 into payments of ₹1999 or less and pay each one from GPay, PhonePe, Paytm or any UPI app. No signup, no backend.',
  applicationName: SITE_NAME,
  alternates: { canonical: '/', types: FEED_ALTERNATE },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    locale: 'en_IN',
    url: '/',
    title: 'TukdaPay – Split UPI payments above ₹2000',
    description: 'Break a big UPI bill into parts of ₹1999 or less and pay each from your own UPI app. Free, no signup.',
    images: [OG_IMAGE],
  },
  twitter: { card: 'summary_large_image' },
  icons: { icon: '/favicon.svg', apple: { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' } },
  manifest: '/manifest.webmanifest',
  robots: { index: true, follow: true },
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
