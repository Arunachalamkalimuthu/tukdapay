const VPA_RE = /^[\w.-]+@[\w.-]+$/;

export function isValidVpa(vpa: unknown): vpa is string {
  return typeof vpa === 'string' && VPA_RE.test(vpa);
}

export interface UpiParams {
  pa: string;
  pn?: string;
  am: number;
  tn?: string;
}

/** Build a UPI deep link: upi://pay?pa=&pn=&am=&cu=INR&tn= */
export function buildUpiUrl({ pa, pn, am, tn }: UpiParams): string {
  if (!isValidVpa(pa)) throw new TypeError(`invalid UPI ID: ${pa}`);
  if (!Number.isFinite(am) || am <= 0) throw new RangeError('amount must be positive');

  const params: [string, string][] = [['pa', pa]];
  if (pn && pn.trim()) params.push(['pn', pn.trim()]);
  params.push(['am', am.toFixed(2)], ['cu', 'INR']);
  if (tn && tn.trim()) params.push(['tn', tn.trim()]);

  return `upi://pay?${params.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')}`;
}
