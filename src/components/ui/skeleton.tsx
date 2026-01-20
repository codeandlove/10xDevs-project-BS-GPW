import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="skeleton" className={cn("bg-accent animate-pulse rounded-md", className)} {...props} />;
}

function GridSkeleton() {
  return (
    <div className="w-full space-y-4 p-4">
      {/* Header skeleton */}
      <div className="flex gap-4">
        <div className="h-10 w-20 animate-pulse rounded bg-accent" />
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-10 w-30 animate-pulse rounded bg-accent" />
        ))}
      </div>
      {/* Grid rows skeleton */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <div className="h-16 w-20 animate-pulse rounded bg-accent" />
          {Array.from({ length: 7 }).map((_, j) => (
            <div key={j} className="h-16 w-30 animate-pulse rounded bg-accent" />
          ))}
        </div>
      ))}
    </div>
  );
}

export { Skeleton, GridSkeleton };
