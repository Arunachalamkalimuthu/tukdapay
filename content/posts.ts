export interface PostMeta {
  slug: string;
  title: string;
  description: string;
  date: string; // ISO date, YYYY-MM-DD
  /** ISO date (YYYY-MM-DD) of the last change to what the post says. Leave unset until the content changes after `date`; never bump it for design or CSS changes. */
  updated?: string;
  /**
   * Large text on the post's share card (lib/og.ts), when the title would read as a fee or limit claim once the
   * card is forwarded without the page. Defaults to the title; the card's alt text always uses the title.
   */
  cardTitle?: string;
}

export const posts: PostMeta[] = [
  {
    slug: 'cant-pay-more-than-2000-upi',
    title: 'Can’t pay more than ₹2000 on UPI? What to check',
    description:
      'UPI payment above ₹2000 won’t go through? Check the message: a QR from your gallery, a new phone or PIN, a bank limit or a RuPay credit card, and what to try.',
    date: '2026-09-17',
  },
  {
    slug: 'upi-2000-threshold-what-to-check',
    title: 'UPI charges above ₹2000: how to check what applies',
    cardTitle: 'Heard about UPI charges? How to check what applies',
    description:
      'Fee on the shop, a charge on you, or a cap on a benefit? What “₹2000” means in UPI news, and where NPCI, RBI and PIB publish what applies today.',
    date: '2026-09-17',
  },
  {
    slug: 'split-upi-payment-above-2000',
    title: 'How to split a UPI payment above ₹2000',
    description:
      'Step by step: pay a bill of more than ₹2000 as several UPI payments of ₹1,999 or less from GPay, PhonePe or Paytm, and what to tell the shop first.',
    date: '2026-09-17',
  },
  {
    slug: 'rupay-credit-card-upi-2000-limit',
    title: 'RuPay credit card on UPI: ₹2000 limit reached?',
    cardTitle: 'RuPay credit card on UPI stopped? What to check',
    description:
      'RuPay credit card UPI payment stopped at ₹2000? Check if the limit is per payment or per day, where issuers publish it, and when paying in parts can’t help.',
    date: '2026-09-17',
  },
  {
    slug: 'does-splitting-upi-save-money',
    title: 'Does splitting a UPI payment above ₹2000 save money?',
    description:
      'A worked ₹5,000 example: who a charge above ₹2000 would land on, when paying in parts changes anything, when it saves nothing, and what it costs in time.',
    date: '2026-09-17',
  },
  {
    slug: 'how-upi-deep-links-work',
    title: 'UPI deep links: upi://pay format and parameters',
    description:
      'The upi://pay link format for developers: pa, pn, am, cu, tn and tr, encoding, what UPI apps do on tap, QR codes, and what a web page can’t know.',
    date: '2026-09-17',
  },
];

/** Site-relative URL of a post, with the trailing slash the static export uses. */
export const postPath = (slug: string) => `/blog/${slug}/`;

/** The posts.ts entry for a slug. Throws (failing the build) if a post page has no entry here. */
export function getPost(slug: string): PostMeta {
  const post = posts.find((p) => p.slug === slug);
  if (!post) throw new Error(`Blog post "${slug}" has no entry in content/posts.ts`);
  return post;
}

/** "2026-09-17" -> "17 September 2026". Pinned to IST so a UTC build machine doesn't show the day before. */
export const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00+05:30`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
