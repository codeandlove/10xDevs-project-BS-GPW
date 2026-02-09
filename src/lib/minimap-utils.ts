/**
 * Utility functions for Grid Minimap Navigation
 *
 * Pure functions for geometric calculations, coordinate transformations,
 * and event data preparation for minimap rendering.
 */

import type { BlackSwanEventMinimal, EventType } from "@/types/nocodb.types";
import type { MinimapDimensions, MinimapViewport, MinimapEvent } from "@/types/minimap.types";

/** Maximum minimap width in pixels (280px fits within container with safe margin) */
const MAX_WIDTH = 280;
/** Minimum cell size to ensure clickable targets */
const MIN_CELL_SIZE = 2;

/**
 * Calculate physical dimensions for minimap canvas
 * Scales grid proportionally to fit within max bounds while maintaining aspect ratio
 * Ensures minimum cell size for usability
 *
 * @param totalSymbols - Number of symbols (rows) in grid
 * @param totalDates - Number of dates (columns) in grid
 * @returns Physical dimensions in pixels
 *
 * @example
 * // Small grid: 10 symbols × 7 dates
 * const dims = calculateMinimapDimensions(10, 7);
 * // Returns: { width: ~140, height: 100, cellWidth: 14, cellHeight: 14.28 }
 *
 * @example
 * // Large grid: 50 symbols × 90 dates (quarter view)
 * const dims = calculateMinimapDimensions(50, 90);
 * // Returns: { width: 300, height: 166.67, cellWidth: 3.33, cellHeight: 3.33 }
 */
export function calculateMinimapDimensions(totalSymbols: number, totalDates: number): MinimapDimensions {
  if (totalSymbols <= 0 || totalDates <= 0) {
    return { width: 0, height: 0, cellWidth: 0, cellHeight: 0 };
  }

  // Start with full MAX_WIDTH to fill container
  let cellWidth = MAX_WIDTH / totalDates;

  // Enforce minimum cell size for usability
  if (cellWidth < MIN_CELL_SIZE) {
    cellWidth = MIN_CELL_SIZE;
  }

  // Calculate actual width based on cell dimensions
  let width = cellWidth * totalDates;

  // If width exceeds MAX_WIDTH, scale down to fit
  if (width > MAX_WIDTH) {
    // Scale down proportionally to fit within MAX_WIDTH
    const scale = MAX_WIDTH / width;
    cellWidth = cellWidth * scale;
    width = MAX_WIDTH;
  }

  // Calculate height based on cellWidth (try to keep cells square)
  let cellHeight = cellWidth;
  let height = cellHeight * totalSymbols;

  // Enforce minimum cell height
  if (cellHeight < MIN_CELL_SIZE) {
    cellHeight = MIN_CELL_SIZE;
    height = cellHeight * totalSymbols;
    // Cells become rectangular (wider than tall or taller than wide)
  }

  return {
    width: Math.round(width),
    height: Math.round(height),
    cellWidth,
    cellHeight,
  };
}

/**
 * Calculate viewport rectangle position and size in normalized coordinates
 * Represents the currently visible portion of the grid
 *
 * @param scrollLeft - Current horizontal scroll position in pixels
 * @param scrollTop - Current vertical scroll position in pixels
 * @param containerWidth - Visible width of scroll container
 * @param containerHeight - Visible height of scroll container
 * @param totalScrollWidth - Total scrollable width
 * @param totalScrollHeight - Total scrollable height
 * @returns Normalized viewport rectangle (0-1 coordinates)
 *
 * @example
 * // Scrolled to middle of large grid
 * const viewport = calculateViewportRect(500, 300, 800, 600, 2000, 1500);
 * // Returns: { x: 0.25, y: 0.2, width: 0.4, height: 0.4 }
 */
export function calculateViewportRect(
  scrollLeft: number,
  scrollTop: number,
  containerWidth: number,
  containerHeight: number,
  totalScrollWidth: number,
  totalScrollHeight: number
): MinimapViewport {
  // Handle edge cases
  if (totalScrollWidth <= 0 || totalScrollHeight <= 0) {
    return { x: 0, y: 0, width: 1, height: 1 };
  }

  // Normalize viewport size (visible area relative to total content)
  const width = Math.max(0, Math.min(1, containerWidth / totalScrollWidth));
  const height = Math.max(0, Math.min(1, containerHeight / totalScrollHeight));

  // Normalize scroll position (relative to total content)
  const x = Math.max(0, Math.min(1 - width, scrollLeft / totalScrollWidth));
  const y = Math.max(0, Math.min(1 - height, scrollTop / totalScrollHeight));

  return {
    x,
    y,
    width,
    height,
  };
}

/**
 * Convert pixel coordinates to normalized coordinates (0-1)
 *
 * @param pixelX - X coordinate in pixels
 * @param pixelY - Y coordinate in pixels
 * @param dimensions - Minimap physical dimensions
 * @returns Normalized coordinates
 *
 * @example
 * const dims = { width: 300, height: 200, cellWidth: 3, cellHeight: 4 };
 * const normalized = normalizePosition(150, 100, dims);
 * // Returns: { x: 0.5, y: 0.5 }
 */
export function normalizePosition(
  pixelX: number,
  pixelY: number,
  dimensions: MinimapDimensions
): { x: number; y: number } {
  if (dimensions.width <= 0 || dimensions.height <= 0) {
    return { x: 0, y: 0 };
  }

  const x = Math.max(0, Math.min(1, pixelX / dimensions.width));
  const y = Math.max(0, Math.min(1, pixelY / dimensions.height));

  return { x, y };
}

/**
 * Convert normalized coordinates (0-1) to pixel coordinates
 *
 * @param normalizedX - Normalized X coordinate (0-1)
 * @param normalizedY - Normalized Y coordinate (0-1)
 * @param dimensions - Minimap physical dimensions
 * @returns Pixel coordinates
 *
 * @example
 * const dims = { width: 300, height: 200, cellWidth: 3, cellHeight: 4 };
 * const pixels = denormalizePosition(0.5, 0.5, dims);
 * // Returns: { x: 150, y: 100 }
 */
export function denormalizePosition(
  normalizedX: number,
  normalizedY: number,
  dimensions: MinimapDimensions
): { x: number; y: number } {
  const x = normalizedX * dimensions.width;
  const y = normalizedY * dimensions.height;

  return { x, y };
}

/**
 * Get color hex code for event type
 * Colors match GridCell component styling for consistency
 *
 * @param eventType - Type of black swan event
 * @returns Hex color code
 *
 * @example
 * getEventColor("BLACK_SWAN_UP");    // Returns: "#22c55e" (green-500)
 * getEventColor("BLACK_SWAN_DOWN");  // Returns: "#ef4444" (red-500)
 */
export function getEventColor(eventType: EventType): string {
  const colorMap: Record<EventType, string> = {
    BLACK_SWAN_UP: "#22c55e", // green-500
    BLACK_SWAN_DOWN: "#ef4444", // red-500
    VOLATILITY_UP: "#f97316", // orange-500
    VOLATILITY_DOWN: "#eab308", // yellow-500
    BIG_MOVE: "#3b82f6", // blue-500
  };

  return colorMap[eventType] || "#6b7280"; // gray-500 fallback
}

/**
 * Prepare events for minimap rendering
 * Maps BlackSwanEventMinimal to MinimapEvent with grid coordinates
 * Filters out events without valid symbol/date (not in current grid view)
 *
 * @param events - Array of black swan events from grid
 * @param symbols - Array of symbol strings (grid rows)
 * @param dates - Array of date strings (grid columns)
 * @returns Array of minimap events with grid coordinates
 *
 * @example
 * const events = [
 *   { id: "1", symbol: "AAPL", occurrence_date: "2024-01-15", event_type: "BLACK_SWAN_UP", ... },
 *   { id: "2", symbol: "TSLA", occurrence_date: "2024-01-16", event_type: "BLACK_SWAN_DOWN", ... }
 * ];
 * const symbols = ["AAPL", "TSLA", "MSFT"];
 * const dates = ["2024-01-15", "2024-01-16", "2024-01-17"];
 *
 * const minimapEvents = prepareMinimapEvents(events, symbols, dates);
 * // Returns: [
 * //   { symbolIndex: 0, dateIndex: 0, eventType: "BLACK_SWAN_UP" },
 * //   { symbolIndex: 1, dateIndex: 1, eventType: "BLACK_SWAN_DOWN" }
 * // ]
 */
export function prepareMinimapEvents(
  events: BlackSwanEventMinimal[],
  symbols: string[],
  dates: string[]
): MinimapEvent[] {
  // Create lookup maps for O(1) index access
  const symbolIndexMap = new Map<string, number>();
  symbols.forEach((symbol, index) => {
    symbolIndexMap.set(symbol, index);
  });

  const dateIndexMap = new Map<string, number>();
  dates.forEach((date, index) => {
    dateIndexMap.set(date, index);
  });

  // Map events to minimap coordinates and filter invalid ones
  return events
    .map((event): MinimapEvent | null => {
      const symbolIndex = symbolIndexMap.get(event.symbol);
      const dateIndex = dateIndexMap.get(event.occurrence_date);

      // Filter out events not in current grid view
      if (symbolIndex === undefined || dateIndex === undefined) {
        return null;
      }

      return {
        symbolIndex,
        dateIndex,
        eventType: event.event_type,
      };
    })
    .filter((event): event is MinimapEvent => event !== null);
}
