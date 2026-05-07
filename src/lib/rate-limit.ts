/**
 * Simple in-memory sliding-window rate limiter.
 * One Map per Node process — sufficient for a single-instance deployment.
 */

interface Window {
  count: number;
  windowStart: number;
}

const store = new Map<string, Window>();

const WINDOW_MS  = 15 * 60 * 1000; // 15 minutes
const MAX_HITS   = 10;              // max attempts per window

/** Returns true if the request should be blocked (rate limited). */
export function isRateLimited(key: string): boolean {
  const now  = Date.now();
  const win  = store.get(key);

  if (!win || now - win.windowStart > WINDOW_MS) {
    store.set(key, { count: 1, windowStart: now });
    return false;
  }

  win.count += 1;
  if (win.count > MAX_HITS) return true;
  return false;
}

/** Clear old entries periodically to avoid memory leak (call once at startup). */
export function pruneRateLimitStore() {
  const now = Date.now();
  for (const [key, win] of store) {
    if (now - win.windowStart > WINDOW_MS * 2) store.delete(key);
  }
}

// Auto-prune every 30 minutes
if (typeof setInterval !== "undefined") {
  setInterval(pruneRateLimitStore, 30 * 60 * 1000);
}
