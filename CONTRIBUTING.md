# Contributing to TukdaPay

Thanks for helping. Keep it small and honest.

## Setup

```sh
git clone https://github.com/Arunachalamkalimuthu/tukdapay
cd tukdapay
npm install
npm run dev
```

Node 20 or newer.

## Ground rules

- Logic lives in `lib/` and must have tests in `test/`. Write the failing
  test first.
- Components stay presentational; state that needs to survive a refresh goes
  through `lib/storage.ts`.
- No runtime dependencies beyond what's there unless there's a clear win.
  The site is a static export — no server code, API routes or SSR.
- Copy is plain, sentence case, from the user's point of view. Never assert
  what the current government rule is; link to sources instead.
- Test on a real phone before submitting splitter changes — the `upi://`
  handoff only works there.

## Pull requests

1. Fork, branch from `main`.
2. `npm test && npm run lint && npm run typecheck && npm run build` must pass
   (CI runs the same).
3. Describe what changed and why; add a screenshot for UI changes.

## Ideas welcome

- Scan a merchant's UPI QR sticker instead of typing the ID
- Hindi / Tamil / other language UI
- More use cases and posts
