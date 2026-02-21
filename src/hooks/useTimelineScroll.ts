/**
 * useTimelineScroll Hook
 * Detects scroll position and triggers loading at threshold
 */

import { useEffect, useState, useRef, useCallback } from "react";
import { getScrollThreshold, getScrollResetThreshold } from "@/lib/timeline-utils";

interface UseTimelineScrollProps {
  scrollElement: HTMLElement | null;
  isLoading: boolean;
  onThresholdReached: () => void;
}

interface UseTimelineScrollReturn {
  scrollLeft: number;
  scrollWidth: number;
  thresholdReached: boolean;
}

/**
 * Hook to detect scroll position and trigger loading at threshold
 * Uses hysteresis: trigger at 60%, reset at 75% to prevent rapid re-triggering
 */
export function useTimelineScroll({ scrollElement, isLoading, onThresholdReached }: UseTimelineScrollProps): UseTimelineScrollReturn {
  const [scrollLeft, setScrollLeft] = useState(0);
  const [scrollWidth, setScrollWidth] = useState(0);
  const [thresholdReached, setThresholdReached] = useState(false);
  const [hasScrolledManually, setHasScrolledManually] = useState(false);
  const timeoutRef = useRef<number | undefined>(undefined);

  const handleScroll = useCallback(() => {
    if (!scrollElement || isLoading) return;

    const currentScrollLeft = scrollElement.scrollLeft;
    const currentScrollWidth = scrollElement.scrollWidth - scrollElement.clientWidth;

    // Mark that user has scrolled manually (ignore initial position triggers)
    if (!hasScrolledManually && currentScrollWidth > 0) {
      setHasScrolledManually(true);
      return; // Don't trigger on first measurement
    }

    // Hysteresis thresholds to prevent rapid re-triggering
    const triggerThreshold = getScrollThreshold(currentScrollWidth); // 60% - trigger loading
    const resetThreshold = getScrollResetThreshold(currentScrollWidth); // 75% - allow re-trigger

    setScrollLeft(currentScrollLeft);
    setScrollWidth(currentScrollWidth);

    // Trigger loading when scrolled to 60% from left (AND not already triggered)
    if (currentScrollLeft <= triggerThreshold && !thresholdReached) {
      setThresholdReached(true);

      try {
        onThresholdReached();
      } catch (error) {
        console.error("[useTimelineScroll] ❌ Error calling onThresholdReached:", error);
      }

      // Reset threshold after 300ms (reduced from 1000ms for faster re-trigger)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = window.setTimeout(() => {
        setThresholdReached(false);
      }, 300);
    }
    // Reset threshold when scrolled past 75% from left (hysteresis zone)
    // This prevents re-triggering until user scrolls significantly to the right
    else if (currentScrollLeft > resetThreshold && thresholdReached) {
      setThresholdReached(false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = undefined;
      }
    }
  }, [scrollElement, isLoading, thresholdReached, hasScrolledManually, onThresholdReached]);

  useEffect(() => {
    if (!scrollElement) return;

    scrollElement.addEventListener("scroll", handleScroll, { passive: true });

    // Initial check
    handleScroll();

    return () => {
      scrollElement.removeEventListener("scroll", handleScroll);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [scrollElement, handleScroll]);

  return { scrollLeft, scrollWidth, thresholdReached };
}
