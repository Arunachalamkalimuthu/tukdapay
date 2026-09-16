import Link from 'next/link';
import { JsonLd } from '@/components/JsonLd';
import { useCases } from '@/content/useCases';
import { formatInr } from '@/lib/format';
import { pageMetadata } from '@/lib/metadata';
import { DEFAULT_MAX, SITE_URL } from '@/lib/site';
import { splitAmount } from '@/lib/split';
import s from './page.module.css';

export const metadata = pageMetadata({
  title: 'Use cases',
  description:
    'Kirana, restaurant, pharmacy, tuition, hotel and more: eight everyday bills split into UPI payments of ₹1,999 or less, with the exact split for each.',
  path: '/use-cases/',
});

/** ₹14,999.00 -> ₹14,999; keeps paise when there are any. */
const rupees = (n: number) => formatInr(n).replace(/\.00$/, '');

const scenarios = useCases.map((u) => ({ ...u, parts: splitAmount(u.amount, DEFAULT_MAX) }));

export default function UseCasesPage() {
  return (
    <div className="page wide">
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
          Here are eight of them, each with the exact split TukdaPay makes at {rupees(DEFAULT_MAX)} a payment. Pick
          one to open the splitter with that amount filled in.
        </p>
      </header>

      <nav className={s.jump} aria-label="Jump to a use case">
        <ul>
          {scenarios.map((u) => (
            <li key={u.slug}>
              <a href={`#${u.slug}`}>{u.who}</a>
            </li>
          ))}
        </ul>
      </nav>

      <div className={s.list}>
        {scenarios.map((u) => {
          const count = u.parts.length;
          return (
            <article key={u.slug} id={u.slug} className={s.card} aria-labelledby={`${u.slug}-title`}>
              <hgroup className={s.head}>
                <p className={s.who}>{u.who}</p>
                <h2 id={`${u.slug}-title`}>{u.title}</h2>
              </hgroup>
              <p className={s.story}>{u.story}</p>

              <div className={s.split}>
                <p className={s.sum}>
                  <span className={s.total}>{rupees(u.amount)}</span>
                  <span className={s.arrow} aria-hidden="true">→</span>
                  <span className={s.count}>
                    <span className={s.srOnly}>splits into </span>
                    {count === 1 ? '1 payment' : `${count} payments`}
                  </span>
                </p>
                <ol className={s.chips} aria-label={`The ${count} payments`}>
                  {u.parts.map((part, i) => (
                    <li key={i}>
                      <span className={i === count - 1 ? `${s.chip} ${s.last}` : s.chip}>{rupees(part)}</span>
                      {i < count - 1 && (
                        <span className={s.plus} aria-hidden="true">
                          +
                        </span>
                      )}
                    </li>
                  ))}
                </ol>
              </div>

              <p className={s.tip}>
                <strong>Tip:</strong> {u.tip}
              </p>

              <Link className={`btn btn-primary ${s.action}`} href={`/?amount=${u.amount}`}>
                {`Try with ${rupees(u.amount)}`}
              </Link>
            </article>
          );
        })}
      </div>

      <section className={`section ${s.cta}`} aria-labelledby="own-bill-title">
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
