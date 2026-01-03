/**
 * Virtualized Grid Component
 * Uses @tanstack/react-virtual for efficient rendering of large datasets
 */

import { useRef, useMemo, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { BlackSwanEventMinimal, DateRange } from "@/types/nocodb.types";
import { GridCell } from "./GridCell";
import { getDatesInRange } from "@/lib/ui-utils";

interface VirtualizedGridProps {
  events: BlackSwanEventMinimal[];
  range: DateRange;
  onCellClick: (eventId: string) => void;
  selectedEventId?: string;
}

export function VirtualizedGrid({ events, range, onCellClick, selectedEventId }: VirtualizedGridProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Group events by symbol and date
  const { symbols, dates, eventsBySymbolAndDate } = useMemo(() => {
    const datesInRange = getDatesInRange(range);
    const symbolsSet = new Set<string>();
    const eventMap = new Map<string, BlackSwanEventMinimal>();

    events.forEach((event) => {
      symbolsSet.add(event.symbol);
      const key = `${event.symbol}-${event.occurrence_date}`;
      eventMap.set(key, event);
    });

    return {
      symbols: Array.from(symbolsSet).sort(),
      dates: datesInRange,
      eventsBySymbolAndDate: eventMap,
    };
  }, [events, range]);

  // Row virtualizer (symbols)
  const rowVirtualizer = useVirtualizer({
    count: symbols.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80, // Height per row
    overscan: 3, // Render 3 extra rows outside viewport
  });

  // Column virtualizer (dates)
  const columnVirtualizer = useVirtualizer({
    horizontal: true,
    count: dates.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 140, // Width per column
    overscan: 5, // Render 5 extra columns outside viewport
  });

  const getEvent = useCallback(
    (symbol: string, date: string) => {
      return eventsBySymbolAndDate.get(`${symbol}-${date}`);
    },
    [eventsBySymbolAndDate]
  );

  return (
    <div className="w-full overflow-hidden rounded-lg border">
      {/* Header row with dates (sticky) */}
      <div className="sticky top-0 z-20 flex border-b bg-white">
        {/* Top-left corner (empty cell for symbol column) */}
        <div className="sticky left-0 z-30 w-32 shrink-0 border-r bg-gray-50 px-4 py-3">
          <span className="text-sm font-semibold text-gray-700">Symbol</span>
        </div>

        {/* Virtual columns for dates */}
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
                className="absolute left-0 top-0 flex h-full items-center justify-center border-r px-4 py-3"
                style={{
                  width: `${virtualColumn.size}px`,
                  transform: `translateX(${virtualColumn.start}px)`,
                }}
              >
                <span className="text-xs font-medium text-gray-600">{date}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Scrollable body */}
      <div ref={parentRef} className="h-[600px] overflow-auto">
        <div
          className="relative"
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: `${columnVirtualizer.getTotalSize() + 128}px`, // +128 for symbol column
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const symbol = symbols[virtualRow.index];

            return (
              <div
                key={virtualRow.key}
                className="absolute left-0 top-0 flex w-full"
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {/* Symbol column (sticky left) */}
                <div className="sticky left-0 z-10 w-32 shrink-0 border-r bg-gray-50 px-4 py-3">
                  <span className="text-sm font-semibold text-gray-900">{symbol}</span>
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

                    return (
                      <div
                        key={virtualColumn.key}
                        className="absolute left-0 top-0 h-full"
                        style={{
                          width: `${virtualColumn.size}px`,
                          transform: `translateX(${virtualColumn.start}px)`,
                        }}
                      >
                        <GridCell
                          data={{
                            symbol,
                            date,
                            eventId: event?.id ?? null,
                            eventType: event?.event_type,
                            percentChange: event?.percent_change,
                            hasSummary: !!event,
                          }}
                          onClick={event ? () => onCellClick(event.id) : undefined}
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
  );
}
