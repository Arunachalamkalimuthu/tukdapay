# UPI Split Payment — Design

Date: 2026-09-17

## Purpose

A consumer-side web app that splits a payment larger than a threshold
(default ₹1999 per transaction) into several UPI payments, each at or
under the threshold, and hands each one to the user's UPI app as a
ready-made `upi://pay` intent.

The threshold is user-editable because the exact rule it targets may
change; the app does not hard-code any tax logic.

## Non-goals

- No backend, login, or payment gateway. A web page cannot move money
  from a consumer's account; only the user's UPI app can.
- No payment confirmation. UPI intents do not call back to a web page,
  so "paid" status is self-reported by the user.
- No QR scanning of merchant stickers (possible follow-up).

## Stack

Static single-page app, vanilla JS ES modules, no build step.

```
index.html        page shell + form + results container
styles.css
src/split.js      splitAmount()   — pure, tested
src/upi.js        buildUpiUrl()   — pure, tested
src/app.js        DOM wiring, localStorage persistence
test/split.test.js
test/upi.test.js
package.json      { "type": "module", "scripts": { "test": "node --test" } }
```

One CDN dependency: `qrcode` (jsDelivr) to render a QR per chunk on
non-mobile screens.

## Split logic — `splitAmount(total, maxPerTxn = 1999)`

Returns an array of numbers (rupees, 2-decimal precision).

- Greedy: chunks of `maxPerTxn`, remainder last.
  `splitAmount(5000)` → `[1999, 1999, 1002]`.
- `total <= maxPerTxn` → `[total]`.
- All amounts rounded to 2 decimals; the sum of chunks must equal
  `total` exactly (rounding error goes into the last chunk).
- Throws `RangeError` on non-finite, zero, or negative `total`, or on
  `maxPerTxn <= 0`.

## UPI intent — `buildUpiUrl({ pa, pn, am, tn })`

Returns a string:
`upi://pay?pa=<vpa>&pn=<name>&am=<amount>&cu=INR&tn=<note>`

- `pa` (VPA) required; must match `/^[\w.-]+@[\w.-]+$/`, else throws
  `TypeError`.
- `am` formatted with exactly 2 decimals.
- `pn`, `tn` optional; omitted from the query if empty.
- All values URL-encoded.

Each chunk's `tn` is `Part <i>/<n>` followed by the user's note if any,
so the merchant can match the pieces.

## UI

**Form**

- Total amount (₹, required)
- Merchant UPI ID (required)
- Merchant name (optional)
- Note (optional)
- Advanced (collapsed): Max per transaction, default 1999

**Result**

- Progress bar "k of n paid".
- One card per chunk: amount, `Pay` link (`href` = upi URL, opens the
  UPI app on mobile), QR code (hidden on narrow screens), "Mark as
  paid" checkbox.
- "Copy breakdown" button copies plain text
  (`Part 1/3: ₹1999.00 to shop@upi` per line).
- "Start over" clears state.

**Persistence**

The current plan (inputs, chunks, paid flags) is stored in
`localStorage` under one key and restored on load, so a refresh
mid-payment does not lose progress. Storage access is wrapped in
try/catch; the app works without it.

## Testing

`node --test` on the two pure modules. Cases:

- split: single chunk, exact multiple, remainder, paise precision,
  custom threshold, invalid inputs.
- upi: minimal URL, full URL, encoding of spaces/special chars,
  2-decimal amount, invalid VPA.

UI checked manually in a browser (desktop for QR, mobile for the
`upi://` handoff).
