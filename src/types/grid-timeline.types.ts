/**
 * Grid Timeline Types
 * Types for infinite scroll timeline functionality
 */

import type { BlackSwanEventMinimal } from "./nocodb.types";

/**
 * Chunk of timeline data (loaded period)
 */
export interface TimelineChunk {
  id: string; // `${startDate}_${endDate}`
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  events: BlackSwanEventMinimal[];
  loadedAt: number; // timestamp for cache invalidation
}

/**
 * Loading boundary (threshold point for triggering load)
 */
export interface LoadingBoundary {
  threshold: number; // Scroll position that triggers load (in pixels)
  direction: "backward" | "forward"; // Which direction
}

/**
 * Timeline state
 */
export interface TimelineState {
  chunks: TimelineChunk[];
  oldestLoadedDate: string;
  newestLoadedDate: string;
  isLoadingBackward: boolean;
  isLoadingForward: boolean; // Future use
  error: Error | null;
  /** True after resetTimeline is called at least once with a real API response */
  isInitialized: boolean;
}

/**
 * Chunk metadata
 */
export interface ChunkMetadata {
  totalEvents: number;
  dateRange: { start: string; end: string };
  symbolCount: number;
}
