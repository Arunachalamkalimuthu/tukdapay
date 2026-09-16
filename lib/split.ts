const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Split `total` rupees into chunks no larger than `maxPerTxn`.
 * Greedy: full chunks first, remainder last. Chunks always sum to `total`.
 */
export function splitAmount(total: number, maxPerTxn = 1999): number[] {
  if (!Number.isFinite(total) || total <= 0) {
    throw new RangeError('total must be a positive finite number');
  }
  if (!Number.isFinite(maxPerTxn) || maxPerTxn <= 0) {
    throw new RangeError('maxPerTxn must be a positive finite number');
  }

  total = round2(total);
  maxPerTxn = round2(maxPerTxn);

  const chunks: number[] = [];
  let remaining = total;
  while (remaining > maxPerTxn) {
    chunks.push(maxPerTxn);
    remaining = round2(remaining - maxPerTxn);
  }
  if (remaining > 0) chunks.push(remaining);
  return chunks;
}
