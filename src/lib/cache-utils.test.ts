/**
 * Unit Tests for cache-utils
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getFromCache,
  setInCache,
  isStale,
  invalidateCache,
  clearAllCache,
  clearTimelineCache,
  DEFAULT_CACHE_TTL,
} from "./cache-utils";

describe("cache-utils", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("setInCache and getFromCache", () => {
    it("should store and retrieve data from cache", () => {
      const key = "test:key";
      const data = { foo: "bar" };

      setInCache(key, data, DEFAULT_CACHE_TTL);

      const cached = getFromCache<typeof data>(key);

      expect(cached).not.toBeNull();
      expect(cached?.data).toEqual(data);
    });

    it("should return null for non-existent key", () => {
      const cached = getFromCache("non:existent");

      expect(cached).toBeNull();
    });

    it("should update lastAccessed timestamp on retrieval", () => {
      const key = "test:accessed";
      const data = { value: 123 };

      setInCache(key, data, DEFAULT_CACHE_TTL);

      const before = Date.now();
      const cached1 = getFromCache<typeof data>(key);
      const after = Date.now();

      expect(cached1?.lastAccessed).toBeGreaterThanOrEqual(before);
      expect(cached1?.lastAccessed).toBeLessThanOrEqual(after);
    });

    it("should persist to localStorage", () => {
      const key = "test:persist";
      const data = { persistent: true };

      setInCache(key, data, DEFAULT_CACHE_TTL);

      const stored = localStorage.getItem(key);
      expect(stored).toBeTruthy();

      const parsed = JSON.parse(stored!);
      expect(parsed.data).toEqual(data);
    });

    it("should handle localStorage errors gracefully", () => {
      const key = "test:error";
      const data = { test: "data" };

      // Mock localStorage.setItem to throw error
      const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("Quota exceeded");
      });

      // Should not throw
      expect(() => setInCache(key, data, DEFAULT_CACHE_TTL)).not.toThrow();

      setItemSpy.mockRestore();
    });
  });

  describe("isStale", () => {
    it("should return false for fresh cache entry", () => {
      const entry = {
        data: { test: "data" },
        timestamp: Date.now(),
        ttl: DEFAULT_CACHE_TTL,
        lastAccessed: Date.now(),
      };

      expect(isStale(entry)).toBe(false);
    });

    it("should return true for stale cache entry", () => {
      const entry = {
        data: { test: "data" },
        timestamp: Date.now() - DEFAULT_CACHE_TTL - 1000,
        ttl: DEFAULT_CACHE_TTL,
        lastAccessed: Date.now(),
      };

      expect(isStale(entry)).toBe(true);
    });

    it("should handle edge case at exact TTL boundary", () => {
      const now = Date.now();
      const entry = {
        data: { test: "data" },
        timestamp: now - DEFAULT_CACHE_TTL,
        ttl: DEFAULT_CACHE_TTL,
        lastAccessed: now,
      };

      expect(isStale(entry)).toBe(false);
    });
  });

  describe("invalidateCache", () => {
    it("should remove entry from memory and localStorage", () => {
      const key = "test:invalidate";
      const data = { value: 42 };

      setInCache(key, data, DEFAULT_CACHE_TTL);

      expect(getFromCache(key)).not.toBeNull();
      expect(localStorage.getItem(key)).toBeTruthy();

      invalidateCache(key);

      expect(getFromCache(key)).toBeNull();
      expect(localStorage.getItem(key)).toBeNull();
    });

    it("should handle non-existent key gracefully", () => {
      expect(() => invalidateCache("non:existent")).not.toThrow();
    });

    it("should handle localStorage errors gracefully", () => {
      const removeItemSpy = vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
        throw new Error("Storage error");
      });

      expect(() => invalidateCache("test:key")).not.toThrow();

      removeItemSpy.mockRestore();
    });
  });

  describe("clearAllCache", () => {
    it("should clear all cache entries", () => {
      setInCache("cache:key1", { a: 1 }, DEFAULT_CACHE_TTL);
      setInCache("cache:key2", { b: 2 }, DEFAULT_CACHE_TTL);
      setInCache("gpw:cache:key3", { c: 3 }, DEFAULT_CACHE_TTL);
      setInCache("other:key4", { d: 4 }, DEFAULT_CACHE_TTL);

      clearAllCache();

      expect(getFromCache("cache:key1")).toBeNull();
      expect(getFromCache("cache:key2")).toBeNull();
      expect(getFromCache("gpw:cache:key3")).toBeNull();
      // other:key4 might still exist depending on implementation
    });

    it("should handle localStorage errors gracefully", () => {
      const keysSpy = vi.spyOn(Object, "keys").mockImplementation(() => {
        throw new Error("Storage error");
      });

      expect(() => clearAllCache()).not.toThrow();

      keysSpy.mockRestore();
    });
  });

  describe("clearTimelineCache", () => {
    beforeEach(() => {
      // Setup timeline cache entries
      setInCache("timeline_chunk_week_abc123_2025-01-01_2025-01-07", { data: 1 }, DEFAULT_CACHE_TTL);
      setInCache("timeline_chunk_week_def456_2025-01-08_2025-01-14", { data: 2 }, DEFAULT_CACHE_TTL);
      setInCache("timeline_chunk_month_abc123_2025-01-01_2025-01-31", { data: 3 }, DEFAULT_CACHE_TTL);
      setInCache("other:cache:key", { data: 4 }, DEFAULT_CACHE_TTL);
    });

    it("should clear all timeline cache when no params provided", () => {
      clearTimelineCache();

      expect(localStorage.getItem("timeline_chunk_week_abc123_2025-01-01_2025-01-07")).toBeNull();
      expect(localStorage.getItem("timeline_chunk_week_def456_2025-01-08_2025-01-14")).toBeNull();
      expect(localStorage.getItem("timeline_chunk_month_abc123_2025-01-01_2025-01-31")).toBeNull();
      expect(localStorage.getItem("other:cache:key")).toBeTruthy(); // Should not be affected
    });

    it("should clear specific range timeline cache", () => {
      clearTimelineCache("week");

      expect(localStorage.getItem("timeline_chunk_week_abc123_2025-01-01_2025-01-07")).toBeNull();
      expect(localStorage.getItem("timeline_chunk_week_def456_2025-01-08_2025-01-14")).toBeNull();
      expect(localStorage.getItem("timeline_chunk_month_abc123_2025-01-01_2025-01-31")).toBeTruthy();
    });

    it("should clear specific range and symbol hash combination", () => {
      clearTimelineCache("week", "abc123");

      expect(localStorage.getItem("timeline_chunk_week_abc123_2025-01-01_2025-01-07")).toBeNull();
      expect(localStorage.getItem("timeline_chunk_week_def456_2025-01-08_2025-01-14")).toBeTruthy();
      expect(localStorage.getItem("timeline_chunk_month_abc123_2025-01-01_2025-01-31")).toBeTruthy();
    });

    it("should handle localStorage errors gracefully", () => {
      const keysSpy = vi.spyOn(Object, "keys").mockImplementation(() => {
        throw new Error("Storage error");
      });

      expect(() => clearTimelineCache()).not.toThrow();

      keysSpy.mockRestore();
    });
  });

  describe("cache eviction", () => {
    it("should evict oldest entry when cache is full", () => {
      // Fill cache with 201 entries (exceeding MAX_CACHE_ENTRIES = 200)
      for (let i = 0; i < 201; i++) {
        setInCache(`test:key${i}`, { value: i }, DEFAULT_CACHE_TTL);
      }

      // First entry should be evicted (oldest)
      expect(getFromCache("test:key0")).toBeNull();

      // Recent entries should still exist
      expect(getFromCache("test:key200")).not.toBeNull();
    });
  });

  describe("fallback from localStorage to memory", () => {
    it("should retrieve from localStorage when not in memory", () => {
      const key = "test:fallback";
      const data = { fallback: true };

      // Store directly to localStorage (bypassing memory cache)
      const entry = {
        data,
        timestamp: Date.now(),
        ttl: DEFAULT_CACHE_TTL,
        lastAccessed: Date.now(),
      };
      localStorage.setItem(key, JSON.stringify(entry));

      // Should retrieve from localStorage
      const cached = getFromCache<typeof data>(key);

      expect(cached).not.toBeNull();
      expect(cached?.data).toEqual(data);
    });

    it("should handle corrupted localStorage data gracefully", () => {
      const key = "test:corrupted";

      // Store corrupted JSON
      localStorage.setItem(key, "{ corrupted json");

      // Should return null without throwing
      const cached = getFromCache(key);

      expect(cached).toBeNull();
    });
  });
});
