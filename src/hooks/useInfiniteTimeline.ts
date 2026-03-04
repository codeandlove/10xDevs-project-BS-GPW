/**
 * useInfiniteTimeline Hook
 * Manages infinite scroll timeline state and chunk loading
 */

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import type { TimelineState, TimelineChunk } from "@/types/grid-timeline.types";
import type { BlackSwanEventMinimal, DateRange } from "@/types/nocodb.types";
import { calculateSmartChunkStart, mergeEventChunks, getAllDatesFromChunks } from "@/lib/timeline-utils";
import { fetchGridData } from "@/lib/api-service";
import { getFromCache, setInCache, isStale } from "@/lib/cache-utils";
import { hashSymbols } from "@/lib/cache";

// TTL for timeline chunks: 30 minutes (data rarely changes)
const TIMELINE_CHUNK_TTL = 30 * 60 * 1000;

/**
 * Generate cache key for timeline chunk
 */
function getChunkCacheKey(range: DateRange, symbols: string[], startDate: string, endDate: string): string {
  const symbolsHash = hashSymbols(symbols);
  return `timeline_chunk_${range}_${symbolsHash}_${startDate}_${endDate}`;
}

interface UseInfiniteTimelineProps {
  range: DateRange;
  symbols: string[];
  initialStartDate: string;
  initialEndDate: string;
  initialEvents: BlackSwanEventMinimal[];
}

interface UseInfiniteTimelineReturn {
  timelineState: TimelineState;
  loadPreviousChunk: () => Promise<void>;
  resetTimeline: (newStartDate: string, newEndDate: string, newEvents: BlackSwanEventMinimal[]) => void;
  allEvents: BlackSwanEventMinimal[];
  allDates: string[];
}

export function useInfiniteTimeline({
  range,
  symbols,
  initialStartDate,
  initialEndDate,
  initialEvents,
}: UseInfiniteTimelineProps): UseInfiniteTimelineReturn {
  const [timelineState, setTimelineState] = useState<TimelineState>(() => ({
    chunks: [
      {
        id: `${initialStartDate}_${initialEndDate}`,
        startDate: initialStartDate,
        endDate: initialEndDate,
        events: initialEvents,
        loadedAt: Date.now(),
      },
    ],
    oldestLoadedDate: initialStartDate,
    newestLoadedDate: initialEndDate,
    isLoadingBackward: false,
    isLoadingForward: false,
    error: null,
    isInitialized: false,
  }));

  // Track if initial preload happened
  const hasPreloadedRef = useRef(false);

  /**
   * Load previous chunk (backward in time)
   * Ensures skeleton is visible for minimum 200ms for better UX
   * Uses smart date boundaries (Mon-Sun, 1st-last, Q1-Q4)
   */
  const loadPreviousChunk = useCallback(async () => {
    if (timelineState.isLoadingBackward) {
      return;
    }

    setTimelineState((prev) => ({ ...prev, isLoadingBackward: true, error: null }));

    try {
      // ✨ Calculate smart chunk start (Mon-Sun, 1st-last, Q1-Q4)
      const startDate = calculateSmartChunkStart(timelineState.oldestLoadedDate, range);

      // End date = oldestLoadedDate - 1 day
      const oldestDate = new Date(timelineState.oldestLoadedDate);
      oldestDate.setDate(oldestDate.getDate() - 1);
      const endDate = oldestDate.toISOString().split("T")[0];

      if (!startDate || !endDate || !startDate.match(/^\d{4}-\d{2}-\d{2}$/) || !endDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        throw new Error(`Invalid date format: startDate=${startDate}, endDate=${endDate}`);
      }

      // Generate cache key for this chunk
      const cacheKey = getChunkCacheKey(range, symbols, startDate, endDate);

      // Check cache first
      const cachedEntry = getFromCache<BlackSwanEventMinimal[]>(cacheKey);
      let events: BlackSwanEventMinimal[];

      if (cachedEntry && !isStale(cachedEntry)) {
        // Use cached events
        events = cachedEntry.data;
      } else {
        // Fetch from API
        const response = await fetchGridData(startDate, endDate, symbols);
        events = response.events;

        // Save to cache
        setInCache(cacheKey, events, TIMELINE_CHUNK_TTL);
      }

      const newChunk: TimelineChunk = {
        id: `${startDate}_${endDate}`,
        startDate,
        endDate,
        events,
        loadedAt: Date.now(),
      };

      // NO artificial delay - if cache is fast, user sees data immediately
      // Skeleton is only shown when actually waiting for API fetch

      setTimelineState((prev) => ({
        ...prev,
        chunks: [newChunk, ...prev.chunks],
        oldestLoadedDate: startDate,
        isLoadingBackward: false,
      }));
    } catch (err) {
      setTimelineState((prev) => ({
        ...prev,
        isLoadingBackward: false,
        error: err instanceof Error ? err : new Error("Failed to load data"),
      }));
    }
  }, [range, symbols, timelineState.oldestLoadedDate, timelineState.isLoadingBackward]);

  /**
   * Auto-preload 2 chunks on mount to ensure scrollbar exists
   * ENABLED: Critical for week view (7 days) and month view (30 days)
   * Ensures user can scroll left to trigger infinite scroll sentinel
   * Loads: initial chunk + 2 previous chunks = 3 chunks total
   */
  useEffect(() => {
    // Only run once, only after timeline is initialized by resetTimeline
    // (avoids premature preload before gridResponse arrives)
    if (
      hasPreloadedRef.current ||
      timelineState.isLoadingBackward ||
      timelineState.chunks.length > 1 ||
      !timelineState.isInitialized
    ) {
      return;
    }

    hasPreloadedRef.current = true;

    // Load first chunk after 50ms (let grid render first)
    const timer1 = setTimeout(() => {
      loadPreviousChunk().then(() => {
        // Load second chunk after first completes
        setTimeout(() => {
          loadPreviousChunk();
        }, 100);
      });
    }, 50);

    return () => clearTimeout(timer1);
  }, [loadPreviousChunk, timelineState.isLoadingBackward, timelineState.chunks.length, timelineState.isInitialized]);

  /**
   * Reset timeline (e.g., when date range picker changes)
   */
  const resetTimeline = useCallback(
    (newStartDate: string, newEndDate: string, newEvents: BlackSwanEventMinimal[]) => {
      // Cache the initial chunk
      const cacheKey = getChunkCacheKey(range, symbols, newStartDate, newEndDate);
      setInCache(cacheKey, newEvents, TIMELINE_CHUNK_TTL);

      setTimelineState({
        chunks: [
          {
            id: `${newStartDate}_${newEndDate}`,
            startDate: newStartDate,
            endDate: newEndDate,
            events: newEvents,
            loadedAt: Date.now(),
          },
        ],
        oldestLoadedDate: newStartDate,
        newestLoadedDate: newEndDate,
        isLoadingBackward: false,
        isLoadingForward: false,
        error: null,
        isInitialized: true,
      });
      hasPreloadedRef.current = false; // Reset preload flag
    },
    [range, symbols]
  );

  /**
   * Memoized merged events
   */
  const allEvents = useMemo(() => {
    return mergeEventChunks(timelineState.chunks);
  }, [timelineState.chunks]);

  /**
   * Memoized all dates
   */
  const allDates = useMemo(() => {
    return getAllDatesFromChunks(timelineState.chunks);
  }, [timelineState.chunks]);

  return {
    timelineState,
    loadPreviousChunk,
    resetTimeline,
    allEvents,
    allDates,
  };
}
