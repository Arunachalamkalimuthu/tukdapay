# TukdaPay

**Pay a big UPI bill in tukde.** Split any amount into parts that each stay
under a per-transaction limit (default ₹1999), then pay each part from your
own UPI app — GPay, PhonePe, Paytm, BHIM, any of them.

Live: https://tukdapay.com/

[![build and deploy](https://github.com/Arunachalamkalimuthu/tukdapay/actions/workflows/deploy.yml/badge.svg)](https://github.com/Arunachalamkalimuthu/tukdapay/actions/workflows/deploy.yml)

Static Next.js site. No backend, no account, no tracking. Your money never
touches this site; it only prepares the `upi://pay` links.

## How it works

1. Enter the amount and the merchant's UPI ID (optional name and note).
2. TukdaPay splits it greedily — ₹5000 → ₹1999 + ₹1999 + ₹1002 — and builds
   a `upi://pay?...` link per part, each tagged `Part i/n` so the merchant
   can match them.
3. On a phone, **Pay** opens your UPI app with the amount filled in. On a
   computer you get a QR code to scan instead.
4. Tick **Paid** as you go; the next-payment button advances. Progress is
   saved in your browser.

Prefill from a link: `/?amount=5000&pa=shop@upi&pn=Shop&note=Bill%2042&max=1999`.

## Develop

```sh
npm install
npm run dev        # http://localhost:3000
npm test           # unit tests for lib/ (node --test via tsx)
npm run lint
npm run typecheck
npm run build      # static export to out/
```

Node 20+.

## Layout

```
app/                 routes (App Router, static export)
  page.tsx           home: hero, splitter, how it works, FAQ
  use-cases/         eight scenarios with "Try with ₹X" prefill links
  blog/              index + one page.mdx per post, feed.xml route
  sitemap.ts, robots.ts, manifest.ts, not-found.tsx
components/          SiteHeader, SiteFooter, PostLayout, splitter/
content/             posts.ts (drives index, RSS, sitemap), useCases.ts, faq.ts
lib/                 split, upi, plan, format — pure and tested
test/                node --test
public/              og.png, favicon, PWA icons, CNAME
.github/workflows/   test + build + deploy to GitHub Pages
```

## Add a blog post

1. Add an entry to `content/posts.ts` (slug, title, description, date).
2. Create `app/blog/<slug>/page.mdx` — copy an existing one; it wraps the
   content in `PostLayout` and exports `postMetadata(slug)`.

That's it: the index, RSS feed and sitemap pick it up.

## Good to know

- A web page cannot see whether a UPI payment went through, so "Paid" is
  self-reported.
- Check with the merchant before splitting a bill; some may not accept it.
- Rules on per-transaction charges change. TukdaPay makes no claim about what
  the current rule is — set the limit to whatever applies to you.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). MIT licensed.
