# Contributing to TukdaPay

Thanks for helping. Keep it small and simple — this is a static page with no
build step, and we'd like it to stay that way.

## Setup

```sh
git clone https://github.com/Arunachalamkalimuthu/tukdapay
cd tukdapay
npm test      # node >= 20, no dependencies to install
npm start     # http://localhost:3000
```

## Ground rules

- Logic lives in `src/split.js`, `src/upi.js`, `src/plan.js` and must have
  tests in `test/`. Write the failing test first.
- `src/app.js` is DOM wiring only. Keep it free of business logic.
- No frameworks, no bundlers, no npm dependencies at runtime. The one CDN
  import (`qrcode`) is loaded lazily and the page must still work if it fails.
- Copy is plain, sentence case, from the user's point of view.
- Test on a real phone before submitting UI changes — the `upi://` handoff
  only works there.

## Pull requests

1. Fork, branch from `main`.
2. `npm test` must pass.
3. Describe what changed and why; add a screenshot for UI changes.

## Ideas welcome

- Scan a merchant's UPI QR sticker instead of typing the ID
- Hindi / Tamil / other language UI
- Share the breakdown via WhatsApp
