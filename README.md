# Split Pay

Split a UPI payment into parts that each stay under a per-transaction limit
(default ₹1999), then pay each part from your UPI app.

Static site, no build step, no backend.

## Run

```sh
npm test          # unit tests for the split / UPI-link / plan logic
npm start         # serves the app at http://localhost:3000
```

Or open `index.html` through any static server (GitHub Pages, Cloudflare
Pages, `python3 -m http.server`). ES modules need http://, not file://.

## How it works

1. Enter the amount, the merchant's UPI ID, and optionally a name and note.
2. The app splits the amount greedily (₹5000 → ₹1999 + ₹1999 + ₹1002) and
   builds a `upi://pay?...` link per part, each with a `Part i/n` note so the
   merchant can match them.
3. On a phone, **Pay** opens your UPI app with the amount filled in. On a
   computer a QR code is shown instead.
4. Tick **Paid** as you go; progress is kept in `localStorage` so a refresh
   doesn't lose your place.

The per-transaction limit is editable under "Max per payment".

## Limits

A web page cannot see whether a UPI payment succeeded, so "Paid" is
self-reported. Check with the merchant before deliberately splitting a bill;
some may not accept it.

## Layout

```
index.html, styles.css   page
src/split.js             splitAmount(total, maxPerTxn)
src/upi.js               buildUpiUrl({ pa, pn, am, tn }), isValidVpa()
src/plan.js              createPlan(input), breakdownText(plan)
src/app.js               DOM wiring + localStorage
test/                    node --test
```
