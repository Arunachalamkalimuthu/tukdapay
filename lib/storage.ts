/**
 * localStorage helpers that never throw (private mode, blocked storage, SSR).
 * Reads return `unknown`: validate the value before using it.
 */
export function readJson(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Save a value (or remove it, for null). Returns false when storage is blocked, full or missing. */
export function writeJson(key: string, value: unknown): boolean {
  try {
    if (value === null || value === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
