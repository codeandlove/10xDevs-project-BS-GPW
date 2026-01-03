/**
 * Skeleton loader component for loading states
 * TODO: Install shadcn skeleton component: npx shadcn@latest add skeleton
 */

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
}

export function Skeleton({ className = "", width, height }: SkeletonProps) {
  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === "number" ? `${width}px` : width;
  if (height) style.height = typeof height === "number" ? `${height}px` : height;

  return (
    <div
      className={`animate-pulse rounded-md bg-gray-200 ${className}`}
      style={style}
      aria-busy="true"
      aria-live="polite"
    />
  );
}

/**
 * Grid skeleton loader
 */
export function GridSkeleton() {
  return (
    <div className="w-full space-y-4 p-4">
      {/* Header skeleton */}
      <div className="flex gap-4">
        <Skeleton width={80} height={40} />
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} width={120} height={40} />
        ))}
      </div>

      {/* Rows skeleton */}
      {Array.from({ length: 8 }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4">
          <Skeleton width={80} height={60} />
          {Array.from({ length: 7 }).map((_, colIndex) => (
            <Skeleton key={colIndex} width={120} height={60} />
          ))}
        </div>
      ))}
    </div>
  );
}
