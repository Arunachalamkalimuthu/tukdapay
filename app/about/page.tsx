import type { Metadata } from 'next';
import Link from 'next/link';
import { JsonLd } from '@/components/JsonLd';
import { posts } from '@/content/posts';
import { pageMetadata } from '@/lib/metadata';
import { ogCards, ogImage } from '@/lib/og';
import { AUTHOR, organization } from '@/lib/schema';
import { REPO_URL, SITE_URL } from '@/lib/site';
import s from './page.module.css';

// The brand is in the title itself (search results and share cards), so the layout's " – TukdaPay" suffix is skipped.
const TITLE = 'About TukdaPay, a free, open-source UPI payment splitter';
const DESCRIPTION =
  'Who builds TukdaPay and why, how it’s funded (it isn’t: no ads, no tracking), what it saves in your browser, and how to get in touch.';
const PATH = '/about/';
/** NPCI, Merchant Discount Rate (MDR) on Select UPI (P2M) Transactions – FAQs, 15 Sept 2026. */
const NPCI_MDR_FAQ_URL =
  'https://www.npci.org.in/uploads/FA_Qs_Merchant_Discount_Rate_MDR_on_Select_UPI_P2_M_Transactions_58dba1d39e.pdf';
const GITHUB_PAGES_DATA_URL =
  'https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages#data-collection';

export const metadata: Metadata = {
  ...pageMetadata({
    title: TITLE,
    description: DESCRIPTION,
    path: PATH,
    image: ogImage(ogCards(posts).find((c) => c.key === 'about')!),
  }),
  title: { absolute: TITLE },
};

// The organization is the same node, with the same @id, as in home's graph (lib/schema.ts).
const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'AboutPage',
  url: `${SITE_URL}${PATH}`,
  name: TITLE,
  description: DESCRIPTION,
  inLanguage: 'en-IN',
  about: organization(),
};

export default function AboutPage() {
  return (
    <div className="page">
      <JsonLd data={structuredData} />
      <article className={s.about}>
        <h1 className="t-display">About TukdaPay</h1>
        <p className={`t-lede ${s.lede}`}>
          TukdaPay is a free web page that splits one UPI bill into smaller payments, each opened in your own UPI app.
          It never touches the money.
        </p>

        <h2 className="t-heading">Who builds it</h2>
        <p>
          <a href={AUTHOR.url} rel="author">
            Arunachalam Kalimuthu
          </a>{' '}
          builds and looks after TukdaPay, and writes the <Link href="/blog/">guides on the blog</Link>.
        </p>

        <h2 className="t-heading">Why it exists</h2>
        <p>
          Sometimes one UPI payment won’t go through in one go, or the shop asks for smaller payments. TukdaPay works
          out the parts, numbers each one so the shop can match them, and keeps track of the ones you tick as paid.
        </p>
        <p>
          It isn’t a way to avoid a fee. Ask the shop before you split. Wondering whether you’ll be charged, or whether a
          shop can pass its fee on to you? <a href={NPCI_MDR_FAQ_URL}>NPCI’s FAQs on the merchant discount rate</a> (PDF)
          answer both (questions 15 and 34).
        </p>

        <h2 className="t-heading">How it’s funded</h2>
        <p>It isn’t. No ads, affiliate links or tracking, and no data to sell, because TukdaPay collects none.</p>

        <h2 className="t-heading">Your privacy</h2>
        <p>
          Your browser’s local storage keeps your last split (amount, UPI ID, name, note, max per payment and which parts
          you ticked as paid), so a reload keeps your place. It also keeps the last five shops you split for (UPI ID and
          name), so you can pick one again. Clearing this site’s data in your browser removes it all.
        </p>
        <p>
          Nothing you type is sent to TukdaPay. What you type leaves this page only when you choose: tapping Pay (or
          scanning a part’s QR code) hands the UPI ID, name, amount and note to your UPI app, and the note goes with
          the payment. Send on WhatsApp passes the breakdown to WhatsApp.
        </p>
        <p>
          The site is hosted on GitHub Pages, and <a href={GITHUB_PAGES_DATA_URL}>GitHub logs visitors’ IP addresses</a>{' '}
          for security.
        </p>

        <h2 className="t-heading">Not part of NPCI, a bank or a UPI app</h2>
        <p>TukdaPay isn’t affiliated with or endorsed by NPCI or its UPI brand, any bank or any UPI app.</p>

        <h2 className="t-heading">Open source</h2>
        <p>
          The <a href={REPO_URL}>code is on GitHub</a> under the MIT licence, so you can check what this page says or
          run your own copy.
        </p>

        <h2 className="t-heading">Get in touch</h2>
        <p>
          Found a bug or a wrong sentence? <a href={`${REPO_URL}/issues`}>Open an issue on GitHub</a>.
        </p>

        <p className={s.cta}>
          <Link className="btn btn-primary" href="/">
            Split a payment
          </Link>
        </p>
      </article>
    </div>
  );
}
