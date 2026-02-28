/**
 * SentinelElement Component
 * Invisible trigger element for infinite scroll
 * Monitored by IntersectionObserver
 */
import { forwardRef } from "react";
import { cn } from "@/lib/utils";
interface SentinelElementProps {
  className?: string;
  "aria-label"?: string;
}
/**
 * Invisible sentinel element positioned at left edge of grid
 * When this element enters viewport it triggers infinite scroll loading
 */
export const SentinelElement = forwardRef<HTMLDivElement, SentinelElementProps>(({ className }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("absolute left-0 top-0", "w-px h-full", "pointer-events-none", className)}
      aria-hidden="true"
      data-sentinel="infinite-scroll"
    />
  );
});
SentinelElement.displayName = "SentinelElement";
