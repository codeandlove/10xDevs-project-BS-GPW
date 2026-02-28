/**
 * Skeleton Columns Component
 * Shows loading state for infinite scroll (prepended columns)
 * Enhanced with weekend support and better visibility
 */

import React from "react";
import { cn } from "@/lib/utils";

interface SkeletonColumnsProps {
  count?: number; // Number of skeleton columns (default: 5)
  columnWidth: number; // Width per column (matches grid config)
  startDate?: string; // Optional: starting date to calculate weekends (YYYY-MM-DD)
}

/**
 * Check if date index represents a weekend (simple pattern: every 7th and 8th day)
 * If startDate provided, calculate accurately, otherwise use pattern
 */
function isWeekendIndex(index: number, startDate?: string): boolean {
  if (startDate) {
    // Calculate actual date and check day of week
    const date = new Date(startDate);
    date.setDate(date.getDate() - index); // Go backwards
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
  }
  // Fallback: simple pattern (assumes Sat/Sun every 7 days)
  const mod = index % 7;
  return mod === 0 || mod === 1;
}

export function SkeletonColumns({ count = 5, columnWidth, startDate }: SkeletonColumnsProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => {
        const isWeekend = isWeekendIndex(i, startDate);

        return (
          <div
            key={`skeleton-col-${i}`}
            className={cn(
              "flex h-full shrink-0 flex-col items-center justify-center border-r px-2 py-2 md:px-4 md:py-3",
              // Enhanced background for better visibility
              isWeekend ? "bg-gray-100" : "bg-white",
              // Subtle left border for first column (visual indicator)
              i === 0 && "border-l-2 border-l-blue-400"
            )}
            style={{
              width: `${columnWidth}px`,
              // Add subtle box-shadow for depth
              boxShadow: i === 0 ? "inset 2px 0 4px rgba(59, 130, 246, 0.1)" : undefined,
            }}
            role="status"
            aria-label="Ładowanie historycznych dat"
          >
            {/* Weekday skeleton with enhanced animation */}
            <div
              className={cn(
                "mb-1 h-3 w-8 rounded md:h-4 md:w-10",
                "animate-pulse",
                isWeekend ? "bg-gray-400" : "bg-gray-300"
              )}
            />

            {/* Date skeleton */}
            <div
              className={cn(
                "h-2 w-12 rounded md:h-3 md:w-16",
                "animate-pulse",
                isWeekend ? "bg-gray-300" : "bg-gray-200"
              )}
            />
          </div>
        );
      })}
    </>
  );
}
