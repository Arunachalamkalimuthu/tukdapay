import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Splitter } from '@/components/splitter/Splitter';
import { JsonLd } from '@/components/JsonLd';
import { postPath, posts } from '@/content/posts';
import { faq } from '@/content/faq';
import { REPO_URL, SITE_URL } from '@/lib/site';
import s from './page.module.css';

// Title, description and Open Graph come from the root layout. Keywords are for the home page only;
// they keep ₹2000 ungrouped because that's how people search for it.
export const metadata: Metadata = {
  keywords: [
    'UPI split payment',
    'UPI 2000 limit',
    'split UPI transaction',
    'UPI ₹2000 rule',
    'pay in parts UPI',
    'GPay split payment',
    'PhonePe split payment',
    'UPI payment splitter',
  ],
};

/**
 * Rendered once. The splitter places it: beside the form while there's no plan (on wide
 * screens), and below the result once there is one.
 */
const howItWorks = (
  <section className={s.section} aria-labelledby="steps-title">
    <h2 id="steps-title">How it works</h2>
    <ol className={s.steps}>
      <li><span><strong>Enter the bill</strong> and the merchant’s UPI ID from their sticker or invoice.</span></li>
      <li><span><strong>Split</strong> — TukdaPay breaks it into parts at or under your limit, each tagged <em>Part 1/3</em>, <em>Part 2/3</em>… so the shop can match them.</span></li>
      <li><span><strong>Pay each part</strong> — every Pay button opens your own UPI app with the amount filled in. Tick them off as you go.</span></li>
    </ol>
  </section>
);

export default function HomePage() {
  return (
    <div className="page page-home">
      <JsonLd
        data={[
          {
            '@context': 'https://schema.org',
            '@type': 'WebApplication',
            name: 'TukdaPay',
            url: `${SITE_URL}/`,
            description: 'Split a UPI payment above ₹2000 into smaller parts and pay each from any UPI app.',
            applicationCategory: 'FinanceApplication',
            operatingSystem: 'Any',
            browserRequirements: 'Requires JavaScript',
            inLanguage: 'en-IN',
            isAccessibleForFree: true,
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
            license: `${REPO_URL}/blob/main/LICENSE`,
          },
          {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
          },
        ]}
      />

      {/* One grid on wide screens: hero and form on the left, the result (or How it works) on the right. */}
      <div className={s.home}>
        <section className={s.hero}>
          <h1>Bill above ₹2,000?<br />Pay it in tukde.</h1>
          <p>
            Split one UPI payment into parts of ₹1,999 or less and pay each from GPay, PhonePe, Paytm or any UPI app.
            Free, no signup, nothing leaves your phone.
          </p>
        </section>

        <Suspense fallback={null}>
          <Splitter howItWorks={howItWorks} layout={{ form: s.tool, side: s.side, below: `${s.lowerItem} ${s.stepsBelow}` }} />
        </Suspense>

        <section className={`${s.section} ${s.lowerItem}`} aria-labelledby="why-title">
          <h2 id="why-title">Why people use it</h2>
          <ul className={s.why}>
            <li><strong>Nothing leaves your phone.</strong> No account, no server, no bank details. It only writes <code>upi://pay</code> links.</li>
            <li><strong>Works with every UPI app.</strong> Google Pay, PhonePe, Paytm, BHIM, CRED, bank apps — on a computer, scan the QR instead.</li>
            <li><strong>Free and open source.</strong> MIT licensed. Read the code, fork it, fix it.</li>
          </ul>
          <Link className={s.more} href="/use-cases/">See real use cases</Link>
        </section>

        <section className={`${s.section} ${s.lowerItem} ${s.faq}`} aria-labelledby="faq-title">
          <h2 id="faq-title">Questions</h2>
          <dl>
            {faq.map((f) => (
              <div key={f.q}>
                <dt>{f.q}</dt>
                <dd>{f.body ?? f.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className={`${s.section} ${s.lowerItem}`} aria-labelledby="blog-title">
          <h2 id="blog-title">From the blog</h2>
          <ul className={s.posts}>
            {posts.slice(0, 3).map((p) => (
              <li key={p.slug}>
                <Link href={postPath(p.slug)}>{p.title}</Link>
                <span>{p.description}</span>
              </li>
            ))}
          </ul>
          <Link className={s.more} href="/blog/">All posts</Link>
        </section>
      </div>
    </div>
  );
}
