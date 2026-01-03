/**
 * Basic grid component (non-virtualized)
 * TODO: Implement virtualization with @tanstack/react-virtual in iteration 2
 */

import { useMemo } from "react";
import type { BlackSwanEventMinimal, DateRange } from "@/types/nocodb.types";
import type { GridCellData } from "@/types/ui.types";
import { GridCell } from "./GridCell";
import { formatDateShort } from "@/lib/ui-utils";

interface BasicGridProps {
  events: BlackSwanEventMinimal[];
  range: DateRange;
  onCellClick: (eventId: string) => void;
  selectedEventId?: string;
}

/**
 * Generate grid structure from events
 */
function buildGridData(
  events: BlackSwanEventMinimal[],
  range: DateRange
): {
  dates: string[];
  symbols: string[];
  cells: Map<string, GridCellData>;
} {
  const dates = new Set<string>();
  const symbols = new Set<string>();
  const cells = new Map<string, GridCellData>();

  // Collect unique dates and symbols
  events.forEach((event) => {
    dates.add(event.occurrence_date);
    symbols.add(event.symbol);
  });

  const sortedDates = Array.from(dates).sort();
  const sortedSymbols = Array.from(symbols).sort();

  // Build cell map
  sortedSymbols.forEach((symbol) => {
    sortedDates.forEach((date) => {
      const key = `${symbol}-${date}`;
      const event = events.find((e) => e.symbol === symbol && e.occurrence_date === date);

      cells.set(key, {
        eventId: event?.id ?? null,
        symbol,
        date,
        eventType: event?.event_type,
        percentChange: event?.percent_change,
        hasSummary: event?.has_summary,
      });
    });
  });

  return {
    dates: sortedDates,
    symbols: sortedSymbols,
    cells,
  };
}

export function BasicGrid({ events, range, onCellClick, selectedEventId }: BasicGridProps) {
  const gridData = useMemo(() => buildGridData(events, range), [events, range]);

  if (gridData.symbols.length === 0 || gridData.dates.length === 0) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-muted-foreground">Brak zdarzeń w wybranym zakresie</p>
          <p className="mt-2 text-sm text-muted-foreground">Spróbuj zmienić zakres czasowy lub filtry tickerów</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full overflow-auto">
      <div className="inline-block min-w-full">
        {/* Grid container */}
        <div className="border-l border-t" role="grid" aria-label="Grid zdarzeń Black Swan">
          {/* Header row with dates */}
          <div className="flex">
            {/* Empty corner cell */}
            <div className="sticky left-0 z-20 w-24 shrink-0 border-b border-r bg-gray-100" />

            {/* Date headers */}
            <div className="flex">
              {gridData.dates.map((date) => (
                <div
                  key={date}
                  className="w-32 shrink-0 border-b border-r bg-gray-100 p-2 text-center text-sm font-medium"
                  role="columnheader"
                >
                  {formatDateShort(date)}
                </div>
              ))}
            </div>
          </div>

          {/* Data rows */}
          {gridData.symbols.map((symbol) => (
            <div key={symbol} className="flex" role="row">
              {/* Symbol header */}
              <div
                className="sticky left-0 z-10 flex w-24 shrink-0 items-center justify-center border-b border-r bg-gray-100 p-2 text-sm font-semibold"
                role="rowheader"
              >
                {symbol}
              </div>

              {/* Cells */}
              <div className="flex">
                {gridData.dates.map((date) => {
                  const key = `${symbol}-${date}`;
                  const cellData = gridData.cells.get(key)!;
                  const isSelected = cellData.eventId === selectedEventId;

                  return (
                    <div key={key} className="w-32 shrink-0">
                      <GridCell
                        data={cellData}
                        onClick={() => cellData.eventId && onCellClick(cellData.eventId)}
                        isSelected={isSelected}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
