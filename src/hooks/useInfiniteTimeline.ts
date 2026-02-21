/**
 * useInfiniteTimeline Hook
 * Manages infinite scroll timeline state and chunk loading
 */

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import type { TimelineState, TimelineChunk } from "@/types/grid-timeline.types";
import type { BlackSwanEventMinimal, DateRange } from "@/types/nocodb.types";
import { calculatePreviousChunk, mergeEventChunks, getAllDatesFromChunks, getChunkSize } from "@/lib/timeline-utils";
import { fetchGridData } from "@/lib/api-service";
import { getFromCache, setInCache, isStale } from "@/lib/cache-utils";
import { hashSymbols } from "@/lib/cache";

// TTL for timeline chunks: 30 minutes (data rarely changes)
const TIMELINE_CHUNK_TTL = 30 * 60 * 1000;

// Minimum skeleton display time to ensure user sees loading feedback (200ms)
const MIN_SKELETON_DISPLAY_TIME = 200;

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
  }));

  // Track if initial preload happened
  const hasPreloadedRef = useRef(false);

  /**
   * Load previous chunk (backward in time)
   * Ensures skeleton is visible for minimum 200ms for better UX
   */
  const loadPreviousChunk = useCallback(async () => {
    if (timelineState.isLoadingBackward) {
      return;
    }

    const startTime = Date.now();
    setTimelineState((prev) => ({ ...prev, isLoadingBackward: true, error: null }));

    try {
      const chunkSize = getChunkSize(range);
      const { startDate, endDate } = calculatePreviousChunk(timelineState.oldestLoadedDate, chunkSize);

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
        console.log(`[useInfiniteTimeline] Using cached chunk: ${startDate} to ${endDate}`);
        events = cachedEntry.data;
      } else {
        // Fetch from API
        console.log(`[useInfiniteTimeline] Fetching chunk from API: ${startDate} to ${endDate}`);
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

      console.log(`[useInfiniteTimeline] Loaded ${events.length} events`);

      // Ensure skeleton is visible for minimum display time (better UX)
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, MIN_SKELETON_DISPLAY_TIME - elapsedTime);

      if (remainingTime > 0) {
        console.log(`[useInfiniteTimeline] ⏱️ Delaying ${remainingTime}ms to show skeleton (cache was too fast)`);
        await new Promise((resolve) => setTimeout(resolve, remainingTime));
      }

      setTimelineState((prev) => ({
        ...prev,
        chunks: [newChunk, ...prev.chunks],
        oldestLoadedDate: startDate,
        isLoadingBackward: false,
      }));
    } catch (error) {
      console.error("[useInfiniteTimeline] Failed to load chunk:", error);
      setTimelineState((prev) => ({
        ...prev,
        isLoadingBackward: false,
        error: error as Error,
      }));
    }
  }, [range, symbols, timelineState.oldestLoadedDate, timelineState.isLoadingBackward]);

  /**
   * Auto-preload first chunk on mount to ensure scrollbar exists
   * DISABLED: With ref callback instant scroll, grid shows only initial week
   * User scrolls left manually to trigger loadPreviousChunk
   * Critical for week view (7 days) which doesn't generate scrollbar initially
   */
  /*
  useEffect(() => {
    // Only run once, only if we have initial events loaded, and not already preloading
    if (
      hasPreloadedRef.current ||
      timelineState.isLoadingBackward ||
      timelineState.chunks.length > 1 ||
      initialEvents.length === 0
    ) {
      return;
    }

    hasPreloadedRef.current = true;

    const timer = setTimeout(() => {
      loadPreviousChunk();
    }, 50);

    return () => clearTimeout(timer);
  }, [loadPreviousChunk, timelineState.isLoadingBackward, timelineState.chunks.length, initialEvents.length]);
  */

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
