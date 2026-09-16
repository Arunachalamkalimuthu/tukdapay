export interface PostMeta {
  slug: string;
  title: string;
  description: string;
  date: string; // ISO
}

export const posts: PostMeta[] = [
  {
    slug: 'split-upi-payment-above-2000',
    title: 'How to split a UPI payment above ₹2000',
    description: 'Step-by-step: break a bill over ₹2000 into UPI payments of ₹1999 or less and pay each one from GPay, PhonePe or Paytm.',
    date: '2026-09-17',
  },
  {
    slug: 'upi-2000-threshold-what-to-check',
    title: 'The ₹2000 UPI threshold: what to check before you pay',
    description: 'Per-transaction UPI rules change often. How to find out what actually applies to your payment today, from the sources that decide it.',
    date: '2026-09-17',
  },
  {
    slug: 'does-splitting-upi-save-money',
    title: 'Does splitting a UPI payment actually save money?',
    description: 'A worked example of when paying a bill in parts saves a per-transaction charge, when it saves nothing, and what it costs in time.',
    date: '2026-09-17',
  },
  {
    slug: 'how-upi-deep-links-work',
    title: 'How upi://pay deep links work',
    description: 'The upi://pay URL scheme explained for developers: parameters, encoding, what apps do with it, and what a web page can and cannot know.',
    date: '2026-09-17',
  },
];

export const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00+05:30`).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
