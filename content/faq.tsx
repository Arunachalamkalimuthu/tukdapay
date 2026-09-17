import type { ReactNode } from 'react';
import Link from 'next/link';
import { REPO_URL } from '../lib/site.ts';

export interface FaqEntry {
  q: string;
  /** Plain-text answer, used for the FAQPage JSON-LD. */
  a: string;
  /** The same answer with markup, shown on the page when set. Must read the same as `a`. */
  body?: ReactNode;
}

/** NPCI, Merchant Discount Rate (MDR) on Select UPI (P2M) Transactions – FAQs, 15 Sept 2026. */
export const NPCI_MDR_FAQ_URL =
  'https://www.npci.org.in/uploads/FA_Qs_Merchant_Discount_Rate_MDR_on_Select_UPI_P2_M_Transactions_58dba1d39e.pdf';
/*
 * Where PIB Fact Check posts its checks. Its portal, factcheck.pib.gov.in, is a login form for sending in a claim,
 * with no checks to read, so answers link these instead.
 */
export const PIB_FACT_CHECK_TELEGRAM_URL = 'https://t.me/PIB_FactCheck';
export const PIB_FACT_CHECK_X_URL = 'https://x.com/PIBFactCheck';

/*
 * Copy rules for these answers: TukdaPay isn't a way to avoid a fee, so nothing here pitches splitting as one, and
 * only the charges answer mentions fees or charges at all. Answers about limits and charges state no rule, rate,
 * cap or date; they say where to check.
 */
export const faq: FaqEntry[] = [
  {
    q: 'What does TukdaPay do?',
    a: 'It takes one amount and breaks it into several UPI payments that each stay at or under a limit you choose (₹1,999 by default). Each part gets its own Pay link or QR code. It’s for when a bill won’t go through as one payment, or when the shop asks you to pay in parts.',
  },
  {
    q: 'Is it OK to pay a shop in parts?',
    a: 'Ask the shop first. They’ll see several payments instead of one. Each part carries its part number in the payment note, like Part 1/3, so the shop can match the payments to your bill.',
  },
  {
    q: 'Is this the same as Split expenses in Google Pay or PhonePe?',
    a: 'No. Splitting expenses in those apps divides one bill among friends, and each person pays their share. TukdaPay is for when you pay a bill yourself, as a few payments to the same shop.',
  },
  {
    q: 'Why ₹1,999?',
    a: 'It keeps each part under ₹2,000, an amount that comes up a lot in UPI news about limits. TukdaPay doesn’t know which limit, if any, applies to your payment. Your bank or UPI app can tell you. If a payment above ₹2,000 won’t go through, see what to check when you can’t pay more than ₹2,000 on UPI.',
    body: (
      <>
        It keeps each part under ₹2,000, an amount that comes up a lot in UPI news about limits. TukdaPay doesn’t know
        which limit, if any, applies to your payment. Your bank or UPI app can tell you. If a payment above ₹2,000
        won’t go through, see{' '}
        <Link href="/blog/cant-pay-more-than-2000-upi/">what to check when you can’t pay more than ₹2,000 on UPI</Link>.
      </>
    ),
  },
  {
    q: 'Can I change the ₹1,999 limit?',
    a: 'Yes. Open “Max per payment” above the Split button and set whatever limit applies to you. Not sure what applies? Here’s what to check.',
    body: (
      <>
        Yes. Open “Max per payment” above the Split button and set whatever limit applies to you. Not sure what applies?{' '}
        <Link href="/blog/upi-2000-threshold-what-to-check/">Here’s what to check</Link>.
      </>
    ),
  },
  {
    q: 'Will I be charged for a UPI payment above ₹2,000?',
    a: 'TukdaPay is free, and it can’t tell you what applies to your payment. NPCI’s FAQs on the merchant discount rate (PDF) cover this in question 15: “Will ordinary consumers be charged for making payments via UPI?” For a newer claim, see whether PIB Fact Check has covered it on its Telegram channel or X account before you believe or forward it. TukdaPay isn’t a way to avoid a fee. Ask the shop before you split.',
    body: (
      <>
        TukdaPay is free, and it can’t tell you what applies to your payment.{' '}
        <a href={NPCI_MDR_FAQ_URL}>NPCI’s FAQs on the merchant discount rate (PDF)</a> cover this in question 15: “Will
        ordinary consumers be charged for making payments via UPI?” For a newer claim, see whether PIB Fact Check has
        covered it on its <a href={PIB_FACT_CHECK_TELEGRAM_URL}>Telegram channel</a> or{' '}
        <a href={PIB_FACT_CHECK_X_URL}>X account</a> before you believe or forward it. TukdaPay isn’t a way to avoid a
        fee. Ask the shop before you split.
      </>
    ),
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
    a: 'Any app that handles UPI links: Google Pay, PhonePe, Paytm, BHIM, Amazon Pay, CRED and bank apps. On a computer, scan the QR code with your phone. Some apps won’t accept a payment opened from a link, for example to a personal UPI ID. If yours declines it, scan the shop’s QR in your UPI app and type that part’s amount.',
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
