/**
 * Virtualized Grid Component
 * Uses @tanstack/react-virtual for efficient rendering of large datasets
 * Includes keyboard navigation support (Arrow keys, Enter, Escape)
 */

import { useRef, useMemo, useCallback, useState, useEffect } from "react";
import type { RefObject } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { BlackSwanEventMinimal } from "@/types/nocodb.types";
import { GridCell } from "./GridCell";
import { GridMinimap } from "./GridMinimap";
import { SentinelElement } from "./SentinelElement";
import { InfiniteScrollIndicator } from "./InfiniteScrollIndicator";
import { useDragScroll } from "@/hooks/useDragScroll";
import { getWeekdayShort, isWeekend, isToday } from "@/lib/ui-utils";

interface VirtualizedGridProps {
  events: BlackSwanEventMinimal[];
  allDates: string[]; // Pre-calculated dates from timeline (for infinite scroll)
  onCellClick: (eventId: string) => void;
  selectedEventId?: string;
  selectedSymbols?: string[]; // User-selected symbols to always show (even if no events)
  sortField?: "date" | "percent_change" | "symbol";
  sortDirection?: "asc" | "desc";
  isLoadingBackward?: boolean; // Loading state for infinite scroll
  sentinelRef?: RefObject<HTMLDivElement | null>; // Ref for sentinel element (infinite scroll trigger)
  onScrollContainer?: (element: HTMLDivElement | null) => void; // Callback for scroll container
}

// Responsive grid sizing - tylko szerokości (wysokości w CSS)
const GRID_CONFIG = {
  mobile: { colWidth: 100, weekendColWidth: 40, symbolWidth: 80 },
  tablet: { colWidth: 120, weekendColWidth: 48, symbolWidth: 100 },
  desktop: { colWidth: 140, weekendColWidth: 56, symbolWidth: 140 },
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
  onCellClick,
  selectedEventId,
  selectedSymbols,
  sortField = "symbol",
  sortDirection = "asc",
  isLoadingBackward = false,
  sentinelRef,
  onScrollContainer,
}: VirtualizedGridProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const breakpoint = useBreakpoint();
  const config = GRID_CONFIG[breakpoint];

  // Drag-and-drop scrolling for better UX (desktop + mobile)
  const { isDragging } = useDragScroll({
    ref: parentRef as RefObject<HTMLElement>,
    enabled: true,
    direction: "both", // Allow both horizontal and vertical dragging
    dragThreshold: 5, // 5px movement to start drag
  });

  // Keyboard navigation state
  const [focusedCell, setFocusedCell] = useState<{ symbolIndex: number; dateIndex: number } | null>(null);

  // Store grid scroll element for minimap
  const [gridScrollElement, setGridScrollElement] = useState<HTMLDivElement | null>(null);
  const [hasInitialScrolled, setHasInitialScrolled] = useState(false);

  // Callback ref - sets internal ref, updates minimap, and notifies parent of scroll container
  const setParentRef = useCallback(
    (element: HTMLDivElement | null) => {
      parentRef.current = element;
      setGridScrollElement(element);
      onScrollContainer?.(element);
    },
    [onScrollContainer]
  );

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
        if (symbol && symbol.trim().length > 0) {
          symbolsSet.add(symbol.trim());
        }
      });
    }

    // Determine symbol order based on sortField
    let finalSymbols: string[];

    if (sortField === "symbol") {
      // Alphabetic sorting - guard against null/undefined
      finalSymbols = Array.from(symbolsSet)
        .filter((s): s is string => typeof s === "string" && s.length > 0)
        .sort((a, b) => {
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
    estimateSize: () => 74, // Match CSS custom property --grid-row-height
    overscan: 3, // Render 3 extra rows outside viewport
  });

  // Column virtualizer (dates)
  const columnVirtualizer = useVirtualizer({
    horizontal: true,
    count: dates.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => config.colWidth,
    overscan: 5,
  });

  // Auto-scroll to RIGHT (newest dates) on initial mount
  // This allows user to scroll LEFT to load older data (infinite scroll backward)
  useEffect(() => {
    const scrollEl = parentRef.current;
    if (!scrollEl || hasInitialScrolled || dates.length === 0) return;

    // Wait for grid to render before scrolling
    const timer = setTimeout(() => {
      const maxScrollLeft = scrollEl.scrollWidth - scrollEl.clientWidth;
      if (maxScrollLeft > 0) {
        scrollEl.scrollLeft = maxScrollLeft;
        setHasInitialScrolled(true);
      }
    }, 100); // 100ms delay to ensure grid is rendered

    return () => clearTimeout(timer);
  }, [dates.length, hasInitialScrolled]);

  // Adjust scrollLeft when new data loads (infinite scroll backward)
  // This prevents sentinel from staying visible and triggering infinite loop
  const previousDatesLength = useRef(dates.length);
  useEffect(() => {
    const scrollEl = parentRef.current;
    if (!scrollEl || !hasInitialScrolled) return;

    const datesAdded = dates.length - previousDatesLength.current;

    // Only adjust if dates were added (not removed)
    if (datesAdded > 0) {
      const columnsAdded = datesAdded;
      const widthAdded = columnsAdded * config.colWidth;

      // Adjust scrollLeft to maintain current view position
      // This pushes sentinel back out of viewport
      const newScrollLeft = scrollEl.scrollLeft + widthAdded;
      scrollEl.scrollLeft = newScrollLeft;
    }

    previousDatesLength.current = dates.length;
  }, [dates.length, hasInitialScrolled, config.colWidth]);

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
        ref={setParentRef}
        className={`h-full w-full overflow-auto rounded-lg ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
        role="grid"
        aria-label="Black Swan Events Grid"
        style={{ outline: "1px solid rgb(229 231 235)", outlineOffset: "-1px" }}
      >
        {/* Symbol header - ABSOLUTE positioned to stay at top-left corner always */}
        <div
          className="absolute left-0 top-0 z-40 flex shrink-0 items-center justify-center rounded-tl-lg border-b border-r bg-gray-50 px-2 py-2 md:px-4 md:py-3"
          role="columnheader"
          style={{
            width: `${config.symbolWidth}px`,
            height: "var(--grid-header-height)",
          }}
        >
          <span className="text-xs font-semibold text-gray-700 md:text-sm">Symbol</span>
        </div>

        {/* Header row with dates - STICKY INSIDE scroll container */}
        <div
          className="sticky top-0 z-20 flex border-b border-gray-200 bg-white"
          role="row"
          style={{ height: "var(--grid-header-height)" }}
        >
          {/* Empty spacer for symbol column width */}
          <div
            className="shrink-0 border-r border-gray-200 bg-gray-50"
            style={{
              width: `${config.symbolWidth}px`,
            }}
          />

          {/* Dates container - NO overflow-x-hidden, scrolls naturally with parent */}
          <div className="flex flex-1 items-stretch">
            <div
              className="relative flex"
              style={{
                width: `${columnVirtualizer.getTotalSize()}px`,
              }}
            >
              {/* Actual date columns */}
              {columnVirtualizer.getVirtualItems().map((virtualColumn) => {
                const date = dates[virtualColumn.index];
                const dateIsWeekend = isWeekend(date);
                const dateIsToday = isToday(date);
                return (
                  <div
                    key={virtualColumn.key}
                    role="columnheader"
                    className={`absolute left-0 top-0 flex flex-col items-center justify-center border-b border-r border-gray-200 px-1 py-1 md:px-2 md:py-2 bg-white ${
                      dateIsWeekend ? "!bg-gray-100" : ""
                    } ${dateIsToday ? "!bg-gray-100" : ""}`}
                    style={{
                      width: `${virtualColumn.size}px`,
                      height: "var(--grid-header-height)",
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
          {/* Sentinel element - invisible trigger at left edge for infinite scroll */}
          {/* Must be inside scrollable content area to be detected by IntersectionObserver */}
          {sentinelRef && <SentinelElement ref={sentinelRef} />}

          {/* Loading indicator - shows visual feedback during backward loading */}
          <InfiniteScrollIndicator isVisible={isLoadingBackward} message="Loading older dates..." position="left" />

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
                  className="sticky left-0 z-10 flex shrink-0 items-center border-b border-r bg-gray-50 px-2 py-2 md:px-4 md:py-3"
                  style={{
                    width: `${config.symbolWidth}px`,
                    height: "var(--grid-row-height)",
                  }}
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
