# TukdaPay

**Pay a big UPI bill in tukde.** Split any amount into parts that each stay
under a per-transaction limit (default ₹1999), then pay each part from your
own UPI app — GPay, PhonePe, Paytm, BHIM, any of them.

Live: https://arunachalamkalimuthu.github.io/tukdapay/

[![test](https://github.com/Arunachalamkalimuthu/tukdapay/actions/workflows/test.yml/badge.svg)](https://github.com/Arunachalamkalimuthu/tukdapay/actions/workflows/test.yml)

Static page. No backend, no account, no tracking. Your money never touches
this site; it only prepares the `upi://pay` links.

## How it works

1. Enter the amount, the merchant's UPI ID, and optionally a name and note.
2. TukdaPay splits it greedily — ₹5000 → ₹1999 + ₹1999 + ₹1002 — and builds
   a `upi://pay?...` link per part, each tagged `Part i/n` so the merchant
   can match them.
3. On a phone, **Pay** opens your UPI app with the amount filled in. On a
   computer you get a QR code to scan instead.
4. Tick **Paid** as you go. Progress is saved in your browser so a refresh
   doesn't lose your place.

The per-transaction limit is editable under "Max per payment".

## Run locally

```sh
npm test    # unit tests (node >= 20, nothing to install)
npm start   # http://localhost:3000
```

Any static server works. ES modules need `http://`, not `file://`.

## Good to know

- A web page cannot see whether a UPI payment went through, so "Paid" is
  self-reported.
- Check with the merchant before splitting a bill; some may not accept it.
- Rules on per-transaction charges change. TukdaPay makes no claim about what
  the current rule is — set the limit to whatever applies to you.

## Layout

```
index.html, styles.css   page
src/split.js             splitAmount(total, maxPerTxn)
src/upi.js               buildUpiUrl({ pa, pn, am, tn }), isValidVpa()
src/plan.js              createPlan(input), breakdownText(plan)
src/app.js               DOM wiring + localStorage
test/                    node --test
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). MIT licensed.
