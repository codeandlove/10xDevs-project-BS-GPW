/**
 * Main Grid View component
 * Manages grid state, filters, and data fetching
 */

import { useCallback, useMemo } from "react";
import { useClientCache } from "@/hooks/useClientCache";
import { useGrid } from "@/contexts/GridContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppLayout } from "@/components/layout/AppLayout";
import { Header } from "@/components/layout/Header";
import { AvatarMenu } from "@/components/layout/AvatarMenu";
import { RangeSelector } from "./RangeSelector";
import { TickerFilter } from "./TickerFilter";
import { EventTypeFilter } from "./EventTypeFilter";
import { SortOptions } from "./SortOptions";
import { ClearFiltersButton } from "./ClearFiltersButton";
import { BasicGrid } from "./BasicGrid";
import { VirtualizedGrid } from "./VirtualizedGrid";
import { GridSkeleton } from "@/components/ui/Skeleton";
import { SummaryView } from "@/components/summary/SummaryView";
import { fetchGridData } from "@/lib/api-service";
import type { EventType } from "@/types/nocodb.types";

// Available symbols for filter
const AVAILABLE_SYMBOLS = ["CPD", "PKN", "PKO", "PZU", "KGH", "JSW", "LPP", "ALE"];

// Threshold for using virtualized grid
const VIRTUALIZATION_THRESHOLD = 100;

export function GridView() {
  const { gridState, setRange, setSymbols, setEventTypes, setSort, setEventId, clearFilters } = useGrid();

  // Cache key based on range and symbols
  const cacheKey = `cache:grid:${gridState.range}:${gridState.symbols.join(",")}`;

  // Fetch data with caching - now using real API
  const {
    data: gridResponse,
    isLoading,
    error,
  } = useClientCache(cacheKey, () => fetchGridData(gridState.range, gridState.symbols));

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

  // Handle cell click
  const handleCellClick = useCallback(
    (eventId: string) => {
      setEventId(eventId);
    },
    [setEventId]
  );

  // Handle summary close
  const handleCloseSummary = useCallback(() => {
    setEventId(undefined);
  }, [setEventId]);

  return (
    <ErrorBoundary>
      <AppLayout
        header={
          <Header
            showRangeSelector
            showFilters
            rangeSelector={<RangeSelector value={gridState.range} onChange={setRange} />}
            filters={
              <div className="flex flex-wrap items-center gap-2">
                <TickerFilter symbols={AVAILABLE_SYMBOLS} selected={gridState.symbols} onChange={setSymbols} />
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
        <div>
          {error && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-4 text-center">
              <p className="text-sm font-medium text-red-800">Wystąpił błąd podczas ładowania danych</p>
              <p className="mt-1 text-xs text-red-600">{error.message}</p>
            </div>
          )}

          {isLoading ? (
            <GridSkeleton />
          ) : events.length > 0 ? (
            // Use VirtualizedGrid for large datasets, BasicGrid for small ones
            events.length >= VIRTUALIZATION_THRESHOLD ? (
              <VirtualizedGrid
                events={events}
                range={gridState.range}
                onCellClick={handleCellClick}
                selectedEventId={gridState.eventId}
              />
            ) : (
              <BasicGrid
                events={events}
                range={gridState.range}
                onCellClick={handleCellClick}
                selectedEventId={gridState.eventId}
              />
            )
          ) : (
            <div className="flex h-[400px] items-center justify-center">
              <div className="text-center">
                <p className="text-lg font-medium text-muted-foreground">Brak zdarzeń w wybranym zakresie</p>
                <p className="mt-2 text-sm text-muted-foreground">Spróbuj zmienić zakres czasowy lub filtry tickerów</p>
              </div>
            </div>
          )}
        </div>

        {/* Summary Sidebar/Drawer */}
        <SummaryView eventId={gridState.eventId || null} onClose={handleCloseSummary} />
      </AppLayout>
    </ErrorBoundary>
  );
}
