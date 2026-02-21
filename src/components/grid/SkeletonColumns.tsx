/**
 * Skeleton Columns Component
 * Shows loading state for infinite scroll (prepended columns)
 */

import React from "react";

interface SkeletonColumnsProps {
  count?: number; // Number of skeleton columns (default: 5)
  columnWidth: number; // Width per column (matches grid config)
}

export function SkeletonColumns({ count = 5, columnWidth }: SkeletonColumnsProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={`skeleton-col-${i}`}
          className="flex h-full shrink-0 flex-col items-center justify-center border-r bg-gray-50 px-2 py-2 md:px-4 md:py-3"
          style={{ width: `${columnWidth}px` }}
          role="status"
          aria-label="Ładowanie historycznych dat"
        >
          {/* Weekday skeleton */}
          <div className="mb-1 h-3 w-8 animate-pulse rounded bg-gray-300 md:h-4 md:w-10" />

          {/* Date skeleton */}
          <div className="h-2 w-12 animate-pulse rounded bg-gray-200 md:h-3 md:w-16" />
        </div>
      ))}
    </>
  );
}
