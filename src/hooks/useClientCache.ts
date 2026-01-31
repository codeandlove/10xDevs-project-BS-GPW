/**
 * Custom hook for client-side caching
 * Strategy: localStorage + in-memory with stale-while-revalidate
 * Eviction: LRU with maxEntries = 200 (per PRD section 8.2)
 */

import { useState, useEffect, useCallback } from "react";
import type { CacheEntry, CacheOptions } from "@/types/ui.types";

// In-memory cache
const memoryCache = new Map<string, CacheEntry<unknown>>();

// Cache configuration (per PRD section 8.2)
const MAX_CACHE_ENTRIES = 200; // Maximum number of entries
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
const DEFAULT_OPTIONS: CacheOptions = {
  ttl: DEFAULT_TTL,
  staleWhileRevalidate: true,
  retry: 3,
};

/**
 * Evict oldest entry if cache is full (LRU policy)
 */
function evictIfNeeded(): void {
  if (memoryCache.size >= MAX_CACHE_ENTRIES) {
    // Find entry with oldest lastAccessed (LRU)
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of memoryCache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      memoryCache.delete(oldestKey);
      try {
        localStorage.removeItem(oldestKey);
      } catch {
        // Graceful degradation: localStorage errors are silent
        // Cache continues working in memory
      }
    }
  }
}

/**
 * Get data from cache (in-memory first, then localStorage)
 */
function getFromCache<T>(key: string): CacheEntry<T> | null {
  // Try in-memory cache first
  const memEntry = memoryCache.get(key) as CacheEntry<T> | undefined;
  if (memEntry) {
    // Update lastAccessed for LRU
    memEntry.lastAccessed = Date.now();
    return memEntry;
  }

  // Try localStorage
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const entry: CacheEntry<T> = JSON.parse(stored);
      // Update lastAccessed
      entry.lastAccessed = Date.now();
      // Store in memory cache for faster access
      memoryCache.set(key, entry as CacheEntry<unknown>);
      return entry;
    }
  } catch {
    // Graceful degradation: localStorage read/parse errors are silent
    // Falls back to fetching fresh data
  }

  return null;
}

/**
 * Set data in cache (both in-memory and localStorage)
 */
function setInCache<T>(key: string, data: T, ttl: number): void {
  const now = Date.now();
  const entry: CacheEntry<T> = {
    data,
    timestamp: now,
    ttl,
    lastAccessed: now,
  };

  // Evict if needed before adding new entry
  evictIfNeeded();

  // Store in memory (cast to unknown for type-safe storage)
  memoryCache.set(key, entry as CacheEntry<unknown>);

  // Store in localStorage
  try {
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // Graceful degradation: localStorage write errors are silent
    // Data is still cached in memory
  }
}

/**
 * Check if cache entry is stale
 */
function isStale<T>(entry: CacheEntry<T>): boolean {
  return Date.now() - entry.timestamp > entry.ttl;
}

/**
 * Custom hook for cached data fetching with stale-while-revalidate
 */
export function useClientCache<T>(key: string, fetcher: () => Promise<T>, options: CacheOptions = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isRevalidating, setIsRevalidating] = useState(false);

  /**
   * Fetch fresh data with retry logic
   */
  const fetchData = useCallback(
    async (retryCount = 0): Promise<T | null> => {
      try {
        const result = await fetcher();
        setInCache(key, result, opts.ttl ?? DEFAULT_TTL);
        return result;
      } catch (err) {
        // Don't retry on client errors (4xx) - user action required
        if (err instanceof Error && err.message) {
          const statusMatch = err.message.match(/HTTP (\d{3})/);
          if (statusMatch) {
            const status = parseInt(statusMatch[1]);
            if (status >= 400 && status < 500) {
              // Client error (401, 403, 404, etc.) - don't retry
              throw err;
            }
          }
        }

        const maxRetries = opts.retry ?? DEFAULT_OPTIONS.retry ?? 3;
        if (retryCount < maxRetries) {
          // Exponential backoff
          await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
          return fetchData(retryCount + 1);
        }
        throw err;
      }
    },
    [key, fetcher, opts.ttl, opts.retry]
  );

  /**
   * Revalidate data in background
   */
  const revalidate = useCallback(async () => {
    setIsRevalidating(true);
    try {
      const freshData = await fetchData();
      if (freshData) {
        setData(freshData);
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch data"));
    } finally {
      setIsRevalidating(false);
    }
  }, [fetchData]);

  /**
   * Load initial data
   */
  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      // Try to get from cache first
      const cached = getFromCache<T>(key);

      if (cached) {
        // Set cached data immediately
        setData(cached.data);
        setIsLoading(false);

        // If stale and stale-while-revalidate is enabled, fetch in background
        if (isStale(cached) && opts.staleWhileRevalidate) {
          try {
            const freshData = await fetchData();
            if (mounted && freshData) {
              setData(freshData);
            }
          } catch {
            // Silent failure: Keep showing stale data on revalidation error
            // This is intentional for stale-while-revalidate strategy
          }
        }
      } else {
        // No cache - fetch fresh data
        try {
          const freshData = await fetchData();
          if (mounted && freshData) {
            setData(freshData);
          }
        } catch (err) {
          if (mounted) {
            setError(err instanceof Error ? err : new Error("Failed to fetch data"));
          }
        } finally {
          if (mounted) {
            setIsLoading(false);
          }
        }
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, [key, fetchData, opts.staleWhileRevalidate]);

  return {
    data,
    isLoading,
    error,
    isRevalidating,
    revalidate,
  };
}

/**
 * Manually invalidate cache for a key
 */
export function invalidateCache(key: string): void {
  memoryCache.delete(key);
  try {
    localStorage.removeItem(key);
  } catch {
    // Graceful degradation: localStorage errors are silent
  }
}

/**
 * Clear all cache
 */
export function clearAllCache(): void {
  memoryCache.clear();
  try {
    // Clear all cache keys (format: "cache:...")
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith("cache:")) {
        localStorage.removeItem(key);
      }
    });
  } catch {
    // Graceful degradation: localStorage errors are silent
    // Memory cache is already cleared
  }
}

/**
 * Clear grid cache but preserve user preferences
 * Used on logout to remove sensitive data while keeping UI preferences
 */
export function clearGridCache(): void {
  memoryCache.clear();
  try {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      // Clear cache data (grid events, event details, summaries)
      // And new format: "gpw:cache:v1:black_swans|id=...", "gpw:cache:v1:grid|...", etc.
      if (key.startsWith("cache:") || key.startsWith("gpw:cache:")) {
        localStorage.removeItem(key);
      }

      // Do NOT clear preferences - preserve for better UX on re-login
      // Preserved keys: gpw:preferences:symbols, gpw:preferences:range, etc.
    });
  } catch {
    // Graceful degradation: localStorage errors are silent
    // Memory cache is already cleared
  }
}
