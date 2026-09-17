import Link from 'next/link';
import { JsonLd } from '@/components/JsonLd';
import { pageMetadata } from '@/lib/metadata';
import { REPO_URL, SITE_NAME, SITE_URL } from '@/lib/site';
import s from './page.module.css';

const TITLE = 'About this free, open-source UPI payment splitter';
const DESCRIPTION =
  'Who builds TukdaPay and why, how it’s funded (it isn’t: no ads, no tracking), why your amounts and UPI IDs stay in your browser, and how to get in touch.';
const PATH = '/about/';
const AUTHOR_URL = 'https://github.com/Arunachalamkalimuthu';

export const metadata = pageMetadata({ title: TITLE, description: DESCRIPTION, path: PATH });

// Same Organization node (and @id) the home page's site-name markup uses, so the two describe one publisher.
const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'AboutPage',
  url: `${SITE_URL}${PATH}`,
  name: TITLE,
  description: DESCRIPTION,
  inLanguage: 'en-IN',
  about: {
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    logo: { '@type': 'ImageObject', url: `${SITE_URL}/icons/icon-512.png`, width: 512, height: 512 },
    sameAs: [REPO_URL],
  },
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
          <a href={AUTHOR_URL} rel="author">
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
          It isn’t a way around any fee or rule. Ask the shop before you split, and{' '}
          <Link href="/blog/upi-2000-threshold-what-to-check/">check what applies to your payment</Link>.
        </p>

        <h2 className="t-heading">How it’s funded</h2>
        <p>It isn’t. No ads, affiliate links or tracking, and no data to sell, because TukdaPay collects none.</p>

        <h2 className="t-heading">Your privacy</h2>
        <p>
          Your last split (amount, UPI ID, name, note and paid ticks) and the last five UPI IDs you used are saved in
          your browser’s local storage, so a reload keeps your place. Nothing you type is sent to TukdaPay or anyone
          else, unless you share a breakdown on WhatsApp yourself. The page only builds <code>upi://pay</code> links,
          and your UPI app does the rest. Clearing this site’s data in your browser removes it all.
        </p>

        <h2 className="t-heading">Not linked to NPCI, banks or UPI apps</h2>
        <p>TukdaPay isn’t affiliated with or endorsed by NPCI, UPI, any bank or any UPI app.</p>

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
