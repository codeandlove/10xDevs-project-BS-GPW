/**
 * Custom hook for client-side caching
 * Strategy: localStorage + in-memory with stale-while-revalidate
 * Eviction: LRU with maxEntries = 200 (per PRD section 8.2)
 */

import { useState, useEffect, useCallback } from "react";
import type { CacheEntry, CacheOptions } from "@/types/ui.types";

// In-memory cache
const memoryCache = new Map<string, CacheEntry<any>>();

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
      } catch (error) {
        console.error("Failed to remove from localStorage:", error);
      }
    }
  }
}

/**
 * Get data from cache (in-memory first, then localStorage)
 */
function getFromCache<T>(key: string): CacheEntry<T> | null {
  // Try in-memory cache first
  const memEntry = memoryCache.get(key);
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
      memoryCache.set(key, entry);
      return entry;
    }
  } catch (error) {
    console.error("Failed to read from localStorage:", error);
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

  // Store in memory
  memoryCache.set(key, entry);

  // Store in localStorage
  try {
    localStorage.setItem(key, JSON.stringify(entry));
  } catch (error) {
    console.error("Failed to write to localStorage:", error);
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
        setInCache(key, result, opts.ttl!);
        return result;
      } catch (err) {
        if (retryCount < opts.retry!) {
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
          } catch (err) {
            // Keep showing stale data on revalidation error
            console.error("Background revalidation failed:", err);
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
  } catch (error) {
    console.error("Failed to remove from localStorage:", error);
  }
}

/**
 * Clear all cache
 */
export function clearAllCache(): void {
  memoryCache.clear();
  try {
    // Clear only cache keys with PRD prefix: gpw:cache:v1:
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith("gpw:cache:v1:")) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.error("Failed to clear localStorage:", error);
  }
}
