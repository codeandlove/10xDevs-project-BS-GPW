/**
 * Type definitions for Infinite Scroll Sentinel Pattern
 */

import type { RefObject } from "react";

/**
 * Configuration for IntersectionObserver-based sentinel
 */
export interface SentinelConfig {
  /**
   * Root margin for IntersectionObserver
   * Format: 'top right bottom left' (like CSS padding)
   * Example: '0px 200px 0px 0px' = expand 200px to the right
   * This triggers loading BEFORE sentinel becomes visible (preload)
   * @default '0px 200px 0px 0px'
   */
  rootMargin?: string;

  /**
   * Intersection threshold (0.0 - 1.0)
   * 0 = trigger as soon as 1px is visible
   * 1 = trigger only when fully visible
   * @default 0
   */
  threshold?: number;

  /**
   * Enable/disable observer
   * @default true
   */
  enabled?: boolean;
}

/**
 * Props for useInfiniteSentinel hook
 */
export interface UseInfiniteSentinelProps {
  /**
   * Ref to sentinel element (invisible trigger)
   */
  sentinelRef: RefObject<HTMLDivElement | null>;

  /**
   * Ref to scroll container (parent with overflow)
   */
  scrollContainerRef: RefObject<HTMLDivElement | null>;

  /**
   * Callback when sentinel intersects viewport
   * Should load previous chunk
   */
  onTrigger: () => void | Promise<void>;

  /**
   * Is data currently loading?
   * Prevents multiple simultaneous triggers
   */
  isLoading: boolean;

  /**
   * Is there more historical data to load?
   * Stops triggering when no more data
   */
  hasMore: boolean;

  /**
   * Optional observer configuration
   */
  config?: SentinelConfig;
}

/**
 * Return value from useInfiniteSentinel hook
 */
export interface UseInfiniteSentinelReturn {
  /**
   * Is observer currently active?
   */
  isObserving: boolean;

  /**
   * Manually disconnect observer
   */
  disconnect: () => void;

  /**
   * Manually reconnect observer
   */
  reconnect: () => void;
}

/**
 * Props for drag scroll hook
 */
export interface UseDragScrollProps {
  /**
   * Ref to scrollable element
   */
  ref: RefObject<HTMLElement>;

  /**
   * Enable/disable drag scrolling
   * @default true
   */
  enabled?: boolean;

  /**
   * Scroll direction
   * @default 'both'
   */
  direction?: "horizontal" | "vertical" | "both";

  /**
   * Minimum pixels to move before drag starts
   * Prevents accidental drags on click
   * @default 5
   */
  dragThreshold?: number;
}

/**
 * Return value from useDragScroll hook
 */
export interface UseDragScrollReturn {
  /**
   * Is currently dragging?
   */
  isDragging: boolean;

  /**
   * Start drag (for manual control)
   */
  dragStart: (e: MouseEvent | TouchEvent) => void;

  /**
   * End drag (for manual control)
   */
  dragEnd: () => void;
}
