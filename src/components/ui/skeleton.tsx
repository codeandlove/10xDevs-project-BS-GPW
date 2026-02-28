import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="skeleton" className={cn("bg-accent animate-pulse rounded-md", className)} {...props} />;
}

/**
 * GridSkeleton - Loading state for grid view
 * Uses single scroll container with sticky header (matches VirtualizedGrid architecture)
 * Matches exact GRID_CONFIG dimensions from VirtualizedGrid
 *
 * Note: Uses suppressHydrationWarning to avoid SSR mismatch (breakpoint detection is client-only)
 */
function GridSkeleton() {
  // Breakpoint detection (matches VirtualizedGrid)
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

  // Match GRID_CONFIG from VirtualizedGrid
  const config = {
    mobile: { colWidth: 100, symbolWidth: 80 },
    tablet: { colWidth: 120, symbolWidth: 100 },
    desktop: { colWidth: 140, symbolWidth: 140 },
  }[breakpoint];

  // Calculate number of columns to show
  // Show 21 days (3 weeks) to match auto-preload behavior
  // This ensures skeleton matches the actual grid after loading
  const numColumns = 21; // 3 weeks × 7 days = 21 days (matches auto-preload)

  return (
    <div className="h-full w-full overflow-auto rounded-lg border" role="grid" suppressHydrationWarning>
      {/* Symbol header - hidden during skeleton (no tickers loaded yet) */}

      {/* Sticky header row */}
      <div
        className="sticky top-0 z-20 flex border-b bg-white"
        role="row"
        style={{ height: "var(--grid-header-height)" }}
      >
        {/* Empty spacer for symbol column width */}
        <div className="shrink-0 rounded-tl-lg border-r bg-gray-50" style={{ width: `${config.symbolWidth}px` }} />

        {/* Date columns header */}
        <div className="flex flex-1 items-stretch">
          {Array.from({ length: numColumns }).map((_, i) => {
            const isWeekend = i % 7 === 0 || i % 7 === 6; // Sat/Sun pattern
            return (
              <div
                key={i}
                className={cn(
                  "flex shrink-0 flex-col items-center justify-center border-r px-2 py-2 md:px-4 md:py-3",
                  isWeekend ? "bg-gray-100" : "bg-white"
                )}
                style={{ width: `${config.colWidth}px` }}
              >
                {/* Weekday skeleton */}
                <div className="mb-1 h-3 w-8 animate-pulse rounded bg-gray-300 md:h-4 md:w-10" />
                {/* Date skeleton */}
                <div className="h-2 w-12 animate-pulse rounded bg-gray-200 md:h-3 md:w-16" />
              </div>
            );
          })}
        </div>
      </div>

      {/* Body rows - in same scroll container */}
      <div className="relative">
        {Array.from({ length: 8 }).map((_, rowIdx) => (
          <div key={rowIdx} className="flex border-b border-gray-200" style={{ height: "var(--grid-row-height)" }}>
            {/* Symbol column */}
            <div
              className="sticky left-0 z-10 flex shrink-0 items-center border-r border-gray-200 bg-gray-50 px-2 py-2 md:px-4 md:py-3"
              style={{ width: `${config.symbolWidth}px` }}
            >
              <div className="h-4 w-12 animate-pulse rounded bg-gray-300 md:h-5 md:w-16" />
            </div>

            {/* Cell columns */}
            {Array.from({ length: numColumns }).map((_, colIdx) => {
              const isWeekend = colIdx % 7 === 0 || colIdx % 7 === 6;
              return (
                <div
                  key={colIdx}
                  className={cn(
                    "flex shrink-0 items-center justify-center border-r border-gray-200 px-2 py-2 md:px-4 md:py-3",
                    isWeekend ? "bg-gray-100/50" : "bg-white"
                  )}
                  style={{ width: `${config.colWidth}px` }}
                >
                  {/* Simulate event data skeleton */}
                  <div className="flex flex-col items-center gap-1">
                    <div className="h-3 w-8 animate-pulse rounded bg-gray-200 md:h-4 md:w-10" />
                    <div className="h-2 w-6 animate-pulse rounded bg-gray-150 md:h-2.5 md:w-8" />
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export { Skeleton, GridSkeleton };
