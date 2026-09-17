# TukdaPay

**[Split a UPI payment above ₹2,000](https://tukdapay.com/)** into payments of
₹1,999 or less, then pay each part from your own UPI app: Google Pay, PhonePe,
Paytm, BHIM or any other. *Tukde* means pieces.

It's for when one payment won't go through in one go, or the shop asks for
smaller payments. It isn't a way to avoid a fee. Ask the shop before you split.

[![test](https://github.com/Arunachalamkalimuthu/tukdapay/actions/workflows/test.yml/badge.svg)](https://github.com/Arunachalamkalimuthu/tukdapay/actions/workflows/test.yml)

A static site with no backend, no account and no tracking. It never touches
your money; it only builds `upi://pay` links.

## How it works

1. Enter the bill and the shop's UPI ID (from its sticker, QR or invoice),
   and optionally a name and a note.
2. TukdaPay cuts the bill into parts (₹5,000 becomes ₹1,999 + ₹1,999 +
   ₹1,002) and builds a `upi://pay` link for each, with `Part 1/3`,
   `Part 2/3`… in the note so the shop can match them.
3. On a phone, **Pay** opens your UPI app with the amount filled in. On a
   computer, scan each part's QR code with your phone.
4. Tick **Paid** as you go. Your ticks are saved in your browser, so a reload
   keeps your place.

₹1,999 is only the starting value. Change it under **Max per payment**.

## Features

- **The splitter.** Type an amount and the tukda strip under it shows the
  parts as you type. An empty field shows the ₹5,000 example as a dashed
  strip, and once the form is filled in the Split button says how many
  payments it will make.
- **Pay bar.** Once you split, a bar pinned to the bottom of the screen
  shows your progress as a strip, how much is left and a button for the next
  part.
- **Resume banner.** On a phone or narrow screen, coming back to an
  unfinished split shows a banner that says which part is next, with a link
  to the payments.
- **Desktop workbench.** On a wide screen with a mouse, every part gets a QR
  code and the next action reads "Scan part 2 of 3". From 960px wide, the form
  and the result sit side by side.
- **Share the breakdown.** **Copy breakdown** or **Send on WhatsApp**.
- **Recent merchants.** Your last five UPI IDs as one-tap chips, kept only
  in your browser.
- **Prefill links** that fill in the form for someone else (see below).
- **Questions and answers** on the home page.
- **[Use cases](https://tukdapay.com/use-cases/).** Everyday bills with the
  exact parts for each, a "Try with ₹X" link that opens the splitter with the
  amount and a note filled in, and a section for shops.
- **[Blog](https://tukdapay.com/blog/)** with plain-language guides, such as
  [how to split a UPI payment above ₹2,000](https://tukdapay.com/blog/split-upi-payment-above-2000/)
  and [the `upi://pay` link format](https://tukdapay.com/blog/how-upi-deep-links-work/),
  plus an [RSS feed](https://tukdapay.com/blog/feed.xml).
- **[About](https://tukdapay.com/about/).** Who builds TukdaPay, how it's
  funded (it isn't), what it keeps in your browser and how to get in touch.

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

`amount` and `max` are read like a pasted amount: commas, spaces between digit
groups (`4%20999`), ₹, Rs. and INR are fine, but a value with more than one
number in it, such as `5000x2`, is ignored.

Opening a link again for a split that is still in progress (the same amount,
UPI ID, name, note and max) brings that split back with its paid ticks, and
drops the parameters from the address as a split does; once every part is
paid, the link starts a new split.

## Good to know

- A web page can't see whether a UPI payment went through, so "Paid" is
  self-reported.
- Ask the shop before you split. Each part carries its part number in the
  note, so the shop can match the payments to one bill.
- TukdaPay doesn't say what the current UPI rules are. Wondering whether
  you'll be charged, or whether a shop can pass its fee on to you?
  [NPCI's FAQs on the merchant discount rate](https://www.npci.org.in/uploads/FA_Qs_Merchant_Discount_Rate_MDR_on_Select_UPI_P2_M_Transactions_58dba1d39e.pdf)
  (PDF) cover both (questions 15 and 34). For a newer claim, see whether
  PIB Fact Check has covered it on its
  [Telegram channel](https://t.me/PIB_FactCheck) or
  [X account](https://x.com/PIBFactCheck).
- Paying in parts can't help if what stops a payment is a total for the day
  rather than a cap on one payment.
  [Here's what to check](https://tukdapay.com/blog/cant-pay-more-than-2000-upi/).
- Your last split and recent merchants stay in your browser's local storage.
  Nothing you type is sent to TukdaPay.
- TukdaPay isn't affiliated with NPCI, any bank or any UPI app.

## Run locally

Needs Node 22 or newer.

```sh
npm ci
npm run dev            # http://localhost:3000
npm test               # node:test tests in test/ (via tsx)
npm run typecheck      # tsc --noEmit
npm run lint           # eslint
npm run build          # static site in out/
npm run check:export   # checks out/ after a build (see SEO below)
npm start              # serves out/ with npx serve
```

## Project layout

A Next.js App Router app exported as static files (`output: 'export'`).

```
app/
  layout.tsx               root layout: home metadata, font, header, footer
  globals.css              design tokens (light + dark), type, buttons, font fallback
  page.tsx                 home: hero, splitter, steps, FAQ, latest posts, JSON-LD
  use-cases/page.tsx       /use-cases/
  about/page.tsx           /about/
  blog/page.tsx            /blog/
  blog/<slug>/page.mdx     one post per folder
  blog/feed.xml/route.ts   /blog/feed.xml (RSS)
  llms.txt/route.ts        /llms.txt, for AI systems and agents (see SEO)
  llms-full.txt/route.ts   /llms-full.txt, the full text of the pages and posts
  og/[image]/route.tsx     /og/<key>.png share cards, rendered at build time
  sitemap.ts               /sitemap.xml
  robots.ts                /robots.txt
  manifest.ts              /manifest.webmanifest
  apple-icon.png           home screen icon
  not-found.tsx            404 page
components/
  splitter/                Splitter (form and amount), PlanResult (parts and pay bar), QrCode
  TukdaStrip.tsx           the tukda strip: a bill drawn as a bar cut into its parts
  SiteHeader.tsx, SiteHeaderNav.tsx, SiteFooter.tsx, JsonLd.tsx
  RouteFocus.tsx           moves focus into <main> after a page change from the header or footer
  blog/                    post page (PostShell) with its metadata and JSON-LD, PostList, PostParts
content/
  posts.ts                 blog post list: slug, title, description, dates
  useCases.ts              use case scenarios
  faq.tsx                  home page questions
lib/                       pure logic, no React
  split.ts                 splitAmount(total, maxPerTxn)
  upi.ts                   buildUpiUrl({ pa, pn, am, tn }), isValidVpa()
  plan.ts                  createPlan(input), breakdownText(plan), parsePlan()
  splitter.ts              the splitter's readings, labels, progress and resume banner
  strip.ts                 tukda strip layout: piece widths, modes, figures
  qr.ts                    QR code modules to an SVG path
  format.ts                ₹ formatting and amount parsing
  cx.ts                    cx(): joins class names, skipping the ones left out
  storage.ts               localStorage helpers that never throw
  prefill.ts               reads the prefill query parameters
  recent.ts                recent merchants list
  rss.ts                   RSS feed XML, newestFirst()
  llms.ts                  /llms.txt and /llms-full.txt text, with PAGE_COPY (the page words they repeat)
  markdown.ts              MDX and JSX to Markdown with absolute links, for llms-full.txt
  metadata.ts              pageMetadata() for every page except home
  schema.ts                JSON-LD builders
  og.ts                    share card list and title fitting
  nav.ts                   which header link is the section you're in (aria-current)
  routeFocus.ts            whether a page change left focus outside <main>, and where Back puts it
  site.ts                  site-wide constants such as the URL, name, repo link and default max per payment
scripts/
  check-export.mjs         npm run check:export
assets/fonts/              Bricolage Grotesque TTFs for the share cards (OFL.txt)
test/                      node:test tests: <module>.test.ts for most lib/ modules; the rest check content, posts, pages
                           and scripts/check-export.mjs (against a small hand-made export)
public/                    CNAME, favicon.svg, og.png, icons/
docs/superpowers/specs/    early design specs (historical)
.github/workflows/         test.yml, deploy.yml (see Deployment)
next.config.ts             static export, trailing slashes, MDX
mdx-components.tsx         components every post can use
```

## Writing a blog post

1. Add an entry to `content/posts.ts`, newest first:

   ```ts
   {
     slug: 'my-post',
     title: 'What the post answers, in the words people search',
     description: 'One or two sentences for search results and link previews.',
     date: '2026-10-01',
     // updated: '2026-10-20',
     // cardTitle: 'Share card text, when the title reads as a fee or limit claim once forwarded',
   },
   ```

   - `title` becomes the `<title>` (the layout adds " – TukdaPay"), the H1,
     the title in post lists and the RSS feed, and the share card text unless
     `cardTitle` is set. Keep it to 52 characters or fewer.
   - `cardTitle` is optional: the large text on the share card, for a title
     that would read as a claim about a fee or limit once the card is
     forwarded without the page. The card's alt text still uses `title`.
   - `description` is 70–160 characters.
   - Write ₹2000 without a comma in both; follow the copy rules in
     [CONTRIBUTING.md](CONTRIBUTING.md#copy).
   - `date` and `updated` are `YYYY-MM-DD`. `updated` is optional: it's the
     date of the last change to what the post says, so set it only when the
     words change, never for design or CSS changes.

   This list drives the blog index, the home page, the RSS feed, the sitemap
   and the share cards.
2. Create `app/blog/<slug>/page.mdx`, starting with:

   ```mdx
   import { postLayout, postMetadata } from '@/components/blog/PostShell'

   export const metadata = postMetadata('<slug>')

   export default postLayout('<slug>')
   ```

   then write the post in Markdown. `<Lede>`, `<Callout>` and `<Cta href>`
   are available without importing, and tables and code blocks scroll on
   their own when they don't fit.
3. The share card at `/og/<slug>.png` is made automatically. Its fonts only
   draw ASCII letters, digits and punctuation plus ₹ – — ‘ ’ “ ” → …, so the
   build stops if the title uses anything else.

The build fails if the slug is missing from `content/posts.ts`. `npm test`
checks title and description lengths, that titles and descriptions write
₹2000 without a comma, that the post links the splitter or the use cases,
that links to other posts and to `/use-cases/#…` sections exist, that the
post doesn't repeat a few known NPCI figures, and that titles, descriptions,
use cases and post prose use typographic quotes and apostrophes (’ “ ”), not
straight ones. After `npm run build`,
`npm run check:export` checks the built page: title, description, canonical
URL, sitemap and feed entries, share image, JSON-LD and links.

## Adding a use case

Add an entry to `content/useCases.ts`. The use cases page shows its exact
parts and a "Try with ₹X" link that opens the splitter with the amount filled
in, and the entry's short `note` too if it has one. `npm test` checks that the
note is under 30 characters and that the last part isn't under ₹100.

`app/use-cases/page.tsx` writes out how many bills there are in its metadata
and intro, so update the count there too, and the page's sitemap date if it
has its own (see [SEO](#seo)).

## Adding a page

- Export metadata built with `pageMetadata()` from `lib/metadata.ts`, so the
  page gets its own canonical URL and share tags.
- Give it a descriptive title. It's also the `og:title`, and a bare "Blog",
  "Use cases", "About" or "TukdaPay" fails the export check. With
  " – TukdaPay" added, the title is 30–65 characters. If the title already
  names TukdaPay, set `title: { absolute: … }` to skip the suffix, as
  `app/about/page.tsx` does. The description is 70–160 characters.
- Add the URL to `app/sitemap.ts`, dated by the last change to the page's
  words. `npm run check:export` fails if an exported page isn't in the
  sitemap.
- Render its JSON-LD with `<JsonLd>`, built with `lib/schema.ts`.
  `npm run check:export` fails on an indexable page without any.
- For its own share card, add an entry to `PAGE_CARDS` in `lib/og.ts` and
  pass `image: ogImage(ogCards(posts).find((c) => c.key === '<key>')!)` to
  `pageMetadata()`. Otherwise it shares `public/og.png`.

## SEO

- **Generated files.** `/sitemap.xml` (`app/sitemap.ts`), `/robots.txt`
  (`app/robots.ts`, which points to the sitemap) and `/blog/feed.xml` are
  written at build time. Posts come from `content/posts.ts`; other pages are
  listed in `app/sitemap.ts`. Sitemap dates follow the words, never the build
  time: posts use their dates in `content/posts.ts`, and a page with its own
  date gets a new one only when its words change.
- **Metadata.** Every indexable page has a canonical URL, Open Graph and X
  tags, and a robots meta that allows large image previews. The 404 page is
  noindex. Home's metadata is in `app/layout.tsx`; other pages use
  `pageMetadata()`.
- **Structured data.** Render JSON-LD with `<JsonLd>`. Home describes the app
  and its FAQ; posts have BlogPosting and BreadcrumbList; `/blog/`,
  `/use-cases/` and `/about/` have Blog, ItemList and AboutPage. Build new
  JSON-LD with `lib/schema.ts`, so the site's Organization keeps one `@id`.
- **Share cards.** `app/og/[image]/route.tsx` renders a 1200×630 PNG at build
  time for each post, the blog, use cases and About, using `lib/og.ts` and the
  fonts in `assets/fonts`. Card text says what the page is, never a fee, rate
  or limit.
- **llms.txt.** `/llms.txt` (`app/llms.txt/route.ts`) tells AI systems and
  agents what TukdaPay is and isn't, when it fits, how prefill links work, and
  links every page, following [llmstxt.org](https://llmstxt.org/).
  `/llms-full.txt` has the same notes, then the full text of home (with the
  FAQ), use cases, About and every post. Both are written at build time by
  `lib/llms.ts` from `content/` and the posts' MDX. Words written directly into
  the home, use cases and About pages are repeated in `PAGE_COPY` in
  `lib/llms.ts`: when you change them, update it too, or `npm test` fails. The
  copy rules apply to both files, and the tests check them.
- **Export check.** After a build, `npm run check:export` checks each exported
  page's title, description, `og:title`, canonical URL, sitemap entry, robots
  meta, H1, share image, JSON-LD (every page has it, with the types above) and
  links to other pages, files and `#` sections. It also checks that the 404
  page is noindex, that the feed has exactly one item per post, that
  `robots.txt` doesn't block the site and points to the sitemap, that `CNAME`
  names tukdapay.com, that `llms.txt` and `llms-full.txt` start with
  `# TukdaPay` and every tukdapay.com link in them resolves, and that the home
  page's form and steps are in the static HTML. CI doesn't
  deploy if it fails. The full list is at the top of
  `scripts/check-export.mjs`, and `test/check-export.test.ts` runs it against
  a small hand-made export.
- **After deploying.** Submit `https://tukdapay.com/sitemap.xml` in Google
  Search Console and Bing Webmaster Tools. For a new or rewritten page, request
  indexing with URL Inspection.

## Deployment

- `.github/workflows/deploy.yml` runs on every push to `main` (or manually
  from the Actions tab): `npm ci`, tests, typecheck, lint, build, then
  `npm run check:export`. Only then does it publish `out/` to GitHub Pages
  with `actions/deploy-pages`.
- `.github/workflows/test.yml` runs the same install, tests, typecheck, lint,
  build and `npm run check:export`, without deploying, on pull requests and
  pushes to `main`.
- GitHub Pages is already set to deploy from GitHub Actions (Settings → Pages
  → Build and deployment → Source: **GitHub Actions**), with HTTPS enforced. A
  fork needs to set this once.
- Custom domain: `public/CNAME` (tukdapay.com) is copied into `out/`. GitHub
  ignores that file for Actions deployments and uses the custom domain set in
  Settings → Pages, so keep the two the same.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). MIT licensed.
