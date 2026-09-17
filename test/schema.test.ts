import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  APP_ID,
  AUTHOR,
  LOGO,
  ORG_ID,
  PUBLISHER,
  WEBSITE_ID,
  blogPosting,
  breadcrumbList,
  faqPage,
  graph,
  istDateTime,
  organization,
  webApplication,
  website,
} from '../lib/schema.ts';
import { jsonLdHtml } from '../lib/metadata.ts';
import { REPO_URL } from '../lib/site.ts';

const post = {
  slug: 'split-upi-payment-above-2000',
  title: 'How to split a UPI payment above ₹2000',
  description: 'Step by step.',
  date: '2026-09-17',
};

test('ids hang off the home URL', () => {
  assert.equal(ORG_ID, 'https://tukdapay.com/#organization');
  assert.equal(WEBSITE_ID, 'https://tukdapay.com/#website');
  assert.equal(APP_ID, 'https://tukdapay.com/#app');
});

test('organization has the name, home URL, a 512px logo and the repo as sameAs', () => {
  assert.deepEqual(organization(), {
    '@type': 'Organization',
    '@id': 'https://tukdapay.com/#organization',
    name: 'TukdaPay',
    url: 'https://tukdapay.com/',
    logo: { '@type': 'ImageObject', url: 'https://tukdapay.com/icons/icon-512.png', width: 512, height: 512 },
    sameAs: [REPO_URL],
  });
  assert.deepEqual(LOGO, organization().logo);
});

test('website names the site, points its publisher at the organization and is in Indian English', () => {
  assert.deepEqual(website(), {
    '@type': 'WebSite',
    '@id': 'https://tukdapay.com/#website',
    name: 'TukdaPay',
    url: 'https://tukdapay.com/',
    inLanguage: 'en-IN',
    publisher: { '@id': 'https://tukdapay.com/#organization' },
  });
});

test('webApplication keeps the given fields and adds its id, publisher and provider', () => {
  const app = webApplication({ name: 'TukdaPay', applicationCategory: 'FinanceApplication' });
  assert.equal(app['@type'], 'WebApplication');
  assert.equal(app['@id'], APP_ID);
  assert.equal(app.name, 'TukdaPay');
  assert.equal(app.applicationCategory, 'FinanceApplication');
  assert.deepEqual(app.publisher, { '@id': ORG_ID });
  assert.deepEqual(app.provider, { '@id': ORG_ID });
});

test('webApplication fields cannot replace the id or the publisher', () => {
  const app = webApplication({ '@id': 'https://example.com/#x', publisher: { '@id': 'x' } });
  assert.equal(app['@id'], APP_ID);
  assert.deepEqual(app.publisher, { '@id': ORG_ID });
});

test('graph wraps nodes in one @context', () => {
  assert.deepEqual(graph(organization(), website()), {
    '@context': 'https://schema.org',
    '@graph': [organization(), website()],
  });
});

test('istDateTime pins a date to 09:00 in India', () => {
  assert.equal(istDateTime('2026-09-17'), '2026-09-17T09:00:00+05:30');
  assert.equal(istDateTime('2028-02-29'), '2028-02-29T09:00:00+05:30');
});

test('istDateTime rejects anything but a real YYYY-MM-DD date', () => {
  for (const bad of ['2026-9-17', '17-09-2026', '2026-02-30', '2026-13-01', '2026-09-17T09:00:00+05:30', '']) {
    assert.throws(() => istDateTime(bad), RangeError, bad);
  }
});

test('blogPosting carries headline, dates with the IST offset, author, publisher logo, image and page', () => {
  const node = blogPosting(post);
  assert.deepEqual(node, {
    '@type': 'BlogPosting',
    headline: 'How to split a UPI payment above ₹2000',
    description: 'Step by step.',
    url: 'https://tukdapay.com/blog/split-upi-payment-above-2000/',
    datePublished: '2026-09-17T09:00:00+05:30',
    dateModified: '2026-09-17T09:00:00+05:30',
    author: AUTHOR,
    publisher: PUBLISHER,
    image: {
      '@type': 'ImageObject',
      url: 'https://tukdapay.com/og/split-upi-payment-above-2000.png',
      width: 1200,
      height: 630,
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://tukdapay.com/blog/split-upi-payment-above-2000/' },
    inLanguage: 'en-IN',
  });
});

test('the post author is a person with a URL, and the publisher is the organization by id with its logo', () => {
  assert.equal(AUTHOR['@type'], 'Person');
  assert.ok(AUTHOR.name.length > 0);
  assert.match(AUTHOR.url, /^https:\/\//);
  assert.deepEqual(PUBLISHER, {
    '@type': 'Organization',
    '@id': ORG_ID,
    name: 'TukdaPay',
    url: 'https://tukdapay.com/',
    logo: LOGO,
  });
});

test('blogPosting uses updated for dateModified when a post has one', () => {
  const node = blogPosting({ ...post, updated: '2026-10-03' });
  assert.equal(node.datePublished, '2026-09-17T09:00:00+05:30');
  assert.equal(node.dateModified, '2026-10-03T09:00:00+05:30');
});

test('blogPosting takes another author and image, and resolves a site-relative image URL', () => {
  const author = { '@type': 'Person' as const, name: 'Someone', url: 'https://tukdapay.com/about/' };
  const node = blogPosting({ ...post, author, image: { url: '/og.png', width: 1200, height: 630 } });
  assert.deepEqual(node.author, author);
  assert.deepEqual(node.image, { '@type': 'ImageObject', url: 'https://tukdapay.com/og.png', width: 1200, height: 630 });
});

test('blogPosting fails on a bad date instead of writing it', () => {
  assert.throws(() => blogPosting({ ...post, date: '17 September 2026' }), RangeError);
  assert.throws(() => blogPosting({ ...post, updated: '2026-02-30' }), RangeError);
});

test('breadcrumbList numbers items from 1 and makes paths absolute', () => {
  assert.deepEqual(
    breadcrumbList([
      { name: 'Home', path: '/' },
      { name: 'Blog', path: '/blog/' },
      { name: 'How to split a UPI payment above ₹2000', path: '/blog/split-upi-payment-above-2000/' },
    ]),
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://tukdapay.com/' },
        { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://tukdapay.com/blog/' },
        {
          '@type': 'ListItem',
          position: 3,
          name: 'How to split a UPI payment above ₹2000',
          item: 'https://tukdapay.com/blog/split-upi-payment-above-2000/',
        },
      ],
    },
  );
});

test('breadcrumbList rejects paths that are not site-relative with a trailing slash', () => {
  assert.throws(() => breadcrumbList([{ name: 'Blog', path: 'blog/' }]), RangeError);
  assert.throws(() => breadcrumbList([{ name: 'Blog', path: '/blog' }]), RangeError);
  assert.throws(() => breadcrumbList([{ name: 'Blog', path: 'https://tukdapay.com/blog/' }]), RangeError);
});

test('faqPage turns question and answer pairs into Question nodes, part of the website', () => {
  assert.deepEqual(faqPage([{ q: 'Does it move money?', a: 'No.' }]), {
    '@type': 'FAQPage',
    isPartOf: { '@id': WEBSITE_ID },
    mainEntity: [{ '@type': 'Question', name: 'Does it move money?', acceptedAnswer: { '@type': 'Answer', text: 'No.' } }],
  });
});

test('a home graph survives the script-safe JSON round trip', () => {
  const data = graph(organization(), website(), webApplication({ name: 'TukdaPay' }), faqPage([{ q: 'Q </script>?', a: 'A' }]));
  assert.deepEqual(JSON.parse(jsonLdHtml(data)), data);
  const ids = data['@graph'].map((n) => (n as { '@id'?: string })['@id']).filter(Boolean);
  assert.equal(new Set(ids).size, ids.length, 'no two nodes share an @id');
});
