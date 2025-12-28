/**
 * Rate Limiter Service
 * In-memory rate limiting for NocoDB API endpoints
 * Implements sliding window: 60 requests per minute per user
 */

interface RateLimitEntry {
  count: number;
  resetAt: number; // timestamp in milliseconds
}

/**
 * Rate limiter configuration
 */
const RATE_LIMIT_WINDOW = 60 * 1000; // 60 seconds in milliseconds
const RATE_LIMIT_MAX_REQUESTS = 60;

/**
 * In-memory store for rate limits
 * Key: user auth_uid
 * Value: { count, resetAt }
 */
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Rate limit result
 */
export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number; // timestamp
  retryAfter?: number; // seconds until reset
}

/**
 * Clean up expired entries (runs periodically)
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupExpiredEntries, 5 * 60 * 1000);

/**
 * Check rate limit for a user
 * @param userId - User's auth_uid
 * @returns Rate limit result with allowed status
 */
export function checkRateLimit(userId: string): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(userId);

  // No entry or expired - allow and create new entry
  if (!entry || entry.resetAt < now) {
    const newResetAt = now + RATE_LIMIT_WINDOW;
    rateLimitStore.set(userId, {
      count: 1,
      resetAt: newResetAt,
    });

    return {
      allowed: true,
      limit: RATE_LIMIT_MAX_REQUESTS,
      remaining: RATE_LIMIT_MAX_REQUESTS - 1,
      resetAt: newResetAt,
    };
  }

  // Entry exists and not expired
  // Check if limit exceeded
  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return {
      allowed: false,
      limit: RATE_LIMIT_MAX_REQUESTS,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfter,
    };
  }

  // Increment count
  entry.count++;
  rateLimitStore.set(userId, entry);

  return {
    allowed: true,
    limit: RATE_LIMIT_MAX_REQUESTS,
    remaining: RATE_LIMIT_MAX_REQUESTS - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Get current rate limit status without incrementing
 * @param userId - User's auth_uid
 * @returns Current rate limit status
 */
export function getRateLimitStatus(userId: string): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(userId);

  if (!entry || entry.resetAt < now) {
    return {
      allowed: true,
      limit: RATE_LIMIT_MAX_REQUESTS,
      remaining: RATE_LIMIT_MAX_REQUESTS,
      resetAt: now + RATE_LIMIT_WINDOW,
    };
  }

  const remaining = Math.max(0, RATE_LIMIT_MAX_REQUESTS - entry.count);
  const retryAfter = entry.count >= RATE_LIMIT_MAX_REQUESTS ? Math.ceil((entry.resetAt - now) / 1000) : undefined;

  return {
    allowed: remaining > 0,
    limit: RATE_LIMIT_MAX_REQUESTS,
    remaining,
    resetAt: entry.resetAt,
    retryAfter,
  };
}

/**
 * Reset rate limit for a user (useful for testing)
 * @param userId - User's auth_uid
 */
export function resetRateLimit(userId: string): void {
  rateLimitStore.delete(userId);
}

/**
 * Get rate limit headers for HTTP response
 * @param result - Rate limit result
 * @returns Headers object
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": new Date(result.resetAt).toISOString(),
  };

  if (result.retryAfter !== undefined) {
    headers["Retry-After"] = String(result.retryAfter);
  }

  return headers;
}
