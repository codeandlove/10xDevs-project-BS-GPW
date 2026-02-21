import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="skeleton" className={cn("bg-accent animate-pulse rounded-md", className)} {...props} />;
}

/**
 * GridSkeleton - Loading state for grid view
 * Uses single scroll container with sticky header (matches VirtualizedGrid architecture)
 */
function GridSkeleton() {
  return (
    <div className="h-full w-full overflow-auto rounded-lg border">
      {/* Sticky header row */}
      <div className="sticky top-0 z-20 flex min-h-[64px] border-b bg-white md:min-h-[72px]">
        {/* Symbol column header */}
        <div className="sticky left-0 z-30 flex shrink-0 items-center border-r bg-gray-50 px-2 py-2 md:px-4 md:py-3">
          <div className="h-4 w-12 animate-pulse rounded bg-gray-300 md:h-5 md:w-16" />
        </div>

        {/* Date columns header */}
        <div className="flex flex-1 items-stretch">
          {Array.from({ length: 7 }).map((_, i) => {
            const isWeekend = i === 0 || i === 6; // Sat/Sun pattern
            return (
              <div
                key={i}
                className={cn(
                  "flex min-w-[100px] flex-col items-center justify-center border-r px-2 py-2 md:min-w-[120px] md:px-4 md:py-3",
                  isWeekend ? "bg-gray-100" : "bg-white"
                )}
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
          <div key={rowIdx} className="flex border-b">
            {/* Symbol column */}
            <div className="sticky left-0 z-10 flex min-h-[60px] shrink-0 items-center border-r bg-gray-50 px-2 py-2 md:min-h-[70px] md:px-4 md:py-3">
              <div className="h-4 w-12 animate-pulse rounded bg-gray-300 md:h-5 md:w-16" />
            </div>

            {/* Cell columns */}
            {Array.from({ length: 7 }).map((_, colIdx) => {
              const isWeekend = colIdx === 0 || colIdx === 6;
              return (
                <div
                  key={colIdx}
                  className={cn(
                    "flex min-h-[60px] min-w-[100px] items-center justify-center border-r px-2 py-2 md:min-h-[70px] md:min-w-[120px] md:px-4 md:py-3",
                    isWeekend ? "bg-gray-100/50" : "bg-white"
                  )}
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
