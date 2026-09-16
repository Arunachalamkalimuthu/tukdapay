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
blog post and adding a use case.

## Ground rules

- Pure logic lives in `lib/` and has `node:test` tests in `test/`. Write the
  failing test first. Inside `lib/`, import other files with the `.ts`
  extension (`./split.ts`) so `npm test` can run them.
- Components are UI wiring. Keep business logic out of them; if it can be
  tested without a browser, it belongs in `lib/`.
- Style with CSS Modules and the tokens in `app/globals.css`. No Tailwind or
  UI kits.
- Keep runtime dependencies to a minimum, and say in the PR why a new one is
  needed.
- `qrcode` stays lazily loaded, and the page must still work if it fails to
  load.
- Every page except home exports metadata built with `pageMetadata()` from
  `lib/metadata.ts`, so it gets its own canonical URL.
- Copy is plain, sentence case, from the user's point of view, in Indian
  English, with amounts grouped the Indian way (₹1,00,000). Never claim what the current UPI fee or
  limit rule is.
- Page titles, meta descriptions, Open Graph text and keywords may write ₹2000
  and ₹1999 without the comma, because that's how people search for them.
- Test on a real phone before submitting UI changes — the `upi://` handoff
  only works there. Check light and dark mode, and a 360px-wide screen.

## Pull requests

1. Fork, branch from `main`.
2. All of these must pass:
   ```sh
   npm test
   npm run typecheck
   npm run lint
   npm run build
   ```
3. Describe what changed and why. Add screenshots for UI changes.

## Ideas welcome

- Scan a merchant's UPI QR sticker instead of typing the ID
- Hindi / Tamil / other language UI
