/**
 * Grid cell component displaying event data
 */

import { memo } from "react";
import type { GridCellProps } from "@/types/ui.types";
import { getEventTypeCellColor } from "@/config/event-type-colors";
import { formatPercentChange } from "@/lib/ui-utils";

export const GridCell = memo(function GridCell({ data, onClick, isSelected = false }: GridCellProps) {
  // Type narrowing: if eventId is null, it's GridCellEmpty
  if (data.eventId === null) {
    // Weekend pattern styling
    const weekendStyle = data.isWeekend
      ? {
          backgroundImage:
            "repeating-linear-gradient(45deg, rgb(243 244 246) 0px, rgb(243 244 246) 10px, rgb(229 231 235) 10px, rgb(229 231 235) 20px)",
          pointerEvents: "none" as const,
        }
      : {};

    const todayClass = data.isToday ? "bg-gray-100 ring-1 ring-inset ring-gray-300" : "";
    const weekendLabel = data.isWeekend ? " (weekend)" : "";

    return (
      <div
        className={`flex h-full min-h-[50px] items-center justify-center border border-gray-200 bg-gray-50/50 md:min-h-[60px] ${todayClass}`}
        style={weekendStyle}
        role="gridcell"
        aria-label={`${data.symbol} ${data.date}${weekendLabel} - brak zdarzenia`}
        data-symbol={data.symbol}
        data-date={data.date}
        data-has-event="false"
        data-is-weekend={data.isWeekend || undefined}
        data-is-today={data.isToday || undefined}
      >
        <span className="text-[10px] text-gray-400 md:text-xs">-</span>
      </div>
    );
  }

  // TypeScript now knows data is GridCellWithEvent
  const colorClass = getEventTypeCellColor(data.eventType);
  const percentText = formatPercentChange(data.percentChange);

  // Weekend pattern styling
  const weekendStyle = data.isWeekend
    ? {
        backgroundImage:
          "repeating-linear-gradient(45deg, currentColor 0px, currentColor 10px, transparent 10px, transparent 20px)",
        backgroundBlendMode: "overlay" as const,
        opacity: 0.95,
        pointerEvents: "none" as const,
      }
    : {};

  const todayRing = data.isToday ? "ring-2 ring-blue-300/40" : "";
  const weekendLabel = data.isWeekend ? " (weekend)" : "";

  // If no onClick, render as div
  if (!onClick) {
    return (
      <div
        className={`
          flex h-full min-h-[50px] w-full flex-col items-center justify-center
          border p-1
          md:min-h-[60px] md:p-2
          ${colorClass} ${todayRing}
        `}
        style={weekendStyle}
        role="gridcell"
        aria-label={`${data.symbol} ${data.date}${weekendLabel} ${data.eventType} ${percentText}`}
        data-symbol={data.symbol}
        data-date={data.date}
        data-has-event="true"
        data-event-id={data.eventId || undefined}
        data-is-weekend={data.isWeekend || undefined}
        data-is-today={data.isToday || undefined}
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
      onClick={data.isWeekend ? undefined : onClick}
      disabled={data.isWeekend}
      className={`
        flex h-full min-h-[50px] w-full flex-col items-center justify-center
        border p-1 transition-all
        hover:shadow-md active:scale-95 md:hover:scale-105
        focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1
        md:min-h-[60px] md:p-2 md:focus:ring-offset-2
        ${colorClass} ${todayRing}
        ${isSelected ? "ring-2 ring-primary ring-offset-1 md:ring-offset-2" : ""}
        ${data.isWeekend ? "cursor-not-allowed opacity-90" : ""}
      `}
      style={weekendStyle}
      role="gridcell"
      aria-label={`${data.symbol} ${data.date}${weekendLabel} ${data.eventType} ${percentText}`}
      tabIndex={data.isWeekend ? -1 : 0}
      data-symbol={data.symbol}
      data-date={data.date}
      data-has-event="true"
      data-event-id={data.eventId || undefined}
      data-is-weekend={data.isWeekend || undefined}
      data-is-today={data.isToday || undefined}
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
