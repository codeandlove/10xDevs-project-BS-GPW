import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { checkRateLimit, resetRateLimit, getRateLimitStatus, getRateLimitHeaders } from "./rate-limiter";

describe("Rate Limiter", () => {
  beforeEach(() => {
    // Clear all rate limits before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up after each test
    resetRateLimit("user-123");
    resetRateLimit("user-456");
    resetRateLimit("user-789");
  });

  describe("checkRateLimit", () => {
    it("should allow first request and set counter to 1", () => {
      const result = checkRateLimit("user-123");

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(59); // 60 - 1
      expect(result.resetAt).toBeGreaterThan(Date.now());
    });

    it("should increment counter on subsequent requests", () => {
      checkRateLimit("user-123");
      const result = checkRateLimit("user-123");

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(58); // 60 - 2
    });

    it("should block requests after limit is reached", () => {
      // Make 60 requests to hit the limit
      for (let i = 0; i < 60; i++) {
        checkRateLimit("user-123");
      }

      const result = checkRateLimit("user-123");

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBeUndefined();
      expect(result.resetAt).toBeDefined();
    });

    it("should reset counter after window expires", () => {
      const now = Date.now();
      vi.spyOn(Date, "now").mockReturnValue(now);

      // First request
      checkRateLimit("user-456", 60, 1000);

      // Advance time past window
      vi.spyOn(Date, "now").mockReturnValue(now + 1001);

      // Should reset and allow
      const result = checkRateLimit("user-456", 60, 1000);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(59);

      vi.restoreAllMocks();
    });

    it("should use custom limit", () => {
      const customLimit = 10;

      for (let i = 0; i < customLimit; i++) {
        const result = checkRateLimit("user-789", customLimit);
        expect(result.allowed).toBe(true);
      }

      const result = checkRateLimit("user-789", customLimit);
      expect(result.allowed).toBe(false);
    });

    it("should use custom window", () => {
      const now = Date.now();
      vi.spyOn(Date, "now").mockReturnValue(now);

      const windowMs = 30000; // 30 seconds
      const result = checkRateLimit("user-custom", 60, windowMs);

      expect(result.resetAt).toBe(now + windowMs);

      vi.restoreAllMocks();
    });

    it("should handle multiple users independently", () => {
      const result1 = checkRateLimit("user-a");
      const result2 = checkRateLimit("user-b");

      expect(result1.allowed).toBe(true);
      expect(result1.remaining).toBe(59);
      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(59);
    });

    it("should return correct remaining count", () => {
      checkRateLimit("user-count");
      checkRateLimit("user-count");
      const result = checkRateLimit("user-count");

      expect(result.remaining).toBe(57); // 60 - 3
    });

    it("should handle exactly at limit", () => {
      // Make exactly 60 requests (hit limit but not exceed)
      for (let i = 0; i < 59; i++) {
        checkRateLimit("user-exact");
      }

      const lastAllowed = checkRateLimit("user-exact");
      expect(lastAllowed.allowed).toBe(true);
      expect(lastAllowed.remaining).toBe(0);

      // Next should be blocked
      const blocked = checkRateLimit("user-exact");
      expect(blocked.allowed).toBe(false);
    });
  });

  describe("resetRateLimit", () => {
    it("should reset rate limit for user", () => {
      // Hit limit
      for (let i = 0; i < 60; i++) {
        checkRateLimit("user-reset");
      }

      // Should be blocked
      expect(checkRateLimit("user-reset").allowed).toBe(false);

      // Reset
      resetRateLimit("user-reset");

      // Should be allowed again
      const result = checkRateLimit("user-reset");
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(59);
    });

    it("should not affect other users", () => {
      // Use unique user IDs for this test to avoid interference
      const userA = "isolated-user-a";
      const userB = "isolated-user-b";

      checkRateLimit(userA);
      checkRateLimit(userA);
      checkRateLimit(userB);

      resetRateLimit(userA);

      // user-a should be reset
      const resultA = checkRateLimit(userA);
      expect(resultA.remaining).toBe(59);

      // user-b should still have count
      const resultB = checkRateLimit(userB);
      expect(resultB.remaining).toBe(58); // 2nd request

      // Cleanup
      resetRateLimit(userA);
      resetRateLimit(userB);
    });

    it("should handle resetting non-existent user gracefully", () => {
      expect(() => resetRateLimit("non-existent-user")).not.toThrow();
    });
  });

  describe("getRateLimitStatus", () => {
    it("should return status for user with active limit", () => {
      checkRateLimit("user-status");
      checkRateLimit("user-status");

      const status = getRateLimitStatus("user-status");

      expect(status).not.toBeNull();
      expect(status?.count).toBe(2);
      expect(status?.remaining).toBe(58);
      expect(status?.resetAt).toBeGreaterThan(Date.now());
    });

    it("should return null for user with no limit", () => {
      const status = getRateLimitStatus("no-limit-user");
      expect(status).toBeNull();
    });

    it("should return null if limit has expired", () => {
      const now = Date.now();
      vi.spyOn(Date, "now").mockReturnValue(now);

      checkRateLimit("user-expired", 60, 1000);

      // Advance time past expiry
      vi.spyOn(Date, "now").mockReturnValue(now + 1001);

      const status = getRateLimitStatus("user-expired");
      expect(status).toBeNull();

      vi.restoreAllMocks();
    });

    it("should calculate remaining correctly with custom limit", () => {
      const customLimit = 10;

      checkRateLimit("user-custom-limit", customLimit);
      checkRateLimit("user-custom-limit", customLimit);
      checkRateLimit("user-custom-limit", customLimit);

      const status = getRateLimitStatus("user-custom-limit", customLimit);

      expect(status?.count).toBe(3);
      expect(status?.remaining).toBe(7); // 10 - 3
    });

    it("should return 0 remaining when limit is reached", () => {
      const limit = 5;

      for (let i = 0; i < limit; i++) {
        checkRateLimit("user-at-limit", limit);
      }

      const status = getRateLimitStatus("user-at-limit", limit);
      expect(status?.remaining).toBe(0);
    });

    it("should return 0 remaining when limit is exceeded", () => {
      const limit = 5;

      for (let i = 0; i < limit + 3; i++) {
        checkRateLimit("user-over-limit", limit);
      }

      const status = getRateLimitStatus("user-over-limit", limit);
      expect(status?.remaining).toBe(0);
      expect(status?.count).toBeGreaterThanOrEqual(limit);
    });
  });

  describe("getRateLimitHeaders", () => {
    it("should return headers for allowed request", () => {
      const result = {
        allowed: true,
        remaining: 55,
        resetAt: Date.now() + 60000,
      };

      const headers = getRateLimitHeaders(result);

      expect(headers["X-RateLimit-Limit"]).toBe("60");
      expect(headers["X-RateLimit-Remaining"]).toBe("55");
      expect(headers["X-RateLimit-Reset"]).toBeDefined();
      expect(headers["Retry-After"]).toBeUndefined();
    });

    it("should return headers for blocked request with Retry-After", () => {
      const resetAt = Date.now() + 30000; // 30 seconds from now
      const result = {
        allowed: false,
        remaining: 0,
        resetAt,
      };

      const headers = getRateLimitHeaders(result);

      expect(headers["X-RateLimit-Limit"]).toBe("60");
      expect(headers["Retry-After"]).toBeDefined();
      expect(parseInt(headers["Retry-After"])).toBeGreaterThan(0);
      expect(parseInt(headers["Retry-After"])).toBeLessThanOrEqual(30);
    });

    it("should convert resetAt to Unix timestamp in seconds", () => {
      const resetAt = 1704067200000; // Jan 1, 2024 00:00:00 GMT
      const result = {
        allowed: true,
        remaining: 10,
        resetAt,
      };

      const headers = getRateLimitHeaders(result);
      const resetTimestamp = parseInt(headers["X-RateLimit-Reset"]);

      expect(resetTimestamp).toBe(Math.ceil(resetAt / 1000));
    });

    it("should handle missing remaining and resetAt", () => {
      const result = {
        allowed: true,
      };

      const headers = getRateLimitHeaders(result);

      expect(headers["X-RateLimit-Limit"]).toBe("60");
      expect(headers["X-RateLimit-Remaining"]).toBeUndefined();
      expect(headers["X-RateLimit-Reset"]).toBeUndefined();
      expect(headers["Retry-After"]).toBeUndefined();
    });

    it("should include remaining as 0 when blocked", () => {
      const result = {
        allowed: false,
        remaining: 0,
        resetAt: Date.now() + 10000,
      };

      const headers = getRateLimitHeaders(result);

      expect(headers["X-RateLimit-Remaining"]).toBe("0");
    });

    it("should calculate Retry-After correctly", () => {
      const now = Date.now();
      const resetIn30Seconds = now + 30000;

      vi.spyOn(Date, "now").mockReturnValue(now);

      const result = {
        allowed: false,
        resetAt: resetIn30Seconds,
      };

      const headers = getRateLimitHeaders(result);
      const retryAfter = parseInt(headers["Retry-After"]);

      expect(retryAfter).toBe(30);

      vi.restoreAllMocks();
    });

    it("should not have negative Retry-After", () => {
      const pastTime = Date.now() - 5000; // 5 seconds ago

      const result = {
        allowed: false,
        resetAt: pastTime,
      };

      const headers = getRateLimitHeaders(result);
      const retryAfter = parseInt(headers["Retry-After"]);

      expect(retryAfter).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Integration scenarios", () => {
    it("should handle full rate limit cycle", () => {
      const userId = "integration-user";
      const limit = 5;

      // Make requests up to limit
      for (let i = 0; i < limit; i++) {
        const result = checkRateLimit(userId, limit);
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(limit - i - 1);
      }

      // Check status at limit
      const status = getRateLimitStatus(userId, limit);
      expect(status?.count).toBe(limit);
      expect(status?.remaining).toBe(0);

      // Try one more (should be blocked)
      const blockedResult = checkRateLimit(userId, limit);
      expect(blockedResult.allowed).toBe(false);

      // Generate headers
      const headers = getRateLimitHeaders(blockedResult);
      expect(headers["Retry-After"]).toBeDefined();

      // Reset and try again
      resetRateLimit(userId);
      const afterReset = checkRateLimit(userId, limit);
      expect(afterReset.allowed).toBe(true);
      expect(afterReset.remaining).toBe(limit - 1);
    });
  });
});
