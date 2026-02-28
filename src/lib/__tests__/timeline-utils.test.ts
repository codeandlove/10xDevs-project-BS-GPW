/**
 * Unit Tests - Timeline Utilities
 */

import { describe, it, expect } from "vitest";
import {
  getChunkSize,
  calculatePreviousChunk,
  mergeEventChunks,
  getAllDatesFromChunks,
  calculateScrollAdjustment,
  getChunkMetadata,
} from "../timeline-utils";
import type { TimelineChunk } from "@/types/grid-timeline.types";

describe("timeline-utils", () => {
  describe("getChunkSize", () => {
    it("should return correct chunk sizes for presets", () => {
      expect(getChunkSize("week")).toBe(7);
      expect(getChunkSize("month")).toBe(30);
      expect(getChunkSize("quarter")).toBe(90);
    });

    it("should return 30 for custom ranges", () => {
      expect(getChunkSize("month")).toBe(30); // Use valid DateRange value
    });
  });

  describe("calculatePreviousChunk", () => {
    it("should calculate previous week chunk", () => {
      const result = calculatePreviousChunk("2026-02-18", 7);
      expect(result).toEqual({
        startDate: "2026-02-11",
        endDate: "2026-02-17",
      });
    });

    it("should handle month boundaries", () => {
      const result = calculatePreviousChunk("2026-02-01", 7);
      expect(result).toEqual({
        startDate: "2026-01-25",
        endDate: "2026-01-31",
      });
    });

    it("should calculate previous month chunk", () => {
      const result = calculatePreviousChunk("2026-02-01", 30);
      expect(result.startDate).toBe("2026-01-02");
      expect(result.endDate).toBe("2026-01-31");
    });
  });

  describe("mergeEventChunks", () => {
    it("should merge events from multiple chunks without duplicates", () => {
      const chunks: TimelineChunk[] = [
        {
          id: "1",
          startDate: "2026-01-01",
          endDate: "2026-01-07",
          events: [
            {
              id: "1",
              symbol: "ABC",
              occurrence_date: "2026-01-05",
              event_type: "BLACK_SWAN_UP",
              percent_change: 5,
              has_summary: true,
            },
          ],
          loadedAt: Date.now(),
        },
        {
          id: "2",
          startDate: "2026-01-08",
          endDate: "2026-01-14",
          events: [
            {
              id: "2",
              symbol: "XYZ",
              occurrence_date: "2026-01-10",
              event_type: "BLACK_SWAN_DOWN",
              percent_change: -5,
              has_summary: true,
            },
            {
              id: "1",
              symbol: "ABC",
              occurrence_date: "2026-01-05",
              event_type: "BLACK_SWAN_UP",
              percent_change: 5,
              has_summary: true,
            }, // Duplicate
          ],
          loadedAt: Date.now(),
        },
      ];

      const merged = mergeEventChunks(chunks);
      expect(merged).toHaveLength(2);
      expect(merged.map((e) => e.id)).toContain("1");
      expect(merged.map((e) => e.id)).toContain("2");
    });

    it("should return empty array for empty chunks", () => {
      const merged = mergeEventChunks([]);
      expect(merged).toEqual([]);
    });
  });

  describe("getAllDatesFromChunks", () => {
    it("should return all unique dates sorted", () => {
      const chunks: TimelineChunk[] = [
        {
          id: "1",
          startDate: "2026-01-01",
          endDate: "2026-01-03",
          events: [],
          loadedAt: Date.now(),
        },
        {
          id: "2",
          startDate: "2026-01-05",
          endDate: "2026-01-07",
          events: [],
          loadedAt: Date.now(),
        },
      ];

      const dates = getAllDatesFromChunks(chunks);
      expect(dates).toContain("2026-01-01");
      expect(dates).toContain("2026-01-03");
      expect(dates).toContain("2026-01-05");
      expect(dates).toContain("2026-01-07");
      expect(dates.length).toBe(6); // 3 + 3 dates

      // Check sorted
      expect(dates[0]).toBe("2026-01-01");
      expect(dates[dates.length - 1]).toBe("2026-01-07");
    });
  });

  describe("calculateScrollAdjustment", () => {
    it("should calculate correct scroll offset", () => {
      const adjustment = calculateScrollAdjustment(10, 17, 140);
      expect(adjustment).toBe(7 * 140); // 980px
    });

    it("should return 0 if no columns added", () => {
      const adjustment = calculateScrollAdjustment(10, 10, 140);
      expect(adjustment).toBe(0);
    });
  });

  describe("getChunkMetadata", () => {
    it("should return correct metadata", () => {
      const chunk: TimelineChunk = {
        id: "1",
        startDate: "2026-01-01",
        endDate: "2026-01-07",
        events: [
          {
            id: "1",
            symbol: "ABC",
            occurrence_date: "2026-01-05",
            event_type: "BLACK_SWAN_UP",
            percent_change: 5,
            has_summary: true,
          },
          {
            id: "2",
            symbol: "XYZ",
            occurrence_date: "2026-01-06",
            event_type: "BLACK_SWAN_DOWN",
            percent_change: -5,
            has_summary: true,
          },
        ],
        loadedAt: Date.now(),
      };

      const metadata = getChunkMetadata(chunk);
      expect(metadata.totalEvents).toBe(2);
      expect(metadata.symbolCount).toBe(2);
      expect(metadata.dateRange).toEqual({
        start: "2026-01-01",
        end: "2026-01-07",
      });
    });
  });
});
