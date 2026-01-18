/**
 * Grid cell component displaying event data
 */

import { memo } from "react";
import type { GridCellProps } from "@/types/ui.types";
import { getEventTypeColor, formatPercentChange } from "@/lib/ui-utils";

export const GridCell = memo(function GridCell({ data, onClick, isSelected = false }: GridCellProps) {
  // Type narrowing: if eventId is null, it's GridCellEmpty
  if (data.eventId === null) {
    return (
      <div
        className="flex h-full min-h-[50px] items-center justify-center border border-gray-200 bg-gray-50/50 md:min-h-[60px]"
        role="gridcell"
        aria-label={`${data.symbol} ${data.date} - brak zdarzenia`}
        data-symbol={data.symbol}
        data-date={data.date}
        data-has-event="false"
      >
        <span className="text-[10px] text-gray-400 md:text-xs">-</span>
      </div>
    );
  }

  // TypeScript now knows data is GridCellWithEvent
  const colorClass = getEventTypeColor(data.eventType);
  const percentText = formatPercentChange(data.percentChange);

  // If no onClick, render as div
  if (!onClick) {
    return (
      <div
        className={`
          flex h-full min-h-[50px] w-full flex-col items-center justify-center
          border p-1
          md:min-h-[60px] md:p-2
          ${colorClass}
        `}
        role="gridcell"
        aria-label={`${data.symbol} ${data.date} ${data.eventType} ${percentText}`}
        data-symbol={data.symbol}
        data-date={data.date}
        data-has-event="true"
        data-event-id={data.eventId || undefined}
      >
        <span className="text-[10px] font-semibold md:text-xs">{data.symbol}</span>
        <span className="text-base font-bold md:text-lg">{percentText}</span>
        {data.hasSummary && (
          <span className="mt-0.5 text-[10px] opacity-70 md:mt-1 md:text-xs" aria-label="Posiada podsumowanie AI">
            AI ✓
          </span>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`
        flex h-full min-h-[50px] w-full flex-col items-center justify-center
        border p-1 transition-all
        hover:shadow-md active:scale-95 md:hover:scale-105
        focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1
        md:min-h-[60px] md:p-2 md:focus:ring-offset-2
        ${colorClass}
        ${isSelected ? "ring-2 ring-primary ring-offset-1 md:ring-offset-2" : ""}
      `}
      role="gridcell"
      aria-label={`${data.symbol} ${data.date} ${data.eventType} ${percentText}`}
      tabIndex={0}
      data-symbol={data.symbol}
      data-date={data.date}
      data-has-event="true"
      data-event-id={data.eventId || undefined}
    >
      <span className="text-[10px] font-semibold md:text-xs">{data.symbol}</span>
      <span className="text-base font-bold md:text-lg">{percentText}</span>
      {data.hasSummary && (
        <span className="mt-0.5 text-[10px] opacity-70 md:mt-1 md:text-xs" aria-label="Posiada podsumowanie AI">
          AI ✓
        </span>
      )}
    </button>
  );
});
