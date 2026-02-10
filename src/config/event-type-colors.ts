/**
 * Central color configuration for event types
 * Single source of truth for all event type colors across the application
 */

import type { EventType } from "@/types/nocodb.types";

/**
 * Color variants for event types
 */
export interface EventTypeColors {
  /** Full Tailwind classes for GridCell background, text, and border */
  cell: string;
  /** Tailwind background class for badge/dot indicators */
  badge: string;
  /** Hex color code for minimap pixels */
  pixel: string;
  /** Human-readable label */
  label: string;
}

/**
 * Color configuration for each event type
 *
 * Grid colors (cell variant):
 * - BLACK_SWAN_UP: green-100 background (growth/positive)
 * - BLACK_SWAN_DOWN: red-100 background (decline/negative)
 * - VOLATILITY_UP: orange-100 background (volatility increase)
 * - VOLATILITY_DOWN: yellow-100 background (volatility decrease)
 * - BIG_MOVE: blue-100 background (significant price movement)
 */
export const EVENT_TYPE_COLORS: Record<EventType, EventTypeColors> = {
  BLACK_SWAN_UP: {
    cell: "bg-green-100 text-green-900 border-green-300",
    badge: "bg-green-500",
    pixel: "#22c55e", // green-500
    label: "Czarny Łabędź (wzrost)",
  },
  BLACK_SWAN_DOWN: {
    cell: "bg-red-100 text-red-900 border-red-300",
    badge: "bg-red-500",
    pixel: "#ef4444", // red-500
    label: "Czarny Łabędź (spadek)",
  },
  VOLATILITY_UP: {
    cell: "bg-orange-100 text-orange-900 border-orange-300",
    badge: "bg-orange-500",
    pixel: "#f97316", // orange-500
    label: "Wysoka zmienność (wzrost)",
  },
  VOLATILITY_DOWN: {
    cell: "bg-yellow-100 text-yellow-900 border-yellow-300",
    badge: "bg-yellow-500",
    pixel: "#eab308", // yellow-500
    label: "Wysoka zmienność (spadek)",
  },
  BIG_MOVE: {
    cell: "bg-blue-100 text-blue-900 border-blue-300",
    badge: "bg-blue-500",
    pixel: "#3b82f6", // blue-500
    label: "Duży ruch cenowy",
  },
};

/**
 * Fallback colors for unknown event types
 */
export const FALLBACK_COLORS: EventTypeColors = {
  cell: "bg-gray-100 text-gray-900 border-gray-300",
  badge: "bg-gray-500",
  pixel: "#6b7280", // gray-500
  label: "Nieznany typ",
};

/**
 * Get cell color classes for GridCell component
 */
export function getEventTypeCellColor(eventType: EventType): string {
  return EVENT_TYPE_COLORS[eventType]?.cell || FALLBACK_COLORS.cell;
}

/**
 * Get badge color class for EventTypeFilter dots
 */
export function getEventTypeBadgeColor(eventType: EventType): string {
  return EVENT_TYPE_COLORS[eventType]?.badge || FALLBACK_COLORS.badge;
}

/**
 * Get pixel hex color for MinimapCanvas
 */
export function getEventTypePixelColor(eventType: EventType): string {
  return EVENT_TYPE_COLORS[eventType]?.pixel || FALLBACK_COLORS.pixel;
}

/**
 * Get human-readable label for event type
 */
export function getEventTypeLabel(eventType: EventType): string {
  return EVENT_TYPE_COLORS[eventType]?.label || FALLBACK_COLORS.label;
}

/**
 * Get all event types with their colors
 * Useful for filters, legends, etc.
 */
export function getAllEventTypeColors(): { value: EventType; colors: EventTypeColors }[] {
  return Object.entries(EVENT_TYPE_COLORS).map(([value, colors]) => ({
    value: value as EventType,
    colors,
  }));
}
