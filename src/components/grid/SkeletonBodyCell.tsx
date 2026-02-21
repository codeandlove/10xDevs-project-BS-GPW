/**
 * Skeleton Body Cell Component
 * Shows loading state for grid cells during infinite scroll backward
 */

import React from "react";
import { cn } from "@/lib/utils";

interface SkeletonBodyCellProps {
  isWeekend: boolean;
  columnWidth: number;
}

export function SkeletonBodyCell({ isWeekend, columnWidth }: SkeletonBodyCellProps) {
  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center border-r px-2 py-2 md:px-4 md:py-3",
        isWeekend ? "bg-gray-100/50" : "bg-gray-50/50"
      )}
      style={{ width: `${columnWidth}px` }}
      role="status"
      aria-label="Ładowanie danych"
    >
      {/* Center content skeleton - simulates event data */}
      <div className="flex flex-col items-center gap-1">
        {/* Percentage skeleton */}
        <div
          className={cn("h-3 w-16 rounded md:h-4 md:w-20", "animate-pulse", isWeekend ? "bg-gray-300" : "bg-gray-200")}
        />
        {/* Event type badge skeleton */}
        <div
          className={cn(
            "h-2 w-10 rounded md:h-2.5 md:w-12",
            "animate-pulse",
            isWeekend ? "bg-gray-200" : "bg-gray-150"
          )}
        />
      </div>
    </div>
  );
}
