# Contributing to TukdaPay

Thanks for helping. TukdaPay is a Next.js app exported as a static site: no
server, no account, no tracking. Keep it small and simple.

## Setup

Needs Node 22 or newer.

```sh
git clone https://github.com/Arunachalamkalimuthu/tukdapay
cd tukdapay
npm ci
npm run dev   # http://localhost:3000
```

See the [README](README.md#project-layout) for the project layout, writing a
blog post, adding a use case or a page, and what the SEO checks cover.

## Ground rules

- Pure logic lives in `lib/` and has `node:test` tests in `test/`. Write the
  failing test first. Inside `lib/` and `content/`, import other files by
  relative path with the extension (`./split.ts`) so `npm test` can run them.
- Components are UI wiring. Keep business logic out of them; if it can be
  tested without a browser, it belongs in `lib/`.
- Keep runtime dependencies to a minimum, and say in the PR why a new one is
  needed.
- `qrcode` stays lazily loaded, and the page must still work if it fails to
  load.
- Every page except home and the 404 exports metadata built with
  `pageMetadata()` from `lib/metadata.ts`. Every indexable page is in
  `app/sitemap.ts` (posts are added from `content/posts.ts`).
- The home page's form and "How it works" must be in the static HTML, not
  only rendered in the browser. `out/index.html` needs exactly one
  `id="steps-title"`, the text "Enter the bill" and `id="total"`, and
  `npm run check:export` fails without them.

## Copy

These apply everywhere: pages, FAQ, posts, share cards, alt text and this
repo's docs.

- **What TukdaPay is for.** Paying a bill when one UPI payment won't go
  through in one go, or when the shop asks for smaller payments. It is not a
  way to avoid a fee: never suggest splitting to avoid the merchant discount
  rate (MDR) or any other charge. Say "ask the shop first".
- **Never state a UPI rule as fact.** Don't write a current fee, rate, cap,
  limit, threshold or effective date as fact, even one you have checked.
  Point to where it is published instead:
  [NPCI's FAQs on the merchant discount rate](https://www.npci.org.in/uploads/FA_Qs_Merchant_Discount_Rate_MDR_on_Select_UPI_P2_M_Transactions_58dba1d39e.pdf)
  by question number (for example, question 15 on whether consumers are
  charged), or [PIB Fact Check](https://factcheck.pib.gov.in/) for rumours.
  `npm test` fails if a post restates the figures in NPCI's FAQs.
- **No invented quotes or figures.** Link the source for any number or quote.
- **Voice.** Plain, sentence case, from the reader's point of view, in Indian
  English.
- **Amounts.** In `<title>`, meta descriptions and each post's `title` and
  `description` in `content/posts.ts`, write ₹2000 without a comma, because
  that's how people search for it. Every other amount, and all other visible
  copy, uses Indian grouping: ₹1,999, ₹2,000, ₹1,00,000. Tests check this for
  posts and the FAQ.
- **FAQ entries.** `a` is the plain-text answer used in the JSON-LD. If you
  add `body` for links or code, it must read exactly the same as `a` (tested).

## Design

The look is set by the tokens and shared classes in `app/globals.css`. Build
new UI from them rather than adding one-off values.

- **Styling.** CSS Modules only. No Tailwind or UI kits.
- **Colour.** Use the role tokens: `--paper`, `--surface`, `--ink`, `--muted`,
  `--line` (decorative dividers only), `--field` (input and control
  boundaries), `--accent`, `--accent-hover`, `--accent-ink`, `--accent-wash`,
  `--focus`, `--paid`, `--paid-ink`, `--paid-wash` and `--error`. In CSS the
  QR code is the one exception: it stays dark on white in both themes so it
  scans. When you add or change a colour token, update all three theme blocks
  (`:root`, the `prefers-color-scheme: dark` block and
  `:root[data-theme='dark']`) and check its contrast.
- **Type, space and shape.** `.t-display`, `.t-title`, `.t-heading`,
  `.t-lede`, `.t-label`, `.t-small`, `.t-money`; `.money` for any amount
  (condensed, tabular figures); `--space-4` to `--space-72`; `--radius`,
  `--radius-lg`, `--radius-sm`. Wrap a page in `.page`.
- **Buttons.** `.btn` with `.btn-primary`, `.btn-secondary`, `.btn-outline`
  or `.btn-tertiary`, plus `.btn-lg` for the large size. `.btn-primary` is the
  one solid magenta action on a screen; other magenta actions use
  `.btn-outline`. A button that isn't ready yet gets `aria-disabled="true"`,
  never lower opacity.
- **Motion.** Use `--duration-feedback`, `--duration-cut` and `--ease-cut`,
  inside `@media (prefers-reduced-motion: no-preference)`.
- **Fonts.** Let text inherit `font-family` from `body`. If a module has to
  set it, use the full stack:

  ```css
  font-family: var(--font-sans), 'Bricolage Fallback Android', system-ui, sans-serif;
  ```

  The Android fallback face in `globals.css` is sized to match Bricolage
  Grotesque, so text doesn't rewrap and jump when the web font loads. A stack
  without it brings that jump back on Android.

### The tukda strip

- Draw a split with `<TukdaStrip>` (`components/TukdaStrip.tsx`), never with
  your own bars. Variants: `ghost` (the ₹5,000 example in the empty amount
  field), `preview` (the live split), `slip` (static, for use cases),
  `progress` (paid, next and later parts in the pay bar) and `missing` (the
  404 page).
- The strip is decorative (`aria-hidden`). Put the same information in text
  next to it, for example `<span className="sr-only">{collapseText(parts)}</span>`.
- Layout decisions (piece widths, gaps, the continuous bar above 24 parts,
  when figures show) live in `lib/strip.ts` and are tested. Change them there,
  not in the component or its CSS. `className` is for outer spacing only.
- Pass `animateCut` only for a plan split in this visit, never for one
  restored from storage.

## Accessibility

UI changes must meet WCAG 2.2 AA in both light and dark themes. Theme follows
the system setting; to test the other one, emulate `prefers-color-scheme` in
your browser's dev tools or set `data-theme="dark"` (or `"light"`) on `<html>`.

- Run axe (for example the axe DevTools browser extension) on every page you
  changed, in both themes, and fix every violation.
- Contrast: 4.5:1 for text; 3:1 for large text, control boundaries and the
  focus ring.
- Focus is always visible and never hidden behind sticky UI such as the pay
  bar. Tab forwards and backwards through the page to check.
- Targets are at least 24×24px; aim for 44px.
- Reflow at 320px wide: no horizontal page scroll. A table or code block that
  doesn't fit scrolls in its own focusable region.
- Reduced motion and forced colours (Windows contrast themes) still work.
- One `<h1>` per page.
- Test on a real phone before submitting UI changes: the `upi://` handoff
  only works there.

## Pull requests

1. Fork, and branch from `main`.
2. All of these must pass (CI runs the same checks):
   ```sh
   npm test
   npm run typecheck
   npm run lint
   npm run build
   npm run check:export
   ```
3. Describe what changed and why. Add screenshots for UI changes, in light
   and dark at phone width. If copy points to a UPI rule, link the source.

## Ideas welcome

- Scan a merchant's UPI QR sticker instead of typing the ID
- Hindi / Tamil / other language UI
