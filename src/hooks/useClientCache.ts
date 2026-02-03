/**
 * Custom hook for client-side caching
 * Strategy: localStorage + in-memory with stale-while-revalidate
 * Eviction: LRU with maxEntries = 200 (per PRD section 8.2)
 */

import { useState, useEffect, useCallback } from "react";
import { getFromCache, setInCache, isStale } from "@/lib/cache-utils";
import type { CacheOptions } from "@/types/ui.types";

// Cache configuration (per PRD section 8.2)
const DEFAULT_OPTIONS: CacheOptions = {
  ttl: 5 * 60 * 1000,
  staleWhileRevalidate: true,
  retry: 3,
};

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
        const ttl = opts.ttl ?? DEFAULT_OPTIONS.ttl ?? 5 * 60 * 1000;
        setInCache(key, result, ttl);
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

// Re-export cache utilities for convenience
export { invalidateCache, clearAllCache } from "@/lib/cache-utils";
