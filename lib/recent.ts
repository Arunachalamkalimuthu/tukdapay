import { isValidVpa } from './upi.ts';

export interface RecentMerchant {
  pa: string;
  pn: string;
}

export const MAX_RECENT = 5;

const samePa = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/**
 * Add a merchant to the recent list: newest first, one entry per UPI ID
 * (UPI IDs are case-insensitive), at most MAX_RECENT. An empty name does not
 * erase a name remembered earlier. Returns a new list.
 */
export function rememberMerchant(list: RecentMerchant[], merchant: RecentMerchant): RecentMerchant[] {
  if (!isValidVpa(merchant.pa)) return list.slice(0, MAX_RECENT);
  const previous = list.find((r) => samePa(r.pa, merchant.pa));
  const entry = { pa: merchant.pa, pn: merchant.pn || previous?.pn || '' };
  return [entry, ...list.filter((r) => !samePa(r.pa, merchant.pa))].slice(0, MAX_RECENT);
}

/** Validate what came out of storage. Malformed entries are dropped. */
export function parseRecent(value: unknown): RecentMerchant[] {
  if (!Array.isArray(value)) return [];
  const list: RecentMerchant[] = [];
  for (const item of value) {
    if (list.length === MAX_RECENT) break;
    if (!item || typeof item !== 'object') continue;
    const { pa, pn } = item as Record<string, unknown>;
    if (!isValidVpa(pa)) continue;
    if (pn !== undefined && typeof pn !== 'string') continue;
    if (list.some((r) => samePa(r.pa, pa))) continue;
    list.push({ pa, pn: pn ?? '' });
  }
  return list;
}
