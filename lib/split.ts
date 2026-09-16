const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Split `total` rupees into chunks no larger than `maxPerTxn`.
 * Greedy: full chunks first, remainder last. Chunks always sum to `total`.
 */
export function splitAmount(total: number, maxPerTxn = 1999): number[] {
  // Round before checking: anything under half a paisa rounds to 0, and a 0 chunk never ends the loop.
  total = round2(total);
  maxPerTxn = round2(maxPerTxn);
  if (!Number.isFinite(total) || total <= 0) {
    throw new RangeError('total must be at least 0.01');
  }
  if (!Number.isFinite(maxPerTxn) || maxPerTxn <= 0) {
    throw new RangeError('maxPerTxn must be at least 0.01');
  }

  const chunks: number[] = [];
  let remaining = total;
  while (remaining > maxPerTxn) {
    chunks.push(maxPerTxn);
    remaining = round2(remaining - maxPerTxn);
  }
  if (remaining > 0) chunks.push(remaining);
  return chunks;
}
