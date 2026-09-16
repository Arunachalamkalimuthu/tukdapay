import Link from 'next/link';
import { JsonLd } from '@/components/JsonLd';
import { TukdaStrip } from '@/components/TukdaStrip';
import { tryHref, useCases } from '@/content/useCases';
import { formatRupees } from '@/lib/format';
import { pageMetadata } from '@/lib/metadata';
import { DEFAULT_MAX, SITE_URL } from '@/lib/site';
import { splitAmount } from '@/lib/split';
import { collapseText } from '@/lib/strip';
import s from './page.module.css';

export const metadata = pageMetadata({
  title: 'Use cases',
  description:
    'Kirana, restaurant, pharmacy, tuition, hotel and more: eight everyday bills split into UPI payments of ₹1,999 or less, with the exact split for each.',
  path: '/use-cases/',
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
          Corner shops, chemists, tutors and homestays often take only UPI, and plenty of everyday bills cross
          ₹2,000. People pay these in parts when one big payment won’t go through, when the shop asks for it,
          or just to keep each payment small.
        </p>
        <p>
          Here are eight of them, each with the exact split TukdaPay makes at {formatRupees(DEFAULT_MAX)} a
          payment. Pick one to open the splitter with that amount filled in.
        </p>
      </header>

      {/* An index, like a price list: the kind of bill, dot leaders, then its total. */}
      <nav className={s.index} aria-label="Jump to a use case">
        <ul>
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

      <section className={s.merchants} aria-labelledby="merchants-title">
        <h2 id="merchants-title">If you’re the merchant</h2>
        <ul>
          <li>
            <strong>Say yes or no up front.</strong> A sign at the counter (“Split UPI payments welcome” or “One
            payment per bill”) saves a conversation.
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
            <strong>Check what applies to you.</strong> If a payment carries a charge, it may fall on you rather than
            the customer. <Link href="/blog/upi-2000-threshold-what-to-check/">Here’s how to check</Link>.
          </li>
        </ul>
      </section>

      <section className={s.cta} aria-labelledby="own-bill-title">
        <h2 id="own-bill-title">Your bill isn’t on the list?</h2>
        <p>
          Any amount works. Enter the bill and the shop’s UPI ID, then pay each part from GPay, PhonePe, Paytm
          or any UPI app.
        </p>
        <Link className={`btn btn-primary ${s.action}`} href="/">
          Split a payment
        </Link>
      </section>
    </div>
  );
}
