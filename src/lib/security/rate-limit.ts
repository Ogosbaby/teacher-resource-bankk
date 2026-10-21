/**
 * Production-ready In-Memory Sliding-Window Rate Limiter.
 *
 * Protects critical API endpoints (e.g., activation code validation, checkout, chat)
 * against brute-force attacks, credential stuffing, and resource exhaustion.
 */

interface RateLimitRecord {
  timestamps: number[];
}

const store = new Map<string, RateLimitRecord>();

// Clean up expired entries every 5 minutes to prevent memory leaks
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    const maxWindow = 15 * 60 * 1000;
    for (const [key, record] of store.entries()) {
      record.timestamps = record.timestamps.filter((ts) => now - ts < maxWindow);
      if (record.timestamps.length === 0) {
        store.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

export interface RateLimitOptions {
  /** Maximum number of allowed requests in the time window */
  maxRequests: number;
  /** Time window in seconds */
  windowSeconds: number;
}

export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions
): {
  success: boolean;
  limit: number;
  remaining: number;
  resetInSeconds: number;
} {
  const now = Date.now();
  const windowMs = options.windowSeconds * 1000;
  const key = identifier.toLowerCase().trim();

  let record = store.get(key);
  if (!record) {
    record = { timestamps: [] };
    store.set(key, record);
  }

  // Filter timestamps within current sliding window
  record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

  if (record.timestamps.length >= options.maxRequests) {
    const oldest = record.timestamps[0];
    const resetInSeconds = Math.ceil((oldest + windowMs - now) / 1000);
    return {
      success: false,
      limit: options.maxRequests,
      remaining: 0,
      resetInSeconds: Math.max(1, resetInSeconds),
    };
  }

  record.timestamps.push(now);
  return {
    success: true,
    limit: options.maxRequests,
    remaining: options.maxRequests - record.timestamps.length,
    resetInSeconds: options.windowSeconds,
  };
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  const cfIp = req.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();

  return "127.0.0.1";
}
