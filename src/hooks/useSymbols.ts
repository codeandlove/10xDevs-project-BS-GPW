/**
 * useSymbols Hook
 * Custom hook for fetching and caching GPW symbols with search functionality
 */

import { useMemo } from "react";
import { useClientCache } from "./useClientCache";
import { fetchSymbols } from "@/lib/api-service";
import type { GPWSymbol, SymbolsResponse, DateRange } from "@/types/nocodb.types";

/**
 * Cache configuration for symbols
 * Symbols change rarely, so we cache for 24h
 * When range provided, cache for 5min (event counts are dynamic)
 */
const SYMBOLS_CACHE_KEY_BASE = "gpw:cache:v1:symbols";
const SYMBOLS_TTL = 24 * 60 * 60 * 1000; // 24 hours
const SYMBOLS_WITH_COUNTS_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Custom hook for GPW symbols with caching
 * Returns symbols data, loading state, error, and search function
 * @param range - Optional date range to include event counts per symbol
 */
export function useSymbols(range?: DateRange) {
  const cacheKey = range ? `${SYMBOLS_CACHE_KEY_BASE}:${range}` : SYMBOLS_CACHE_KEY_BASE;
  const ttl = range ? SYMBOLS_WITH_COUNTS_TTL : SYMBOLS_TTL;

  const fetcher = useMemo(() => () => fetchSymbols(range), [range]);

  const { data, isLoading, error, isRevalidating } = useClientCache<SymbolsResponse>(cacheKey, fetcher, {
    ttl,
    staleWhileRevalidate: true,
    retry: 3,
  });

  const symbols = useMemo(() => data?.symbols || [], [data?.symbols]);

  return {
    symbols,
    totalCount: data?.total_count || 0,
    cachedAt: data?.cached_at,
    isLoading,
    isRevalidating,
    error,
  };
}

/**
 * Search and filter symbols by query
 * Prioritizes: exact match symbol > exact match label > partial matches (alphabetical)
 *
 * @param query - Search query string
 * @param symbols - Array of GPW symbols to search
 * @returns Filtered and sorted array of symbols
 */
export function searchSymbols(query: string, symbols: GPWSymbol[]): GPWSymbol[] {
  if (!query || query.trim() === "") {
    return symbols;
  }

  const lowerQuery = query.toLowerCase().trim();

  // Filter symbols that match query in symbol, label, or name
  const matches = symbols.filter(
    (s) =>
      s.symbol.toLowerCase().includes(lowerQuery) ||
      s.label.toLowerCase().includes(lowerQuery) ||
      s.name.toLowerCase().includes(lowerQuery)
  );

  // Sort by priority:
  // 1. Exact match on symbol (highest priority)
  // 2. Exact match on label
  // 3. Starts with query (symbol or label)
  // 4. Contains query (alphabetical)
  return matches.sort((a, b) => {
    const aSymbolLower = a.symbol.toLowerCase();
    const bSymbolLower = b.symbol.toLowerCase();
    const aLabelLower = a.label.toLowerCase();
    const bLabelLower = b.label.toLowerCase();

    // Priority 1: Exact match on symbol
    const aExactSymbol = aSymbolLower === lowerQuery;
    const bExactSymbol = bSymbolLower === lowerQuery;
    if (aExactSymbol && !bExactSymbol) return -1;
    if (!aExactSymbol && bExactSymbol) return 1;

    // Priority 2: Exact match on label
    const aExactLabel = aLabelLower === lowerQuery;
    const bExactLabel = bLabelLower === lowerQuery;
    if (aExactLabel && !bExactLabel) return -1;
    if (!aExactLabel && bExactLabel) return 1;

    // Priority 3: Starts with query on symbol
    const aStartsSymbol = aSymbolLower.startsWith(lowerQuery);
    const bStartsSymbol = bSymbolLower.startsWith(lowerQuery);
    if (aStartsSymbol && !bStartsSymbol) return -1;
    if (!aStartsSymbol && bStartsSymbol) return 1;

    // Priority 4: Starts with query on label
    const aStartsLabel = aLabelLower.startsWith(lowerQuery);
    const bStartsLabel = bLabelLower.startsWith(lowerQuery);
    if (aStartsLabel && !bStartsLabel) return -1;
    if (!aStartsLabel && bStartsLabel) return 1;

    // Default: Alphabetical by symbol
    return a.symbol.localeCompare(b.symbol);
  });
}
