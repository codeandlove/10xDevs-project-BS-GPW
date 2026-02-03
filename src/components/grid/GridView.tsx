/**
 * Main Grid View component
 * Manages grid state, filters, and data fetching
 */

import { useCallback, useMemo, useEffect, useState } from "react";
import { useClientCache } from "@/hooks/useClientCache";
import { useGrid } from "@/contexts/GridContext";
import { useAuth } from "@/contexts/AuthContext";
import { canAccessPremiumFeatures } from "@/lib/auth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppLayout } from "@/components/layout/AppLayout";
import { Header } from "@/components/layout/Header";
import { AvatarMenu } from "@/components/layout/AvatarMenu";
import { RangeSelector } from "./RangeSelector";
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
import { WIG20_SYMBOLS } from "@/config/gpw-indices";
import type { EventType } from "@/types/nocodb.types";

export function GridView() {
  const {
    gridState,
    setRange,
    setSymbols,
    setEventTypes,
    setSort,
    setEventId,
    clearFilters,
    recentSymbols,
    setRecentSymbols,
    isInitialized,
    setIsInitialized,
  } = useGrid();
  const { profile, isLoading: isLoadingAuth, session } = useAuth();

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

  // Smart initialization: show tickers with events from last 7 days or WIG20 fallback
  // Only runs once on first load
  useEffect(() => {
    async function smartInitialization() {
      // Skip if already initialized or no access
      if (isInitialized || !hasAccess) {
        return;
      }

      try {
        // Fetch events from last 7 days without symbol filter
        const recentEvents = await fetchGridData("week", []);

        // Extract unique symbols from events
        const uniqueSymbols = [...new Set(recentEvents.events.map((e) => e.symbol))];

        // If >= 2 events, use those symbols; otherwise fallback to WIG20
        if (recentEvents.events.length >= 2) {
          setSymbols(uniqueSymbols);
          setRecentSymbols(uniqueSymbols); // Cache "ostatnie" for "Zaznacz ostatnie" button
        } else {
          setSymbols([...WIG20_SYMBOLS]);
          setRecentSymbols([...WIG20_SYMBOLS]); // Cache WIG20 as fallback
        }

        setIsInitialized(true); // Mark as initialized - won't run again
      } catch {
        // Fallback to WIG20 on error
        setSymbols([...WIG20_SYMBOLS]);
        setRecentSymbols([...WIG20_SYMBOLS]);
        setIsInitialized(true);
      }
    }

    if (hasAccess === true) {
      smartInitialization();
    }
  }, [hasAccess, isInitialized, setIsInitialized, setRecentSymbols, setSymbols]);

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // sm breakpoint
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

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

  const cacheKey = `cache:grid:${gridState.range}:${hashSymbols(gridState.symbols)}`;

  const shouldFetch = hasAccess === true;

  // Memoize fetcher to ensure useClientCache properly detects key changes
  const fetcher = useCallback(() => {
    return shouldFetch ? fetchGridData(gridState.range, gridState.symbols) : Promise.resolve(null);
  }, [shouldFetch, gridState.range, gridState.symbols]);

  const {
    data: gridResponse,
    isLoading,
    error,
  } = useClientCache(cacheKey, fetcher, { ttl: shouldFetch ? 5 * 60 * 1000 : 0 });

  // Extract and filter events
  let events = gridResponse?.events || [];

  // Apply event type filter
  if (gridState.eventTypes && gridState.eventTypes.length > 0) {
    events = events.filter((event) => gridState.eventTypes?.includes(event.event_type));
  }

  // Apply sorting
  if (gridState.sortField && gridState.sortDirection) {
    events = [...events].sort((a, b) => {
      if (gridState.sortField === "date") {
        const comparison = a.occurrence_date.localeCompare(b.occurrence_date);
        return gridState.sortDirection === "asc" ? comparison : -comparison;
      } else if (gridState.sortField === "percent_change") {
        const comparison = a.percent_change - b.percent_change;
        return gridState.sortDirection === "asc" ? comparison : -comparison;
      }
      return 0;
    });
  }

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (gridState.symbols.length > 0) count++;
    if (gridState.eventTypes && gridState.eventTypes.length > 0) count++;
    if (gridState.sortField) count++;
    return count;
  }, [gridState.symbols, gridState.eventTypes, gridState.sortField]);

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

  return (
    <ErrorBoundary>
      <AppLayout
        scrollable={isMobile && hasAccess === false}
        header={
          <Header
            showRangeSelector
            showFilters
            rangeSelector={<RangeSelector value={gridState.range} onChange={setRange} />}
            filters={
              <div className="flex flex-wrap items-center gap-2">
                <AdvancedTickerFilter
                  selected={gridState.symbols}
                  onChange={setSymbols}
                  recentSymbols={recentSymbols}
                  range={gridState.range}
                />
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
        <div className="flex h-full flex-col p-4">
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
            {isLoading || hasAccess === null || (!isInitialized && hasAccess) ? (
              <GridSkeleton />
            ) : !hasAccess ? (
              isMobile ? (
                <MobileAccessBlock />
              ) : (
                <BlurredDemoGrid range={gridState.range} />
              )
            ) : events.length > 0 ? (
              <VirtualizedGrid
                events={events}
                range={gridState.range}
                onCellClick={handleCellClick}
                selectedEventId={gridState.eventId}
                selectedSymbols={gridState.symbols}
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
          </div>
        </div>

        {/* Summary Sidebar/Drawer - only if has access */}
        {hasAccess && <SummaryView eventId={gridState.eventId || null} onClose={handleCloseSummary} />}
      </AppLayout>
    </ErrorBoundary>
  );
}
