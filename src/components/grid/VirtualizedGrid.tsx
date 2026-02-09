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
import { getDatesInRange } from "@/lib/ui-utils";

interface VirtualizedGridProps {
  events: BlackSwanEventMinimal[];
  range: DateRange;
  onCellClick: (eventId: string) => void;
  selectedEventId?: string;
  selectedSymbols?: string[]; // User-selected symbols to always show (even if no events)
  sortField?: "date" | "percent_change" | "symbol";
  sortDirection?: "asc" | "desc";
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
  range,
  onCellClick,
  selectedEventId,
  selectedSymbols,
  sortField = "symbol",
  sortDirection = "asc",
}: VirtualizedGridProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const breakpoint = useBreakpoint();
  const config = GRID_CONFIG[breakpoint];

  // Keyboard navigation state
  const [focusedCell, setFocusedCell] = useState<{ symbolIndex: number; dateIndex: number } | null>(null);

  // Store grid scroll element for minimap
  const [gridScrollElement, setGridScrollElement] = useState<HTMLDivElement | null>(null);

  // Scroll synchronization between header and body
  useEffect(() => {
    const bodyEl = parentRef.current;
    const headerEl = headerScrollRef.current;

    if (!bodyEl || !headerEl) return;

    // Set grid scroll element for minimap
    setGridScrollElement(bodyEl);

    const handleScroll = () => {
      headerEl.scrollLeft = bodyEl.scrollLeft;
    };

    bodyEl.addEventListener("scroll", handleScroll);
    return () => bodyEl.removeEventListener("scroll", handleScroll);
  }, []);

  // Group events by symbol and date
  const { symbols, dates, eventsBySymbolAndDate } = useMemo(() => {
    const datesInRange = getDatesInRange(range);
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

    return {
      symbols: finalSymbols,
      dates: datesInRange,
      eventsBySymbolAndDate: eventMap,
    };
  }, [events, range, selectedSymbols, sortField, sortDirection]);

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
      <div className="flex h-full w-full flex-col rounded-lg border" role="grid" aria-label="Black Swan Events Grid">
        {/* Header row with dates (sticky) */}
        <div className="sticky top-0 z-20 flex min-h-[48px] border-b bg-white md:min-h-[56px]" role="row">
          {/* Top-left corner (empty cell for symbol column) */}
          <div
            className="sticky left-0 z-30 flex shrink-0 items-center border-r bg-gray-50 px-2 py-2 md:px-4 md:py-3"
            role="columnheader"
            style={{ width: `${config.symbolWidth}px` }}
          >
            <span className="text-xs font-semibold text-gray-700 md:text-sm">Symbol</span>
          </div>

          {/* Scrollable dates container */}
          <div ref={headerScrollRef} className="flex flex-1 items-stretch overflow-x-hidden">
            <div
              className="relative flex"
              style={{
                width: `${columnVirtualizer.getTotalSize()}px`,
              }}
            >
              {columnVirtualizer.getVirtualItems().map((virtualColumn) => {
                const date = dates[virtualColumn.index];
                return (
                  <div
                    key={virtualColumn.key}
                    role="columnheader"
                    className="absolute left-0 top-0 flex h-full items-center justify-center border-r px-2 py-2 md:px-4 md:py-3"
                    style={{
                      width: `${virtualColumn.size}px`,
                      transform: `translateX(${virtualColumn.start}px)`,
                    }}
                  >
                    <span className="text-[10px] font-medium text-gray-600 md:text-xs">{date}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Scrollable body */}
        <div ref={parentRef} className="flex-1 overflow-auto rounded-b-lg">
          <div
            className="relative"
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: `${columnVirtualizer.getTotalSize() + config.symbolWidth}px`,
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const symbol = symbols[virtualRow.index];

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
                  >
                    <span className="truncate text-xs font-semibold text-gray-900 md:text-sm" title={symbol}>
                      {symbol}
                    </span>
                  </div>

                  {/* Virtual columns for cells */}
                  <div
                    className="relative flex"
                    style={{
                      width: `${columnVirtualizer.getTotalSize()}px`,
                    }}
                  >
                    {columnVirtualizer.getVirtualItems().map((virtualColumn) => {
                      const date = dates[virtualColumn.index];
                      const event = getEvent(symbol, date);
                      const symbolIndex = virtualRow.index;
                      const dateIndex = virtualColumn.index;
                      const isFocused =
                        focusedCell?.symbolIndex === symbolIndex && focusedCell?.dateIndex === dateIndex;

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
                                  }
                                : {
                                    eventId: null,
                                    symbol,
                                    date,
                                  }
                            }
                            onClick={
                              event ? () => handleCellClickWithFocus(event.id, symbolIndex, dateIndex) : undefined
                            }
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
      </div>

      {/* Minimap for navigation */}
      <GridMinimap events={events} symbols={symbols} dates={dates} gridScrollElement={gridScrollElement} />
    </>
  );
}
