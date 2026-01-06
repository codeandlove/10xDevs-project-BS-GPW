/**
 * Summary View - Responsive wrapper
 * Automatically switches between Sidebar (desktop) and Drawer (mobile)
 * Uses cache for event details per PRD section 8
 */

import { useState, useEffect } from "react";
import { SummarySidebar } from "./SummarySidebar";
import { SummaryDrawer } from "./SummaryDrawer";
import { fetchEventDetails } from "@/lib/api-service";
import type { EventDetailsResponse } from "@/types/nocodb.types";

interface SummaryViewProps {
  eventId: string | null;
  onClose: () => void;
}

export function SummaryView({ eventId, onClose }: SummaryViewProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [event, setEvent] = useState<EventDetailsResponse["event"] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Fetch event details with caching when eventId changes
  useEffect(() => {
    if (!eventId) {
      setEvent(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    const loadEvent = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Check cache first
        const cacheKey = `gpw:cache:v1:black_swans|id=${eventId}`;
        const cached = localStorage.getItem(cacheKey);

        if (cached) {
          const cacheEntry = JSON.parse(cached);
          const isStale = Date.now() - cacheEntry.timestamp > cacheEntry.ttl;

          // Use cached data immediately
          setEvent(cacheEntry.data.event);
          setIsLoading(false);

          // Revalidate in background if stale
          if (isStale) {
            const response = await fetchEventDetails(eventId);
            setEvent(response.event);
            // Update cache
            localStorage.setItem(
              cacheKey,
              JSON.stringify({
                data: response,
                timestamp: Date.now(),
                ttl: 10 * 60 * 1000,
                lastAccessed: Date.now(),
              })
            );
          }
        } else {
          // No cache - fetch fresh
          const response = await fetchEventDetails(eventId);
          setEvent(response.event);
          setIsLoading(false);
          // Save to cache
          localStorage.setItem(
            cacheKey,
            JSON.stringify({
              data: response,
              timestamp: Date.now(),
              ttl: 10 * 60 * 1000,
              lastAccessed: Date.now(),
            })
          );
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to fetch event details"));
        setIsLoading(false);
      }
    };

    loadEvent();
  }, [eventId]);

  const handleViewMore = () => {
    // Navigate to full detail view
    window.location.href = `/event/${eventId}`;
  };

  const handleRetry = () => {
    // Force reload by clearing cache and re-fetching
    if (eventId) {
      const cacheKey = `gpw:cache:v1:black_swans|id=${eventId}`;
      localStorage.removeItem(cacheKey);

      // Trigger re-fetch
      setIsLoading(true);
      setError(null);

      fetchEventDetails(eventId)
        .then((response) => {
          setEvent(response.event);
          setIsLoading(false);
          // Save to cache
          localStorage.setItem(
            cacheKey,
            JSON.stringify({
              data: response,
              timestamp: Date.now(),
              ttl: 10 * 60 * 1000,
              lastAccessed: Date.now(),
            })
          );
        })
        .catch((err) => {
          setError(err instanceof Error ? err : new Error("Failed to fetch event details"));
          setIsLoading(false);
        });
    }
  };

  if (!eventId) return null;

  return isMobile ? (
    <SummaryDrawer
      event={event}
      isLoading={isLoading}
      error={error}
      onClose={onClose}
      onViewMore={handleViewMore}
      onRetry={handleRetry}
    />
  ) : (
    <SummarySidebar
      event={event}
      isLoading={isLoading}
      error={error}
      onClose={onClose}
      onViewMore={handleViewMore}
      onRetry={handleRetry}
    />
  );
}
