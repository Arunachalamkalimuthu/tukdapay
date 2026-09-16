# TukdaPay — Next.js migration and UX pass

Date: 2026-09-17

## Goal

Rebuild the static site as a Next.js app (static export) with a stronger
UX for the splitter, an MDX blog, and a new use-cases page, deployed to
GitHub Pages via GitHub Actions on tukdapay.com.

## Stack

- Next.js 15, App Router, TypeScript, `output: 'export'`, `trailingSlash: true`
- Global CSS with existing tokens + CSS Modules per component. No Tailwind.
- Blog posts as `app/blog/<slug>/page.mdx` via `@next/mdx`; each exports
  `metadata`. Post list is driven by `content/posts.ts` (slug, title,
  description, date) which also feeds the RSS feed and sitemap.
- Pure logic in `lib/split.ts`, `lib/upi.ts`, `lib/plan.ts`, tested with
  `node --test` through `tsx`.
- Deployment: `.github/workflows/deploy.yml` builds and publishes `out/`
  with `actions/deploy-pages`. Pages source switches to GitHub Actions.
  `public/CNAME` = tukdapay.com.

## Routes

| Route | Purpose |
|---|---|
| `/` | Hero, splitter, how it works, why, FAQ, from the blog |
| `/use-cases/` | 8 scenarios with sample amounts; "Try with ₹X" links to `/?amount=X` |
| `/blog/` | Post list |
| `/blog/<slug>/` | MDX post |
| `/blog/feed.xml` | RSS (route handler, force-static) |
| `/sitemap.xml`, `/robots.txt` | via `app/sitemap.ts`, `app/robots.ts` |
| `/manifest.webmanifest` | PWA manifest via `app/manifest.ts` |
| 404 | `app/not-found.tsx` |

## Splitter UX

- Amount input: numeric, formats with Indian grouping (`en-IN`) on blur;
  live chip preview of the actual split under the field.
- URL prefill: `?amount=`, `?pa=`, `?pn=`, `?note=`, `?max=`.
- Recent merchants: last 5 `{pa, pn}` in localStorage; chips under the
  UPI ID field; tap to fill.
- Inline validation on blur; submit disabled until valid.
- Result: sticky progress header with the next action
  ("Pay Part 2 of 3 · ₹1,999"); part rows with Pay link, QR on wide
  screens, Paid checkbox; done state when all paid.
- Share: "Copy breakdown" and "Send on WhatsApp" (`https://wa.me/?text=`).
- Persistence of the current plan in localStorage (existing behaviour).
- Focus moves to the result heading after split; reduced-motion honoured.

## Non-goals

Server features, analytics, auth, QR scanning, i18n (later).

## Verification

`npm test`, `npm run lint`, `npm run build` clean; Chrome walkthrough at
phone and desktop widths of every route and the full split → pay → paid →
refresh flow; live-domain check after deploy.
