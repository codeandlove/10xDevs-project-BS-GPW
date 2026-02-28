/**
 * InfiniteScrollIndicator - Visual feedback during infinite scroll loading
 *
 * Provides user with clear visual feedback when historical data is being loaded.
 * Shows floating indicator with spinner and message.
 *
 * Design specs:
 * - Position: absolute, left side or center
 * - Animation: fade-in + slide-in (200ms)
 * - Styling: white bg, shadow-lg, rounded
 * - Accessibility: role="status", aria-live="polite"
 */

import { cn } from "@/lib/utils";

interface InfiniteScrollIndicatorProps {
  /** Controls visibility of the indicator */
  isVisible: boolean;
  /** Message to display (default: "Loading older dates...") */
  message?: string;
  /** Position of the indicator (default: "left") */
  position?: "left" | "center";
  /** Custom className for styling overrides */
  className?: string;
}

/**
 * Spinner component - simple animated loading spinner
 */
function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn("animate-spin", className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

/**
 * InfiniteScrollIndicator component
 *
 * Shows visual feedback during infinite scroll loading.
 * Appears with smooth animation when isVisible=true.
 *
 * @example
 * ```tsx
 * <InfiniteScrollIndicator
 *   isVisible={isLoadingBackward}
 *   message="Loading older dates..."
 *   position="left"
 * />
 * ```
 */
export function InfiniteScrollIndicator({
  isVisible,
  message = "Loading older dates...",
  position = "left",
  className,
}: InfiniteScrollIndicatorProps) {
  if (!isVisible) return null;

  return (
    <div
      className={cn(
        // Fixed to viewport - always visible regardless of scroll position
        "fixed z-50 bottom-6",
        // Styling
        "bg-white rounded-lg shadow-xl border border-gray-200 px-4 py-2.5",
        "flex items-center gap-2.5",
        // Animation
        "animate-in fade-in slide-in-from-bottom-4 duration-200",
        // Position variants
        position === "left" && "left-1/2 -translate-x-1/2",
        position === "center" && "left-1/2 -translate-x-1/2",
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      <Spinner className="h-4 w-4 text-blue-600" />
      <span className="text-sm font-medium text-gray-700">{message}</span>
    </div>
  );
}
