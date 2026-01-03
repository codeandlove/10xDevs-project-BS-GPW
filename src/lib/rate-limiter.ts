/**
 * In-memory Rate Limiter
 * Zgodnie z api-plan.md sekcja 4.2: Rate Limiting
 *
 * Implementuje sliding window rate limiting z automatycznym cleanup.
 * Default: 60 requestów na minutę na użytkownika.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Sprawdza rate limit dla użytkownika
 * @param userId - ID użytkownika (auth_uid)
 * @param limit - Max liczba requestów (domyślnie 60)
 * @param windowMs - Okno czasowe w ms (domyślnie 60000 = 1 min)
 * @returns { allowed: boolean, remaining?: number, resetAt?: number }
 */
export function checkRateLimit(
  userId: string,
  limit = 60,
  windowMs = 60000
): { allowed: boolean; remaining?: number; resetAt?: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(userId);

  // Brak wpisu lub okno wygasło - reset licznika
  if (!entry || entry.resetAt < now) {
    const resetAt = now + windowMs;
    rateLimitStore.set(userId, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt };
  }

  // Przekroczono limit
  if (entry.count >= limit) {
    return { allowed: false, resetAt: entry.resetAt };
  }

  // Zwiększ counter
  entry.count++;
  return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt };
}

/**
 * Resetuje rate limit dla użytkownika (użyteczne w testach)
 * @param userId - ID użytkownika
 */
export function resetRateLimit(userId: string): void {
  rateLimitStore.delete(userId);
}

/**
 * Pobiera aktualny stan rate limit dla użytkownika
 * @param userId - ID użytkownika
 * @returns { count: number, resetAt: number, remaining: number } lub null jeśli brak wpisu
 */
export function getRateLimitStatus(
  userId: string,
  limit = 60
): { count: number; resetAt: number; remaining: number } | null {
  const entry = rateLimitStore.get(userId);
  if (!entry) return null;

  const now = Date.now();
  if (entry.resetAt < now) return null;

  return {
    count: entry.count,
    resetAt: entry.resetAt,
    remaining: Math.max(0, limit - entry.count),
  };
}

/**
 * Cleanup expired entries co 5 minut
 * Zapobiega memory leaks w długo działającej aplikacji
 */
setInterval(
  () => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetAt < now) {
        rateLimitStore.delete(key);
      }
    }
  },
  5 * 60 * 1000
);

/**
 * Generuje nagłówki HTTP dla rate limiting zgodnie z api-plan.md sekcja 4.2
 * @param result - Wynik checkRateLimit
 * @returns Obiekt z nagłówkami X-RateLimit-*
 */
export function getRateLimitHeaders(result: {
  allowed: boolean;
  remaining?: number;
  resetAt?: number;
}): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": "60",
  };

  if (result.remaining !== undefined) {
    headers["X-RateLimit-Remaining"] = String(result.remaining);
  }

  if (result.resetAt !== undefined) {
    headers["X-RateLimit-Reset"] = String(Math.ceil(result.resetAt / 1000));
  }

  // Dodaj Retry-After dla 429
  if (!result.allowed && result.resetAt !== undefined) {
    const retryAfterSeconds = Math.ceil((result.resetAt - Date.now()) / 1000);
    headers["Retry-After"] = String(Math.max(0, retryAfterSeconds));
  }

  return headers;
}
