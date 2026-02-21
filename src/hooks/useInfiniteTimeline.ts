/**
 * useInfiniteTimeline Hook
 * Manages infinite scroll timeline state and chunk loading
 */

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import type { TimelineState, TimelineChunk } from "@/types/grid-timeline.types";
import type { BlackSwanEventMinimal, DateRange } from "@/types/nocodb.types";
import { calculatePreviousChunk, mergeEventChunks, getAllDatesFromChunks, getChunkSize } from "@/lib/timeline-utils";
import { fetchGridData } from "@/lib/api-service";

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
   */
  const loadPreviousChunk = useCallback(async () => {
    if (timelineState.isLoadingBackward) {
      return;
    }

    setTimelineState((prev) => ({ ...prev, isLoadingBackward: true, error: null }));

    try {
      const chunkSize = getChunkSize(range);
      const { startDate, endDate } = calculatePreviousChunk(timelineState.oldestLoadedDate, chunkSize);

      if (!startDate || !endDate || !startDate.match(/^\d{4}-\d{2}-\d{2}$/) || !endDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        throw new Error(`Invalid date format: startDate=${startDate}, endDate=${endDate}`);
      }

      const response = await fetchGridData(startDate, endDate, symbols);

      const newChunk: TimelineChunk = {
        id: `${startDate}_${endDate}`,
        startDate,
        endDate,
        events: response.events,
        loadedAt: Date.now(),
      };

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
   * Critical for week view (7 days) which doesn't generate scrollbar initially
   */
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

  /**
   * Reset timeline (e.g., when date range picker changes)
   */
  const resetTimeline = useCallback((newStartDate: string, newEndDate: string, newEvents: BlackSwanEventMinimal[]) => {
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
  }, []);

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
