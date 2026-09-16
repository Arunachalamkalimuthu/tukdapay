import type { ReactNode } from 'react';
import { REPO_URL } from '../lib/site.ts';

export interface FaqEntry {
  q: string;
  /** Plain-text answer, used for the FAQPage JSON-LD. */
  a: string;
  /** The same answer with markup, shown on the page when set. Must read the same as `a`. */
  body?: ReactNode;
}

export const faq: FaqEntry[] = [
  {
    q: 'What does TukdaPay do?',
    a: 'It takes one amount and breaks it into several UPI payments that each stay at or under a limit you choose (₹1,999 by default). Each part gets its own Pay link or QR code.',
  },
  {
    q: 'Does it move money?',
    a: 'No. TukdaPay only prepares upi://pay links. Your own UPI app makes every payment, and this page never sees your bank details.',
    body: (
      <>
        No. TukdaPay only prepares <code>upi://pay</code> links. Your own UPI app makes every payment, and this page
        never sees your bank details.
      </>
    ),
  },
  {
    q: 'Which UPI apps work?',
    a: 'Any app that handles UPI links: Google Pay, PhonePe, Paytm, BHIM, Amazon Pay, CRED and bank apps. On a computer, scan the QR code with your phone.',
  },
  {
    q: 'Can I change the ₹1,999 limit?',
    a: 'Yes. Open “Max per payment” above the Split button and set whatever limit applies to you.',
  },
  {
    q: 'Is it free and open source?',
    a: 'Yes. MIT licensed on GitHub. No signup, no ads, no tracking.',
    body: (
      <>
        Yes. MIT licensed on <a href={REPO_URL}>GitHub</a>. No signup, no ads, no tracking.
      </>
    ),
  },
];
