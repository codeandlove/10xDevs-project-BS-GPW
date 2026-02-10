/**
 * Unit tests for minimap utility functions
 */

import { describe, it, expect } from "vitest";
import {
  calculateMinimapDimensions,
  calculateViewportRect,
  normalizePosition,
  denormalizePosition,
  getEventColor,
  prepareMinimapEvents,
} from "../minimap-utils";
import type { BlackSwanEventMinimal, EventType } from "@/types/nocodb.types";
import { getEventTypePixelColor } from "@/config/event-type-colors";

describe("calculateMinimapDimensions", () => {
  it("should calculate dimensions for small grid", () => {
    const dims = calculateMinimapDimensions(10, 7);

    expect(dims.width).toBeGreaterThan(0);
    expect(dims.height).toBeGreaterThan(0);
    expect(dims.cellWidth).toBeGreaterThanOrEqual(2); // MIN_CELL_SIZE
    expect(dims.cellHeight).toBeGreaterThanOrEqual(2); // MIN_CELL_SIZE
  });

  it("should scale down large grid to max bounds", () => {
    const dims = calculateMinimapDimensions(50, 90);

    expect(dims.width).toBeLessThanOrEqual(280); // MAX_WIDTH
    expect(dims.width).toBeGreaterThan(0);
    // Height can exceed MAX_HEIGHT for vertical scroll
  });

  it("should preserve aspect ratio", () => {
    const dims = calculateMinimapDimensions(20, 40);
    const aspectRatio = dims.width / dims.height;
    const gridAspectRatio = 40 / 20;

    // Aspect ratios should be approximately equal (within 10% tolerance)
    expect(Math.abs(aspectRatio - gridAspectRatio) / gridAspectRatio).toBeLessThan(0.1);
  });

  it("should enforce minimum cell size for reasonably sized grids", () => {
    // Test with a grid size where MIN_CELL_SIZE can be maintained
    // For MAX_WIDTH=280px and MIN_CELL_SIZE=2px, max columns = 140
    const dims = calculateMinimapDimensions(50, 100);

    expect(dims.cellWidth).toBeGreaterThanOrEqual(2);
    expect(dims.cellHeight).toBeGreaterThanOrEqual(2);
  });

  it("should return zero dimensions for invalid input", () => {
    const dims = calculateMinimapDimensions(0, 0);

    expect(dims.width).toBe(0);
    expect(dims.height).toBe(0);
    expect(dims.cellWidth).toBe(0);
    expect(dims.cellHeight).toBe(0);
  });
});

describe("calculateViewportRect", () => {
  it("should calculate viewport at top-left", () => {
    const viewport = calculateViewportRect(0, 0, 800, 600, 2000, 1500);

    expect(viewport.x).toBe(0);
    expect(viewport.y).toBe(0);
    expect(viewport.width).toBeGreaterThan(0);
    expect(viewport.height).toBeGreaterThan(0);
  });

  it("should calculate viewport in middle", () => {
    const viewport = calculateViewportRect(500, 300, 800, 600, 2000, 1500);

    expect(viewport.x).toBeGreaterThan(0);
    expect(viewport.x).toBeLessThan(1);
    expect(viewport.y).toBeGreaterThan(0);
    expect(viewport.y).toBeLessThan(1);
  });

  it("should clamp viewport to valid range", () => {
    const viewport = calculateViewportRect(2000, 1500, 800, 600, 2000, 1500);

    expect(viewport.x).toBeLessThanOrEqual(1 - viewport.width);
    expect(viewport.y).toBeLessThanOrEqual(1 - viewport.height);
  });

  it("should normalize viewport size", () => {
    const viewport = calculateViewportRect(100, 100, 400, 300, 1000, 600);

    expect(viewport.width).toBeLessThanOrEqual(1);
    expect(viewport.height).toBeLessThanOrEqual(1);
    expect(viewport.width).toBeGreaterThan(0);
    expect(viewport.height).toBeGreaterThan(0);
  });

  it("should return default viewport for invalid scroll dimensions", () => {
    const viewport = calculateViewportRect(0, 0, 800, 600, 0, 0);

    expect(viewport.x).toBe(0);
    expect(viewport.y).toBe(0);
    expect(viewport.width).toBe(1);
    expect(viewport.height).toBe(1);
  });
});

describe("normalizePosition", () => {
  const dimensions = { width: 300, height: 200, cellWidth: 3, cellHeight: 4 };

  it("should normalize middle point", () => {
    const normalized = normalizePosition(150, 100, dimensions);

    expect(normalized.x).toBeCloseTo(0.5);
    expect(normalized.y).toBeCloseTo(0.5);
  });

  it("should normalize top-left corner", () => {
    const normalized = normalizePosition(0, 0, dimensions);

    expect(normalized.x).toBe(0);
    expect(normalized.y).toBe(0);
  });

  it("should normalize bottom-right corner", () => {
    const normalized = normalizePosition(300, 200, dimensions);

    expect(normalized.x).toBe(1);
    expect(normalized.y).toBe(1);
  });

  it("should clamp values outside bounds", () => {
    const normalized = normalizePosition(400, 300, dimensions);

    expect(normalized.x).toBe(1);
    expect(normalized.y).toBe(1);
  });

  it("should return zero for zero dimensions", () => {
    const zeroDims = { width: 0, height: 0, cellWidth: 0, cellHeight: 0 };
    const normalized = normalizePosition(100, 100, zeroDims);

    expect(normalized.x).toBe(0);
    expect(normalized.y).toBe(0);
  });
});

describe("denormalizePosition", () => {
  const dimensions = { width: 300, height: 200, cellWidth: 3, cellHeight: 4 };

  it("should denormalize middle point", () => {
    const pixels = denormalizePosition(0.5, 0.5, dimensions);

    expect(pixels.x).toBe(150);
    expect(pixels.y).toBe(100);
  });

  it("should denormalize top-left corner", () => {
    const pixels = denormalizePosition(0, 0, dimensions);

    expect(pixels.x).toBe(0);
    expect(pixels.y).toBe(0);
  });

  it("should denormalize bottom-right corner", () => {
    const pixels = denormalizePosition(1, 1, dimensions);

    expect(pixels.x).toBe(300);
    expect(pixels.y).toBe(200);
  });

  it("should perform round-trip conversion", () => {
    const original = { x: 150, y: 100 };
    const normalized = normalizePosition(original.x, original.y, dimensions);
    const denormalized = denormalizePosition(normalized.x, normalized.y, dimensions);

    expect(denormalized.x).toBeCloseTo(original.x);
    expect(denormalized.y).toBeCloseTo(original.y);
  });
});

describe("getEventColor", () => {
  it("should return green for BLACK_SWAN_UP", () => {
    const color = getEventColor("BLACK_SWAN_UP");
    expect(color).toBe("#22c55e");
  });

  it("should return red for BLACK_SWAN_DOWN", () => {
    const color = getEventColor("BLACK_SWAN_DOWN");
    expect(color).toBe("#ef4444");
  });

  it("should return orange for VOLATILITY_UP", () => {
    const color = getEventColor("VOLATILITY_UP");
    expect(color).toBe("#f97316");
  });

  it("should return yellow for VOLATILITY_DOWN", () => {
    const color = getEventColor("VOLATILITY_DOWN");
    expect(color).toBe("#eab308");
  });

  it("should return blue for BIG_MOVE", () => {
    const color = getEventColor("BIG_MOVE");
    expect(color).toBe("#3b82f6");
  });

  it("should return same values as getEventTypePixelColor", () => {
    const eventTypes: EventType[] = [
      "BLACK_SWAN_UP",
      "BLACK_SWAN_DOWN",
      "VOLATILITY_UP",
      "VOLATILITY_DOWN",
      "BIG_MOVE",
    ];

    eventTypes.forEach((type) => {
      expect(getEventColor(type)).toBe(getEventTypePixelColor(type));
    });
  });

  it("should return fallback hex for unknown event type", () => {
    expect(getEventColor("UNKNOWN" as EventType)).toBe("#6b7280");
  });
});

describe("prepareMinimapEvents", () => {
  const symbols = ["AAPL", "TSLA", "MSFT"];
  const dates = ["2024-01-15", "2024-01-16", "2024-01-17"];

  it("should map valid events to minimap events", () => {
    const events: BlackSwanEventMinimal[] = [
      {
        id: "1",
        symbol: "AAPL",
        occurrence_date: "2024-01-15",
        event_type: "BLACK_SWAN_UP",
        percent_change: 5.5,
        has_summary: true,
      },
      {
        id: "2",
        symbol: "TSLA",
        occurrence_date: "2024-01-16",
        event_type: "BLACK_SWAN_DOWN",
        percent_change: -6.2,
        has_summary: true,
      },
    ];

    const minimapEvents = prepareMinimapEvents(events, symbols, dates);

    expect(minimapEvents).toHaveLength(2);
    expect(minimapEvents[0]).toEqual({
      symbolIndex: 0,
      dateIndex: 0,
      eventType: "BLACK_SWAN_UP",
    });
    expect(minimapEvents[1]).toEqual({
      symbolIndex: 1,
      dateIndex: 1,
      eventType: "BLACK_SWAN_DOWN",
    });
  });

  it("should filter out events with invalid symbol", () => {
    const events: BlackSwanEventMinimal[] = [
      {
        id: "1",
        symbol: "AAPL",
        occurrence_date: "2024-01-15",
        event_type: "BLACK_SWAN_UP",
        percent_change: 5.5,
        has_summary: true,
      },
      {
        id: "2",
        symbol: "INVALID",
        occurrence_date: "2024-01-16",
        event_type: "BLACK_SWAN_DOWN",
        percent_change: -6.2,
        has_summary: false,
      },
    ];

    const minimapEvents = prepareMinimapEvents(events, symbols, dates);

    expect(minimapEvents).toHaveLength(1);
    expect(minimapEvents[0].symbolIndex).toBe(0);
  });

  it("should filter out events with invalid date", () => {
    const events: BlackSwanEventMinimal[] = [
      {
        id: "1",
        symbol: "AAPL",
        occurrence_date: "2024-01-15",
        event_type: "BLACK_SWAN_UP",
        percent_change: 5.5,
        has_summary: true,
      },
      {
        id: "2",
        symbol: "TSLA",
        occurrence_date: "2024-12-31",
        event_type: "BLACK_SWAN_DOWN",
        percent_change: -6.2,
        has_summary: true,
      },
    ];

    const minimapEvents = prepareMinimapEvents(events, symbols, dates);

    expect(minimapEvents).toHaveLength(1);
    expect(minimapEvents[0].dateIndex).toBe(0);
  });

  it("should return empty array for empty events", () => {
    const minimapEvents = prepareMinimapEvents([], symbols, dates);

    expect(minimapEvents).toHaveLength(0);
  });

  it("should handle multiple events on same cell (last wins)", () => {
    const events: BlackSwanEventMinimal[] = [
      {
        id: "1",
        symbol: "AAPL",
        occurrence_date: "2024-01-15",
        event_type: "BLACK_SWAN_UP",
        percent_change: 5.5,
        has_summary: true,
      },
      {
        id: "2",
        symbol: "AAPL",
        occurrence_date: "2024-01-15",
        event_type: "BLACK_SWAN_DOWN",
        percent_change: -3.2,
        has_summary: false,
      },
    ];

    const minimapEvents = prepareMinimapEvents(events, symbols, dates);

    // Both events should be in result (minimap shows all events, GridCell shows most significant)
    expect(minimapEvents).toHaveLength(2);
  });
});
