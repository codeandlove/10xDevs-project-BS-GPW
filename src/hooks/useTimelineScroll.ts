/**
 * useTimelineScroll Hook
 * Detects scroll position and triggers loading at threshold
 */

import { useEffect, useState, useRef, useCallback } from "react";
import { getScrollThreshold } from "@/lib/timeline-utils";

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
 * Hook to detect scroll position and trigger loading at threshold (15% from left)
 */
export function useTimelineScroll({
  scrollElement,
  isLoading,
  onThresholdReached,
}: UseTimelineScrollProps): UseTimelineScrollReturn {
  const [scrollLeft, setScrollLeft] = useState(0);
  const [scrollWidth, setScrollWidth] = useState(0);
  const [thresholdReached, setThresholdReached] = useState(false);
  const timeoutRef = useRef<number | undefined>(undefined);

  const handleScroll = useCallback(() => {
    if (!scrollElement || isLoading) return;

    const currentScrollLeft = scrollElement.scrollLeft;
    const currentScrollWidth = scrollElement.scrollWidth - scrollElement.clientWidth;
    const threshold = getScrollThreshold(currentScrollWidth);

    setScrollLeft(currentScrollLeft);
    setScrollWidth(currentScrollWidth);

    if (currentScrollLeft <= threshold && !thresholdReached) {
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
    } else if (currentScrollLeft > threshold && thresholdReached) {
      setThresholdReached(false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = undefined;
      }
    }
  }, [scrollElement, isLoading, thresholdReached, onThresholdReached]);

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
