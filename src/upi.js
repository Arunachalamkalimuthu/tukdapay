const VPA_RE = /^[\w.-]+@[\w.-]+$/;

export function isValidVpa(vpa) {
  return typeof vpa === 'string' && VPA_RE.test(vpa);
}

/**
 * Build a UPI deep link: upi://pay?pa=&pn=&am=&cu=INR&tn=
 * pa (payee VPA) and am (amount in rupees) are required.
 */
export function buildUpiUrl({ pa, pn, am, tn }) {
  if (!isValidVpa(pa)) throw new TypeError(`invalid UPI ID: ${pa}`);
  if (!Number.isFinite(am) || am <= 0) throw new RangeError('amount must be positive');

  const params = [['pa', pa]];
  if (pn && pn.trim()) params.push(['pn', pn.trim()]);
  params.push(['am', am.toFixed(2)], ['cu', 'INR']);
  if (tn && tn.trim()) params.push(['tn', tn.trim()]);

  const query = params.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  return `upi://pay?${query}`;
}
