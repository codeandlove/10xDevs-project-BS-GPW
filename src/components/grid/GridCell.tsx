/**
 * Grid cell component displaying event data
 */

import { memo } from "react";
import type { GridCellProps } from "@/types/ui.types";
import { getEventTypeColor, formatPercentChange } from "@/lib/ui-utils";

export const GridCell = memo(function GridCell({ data, onClick, isSelected = false }: GridCellProps) {
  const isEmpty = !data.eventId;

  if (isEmpty) {
    return (
      <div
        className="flex h-full min-h-[60px] items-center justify-center border border-gray-200 bg-gray-50/50"
        role="gridcell"
        aria-label={`${data.symbol} ${data.date} - brak zdarzenia`}
      >
        <span className="text-xs text-gray-400">-</span>
      </div>
    );
  }

  const colorClass = getEventTypeColor(data.eventType!);
  const percentText = formatPercentChange(data.percentChange!);

  // If no onClick, render as div
  if (!onClick) {
    return (
      <div
        className={`
          flex h-full min-h-[60px] w-full flex-col items-center justify-center
          border p-2
          ${colorClass}
        `}
        role="gridcell"
        aria-label={`${data.symbol} ${data.date} ${data.eventType} ${percentText}`}
      >
        <span className="text-xs font-semibold">{data.symbol}</span>
        <span className="text-lg font-bold">{percentText}</span>
        {data.hasSummary && (
          <span className="mt-1 text-xs opacity-70" aria-label="Posiada podsumowanie AI">
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
        flex h-full min-h-[60px] w-full flex-col items-center justify-center
        border p-2 transition-all
        hover:shadow-md hover:scale-105
        focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
        ${colorClass}
        ${isSelected ? "ring-2 ring-primary ring-offset-2" : ""}
      `}
      role="gridcell"
      aria-label={`${data.symbol} ${data.date} ${data.eventType} ${percentText}`}
      aria-pressed={isSelected}
      tabIndex={0}
    >
      <span className="text-xs font-semibold">{data.symbol}</span>
      <span className="text-lg font-bold">{percentText}</span>
      {data.hasSummary && (
        <span className="mt-1 text-xs opacity-70" aria-label="Posiada podsumowanie AI">
          AI ✓
        </span>
      )}
    </button>
  );
});
