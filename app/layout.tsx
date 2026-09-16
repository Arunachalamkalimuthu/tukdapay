import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque } from 'next/font/google';
import { SITE_NAME, SITE_URL } from '@/lib/site';
import { FEED_URL, OG_IMAGE } from '@/lib/metadata';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import './globals.css';

const sans = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['400', '500', '700', '800'],
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
  keywords: ['UPI split payment', 'UPI 2000 limit', 'split UPI transaction', 'GPay split payment', 'PhonePe split payment', 'UPI payment splitter'],
  alternates: { canonical: '/', types: { 'application/rss+xml': FEED_URL } },
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

export const viewport: Viewport = { themeColor: '#a8256b' };

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
