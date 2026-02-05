/**
 * Shared cache utilities used across hooks and service modules.
 * Keeps in-memory and persistent cache in sync and exposes invalidation helpers.
 */

import type { CacheEntry } from "@/types/ui.types";

const memoryCache = new Map<string, CacheEntry<unknown>>();

const MAX_CACHE_ENTRIES = 200; // matches PRD section 8.2
export const DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function evictIfNeeded(): void {
  if (memoryCache.size < MAX_CACHE_ENTRIES) {
    return;
  }

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
      // Graceful degradation: ignore storage errors
    }
  }
}

export function getFromCache<T>(key: string): CacheEntry<T> | null {
  const memEntry = memoryCache.get(key) as CacheEntry<T> | undefined;
  if (memEntry) {
    memEntry.lastAccessed = Date.now();
    return memEntry;
  }

  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const entry: CacheEntry<T> = JSON.parse(stored);
      entry.lastAccessed = Date.now();
      memoryCache.set(key, entry as CacheEntry<unknown>);
      return entry;
    }
  } catch {
    // Fall back to fresh fetch when storage is unavailable or data malformed
  }

  return null;
}

export function setInCache<T>(key: string, data: T, ttl: number): void {
  const now = Date.now();
  const entry: CacheEntry<T> = {
    data,
    timestamp: now,
    ttl,
    lastAccessed: now,
  };

  evictIfNeeded();
  memoryCache.set(key, entry as CacheEntry<unknown>);

  try {
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // Storage failures degrade silently
  }
}

export function isStale<T>(entry: CacheEntry<T>): boolean {
  return Date.now() - entry.timestamp > entry.ttl;
}

export function invalidateCache(key: string): void {
  memoryCache.delete(key);
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore storage errors
  }
}

export function clearAllCache(): void {
  memoryCache.clear();
  try {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith("cache:") || key.startsWith("gpw:cache:")) {
        localStorage.removeItem(key);
      }
    });
  } catch {
    // ignore when localStorage is inaccessible
  }
}
