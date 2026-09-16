import type { Metadata } from 'next';
import Link from 'next/link';
import { useCases } from '@/content/useCases';
import { splitAmount } from '@/lib/split';
import { formatInr } from '@/lib/format';
import { JsonLd } from '@/components/JsonLd';
import { SITE_URL } from '@/lib/site';
import s from './page.module.css';

export const metadata: Metadata = {
  title: 'Use cases: where splitting a UPI payment helps',
  description:
    'Kirana bills, restaurant tables, phones, pharmacy, coaching fees, wedding vendors, hotels, repairs — real situations where a UPI bill above ₹2000 is easier paid in parts.',
  alternates: { canonical: '/use-cases/' },
  openGraph: { url: '/use-cases/', title: 'Where splitting a UPI payment helps', description: 'Eight everyday situations, with the split worked out.' },
};

const short = (n: number) => formatInr(n).replace('.00', '');

export default function UseCasesPage() {
  return (
    <div className="page wide">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: 'TukdaPay use cases',
          itemListElement: useCases.map((u, i) => ({ '@type': 'ListItem', position: i + 1, name: u.title, url: `${SITE_URL}/use-cases/#${u.slug}` })),
        }}
      />
      <h1 style={{ fontSize: 34, fontWeight: 800 }}>Where splitting a UPI payment helps</h1>
      <p className={s.intro}>
        Eight everyday situations where the bill crosses ₹2,000 and paying in parts is simpler. Each card has the split
        worked out at the ₹1,999 default — tap <strong>Try</strong> to open it in the splitter with the amount filled in.
      </p>

      <ul className={s.grid}>
        {useCases.map((u) => {
          const parts = splitAmount(u.amount);
          return (
            <li key={u.slug} id={u.slug} className={s.card}>
              <span className={s.who}>{u.who}</span>
              <h2>{u.title}</h2>
              <div className={s.split} aria-label={`${short(u.amount)} splits into ${parts.length} payments`}>
                <span>{short(u.amount)}</span>
                <span className={s.op} aria-hidden="true">→</span>
                {parts.map((p, i) => (
                  <span key={i} style={{ display: 'contents' }}>
                    <span className={`${s.chip} ${i === parts.length - 1 ? s.last : ''}`}>{short(p)}</span>
                    {i < parts.length - 1 && <span className={s.op} aria-hidden="true">+</span>}
                  </span>
                ))}
              </div>
              <p>{u.story}</p>
              <p className={s.tip}>{u.tip}</p>
              <Link className={`btn btn-secondary ${s.try}`} href={`/?amount=${u.amount}&note=${encodeURIComponent(u.title)}`}>
                Try with {short(u.amount)}
              </Link>
            </li>
          );
        })}
      </ul>

      <section className={s.merchants} aria-labelledby="merchants-title">
        <h2 id="merchants-title" style={{ fontSize: 22, fontWeight: 800, marginBottom: 12 }}>If you&apos;re the merchant</h2>
        <ul>
          <li><strong>Say yes or no up front.</strong> A sign at the counter (“Split UPI payments welcome” or “One payment per bill”) saves a conversation.</li>
          <li><strong>Look for the part numbers.</strong> TukdaPay tags every payment <em>Part 1/3</em>, <em>Part 2/3</em>… in the note, so matching them to one bill is a glance.</li>
          <li><strong>Ask for the breakdown.</strong> Customers can send the list on WhatsApp in one tap; keep it with the bill.</li>
          <li><strong>Check what applies to you.</strong> Some rules attach a charge to the merchant, not the customer. <Link href="/blog/upi-2000-threshold-what-to-check/">Here&apos;s how to check.</Link></li>
        </ul>
      </section>
    </div>
  );
}
