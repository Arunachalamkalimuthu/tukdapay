export interface PostMeta {
  slug: string;
  title: string;
  description: string;
  date: string; // ISO date, YYYY-MM-DD
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
