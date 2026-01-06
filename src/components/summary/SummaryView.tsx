/**
 * Summary View - Responsive wrapper
 * Automatically switches between Sidebar (desktop) and Drawer (mobile)
 * Uses cache for event details per PRD section 8
 */

import { useState, useEffect } from "react";
import { SummarySidebar } from "./SummarySidebar";
import { SummaryDrawer } from "./SummaryDrawer";
import { fetchEventDetails } from "@/lib/api-service";
import { useClientCache } from "@/hooks/useClientCache";
import type { EventDetailsResponse } from "@/types/nocodb.types";

interface SummaryViewProps {
  eventId: string | null;
  onClose: () => void;
}

export function SummaryView({ eventId, onClose }: SummaryViewProps) {
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Cache key for event details (per PRD section 8.1)
  // Format: gpw:cache:v1:black_swans|id=<id>
  const cacheKey = eventId ? `gpw:cache:v1:black_swans|id=${eventId}` : "";

  // Fetch event details with caching
  const {
    data: eventResponse,
    isLoading,
    error,
    revalidate,
  } = useClientCache<EventDetailsResponse>(cacheKey, () => fetchEventDetails(eventId || ""), {
    ttl: 10 * 60 * 1000, // 10 minutes (longer than grid because events don't change often)
    staleWhileRevalidate: true,
    retry: 3,
  });

  const event = eventResponse?.event || null;

  const handleViewMore = () => {
    // Navigate to full detail view
    window.location.href = `/event/${eventId}`;
  };

  const handleRetry = () => {
    revalidate();
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
