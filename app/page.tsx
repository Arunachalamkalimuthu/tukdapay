import Link from 'next/link';
import { Splitter } from '@/components/splitter/Splitter';
import { JsonLd } from '@/components/JsonLd';
import { postPath, posts } from '@/content/posts';
import { faq } from '@/content/faq';
import { useCases } from '@/content/useCases';
import { newestFirst } from '@/lib/rss';
import { faqPage, graph, organization, webApplication, website } from '@/lib/schema';
import { REPO_URL, SITE_URL } from '@/lib/site';
import s from './page.module.css';

// Title, description, canonical and Open Graph come from the root layout.

/** The site's one JSON-LD graph, on the home page only: Google reads the site name and logo from here. */
const structuredData = graph(
  organization(),
  website(),
  webApplication({
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
  }),
  faqPage(faq),
);

/**
 * Rendered once. The splitter places it: beside the form while there's no plan (on wide
 * screens), and below the result once there is one.
 */
const howItWorks = (
  <section className={s.section} aria-labelledby="steps-title">
    <h2 id="steps-title">How to split a UPI payment</h2>
    <ol className={s.steps}>
      <li><span><strong>Enter the bill</strong> and the merchant’s UPI ID from their sticker or invoice.</span></li>
      <li><span><strong>Split</strong> — TukdaPay breaks it into parts at or under your limit (₹5,000 becomes ₹1,999 + ₹1,999 + ₹1,002), each tagged <em>Part 1/3</em>, <em>Part 2/3</em>… so the shop can match them.</span></li>
      <li><span><strong>Pay each part</strong> — every Pay button opens your own UPI app with the amount filled in. Tick them off as you go.</span></li>
    </ol>
  </section>
);

export default function HomePage() {
  return (
    <div className="page page-home">
      <JsonLd data={structuredData} />

      {/* One grid on wide screens: hero and form on the left, the result (or How it works) on the right. */}
      <div className={s.home}>
        <section className={s.hero}>
          <h1>UPI bill <br className={s.narrowBreak} />above ₹2,000?<br />Pay it in tukde.</h1>
          <p>
            Split the bill into tukde (pieces) of ₹1,999 or less and pay each from GPay, PhonePe, Paytm or any UPI app.
            Free, no signup, nothing leaves your phone.
          </p>
        </section>

        {/*
          * No <Suspense> around the splitter. Once the page's HTML passes about 12.8KB, React writes a finished
          * Suspense boundary into a hidden <div> and a script moves it into place, so without JavaScript the form
          * and these steps would be invisible. The splitter only calls useSearchParams after hydration, so the
          * prerender never needs a boundary; if that changes, next build fails with a missing Suspense boundary
          * error instead.
          */}
        <Splitter howItWorks={howItWorks} layout={{ form: s.tool, side: s.side, below: `${s.lowerItem} ${s.stepsBelow}` }} />

        <section className={`${s.section} ${s.lowerItem}`} aria-labelledby="why-title">
          <h2 id="why-title">Why people use it</h2>
          <ul className={s.why}>
            <li><strong>Nothing leaves your phone.</strong> No account, no server, no bank details. It only writes <code>upi://pay</code> links.</li>
            <li><strong>Works with every UPI app.</strong> Google Pay, PhonePe, Paytm, BHIM, CRED, bank apps — on a computer, scan the QR instead.</li>
            <li><strong>Free and open source.</strong> MIT licensed. Read the code, fork it, fix it.</li>
          </ul>
          <Link className={s.more} href="/use-cases/">{`See ${useCases.length} bills people split, from kirana to tuition fees`}</Link>
        </section>

        <section className={`${s.section} ${s.lowerItem} ${s.faq}`} aria-labelledby="faq-title">
          <h2 id="faq-title">Questions about splitting UPI payments</h2>
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
            {newestFirst(posts).slice(0, 3).map((p) => (
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
