import Link from 'next/link';
import { JsonLd } from '@/components/JsonLd';
import { TukdaStrip } from '@/components/TukdaStrip';
import { posts } from '@/content/posts';
import { tryHref, useCases } from '@/content/useCases';
import { formatRupees } from '@/lib/format';
import { pageMetadata } from '@/lib/metadata';
import { ogCards, ogImage } from '@/lib/og';
import { DEFAULT_MAX, SITE_URL } from '@/lib/site';
import { splitAmount } from '@/lib/split';
import { collapseText } from '@/lib/strip';
import s from './page.module.css';

// ₹2000 without a comma in the title and description, the way people search for it; the page itself groups it.
export const metadata = pageMetadata({
  title: 'Split UPI bills above ₹2000: 8 everyday examples',
  description:
    'Kirana, restaurant, pharmacy, tuition, hotel and more: eight bills above ₹2000 split into UPI payments of ₹1,999 or less, with the exact parts for each.',
  path: '/use-cases/',
  image: ogImage(ogCards(posts).find((c) => c.key === 'use-cases')!),
});

const scenarios = useCases.map((u) => ({ ...u, parts: splitAmount(u.amount, DEFAULT_MAX) }));

export default function UseCasesPage() {
  return (
    <div className="page">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: 'Bills people split into smaller UPI payments',
          url: `${SITE_URL}/use-cases/`,
          numberOfItems: scenarios.length,
          itemListElement: scenarios.map((u, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: u.title,
            description: u.story,
            url: `${SITE_URL}/use-cases/#${u.slug}`,
          })),
        }}
      />

      <header className={s.intro}>
        <h1>Bills people pay in tukde</h1>
        <p>
          Tukde means pieces: one bill paid as a few smaller UPI payments. Corner shops, chemists, tutors and homestays
          often take only UPI, and plenty of everyday bills cross ₹2,000. Splitting is one way to pay when one payment
          won’t go through, or when the shop asks for it. Ask the shop before you split.
        </p>
        <p>
          Here are eight of these bills, each with the exact split TukdaPay makes at {formatRupees(DEFAULT_MAX)} a
          payment. Pick one to open the splitter with that amount filled in. New to this? Read{' '}
          <Link href="/blog/split-upi-payment-above-2000/">how to split a UPI payment above ₹2,000</Link>, step by step.
        </p>
      </header>

      {/* An index, like a price list: the kind of bill, dot leaders, then its total.
          role="list" because Safari drops list semantics from lists styled without bullets. */}
      <nav className={s.index} aria-label="Jump to a use case">
        <ul role="list">
          {scenarios.map((u) => (
            <li key={u.slug}>
              <a href={`#${u.slug}`}>
                <span className={s.indexName}>{u.who}</span>{' '}
                <span className={s.leader} aria-hidden="true" />{' '}
                <span className={`money ${s.indexTotal}`}>{formatRupees(u.amount)}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className={s.cases}>
        {scenarios.map((u) => {
          const count = u.parts.length;
          const total = formatRupees(u.amount);
          return (
            <article key={u.slug} id={u.slug} className={s.case} aria-labelledby={`${u.slug}-title`}>
              <div className={s.caseHead}>
                <h2 id={`${u.slug}-title`}>{u.title}</h2>
                <p className={`t-money ${s.caseTotal}`}>{total}</p>
              </div>
              <p className={s.who}>{u.who}</p>
              <p className={s.story}>{u.story}</p>

              {/* The split as a slip. The strip is decorative, so the figures are also written out for screen readers. */}
              <div className={s.slip}>
                <p className={s.slipHead}>
                  <span className={`money ${s.slipTotal}`}>{total}</span>{' '}
                  {count === 1 ? 'in 1 payment' : `in ${count} payments`}
                  <span className="sr-only">: {collapseText(u.parts)}</span>
                </p>
                <TukdaStrip variant="slip" parts={u.parts} />
              </div>

              <p className={s.tip}>
                <strong>Tip:</strong> {u.tip}
              </p>

              <Link className={`btn btn-outline ${s.action}`} href={tryHref(u)}>
                <span>
                  Try with <span className="money">{total}</span>
                </span>
              </Link>
            </article>
          );
        })}
      </div>

      {/* Posts link this section as /use-cases/#merchants or by its heading, #merchants-title, so keep both ids.
          The heading's scroll margin (page.module.css) lands both in the same place; test/pages.test.ts checks. */}
      <section id="merchants" className={s.merchants} aria-labelledby="merchants-title">
        <h2 id="merchants-title">If you’re the merchant</h2>
        <ul role="list">
          <li>
            <strong>Say up front whether you take a bill in parts.</strong> Some customers can’t pay a large bill in
            one UPI payment; tell them before they start.
          </li>
          <li>
            <strong>Look for the part numbers.</strong> TukdaPay tags every payment <em>Part 1/3</em>,{' '}
            <em>Part 2/3</em>… in the note, so matching them to one bill is a glance.
          </li>
          <li>
            <strong>Ask for the breakdown.</strong> Customers can send the list on WhatsApp in one tap; keep it with
            the bill.
          </li>
          <li>
            <strong>Check what applies to you.</strong> Start with your bank’s terms for your UPI QR, and here’s{' '}
            <Link href="/blog/upi-2000-threshold-what-to-check/">how to check what applies to a UPI payment above ₹2,000</Link>.
          </li>
        </ul>
      </section>

      <section className={s.cta} aria-labelledby="own-bill-title">
        <h2 id="own-bill-title">Your bill isn’t on the list?</h2>
        <p>
          Any amount works. Enter the bill and the shop’s UPI ID, then pay each part from GPay, PhonePe, Paytm
          or any UPI app.
        </p>
        <p>
          TukdaPay isn’t a way to avoid a fee:{' '}
          <Link href="/blog/does-splitting-upi-save-money/">see who a UPI charge lands on</Link>.
        </p>
        <Link className={`btn btn-primary ${s.action}`} href="/">
          Split a payment
        </Link>
      </section>
    </div>
  );
}
