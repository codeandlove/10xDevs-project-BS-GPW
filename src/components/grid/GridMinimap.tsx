/**
 * Main minimap container component
 *
 * Integrates all minimap functionality: state management, drag interaction,
 * canvas rendering, and responsive mobile/desktop UI
 */

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Map, X } from "lucide-react";
import type { BlackSwanEventMinimal } from "@/types/nocodb.types";
import type { MinimapViewport } from "@/types/minimap.types";
import { calculateMinimapDimensions, calculateViewportRect, prepareMinimapEvents } from "@/lib/minimap-utils";
import { useMinimapState } from "@/hooks/useMinimapState";
import { useMinimapDrag } from "@/hooks/useMinimapDrag";
import { MinimapCanvas } from "./MinimapCanvas";
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetTitle,
  BottomSheetDescription,
  BottomSheetBody,
  BottomSheetFooter,
} from "@/components/ui/bottom-sheet";

interface GridMinimapProps {
  /** Array of black swan events to visualize */
  events: BlackSwanEventMinimal[];
  /** Array of symbol strings (grid rows) */
  symbols: string[];
  /** Array of date strings (grid columns) */
  dates: string[];
  /** Grid scroll container element */
  gridScrollElement: HTMLElement | null;
}

/**
 * Interactive minimap for grid navigation
 *
 * Features:
 * - Visualizes event distribution as colored pixels
 * - Shows current viewport rectangle
 * - Drag viewport to scroll grid
 * - Toggle visibility with persistence
 * - Responsive: fixed position on desktop, overlay on mobile
 *
 * @example
 * <GridMinimap
 *   events={blackSwanEvents}
 *   symbols={["AAPL", "TSLA", "MSFT"]}
 *   dates={["2024-01-15", "2024-01-16", ...]}
 *   gridScrollElement={parentRef.current}
 * />
 */
export function GridMinimap({ events, symbols, dates, gridScrollElement }: GridMinimapProps) {
  // State management
  const { isVisible, isDragging, isMobile, setIsDragging, toggleVisibility } = useMinimapState();

  // Ref for minimap scroll container (desktop mode only)
  const minimapScrollRef = useRef<HTMLDivElement>(null);

  // Viewport state (updated on scroll)
  const [viewport, setViewport] = useState<MinimapViewport>({
    x: 0,
    y: 0,
    width: 1,
    height: 1,
  });

  // Calculate minimap dimensions based on grid size
  const dimensions = useMemo(
    () => calculateMinimapDimensions(symbols.length, dates.length),
    [symbols.length, dates.length]
  );

  // Calculate mobile-specific dimensions (full width with aspect ratio)
  const mobileDimensions = useMemo(() => {
    if (!isMobile) return dimensions;

    const mobileWidth = typeof window !== "undefined" ? Math.min(window.innerWidth - 32, 600) : 280;
    const aspectRatio = dimensions.width / dimensions.height;
    const mobileHeight = mobileWidth / aspectRatio;

    return {
      width: Math.round(mobileWidth),
      height: Math.round(mobileHeight),
      cellWidth: (mobileWidth / dimensions.width) * dimensions.cellWidth,
      cellHeight: (mobileHeight / dimensions.height) * dimensions.cellHeight,
    };
  }, [dimensions, isMobile]);

  // Prepare events for minimap rendering
  const minimapEvents = useMemo(() => prepareMinimapEvents(events, symbols, dates), [events, symbols, dates]);

  // Update viewport rectangle when grid scrolls or resizes
  const updateViewport = useCallback(() => {
    if (!gridScrollElement) return;

    const newViewport = calculateViewportRect(
      gridScrollElement.scrollLeft,
      gridScrollElement.scrollTop,
      gridScrollElement.clientWidth,
      gridScrollElement.clientHeight,
      gridScrollElement.scrollWidth,
      gridScrollElement.scrollHeight
    );

    // Only update if viewport actually changed (avoid unnecessary re-renders)
    setViewport((prev) => {
      const hasChanged =
        Math.abs(prev.x - newViewport.x) > 0.001 ||
        Math.abs(prev.y - newViewport.y) > 0.001 ||
        Math.abs(prev.width - newViewport.width) > 0.001 ||
        Math.abs(prev.height - newViewport.height) > 0.001;

      return hasChanged ? newViewport : prev;
    });
  }, [gridScrollElement]);

  // Listen to scroll and resize events
  useEffect(() => {
    if (!gridScrollElement) return;

    // Initial viewport calculation
    updateViewport();

    // Add listeners
    gridScrollElement.addEventListener("scroll", updateViewport);
    window.addEventListener("resize", updateViewport);

    // Cleanup
    return () => {
      gridScrollElement.removeEventListener("scroll", updateViewport);
      window.removeEventListener("resize", updateViewport);
    };
  }, [gridScrollElement, updateViewport]);

  // Recalculate viewport when grid structure changes (symbols, dates, events)
  // Use RAF to ensure grid has rendered with new dimensions
  useEffect(() => {
    if (!gridScrollElement) return;

    const handle = requestAnimationFrame(() => {
      updateViewport();
    });

    return () => cancelAnimationFrame(handle);
  }, [symbols.length, dates.length, gridScrollElement, updateViewport]);

  // Auto-scroll minimap to keep viewport rectangle visible at top
  useEffect(() => {
    if (!minimapScrollRef.current || isMobile) return;

    const scrollContainer = minimapScrollRef.current;
    const { y } = viewport;

    // Convert viewport normalized coords to pixel coords
    const viewportTop = y * dimensions.height;

    // Get scroll container dimensions
    const containerHeight = scrollContainer.clientHeight;
    const scrollTop = scrollContainer.scrollTop;

    // Check if viewport top is outside the target zone (15%-25% from top)
    const isAboveTarget = viewportTop < scrollTop + containerHeight * 0.15;
    const isBelowTarget = viewportTop > scrollTop + containerHeight * 0.25;

    if (isAboveTarget || isBelowTarget) {
      // Scroll to position viewport at 20% from top of visible area
      const targetScrollTop = viewportTop - containerHeight * 0.2;
      scrollContainer.scrollTo({
        top: Math.max(0, targetScrollTop),
        behavior: isDragging ? "auto" : "smooth",
      });
    }
  }, [viewport, dimensions, isMobile, isDragging]);

  // Drag interaction (use mobile dimensions on mobile for correct coordinate transformation)
  const { handleMouseDown, handleTouchStart } = useMinimapDrag({
    dimensions: isMobile ? mobileDimensions : dimensions,
    viewport,
    gridScrollElement,
    onDragStart: () => setIsDragging(true),
    onDragEnd: () => setIsDragging(false),
  });

  // Keyboard handler for accessibility
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      // Enter/Space on minimap could toggle visibility or focus
      // For now, prevent default to avoid unintended actions
    }
  }, []);

  // Don't render if grid not ready
  if (!gridScrollElement || symbols.length === 0 || dates.length === 0) {
    return null;
  }

  // Toggle button when hidden
  if (!isVisible) {
    return (
      <button
        onClick={toggleVisibility}
        className="fixed bottom-4 right-4 z-40 flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 bg-white shadow-lg transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Pokaż mini-mapę"
        title="Pokaż mini-mapę"
      >
        <Map className="h-5 w-5 text-gray-700" />
      </button>
    );
  }

  // Mobile bottom sheet mode
  if (isMobile) {
    return (
      <BottomSheet open={isVisible} onOpenChange={toggleVisibility}>
        <BottomSheetContent>
          <BottomSheetHeader>
            <BottomSheetTitle>Nawiguj</BottomSheetTitle>
            <BottomSheetDescription>Dotknij mapy aby przejść do wybranej lokalizacji</BottomSheetDescription>
          </BottomSheetHeader>

          <BottomSheetBody>
            <div
              data-minimap
              role="button"
              tabIndex={0}
              className="mx-auto w-full"
              onMouseDown={handleMouseDown}
              onKeyDown={handleKeyDown}
              aria-label="Dotknij aby przewinąć grid"
            >
              <MinimapCanvas
                dimensions={mobileDimensions}
                events={minimapEvents}
                viewport={viewport}
                isDragging={isDragging}
                fullWidth={true}
              />
            </div>
          </BottomSheetBody>

          <BottomSheetFooter>
            <p className="w-full text-center text-sm text-muted-foreground">
              {minimapEvents.length} {minimapEvents.length === 1 ? "zdarzenie" : "zdarzeń"}
            </p>
          </BottomSheetFooter>
        </BottomSheetContent>
      </BottomSheet>
    );
  }

  // Desktop fixed position mode
  return (
    <div className="fixed bottom-4 right-4 z-40 flex w-[320px] max-h-[400px] flex-col rounded-lg border border-gray-300 bg-white p-3 shadow-lg">
      {/* Header with title and close button */}
      <div className="mb-2 flex shrink-0 items-center justify-between">
        <h4 className="text-xs font-semibold text-gray-700">Nawiguj</h4>
        <button
          onClick={toggleVisibility}
          className="flex h-6 w-6 items-center justify-center rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Ukryj mini-mapę"
          title="Ukryj mini-mapę"
        >
          <X className="h-4 w-4 text-gray-500" />
        </button>
      </div>

      {/* Canvas container with scroll */}
      <div ref={minimapScrollRef} data-minimap-scroll className="min-h-0 flex-1 overflow-auto">
        <div
          data-minimap
          role="button"
          tabIndex={0}
          className={`block ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
          onMouseDown={handleMouseDown}
          onKeyDown={handleKeyDown}
          aria-label="Przeciągnij aby przewinąć grid"
        >
          <MinimapCanvas
            dimensions={dimensions}
            events={minimapEvents}
            viewport={viewport}
            isDragging={isDragging}
            onTouchStart={handleTouchStart}
          />
        </div>
      </div>

      {/* Footer with event count */}
      <p className="mt-2 shrink-0 text-xs text-gray-500">
        {minimapEvents.length} {minimapEvents.length === 1 ? "zdarzenie" : "zdarzeń"}
      </p>
    </div>
  );
}
