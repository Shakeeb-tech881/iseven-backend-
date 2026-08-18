import { TooManyRequests } from './errors';

/**
 * Fixed-window limiter held in process memory.
 *
 * Good enough for a single long-running server (VPS, Railway, Fly).
 * On serverless each instance keeps its own counter, so the effective
 * limit is higher than configured. If you deploy to Vercel or Cloudflare
 * and abuse becomes a problem, swap the Map for Upstash Redis — the
 * function signature stays the same.
 */
interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Stop the Map growing forever.
setInterval(() => {
  const now = Date.now();
  for (const [key, b] of buckets) if (b.resetAt < now) buckets.delete(key);
}, 60_000).unref?.();

export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}

export function rateLimit(key: string, limit: number, windowMs: number): void {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  existing.count += 1;
  if (existing.count > limit) {
    const seconds = Math.ceil((existing.resetAt - now) / 1000);
    throw TooManyRequests(`Too many requests. Try again in ${seconds}s.`);
  }
}

/** Convenience wrapper keyed by route + IP. */
export function limitByIp(req: Request, route: string, limit: number, windowMs: number) {
  rateLimit(`${route}:${clientIp(req)}`, limit, windowMs);
}
