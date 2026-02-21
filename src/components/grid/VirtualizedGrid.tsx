/**
 * Virtualized Grid Component
 * Uses @tanstack/react-virtual for efficient rendering of large datasets
 * Includes keyboard navigation support (Arrow keys, Enter, Escape)
 */

import { useRef, useMemo, useCallback, useState, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { BlackSwanEventMinimal, DateRange } from "@/types/nocodb.types";
import { GridCell } from "./GridCell";
import { GridMinimap } from "./GridMinimap";
import { SkeletonColumns } from "./SkeletonColumns";
import { SkeletonBodyCell } from "./SkeletonBodyCell";
import { getDatesInRange, getWeekdayShort, isWeekend, isToday } from "@/lib/ui-utils";

interface VirtualizedGridProps {
  events: BlackSwanEventMinimal[];
  allDates: string[]; // Pre-calculated dates from timeline (for infinite scroll)
  range: DateRange;
  onCellClick: (eventId: string) => void;
  selectedEventId?: string;
  selectedSymbols?: string[]; // User-selected symbols to always show (even if no events)
  sortField?: "date" | "percent_change" | "symbol";
  sortDirection?: "asc" | "desc";
  isLoadingBackward?: boolean; // Loading state for infinite scroll
  onScrollElement?: (element: HTMLDivElement | null) => void; // Expose scroll element
}

// Responsive grid sizing
const GRID_CONFIG = {
  mobile: { rowHeight: 60, colWidth: 100, symbolWidth: 80 },
  tablet: { rowHeight: 70, colWidth: 120, symbolWidth: 100 },
  desktop: { rowHeight: 80, colWidth: 140, symbolWidth: 128 },
};

// Hook to detect breakpoint
function useBreakpoint() {
  const [breakpoint, setBreakpoint] = useState<"mobile" | "tablet" | "desktop">("desktop");

  useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setBreakpoint("mobile");
      } else if (width < 1024) {
        setBreakpoint("tablet");
      } else {
        setBreakpoint("desktop");
      }
    };

    updateBreakpoint();
    window.addEventListener("resize", updateBreakpoint);
    return () => window.removeEventListener("resize", updateBreakpoint);
  }, []);

  return breakpoint;
}

export function VirtualizedGrid({
  events,
  allDates,
  range,
  onCellClick,
  selectedEventId,
  selectedSymbols,
  sortField = "symbol",
  sortDirection = "asc",
  isLoadingBackward = false,
  onScrollElement,
}: VirtualizedGridProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const breakpoint = useBreakpoint();
  const config = GRID_CONFIG[breakpoint];

  // Keyboard navigation state
  const [focusedCell, setFocusedCell] = useState<{ symbolIndex: number; dateIndex: number } | null>(null);

  // Store grid scroll element for minimap
  const [gridScrollElement, setGridScrollElement] = useState<HTMLDivElement | null>(null);

  // Expose scroll element for minimap and infinite scroll (no sync needed - single container)
  useEffect(() => {
    const scrollEl = parentRef.current;
    if (!scrollEl) return;

    setGridScrollElement(scrollEl);
    if (onScrollElement) {
      onScrollElement(scrollEl);
    }
  }, [onScrollElement]);

  // Group events by symbol and date
  const { symbols, dates, eventsBySymbolAndDate } = useMemo(() => {
    // Use allDates from props (includes infinite scroll dates)
    const symbolsSet = new Set<string>();
    const eventMap = new Map<string, BlackSwanEventMinimal>();

    // Group events by symbol to find most significant event per symbol
    const eventsBySymbol = new Map<string, BlackSwanEventMinimal[]>();

    // Add symbols from events and group by symbol
    events.forEach((event) => {
      symbolsSet.add(event.symbol);
      const key = `${event.symbol}-${event.occurrence_date}`;
      eventMap.set(key, event);

      if (!eventsBySymbol.has(event.symbol)) {
        eventsBySymbol.set(event.symbol, []);
      }
      const symbolEvents = eventsBySymbol.get(event.symbol);
      if (symbolEvents) {
        symbolEvents.push(event);
      }
    });

    // Add user-selected symbols (even if no events) - append at end
    if (selectedSymbols && selectedSymbols.length > 0) {
      selectedSymbols.forEach((symbol) => {
        symbolsSet.add(symbol);
      });
    }

    // Determine symbol order based on sortField
    let finalSymbols: string[];

    if (sortField === "symbol") {
      // Alphabetic sorting
      finalSymbols = Array.from(symbolsSet).sort((a, b) => {
        const comparison = a.localeCompare(b);
        return sortDirection === "asc" ? comparison : -comparison;
      });
    } else {
      // For date/percent_change sorting: preserve order from events array
      // Symbols with events stay in the order of their first (most significant) event
      const symbolsWithEvents = Array.from(eventsBySymbol.keys());
      const symbolsWithoutEvents = Array.from(symbolsSet).filter((s) => !eventsBySymbol.has(s));
      // Symbols without events are sorted alphabetically and appended
      finalSymbols = [...symbolsWithEvents, ...symbolsWithoutEvents.sort()];
    }

    // Fill with empty rows if grid has few symbols (minimum 8 rows for better visual)
    const MIN_ROWS = 8;
    if (finalSymbols.length < MIN_ROWS && finalSymbols.length > 0) {
      const emptyRowsNeeded = MIN_ROWS - finalSymbols.length;
      for (let i = 0; i < emptyRowsNeeded; i++) {
        finalSymbols.push(`_empty_${i}`); // Placeholder symbol
      }
    }

    return {
      symbols: finalSymbols,
      dates: allDates,
      eventsBySymbolAndDate: eventMap,
    };
  }, [events, allDates, selectedSymbols, sortField, sortDirection]);

  // Row virtualizer (symbols) - recreate when config changes
  const rowVirtualizer = useVirtualizer({
    count: symbols.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => config.rowHeight,
    overscan: 3, // Render 3 extra rows outside viewport
  });

  // Column virtualizer (dates) - recreate when config changes
  const columnVirtualizer = useVirtualizer({
    horizontal: true,
    count: dates.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => config.colWidth,
    overscan: 5, // Render 5 extra columns outside viewport
  });

  const getEvent = useCallback(
    (symbol: string, date: string) => {
      return eventsBySymbolAndDate.get(`${symbol}-${date}`);
    },
    [eventsBySymbolAndDate]
  );

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!focusedCell) return;

      const { symbolIndex, dateIndex } = focusedCell;
      let newSymbolIndex = symbolIndex;
      let newDateIndex = dateIndex;

      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          newSymbolIndex = Math.max(0, symbolIndex - 1);
          break;
        case "ArrowDown":
          e.preventDefault();
          newSymbolIndex = Math.min(symbols.length - 1, symbolIndex + 1);
          break;
        case "ArrowLeft":
          e.preventDefault();
          newDateIndex = Math.max(0, dateIndex - 1);
          break;
        case "ArrowRight":
          e.preventDefault();
          newDateIndex = Math.min(dates.length - 1, dateIndex + 1);
          break;
        case "Enter": {
          e.preventDefault();
          // Open sidebar for focused cell
          const symbol = symbols[symbolIndex];
          const date = dates[dateIndex];
          const event = getEvent(symbol, date);
          if (event?.id) {
            onCellClick(event.id);
          }
          return;
        }
        case "Escape":
          e.preventDefault();
          // Clear focus
          setFocusedCell(null);
          return;
      }

      if (newSymbolIndex !== symbolIndex || newDateIndex !== dateIndex) {
        setFocusedCell({ symbolIndex: newSymbolIndex, dateIndex: newDateIndex });
        // Scroll to new focused cell
        rowVirtualizer.scrollToIndex(newSymbolIndex, { align: "center" });
        columnVirtualizer.scrollToIndex(newDateIndex, { align: "center" });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [focusedCell, symbols, dates, getEvent, onCellClick, rowVirtualizer, columnVirtualizer]);

  // Handle cell click - also set keyboard focus
  const handleCellClickWithFocus = useCallback(
    (eventId: string, symbolIndex: number, dateIndex: number) => {
      setFocusedCell({ symbolIndex, dateIndex });
      onCellClick(eventId);
    },
    [onCellClick]
  );

  return (
    <>
      {/* Single scroll container with header inside as sticky element */}
      <div
        ref={parentRef}
        className="h-full w-full overflow-auto rounded-lg border"
        role="grid"
        aria-label="Black Swan Events Grid"
      >
        {/* Header row with dates - STICKY INSIDE scroll container */}
        <div className="sticky top-0 z-20 flex min-h-[64px] border-b bg-white md:min-h-[72px]" role="row">
          {/* Top-left corner (empty cell for symbol column) */}
          <div
            className="sticky left-0 z-30 flex shrink-0 items-center border-r bg-gray-50 px-2 py-2 md:px-4 md:py-3"
            role="columnheader"
            style={{ width: `${config.symbolWidth}px` }}
          >
            <span className="text-xs font-semibold text-gray-700 md:text-sm">Symbol</span>
          </div>

          {/* Dates container - NO overflow-x-hidden, scrolls naturally with parent */}
          <div className="flex flex-1 items-stretch">
            <div
              className="relative flex"
              style={{
                width: `${columnVirtualizer.getTotalSize()}px`,
              }}
            >
              {/* Loading skeleton columns (shown on left during infinite scroll backward) */}
              {isLoadingBackward && (
                <div className="absolute left-0 top-0 z-10 flex h-full">
                  <SkeletonColumns
                    count={3}
                    columnWidth={config.colWidth}
                    startDate={dates[0]} // First date to calculate weekends accurately
                  />
                </div>
              )}

              {/* Actual date columns */}
              {columnVirtualizer.getVirtualItems().map((virtualColumn) => {
                const date = dates[virtualColumn.index];
                const dateIsWeekend = isWeekend(date);
                const dateIsToday = isToday(date);
                return (
                  <div
                    key={virtualColumn.key}
                    role="columnheader"
                    className={`absolute left-0 top-0 flex h-full flex-col items-center justify-center border-r px-1 py-1 md:px-2 md:py-2 bg-white ${
                      dateIsWeekend ? "!bg-gray-100" : ""
                    } ${dateIsToday ? "!bg-blue-50 ring-2 ring-inset ring-blue-300" : ""}`}
                    style={{
                      width: `${virtualColumn.size}px`,
                      transform: `translateX(${virtualColumn.start}px)`,
                    }}
                  >
                    {/* Weekday name (top) */}
                    <span
                      className={`text-[11px] font-bold md:text-xs ${dateIsWeekend ? "text-gray-500" : "text-gray-700"}`}
                    >
                      {getWeekdayShort(date)}
                    </span>
                    {/* Date (bottom) */}
                    <span
                      className={`mt-0.5 text-[9px] font-medium md:text-[10px] ${dateIsWeekend ? "text-gray-400" : "text-gray-600"}`}
                    >
                      {date}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Body rows - in the same scroll container */}
        <div
          className="relative"
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: `${columnVirtualizer.getTotalSize() + config.symbolWidth}px`,
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const symbol = symbols[virtualRow.index];
            const isEmptyRow = symbol.startsWith("_empty_");

            return (
              <div
                key={virtualRow.key}
                role="row"
                className="absolute left-0 top-0 flex w-full"
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {/* Symbol column (sticky left) */}
                <div
                  className="sticky left-0 z-10 shrink-0 border-r bg-gray-50 px-2 py-2 md:px-4 md:py-3"
                  style={{ width: `${config.symbolWidth}px` }}
                  role="rowheader"
                >
                  {!isEmptyRow && (
                    <span className="truncate text-xs font-semibold text-gray-900 md:text-sm" title={symbol}>
                      {symbol}
                    </span>
                  )}
                </div>

                {/* Virtual columns for cells */}
                <div
                  className="relative flex"
                  style={{
                    width: `${columnVirtualizer.getTotalSize()}px`,
                  }}
                >
                  {/* Loading skeleton cells (shown on left during infinite scroll backward) */}
                  {isLoadingBackward && (
                    <div className="absolute left-0 top-0 z-10 flex h-full">
                      {Array.from({ length: 3 }).map((_, i) => {
                        // Calculate if this skeleton represents a weekend
                        // Use same logic as SkeletonColumns for consistency
                        const date = dates[0] ? new Date(dates[0]) : new Date();
                        date.setDate(date.getDate() - i);
                        const dayOfWeek = date.getDay();
                        const skeletonIsWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                        return (
                          <div
                            key={`skeleton-body-${i}`}
                            className={i === 0 ? "border-l-2 border-l-blue-400" : ""}
                            style={{
                              width: `${config.colWidth}px`,
                              boxShadow: i === 0 ? "inset 2px 0 4px rgba(59, 130, 246, 0.1)" : undefined,
                            }}
                          >
                            <SkeletonBodyCell isWeekend={skeletonIsWeekend} columnWidth={config.colWidth} />
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Actual cell columns */}
                  {columnVirtualizer.getVirtualItems().map((virtualColumn) => {
                    const date = dates[virtualColumn.index];
                    const event = getEvent(symbol, date);
                    const symbolIndex = virtualRow.index;
                    const dateIndex = virtualColumn.index;
                    const isFocused = focusedCell?.symbolIndex === symbolIndex && focusedCell?.dateIndex === dateIndex;
                    const dateIsWeekend = isWeekend(date);
                    const dateIsToday = isToday(date);

                    return (
                      <div
                        key={virtualColumn.key}
                        className={`absolute left-0 top-0 h-full ${isFocused ? "ring-2 ring-blue-500 ring-offset-1" : ""}`}
                        style={{
                          width: `${virtualColumn.size}px`,
                          transform: `translateX(${virtualColumn.start}px)`,
                        }}
                      >
                        <GridCell
                          data={
                            event
                              ? {
                                  eventId: event.id,
                                  symbol,
                                  date,
                                  eventType: event.event_type,
                                  percentChange: event.percent_change,
                                  hasSummary: true,
                                  isWeekend: dateIsWeekend,
                                  isToday: dateIsToday,
                                }
                              : {
                                  eventId: null,
                                  symbol,
                                  date,
                                  isWeekend: dateIsWeekend,
                                  isToday: dateIsToday,
                                }
                          }
                          onClick={event ? () => handleCellClickWithFocus(event.id, symbolIndex, dateIndex) : undefined}
                          isSelected={event?.id === selectedEventId}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Minimap for navigation */}
      <GridMinimap events={events} symbols={symbols} dates={dates} gridScrollElement={gridScrollElement} />
    </>
  );
}
