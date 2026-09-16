# TukdaPay

**Pay a big UPI bill in tukde.** Split any amount into parts that each stay
under a per-transaction limit (default ₹1,999), then pay each part from your
own UPI app — GPay, PhonePe, Paytm, BHIM, any of them.

Live: https://tukdapay.com/

[![test](https://github.com/Arunachalamkalimuthu/tukdapay/actions/workflows/test.yml/badge.svg)](https://github.com/Arunachalamkalimuthu/tukdapay/actions/workflows/test.yml)

Static site. No backend, no account, no tracking. Your money never touches
this site; it only prepares the `upi://pay` links.

## How it works

1. Enter the amount, the merchant's UPI ID, and optionally a name and note.
2. TukdaPay splits it greedily — ₹5,000 → ₹1,999 + ₹1,999 + ₹1,002 — and
   builds a `upi://pay?...` link per part, each tagged `Part i/n` so the
   merchant can match them.
3. On a phone, **Pay** opens your UPI app with the amount filled in. On a
   computer, each part has a QR code to scan with your phone instead.
4. Tick **Paid** as you go. Paid is self-reported and saved in your browser,
   so a refresh doesn't lose your place.

The per-transaction limit is editable under "Max per payment".

## Features

- Live preview of the split as you type the amount.
- Progress bar and a "Pay Part 2 of 3" button for the next unpaid part.
- Share the breakdown: **Copy breakdown** or **Send on WhatsApp**.
- Recent merchants: your last five UPI IDs as one-tap chips, stored only in
  your browser.
- Prefill links that fill in the form for someone else (below).
- [Use cases](https://tukdapay.com/use-cases/): everyday bills with a
  "Try with ₹X" link for each.
- [Blog](https://tukdapay.com/blog/) with an
  [RSS feed](https://tukdapay.com/blog/feed.xml).

## Prefill links

Add any of these query parameters to the home page URL:

| Parameter | Fills in                 | Example         |
|-----------|--------------------------|-----------------|
| `amount`  | Amount, in rupees        | `4200`          |
| `pa`      | Merchant UPI ID          | `shop@okaxis`   |
| `pn`      | Merchant name            | `Sri%20Stores`  |
| `note`    | Note added to every part | `Sept%20khata`  |
| `max`     | Max per payment          | `1999`          |

```
https://tukdapay.com/?amount=4200&pa=shop@okaxis&pn=Sri%20Stores&note=Sept%20khata
```

URL-encode the values. A link only fills in the form; every payment still
happens in the payer's own UPI app.

## Good to know

- A web page cannot see whether a UPI payment went through, so "Paid" is
  self-reported.
- Check with the merchant before splitting a bill; some may not accept it.
- Rules on per-transaction charges change. TukdaPay makes no claim about what
  the current rule is — set the limit to whatever applies to you.

## Run locally

Needs Node 22 or newer.

```sh
npm ci
npm run dev         # http://localhost:3000
npm test            # unit tests for lib/ (node:test via tsx)
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm run build       # static site in out/
npm start           # serves out/ (npx serve)
```

## Project layout

A Next.js App Router app exported as static files (`output: 'export'`).

```
app/
  layout.tsx               root layout: metadata, header, footer
  globals.css              design tokens (light + dark), shared classes
  page.tsx                 home: hero, splitter, how it works, FAQ, posts
  use-cases/page.tsx       /use-cases/
  blog/page.tsx            /blog/
  blog/<slug>/page.mdx     one post per folder
  blog/feed.xml/route.ts   /blog/feed.xml (RSS)
  sitemap.ts               /sitemap.xml
  robots.ts                /robots.txt
  manifest.ts              /manifest.webmanifest
  not-found.tsx            404 page
components/
  splitter/                form, result list, QR code
  SiteHeader.tsx, SiteFooter.tsx, JsonLd.tsx
  blog/                    blog UI
content/
  posts.ts                 blog post list
  useCases.ts              use case scenarios
  faq.ts                   home page questions
lib/                       pure logic, no React
  split.ts                 splitAmount(total, maxPerTxn)
  upi.ts                   buildUpiUrl({ pa, pn, am, tn }), isValidVpa()
  plan.ts                  createPlan(input), breakdownText(plan)
  format.ts                ₹ formatting and amount parsing
  storage.ts               localStorage helpers that never throw
  prefill.ts               reads the prefill query parameters
  recent.ts                recent merchants list
  rss.ts                   RSS feed XML
  metadata.ts              pageMetadata() for every non-home page
  site.ts                  site URL, name, repo link, default limit
test/                      node:test tests for lib/
public/                    CNAME, favicon.svg, og.png, icons/
next.config.ts             static export, trailing slashes, MDX
mdx-components.tsx         required by @next/mdx
```

## Writing a blog post

1. Create `app/blog/<slug>/page.mdx`. Copy an existing post for the
   `metadata` export and structure.
2. Add `{ slug, title, description, date }` to `content/posts.ts`, newest
   first. That list drives the blog index, the home page, the RSS feed and
   the sitemap.

## Adding a use case

Add an entry to `content/useCases.ts`. The use cases page renders it with a
"Try with ₹X" link that opens the splitter with the amount filled in.

## Deployment

- `.github/workflows/deploy.yml` runs on every push to `main` (or manually
  from the Actions tab): tests, typecheck, lint, build, then publishes `out/`
  to GitHub Pages with `actions/deploy-pages`.
- `.github/workflows/test.yml` runs the same checks on pull requests.
- One-time setup: Settings → Pages → Build and deployment → Source:
  **GitHub Actions**.
- Custom domain: `public/CNAME` (tukdapay.com) is copied into `out/`. GitHub
  ignores that file for Actions deployments and uses the custom domain set in
  Settings → Pages, so keep the two the same.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). MIT licensed.
