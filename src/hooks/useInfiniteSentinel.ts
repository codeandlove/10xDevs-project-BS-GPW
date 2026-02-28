/**
 * useInfiniteSentinel Hook
 * IntersectionObserver-based infinite scroll trigger
 * Monitors sentinel element visibility to trigger loading
 */

import { useEffect, useState, useCallback, useRef } from "react";
import type { UseInfiniteSentinelProps, UseInfiniteSentinelReturn } from "@/types/infinite-scroll.types";

/**
 * Hook to detect when sentinel element enters viewport
 * Uses IntersectionObserver for performant scroll detection
 *
 * @example
 * ```tsx
 * const sentinelRef = useRef<HTMLDivElement>(null);
 * const scrollRef = useRef<HTMLDivElement>(null);
 *
 * const { isObserving } = useInfiniteSentinel({
 *   sentinelRef,
 *   scrollContainerRef: scrollRef,
 *   onTrigger: loadPreviousChunk,
 *   isLoading: isLoadingBackward,
 *   hasMore: hasMoreHistoricalData,
 *   config: {
 *     rootMargin: '0px 200px 0px 0px', // Trigger 200px before visible
 *     threshold: 0,
 *   },
 * });
 * ```
 */
export function useInfiniteSentinel({
  sentinelRef,
  scrollContainerRef,
  onTrigger,
  isLoading,
  hasMore,
  config = {},
}: UseInfiniteSentinelProps): UseInfiniteSentinelReturn {
  const [isObserving, setIsObserving] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const isTriggering = useRef(false);

  // Default configuration
  const {
    rootMargin = "0px 0px 0px 200px", // Trigger 200px BEFORE left edge (format: top right bottom left)
    threshold = 0,
    enabled = true,
  } = config;

  /**
   * Handle intersection callback
   * Triggers loading when sentinel becomes visible
   */
  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;

      // Guard: Check if sentinel is intersecting
      if (!entry.isIntersecting) {
        return;
      }

      // Guard: Don't trigger if already loading
      if (isLoading) {
        return;
      }

      // Guard: Don't trigger if no more data
      if (!hasMore) {
        return;
      }

      // Guard: Prevent duplicate triggers (debounce)
      if (isTriggering.current) {
        return;
      }

      // Trigger loading
      isTriggering.current = true;

      try {
        const result = onTrigger();

        // If onTrigger returns Promise, wait for completion
        if (result instanceof Promise) {
          result
            .then(() => {
              isTriggering.current = false;
            })
            .catch(() => {
              isTriggering.current = false;
            });
        } else {
          // Sync callback - reset immediately
          isTriggering.current = false;
        }
      } catch {
        isTriggering.current = false;
      }
    },
    [onTrigger, isLoading, hasMore]
  );

  /**
   * Disconnect observer
   */
  const disconnect = useCallback(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      setIsObserving(false);
    }
  }, []);

  /**
   * Reconnect observer
   */
  const reconnect = useCallback(() => {
    const sentinel = sentinelRef.current;
    const scrollContainer = scrollContainerRef.current;

    if (!sentinel || !scrollContainer) {
      return;
    }

    // Disconnect existing observer
    disconnect();

    // Create new observer
    const observer = new IntersectionObserver(handleIntersection, {
      root: scrollContainer,
      rootMargin,
      threshold,
    });

    observer.observe(sentinel);
    observerRef.current = observer;
    setIsObserving(true);
  }, [sentinelRef, scrollContainerRef, rootMargin, threshold, handleIntersection, disconnect]);

  /**
   * Setup IntersectionObserver on mount
   * Cleanup on unmount
   * Retry mechanism: If refs not ready, retry up to 10 times (1 second total)
   */
  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 10;
    const retryDelay = 100; // 100ms between retries
    let retryTimer: number | undefined;

    const setupObserver = () => {
      const sentinel = sentinelRef.current;
      const scrollContainer = scrollContainerRef.current;

      // Guard: Check if refs are available
      if (!sentinel || !scrollContainer) {
        retryCount++;
        if (retryCount < maxRetries) {
          retryTimer = window.setTimeout(setupObserver, retryDelay);
          return;
        } else {
          // Refs not ready after max retries - give up silently
          return;
        }
      }

      // Guard: Check if observer is enabled
      if (!enabled) {
        return;
      }

      // Check if IntersectionObserver is supported
      if (typeof IntersectionObserver === "undefined") {
        // IntersectionObserver not supported - silently fail (e.g., old browsers)
        return;
      }

      // Create IntersectionObserver
      const observer = new IntersectionObserver(handleIntersection, {
        root: scrollContainer,
        rootMargin,
        threshold,
      });

      // Start observing sentinel
      observer.observe(sentinel);
      observerRef.current = observer;
      setIsObserving(true);
    };

    // Start setup (with retry mechanism)
    setupObserver();

    // Cleanup on unmount
    return () => {
      if (retryTimer) {
        clearTimeout(retryTimer);
      }
      if (observerRef.current) {
        observerRef.current.disconnect();
        setIsObserving(false);
      }
    };
  }, [sentinelRef, scrollContainerRef, rootMargin, threshold, enabled, handleIntersection]);

  return {
    isObserving,
    disconnect,
    reconnect,
  };
}
