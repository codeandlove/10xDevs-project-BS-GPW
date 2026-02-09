/**
 * Types for Grid Minimap Navigation Feature
 *
 * This module defines TypeScript interfaces for the interactive minimap
 * that visualizes event distribution and enables viewport navigation.
 */

import type { EventType } from "./nocodb.types";

/**
 * Normalized viewport position and dimensions (0-1 range)
 * Used for viewport calculations independent of physical pixel dimensions
 *
 * @example
 * // Viewport in top-left quarter of minimap
 * const viewport: MinimapViewport = {
 *   x: 0,
 *   y: 0,
 *   width: 0.5,
 *   height: 0.5
 * };
 */
export interface MinimapViewport {
  /** Normalized X position (0 = left edge, 1 = right edge) */
  x: number;
  /** Normalized Y position (0 = top edge, 1 = bottom edge) */
  y: number;
  /** Normalized width (0-1, where 1 = full minimap width) */
  width: number;
  /** Normalized height (0-1, where 1 = full minimap height) */
  height: number;
}

/**
 * Physical dimensions of the minimap canvas in pixels
 * Calculated based on grid size with constraints (max 300x200px, min 2px cells)
 *
 * @example
 * const dims: MinimapDimensions = {
 *   width: 300,
 *   height: 200,
 *   cellWidth: 3.33,
 *   cellHeight: 4
 * };
 */
export interface MinimapDimensions {
  /** Total canvas width in pixels */
  width: number;
  /** Total canvas height in pixels */
  height: number;
  /** Width of each cell/pixel representing a grid cell */
  cellWidth: number;
  /** Height of each cell/pixel representing a grid cell */
  cellHeight: number;
}

/**
 * Simplified event representation for minimap rendering
 * Maps BlackSwanEventMinimal to grid coordinates (symbol index, date index)
 *
 * @example
 * // Event at symbol index 5, date index 10, type BLACK_SWAN_UP
 * const event: MinimapEvent = {
 *   symbolIndex: 5,
 *   dateIndex: 10,
 *   eventType: "BLACK_SWAN_UP"
 * };
 */
export interface MinimapEvent {
  /** Index of symbol in symbols array (row position) */
  symbolIndex: number;
  /** Index of date in dates array (column position) */
  dateIndex: number;
  /** Event type determining pixel color */
  eventType: EventType;
}

/**
 * UI state for minimap component
 * Tracks visibility, drag interaction, and mobile mode
 *
 * @example
 * const state: MinimapState = {
 *   isVisible: true,
 *   isDragging: false,
 *   dragStartX: null,
 *   dragStartY: null
 * };
 */
export interface MinimapState {
  /** Whether minimap is currently visible (toggled by user) */
  isVisible: boolean;
  /** Whether user is currently dragging the viewport rectangle */
  isDragging: boolean;
  /** X coordinate where drag started (null when not dragging) */
  dragStartX: number | null;
  /** Y coordinate where drag started (null when not dragging) */
  dragStartY: number | null;
}
