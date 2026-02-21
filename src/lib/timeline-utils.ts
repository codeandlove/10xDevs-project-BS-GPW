/**
 * Timeline Utilities
 * Helper functions for infinite scroll timeline
 */

import type { TimelineChunk, ChunkMetadata } from "@/types/grid-timeline.types";
import type { BlackSwanEventMinimal, DateRange } from "@/types/nocodb.types";

/**
 * Calculate chunk size in days based on range
 */
export function getChunkSize(range: DateRange): number {
  if (typeof range === "string" && range.startsWith("custom:")) {
    // Custom range - return 30 as default chunk
    return 30;
  }

  switch (range) {
    case "week":
      return 7;
    case "month":
      return 30;
    case "quarter":
      return 90;
    default:
      return 30;
  }
}

/**
 * Calculate previous chunk date range
 * @param oldestDate - Current oldest date in timeline
 * @param chunkSize - Size of chunk in days
 * @returns { startDate, endDate } for the previous chunk
 */
export function calculatePreviousChunk(oldestDate: string, chunkSize: number): { startDate: string; endDate: string } {
  const oldest = new Date(oldestDate);

  // endDate = oldestDate - 1 day
  const endDate = new Date(oldest);
  endDate.setDate(endDate.getDate() - 1);

  // startDate = endDate - chunkSize days + 1
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - chunkSize + 1);

  return {
    startDate: startDate.toISOString().split("T")[0],
    endDate: endDate.toISOString().split("T")[0],
  };
}

/**
 * Merge events from multiple chunks, removing duplicates
 */
export function mergeEventChunks(chunks: TimelineChunk[]): BlackSwanEventMinimal[] {
  const eventMap = new Map<string, BlackSwanEventMinimal>();

  chunks.forEach((chunk) => {
    chunk.events.forEach((event) => {
      const key = `${event.symbol}-${event.occurrence_date}`;
      if (!eventMap.has(key)) {
        eventMap.set(key, event);
      }
    });
  });

  return Array.from(eventMap.values());
}

/**
 * Get all unique dates from chunks, sorted oldest to newest
 */
export function getAllDatesFromChunks(chunks: TimelineChunk[]): string[] {
  const dateSet = new Set<string>();

  chunks.forEach((chunk) => {
    const chunkStart = new Date(chunk.startDate);
    const chunkEnd = new Date(chunk.endDate);

    for (let d = new Date(chunkStart); d <= chunkEnd; d.setDate(d.getDate() + 1)) {
      dateSet.add(d.toISOString().split("T")[0]);
    }
  });

  return Array.from(dateSet).sort();
}

/**
 * Calculate scroll threshold for triggering infinite scroll (60% from left edge)
 * Higher threshold = triggers sooner (less scrolling needed to the left)
 * User scrolls less to load historical data
 */
export function getScrollThreshold(scrollWidth: number): number {
  return scrollWidth * 0.6;
}

/**
 * Calculate scroll reset threshold (75% from left edge)
 * Creates hysteresis zone (60%-75%) to prevent rapid re-triggering
 * User must scroll past 75% to allow next trigger
 */
export function getScrollResetThreshold(scrollWidth: number): number {
  return scrollWidth * 0.75;
}

/**
 * Calculate scroll offset adjustment to prevent visual jump
 * When prepending columns, we need to adjust scrollLeft to keep same visual position
 */
export function calculateScrollAdjustment(
  previousColumnCount: number,
  newColumnCount: number,
  columnWidth: number
): number {
  const addedColumns = newColumnCount - previousColumnCount;
  return addedColumns * columnWidth;
}

/**
 * Get chunk metadata
 */
export function getChunkMetadata(chunk: TimelineChunk): ChunkMetadata {
  const symbolSet = new Set(chunk.events.map((e) => e.symbol));

  return {
    totalEvents: chunk.events.length,
    dateRange: { start: chunk.startDate, end: chunk.endDate },
    symbolCount: symbolSet.size,
  };
}
