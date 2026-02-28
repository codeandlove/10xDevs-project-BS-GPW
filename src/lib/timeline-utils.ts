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
 * Calculate smart chunk start date based on natural boundaries
 * Week: Always starts on Monday (finds last Monday, then -7 days)
 * Month: Always starts on 1st day of month (finds month start, then -1 month)
 * Quarter: Always starts on 1st day of quarter (finds quarter start, then -3 months)
 *
 * Benefits:
 * - Grid always shows complete weeks (Mon-Sun)
 * - Grid always shows complete months (1st-last day)
 * - Grid always shows complete quarters (Q1-Q4)
 * - Clean visual alignment
 * - Better UX (users see "full periods")
 *
 * @param lastVisibleDate - Last date currently visible in grid (leftmost column)
 * @param range - Time range (week/month/quarter/undefined)
 * @returns Start date for next chunk to load (YYYY-MM-DD)
 *
 * @example
 * // Week example
 * lastVisibleDate: '2026-02-18' (Wednesday)
 * range: 'week'
 * Logic:
 * 1. Find last Monday before 2026-02-18 → 2026-02-16
 * 2. Go back 7 days → 2026-02-09 (Monday)
 * Result: '2026-02-09' (full week Mon-Sun)
 *
 * @example
 * // Month example
 * lastVisibleDate: '2026-02-15'
 * range: 'month'
 * Logic:
 * 1. Find 1st of month → 2026-02-01
 * 2. Go back 1 month → 2026-01-01
 * Result: '2026-01-01' (full month Jan 1-31)
 */
export function calculateSmartChunkStart(lastVisibleDate: string, range: DateRange | undefined): string {
  const date = new Date(lastVisibleDate);

  if (!range || (typeof range === "string" && range.startsWith("custom:"))) {
    // Custom dates: treat as week (find Monday, -7 days)
    range = "week";
  }

  switch (range) {
    case "week": {
      // Find last Monday on or before lastVisibleDate
      const dayOfWeek = date.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
      const daysToMonday = (dayOfWeek + 6) % 7; // Days back to last Monday
      const lastMonday = new Date(date);
      lastMonday.setDate(date.getDate() - daysToMonday);

      // Go back 7 days (previous week's Monday)
      lastMonday.setDate(lastMonday.getDate() - 7);

      return formatDate(lastMonday); // YYYY-MM-DD
    }

    case "month": {
      // Find 1st day of current month
      const firstOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);

      // Go back 1 month (previous month's 1st day)
      firstOfMonth.setMonth(firstOfMonth.getMonth() - 1);

      return formatDate(firstOfMonth);
    }

    case "quarter": {
      // Quarters: Q1 (0-2), Q2 (3-5), Q3 (6-8), Q4 (9-11)
      const currentMonth = date.getMonth();
      const quarterStartMonth = Math.floor(currentMonth / 3) * 3; // 0, 3, 6, or 9

      // Find 1st day of current quarter
      const quarterStart = new Date(date.getFullYear(), quarterStartMonth, 1);

      // Go back 3 months (previous quarter's 1st day)
      quarterStart.setMonth(quarterStart.getMonth() - 3);

      return formatDate(quarterStart);
    }

    default:
      // Fallback: simple -7 days
      date.setDate(date.getDate() - 7);
      return formatDate(date);
  }
}

/**
 * Helper: Format Date to YYYY-MM-DD
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
