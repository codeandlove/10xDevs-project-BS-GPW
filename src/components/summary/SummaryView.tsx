/**
 * Summary View - Responsive wrapper
 * Automatically switches between Sidebar (desktop) and Drawer (mobile)
 */

import { useState, useEffect } from "react";
import { SummarySidebar } from "./SummarySidebar";
import { SummaryDrawer } from "./SummaryDrawer";
import { fetchEventDetails } from "@/lib/api-service";
import type { BlackSwanEventDetailed } from "@/types/nocodb.types";

interface SummaryViewProps {
  eventId: string | null;
  onClose: () => void;
}

export function SummaryView({ eventId, onClose }: SummaryViewProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [event, setEvent] = useState<BlackSwanEventDetailed | null>(null);
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

  // Fetch event details
  useEffect(() => {
    if (!eventId) {
      setEvent(null);
      return;
    }

    const fetchEvent = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Use real API
        const response = await fetchEventDetails(eventId);
        setEvent(response.event);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to fetch event details"));
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvent();
  }, [eventId]);

  const handleViewMore = () => {
    // Navigate to full detail view
    window.location.href = `/event/${eventId}`;
  };

  if (!eventId) return null;

  return isMobile ? (
    <SummaryDrawer event={event} isLoading={isLoading} error={error} onClose={onClose} onViewMore={handleViewMore} />
  ) : (
    <SummarySidebar event={event} isLoading={isLoading} error={error} onClose={onClose} onViewMore={handleViewMore} />
  );
}
