/**
 * Main Grid View component
 * Manages grid state, filters, and data fetching
 */

import { useCallback, useMemo, useEffect, useState, useRef } from "react";
import { useClientCache } from "@/hooks/useClientCache";
import { useInfiniteTimeline } from "@/hooks/useInfiniteTimeline";
import { useInfiniteSentinel } from "@/hooks/useInfiniteSentinel";
import { useGrid } from "@/contexts/GridContext";
import { useAuth } from "@/contexts/AuthContext";
import { canAccessPremiumFeatures } from "@/lib/auth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppLayout } from "@/components/layout/AppLayout";
import { Header } from "@/components/layout/Header";
import { AvatarMenu } from "@/components/layout/AvatarMenu";
import { DateRangeSelector } from "./DateRangeSelector";
import { AdvancedTickerFilter } from "./AdvancedTickerFilter";
import { EventTypeFilter } from "./EventTypeFilter";
import { SortOptions } from "./SortOptions";
import { ClearFiltersButton } from "./ClearFiltersButton";
import { VirtualizedGrid } from "./VirtualizedGrid";
import { BlurredDemoGrid } from "./BlurredDemoGrid";
import { MobileAccessBlock } from "./MobileAccessBlock";
import { GridSkeleton } from "@/components/ui/skeleton";
import { SummaryView } from "@/components/summary/SummaryView";
import { fetchGridData } from "@/lib/api-service";
import { hashSymbols } from "@/lib/cache";
import { clearTimelineCache } from "@/lib/cache-utils";
import type { EventType, DateRange } from "@/types/nocodb.types";

// Hook to detect mobile
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return isMobile;
}

export function GridView() {
  const { gridState, setRange, setSymbols, setEventTypes, setSort, setEventId, setDateRange, clearFilters } = useGrid();
  const { profile, isLoading: isLoadingAuth, session } = useAuth();
  const isMobile = useIsMobile();

  // Refs for infinite scroll sentinel pattern
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Sync scrollContainerRef with VirtualizedGrid's scroll container (for IntersectionObserver)
  useEffect(() => {
    // Wait for VirtualizedGrid to mount and find its scroll container
    const timer = setTimeout(() => {
      const gridContainer = document.querySelector('[role="grid"]') as HTMLDivElement | null;
      if (gridContainer && scrollContainerRef) {
        scrollContainerRef.current = gridContainer;
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Stable callback to sync scrollContainerRef with VirtualizedGrid's scroll element
  const handleScrollContainer = useCallback((el: HTMLDivElement | null) => {
    scrollContainerRef.current = el;
  }, []);

  const today = new Date().toISOString().split("T")[0];
  const initialStartDate = useMemo(() => {
    if (gridState.startDate) return gridState.startDate;

    // Calculate from range
    const daysBack = gridState.range === "week" ? 7 : gridState.range === "month" ? 30 : 90;
    const start = new Date();
    start.setDate(start.getDate() - daysBack);
    return start.toISOString().split("T")[0];
  }, [gridState.startDate, gridState.range]);

  const initialEndDate = gridState.endDate || today;

  // Redirect unauthenticated users - but only if loading complete AND no session exists
  // If session exists but profile is null, it means profile is still loading - don't redirect
  useEffect(() => {
    if (!isLoadingAuth && !session) {
      const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/auth/login?returnUrl=${returnUrl}`;
    }
  }, [session, isLoadingAuth]);

  const hasAccess = useMemo(
    () => (profile && !isLoadingAuth ? canAccessPremiumFeatures(profile) : null),
    [profile, isLoadingAuth]
  );

  // Listen for browser back/forward navigation
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state?.eventId) {
        setEventId(event.state.eventId);
      } else {
        setEventId(undefined);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [setEventId]);

  // Fetch initial data
  const cacheKey = useMemo(() => {
    // If custom dates in URL, use them for cache key
    if (gridState.startDate && gridState.endDate) {
      return `cache:grid:${gridState.startDate}:${gridState.endDate}:${hashSymbols(gridState.symbols)}`;
    }
    // Otherwise use range
    return `cache:grid:${gridState.range}:${hashSymbols(gridState.symbols)}`;
  }, [gridState.startDate, gridState.endDate, gridState.range, gridState.symbols]);

  const shouldFetch = hasAccess === true;

  const fetcher = useCallback(() => {
    if (!shouldFetch) return Promise.resolve(null);

    // If custom dates in URL (start_date + end_date), use Mode 1 (explicit dates)
    if (gridState.startDate && gridState.endDate) {
      return fetchGridData(gridState.startDate, gridState.endDate, gridState.symbols);
    }

    // Otherwise use Mode 3 (range only - backward compatible)
    return fetchGridData(gridState.range, gridState.symbols, undefined);
  }, [shouldFetch, gridState.startDate, gridState.endDate, gridState.range, gridState.symbols]);

  const {
    data: gridResponse,
    isLoading,
    error,
  } = useClientCache(cacheKey, fetcher, { ttl: shouldFetch ? 5 * 60 * 1000 : 0 });

  // Infinite timeline hook
  const { timelineState, loadPreviousChunk, resetTimeline, allEvents, allDates } = useInfiniteTimeline({
    range: gridState.range,
    symbols: gridState.symbols,
    initialStartDate,
    initialEndDate,
    initialEvents: gridResponse?.events || [],
  });

  // Track last gridResponse we initialized from to prevent re-running on every render
  const lastInitializedResponseRef = useRef<typeof gridResponse>(null);

  // Re-initialize timeline when gridResponse loads (fixes timing issue with hasAccess)
  // Note: gridResponse.events may be empty (ticker with no events in current range) -
  // we still need to reset timeline so the empty ticker row is visible and historical
  // chunks can be loaded by scrolling left.
  useEffect(() => {
    if (
      gridResponse &&
      gridResponse !== lastInitializedResponseRef.current &&
      allEvents.length === 0 &&
      !timelineState.isLoadingBackward
    ) {
      lastInitializedResponseRef.current = gridResponse;
      resetTimeline(initialStartDate, initialEndDate, gridResponse.events);
    }
  }, [
    gridResponse,
    initialStartDate,
    initialEndDate,
    resetTimeline,
    allEvents.length,
    timelineState.isLoadingBackward,
  ]);

  // Reset timeline when symbols or range changes - forces refetch with new filters
  // This ensures cached chunks don't have stale data from old symbol filters
  const symbolsKey = gridState.symbols.sort().join(",");
  const prevSymbolsKeyRef = useRef<string>(symbolsKey);
  const prevRangeRef = useRef<DateRange>(gridState.range);

  useEffect(() => {
    const symbolsChanged = prevSymbolsKeyRef.current !== symbolsKey;
    const rangeChanged = prevRangeRef.current !== gridState.range;

    // Reset timeline regardless of event count - tickers with 0 events still need
    // a valid timeline so the empty row is shown and historical chunks can be loaded.
    if ((symbolsChanged || rangeChanged) && gridResponse) {
      resetTimeline(initialStartDate, initialEndDate, gridResponse.events);
      prevSymbolsKeyRef.current = symbolsKey;
      prevRangeRef.current = gridState.range;
    }
  }, [symbolsKey, gridState.range, gridResponse, initialStartDate, initialEndDate, resetTimeline]);

  // Sentinel-based infinite scroll (IntersectionObserver)
  useInfiniteSentinel({
    sentinelRef: sentinelRef as React.RefObject<HTMLDivElement | null>,
    scrollContainerRef: scrollContainerRef as React.RefObject<HTMLDivElement | null>,
    onTrigger: loadPreviousChunk,
    isLoading: timelineState.isLoadingBackward,
    hasMore: true, // TODO: Add hasMoreHistoricalData state when API returns empty chunk
    config: {
      rootMargin: "0px 0px 0px 200px", // Trigger 200px BEFORE left edge (top right bottom left)
      threshold: 0,
    },
  });

  // Mobile performance warning (10+ chunks)
  useEffect(() => {
    if (isMobile && timelineState.chunks.length >= 10) {
      // TODO: Implement toast notification when toast library is available
    }
  }, [isMobile, timelineState.chunks.length]);

  // Clear timeline cache when range changes (after mount)
  // This ensures fresh data when switching between week/month/quarter
  const previousRangeRef = useRef(gridState.range);
  useEffect(() => {
    if (previousRangeRef.current !== gridState.range) {
      // Clear cache for the old range
      const symbolsHash = hashSymbols(gridState.symbols);
      clearTimelineCache(previousRangeRef.current, symbolsHash);
      previousRangeRef.current = gridState.range;
    }
  }, [gridState.range, gridState.symbols]);

  // Extract and filter events from timeline
  let events = allEvents;

  // Apply event type filter
  if (gridState.eventTypes && gridState.eventTypes.length > 0) {
    events = events.filter((event) => gridState.eventTypes?.includes(event.event_type));
  }

  // Apply sorting
  if (gridState.sortField && gridState.sortDirection) {
    // Only sort events for date and percent_change
    // Symbol sorting is handled in VirtualizedGrid (row order)
    if (gridState.sortField !== "symbol") {
      events = [...events].sort((a, b) => {
        if (gridState.sortField === "date") {
          const comparison = a.occurrence_date.localeCompare(b.occurrence_date);
          return gridState.sortDirection === "asc" ? comparison : -comparison;
        } else if (gridState.sortField === "percent_change") {
          const comparison = Math.abs(a.percent_change) - Math.abs(b.percent_change);
          return gridState.sortDirection === "asc" ? comparison : -comparison;
        }
        return 0;
      });
    }
  }

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (gridState.symbols.length > 0) count++;
    if (gridState.eventTypes && gridState.eventTypes.length > 0) count++;
    if (gridState.sortField && (gridState.sortField !== "symbol" || gridState.sortDirection !== "asc")) count++;
    return count;
  }, [gridState.symbols, gridState.eventTypes, gridState.sortField, gridState.sortDirection]);

  // Handle cell click - add to history
  const handleCellClick = useCallback(
    (eventId: string) => {
      setEventId(eventId);
      // Push state to history for back navigation
      window.history.pushState({ eventId }, "", `?eventId=${eventId}`);
    },
    [setEventId]
  );

  // Handle summary close - close immediately then history.back()
  const handleCloseSummary = useCallback(() => {
    // Close sidebar immediately (don't wait for popstate)
    setEventId(undefined);

    // Clean up URL if it has eventId param
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has("eventId")) {
      // Remove eventId from URL without triggering popstate
      urlParams.delete("eventId");
      const newUrl = urlParams.toString() ? `?${urlParams.toString()}` : window.location.pathname;
      window.history.replaceState({}, "", newUrl);
    }
  }, [setEventId]);

  // Handle date range change from picker
  const handleDateRangeChange = useCallback(
    (startDate: string, endDate: string) => {
      setDateRange(startDate, endDate);

      fetchGridData(startDate, endDate, gridState.symbols).then((response) => {
        resetTimeline(startDate, endDate, response.events);
      });
    },
    [setDateRange, resetTimeline, gridState.symbols]
  );

  // Handle preset change (quick filters)
  const handlePresetChange = useCallback(
    (preset: DateRange) => {
      setRange(preset);

      // Calculate new dates from preset
      const daysBack = preset === "week" ? 7 : preset === "month" ? 30 : 90;
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - daysBack);

      const startDate = start.toISOString().split("T")[0];
      const endDate = end.toISOString().split("T")[0];

      handleDateRangeChange(startDate, endDate);
    },
    [setRange, handleDateRangeChange]
  );

  return (
    <ErrorBoundary>
      <AppLayout
        scrollable={isMobile && hasAccess === false}
        header={
          <Header
            showRangeSelector
            showFilters
            rangeSelector={
              <DateRangeSelector
                currentRange={gridState.range}
                startDate={initialStartDate}
                endDate={initialEndDate}
                onPresetChange={handlePresetChange}
                onCustomRangeChange={handleDateRangeChange}
              />
            }
            filters={
              <div className="flex flex-wrap items-center gap-2">
                <AdvancedTickerFilter selected={gridState.symbols} onChange={setSymbols} range={gridState.range} />
                <EventTypeFilter selected={(gridState.eventTypes || []) as EventType[]} onChange={setEventTypes} />
                <SortOptions
                  value={{
                    field: gridState.sortField || "date",
                    direction: gridState.sortDirection || "desc",
                  }}
                  onChange={setSort}
                />
                <ClearFiltersButton activeFiltersCount={activeFiltersCount} onClear={clearFilters} />
              </div>
            }
            avatarMenu={<AvatarMenu />}
          />
        }
      >
        <div className="flex h-full flex-col">
          {error && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-4 text-center">
              <p className="text-sm font-medium text-red-800">Wystąpił błąd podczas ładowania danych</p>
              <p className="mt-1 text-xs text-red-600">{error.message}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-3 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Spróbuj ponownie
              </button>
            </div>
          )}

          <div className="relative min-h-0 flex-1">
            {isLoading || hasAccess === null || (hasAccess && gridResponse === null) ? (
              <GridSkeleton />
            ) : !hasAccess ? (
              isMobile ? (
                <MobileAccessBlock />
              ) : (
                <BlurredDemoGrid range={gridState.range} />
              )
            ) : timelineState.chunks.length > 0 ? (
              <VirtualizedGrid
                events={events}
                allDates={allDates}
                onCellClick={handleCellClick}
                selectedEventId={gridState.eventId}
                selectedSymbols={gridState.symbols}
                sortField={gridState.sortField}
                sortDirection={gridState.sortDirection}
                isLoadingBackward={timelineState.isLoadingBackward}
                sentinelRef={sentinelRef}
                onScrollContainer={handleScrollContainer}
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <p className="text-lg font-medium text-muted-foreground">Brak zdarzeń w wybranym zakresie</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Spróbuj zmienić zakres czasowy lub filtry tickerów
                  </p>
                </div>
              </div>
            )}

            {/* Timeline error state (floating at bottom) */}
            {timelineState.error && (
              <div className="absolute bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 shadow-lg">
                <p className="text-sm font-medium text-red-800">Błąd ładowania danych</p>
                <button
                  onClick={() => loadPreviousChunk()}
                  className="mt-2 text-sm text-red-600 underline hover:text-red-700"
                >
                  Spróbuj ponownie
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Summary Sidebar/Drawer - only if has access */}
        {hasAccess && <SummaryView eventId={gridState.eventId || null} onClose={handleCloseSummary} />}
      </AppLayout>
    </ErrorBoundary>
  );
}
