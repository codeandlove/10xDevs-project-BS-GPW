/**
 * Canvas component for rendering minimap visualization
 *
 * Renders event pixels, viewport rectangle, and grid lines using Canvas 2D API
 * Optimized with requestAnimationFrame for smooth performance
 */

import { useRef, useEffect, memo } from "react";
import type { MinimapDimensions, MinimapViewport, MinimapEvent } from "@/types/minimap.types";
import { getEventColor, denormalizePosition } from "@/lib/minimap-utils";

interface MinimapCanvasProps {
  /** Physical dimensions of canvas in pixels */
  dimensions: MinimapDimensions;
  /** Events to render as pixels */
  events: MinimapEvent[];
  /** Current viewport rectangle in normalized coordinates */
  viewport: MinimapViewport;
  /** Whether user is currently dragging viewport */
  isDragging: boolean;
  /** Native touch start handler for drag functionality */
  onTouchStart?: (e: TouchEvent) => void;
  /** Whether to render canvas at 100% width (mobile) */
  fullWidth?: boolean;
}

/**
 * Renders minimap visualization on HTML canvas
 *
 * Performance optimizations:
 * - Uses requestAnimationFrame to batch renders
 * - Memoized to prevent unnecessary re-renders
 * - Single canvas context reused across renders
 *
 * @example
 * <MinimapCanvas
 *   dimensions={{ width: 300, height: 200, cellWidth: 3, cellHeight: 4 }}
 *   events={minimapEvents}
 *   viewport={{ x: 0.2, y: 0.3, width: 0.4, height: 0.3 }}
 *   isDragging={false}
 * />
 */
function MinimapCanvasComponent({
  dimensions,
  events,
  viewport,
  isDragging,
  onTouchStart,
  fullWidth = false,
}: MinimapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Attach native touch listener (both desktop and mobile for drag functionality)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !onTouchStart) return;

    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    return () => canvas.removeEventListener("touchstart", onTouchStart);
  }, [onTouchStart]);

  // Render canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Cancel any pending animation frame
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    // Schedule render in next animation frame
    animationFrameRef.current = requestAnimationFrame(() => {
      render(ctx, dimensions, events, viewport, isDragging);
    });

    // Cleanup on unmount or dependency change
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [dimensions, events, viewport, isDragging]);

  return (
    <canvas
      ref={canvasRef}
      width={dimensions.width}
      height={dimensions.height}
      className="block"
      style={{
        touchAction: fullWidth ? "auto" : "none",
        verticalAlign: "top",
        maxWidth: "100%",
      }}
      aria-label="Mapa nawigacyjna gridu"
    />
  );
}

/**
 * Render function for canvas drawing
 * Separated from component for clarity and testability
 */
function render(
  ctx: CanvasRenderingContext2D,
  dimensions: MinimapDimensions,
  events: MinimapEvent[],
  viewport: MinimapViewport,
  isDragging: boolean
) {
  const { width, height, cellWidth, cellHeight } = dimensions;

  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  // Draw background
  ctx.fillStyle = "#f9fafb"; // gray-50
  ctx.fillRect(0, 0, width, height);

  // Draw subtle grid lines for orientation (every 5 or 10 cells depending on size)
  const gridInterval = cellWidth < 5 ? 10 : 5;
  ctx.strokeStyle = "#e5e7eb"; // gray-200
  ctx.lineWidth = 0.5;

  // Vertical grid lines
  for (let i = gridInterval; i * cellWidth < width; i += gridInterval) {
    const x = i * cellWidth;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  // Horizontal grid lines
  for (let i = gridInterval; i * cellHeight < height; i += gridInterval) {
    const y = i * cellHeight;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Draw event pixels
  events.forEach((event) => {
    const x = event.dateIndex * cellWidth;
    const y = event.symbolIndex * cellHeight;
    const color = getEventColor(event.eventType);

    ctx.fillStyle = color;
    ctx.fillRect(x, y, cellWidth, cellHeight);
  });

  // Draw viewport rectangle
  const viewportPixels = denormalizePosition(viewport.x, viewport.y, dimensions);
  const viewportWidth = viewport.width * width;
  const viewportHeight = viewport.height * height;

  // Fill with semi-transparent blue (different alpha for dragging state)
  ctx.fillStyle = isDragging ? "rgba(59, 130, 246, 0.15)" : "rgba(59, 130, 246, 0.1)"; // blue-500
  ctx.fillRect(viewportPixels.x, viewportPixels.y, viewportWidth, viewportHeight);

  // Border with different line width for dragging state
  ctx.strokeStyle = "#3b82f6"; // blue-500
  ctx.lineWidth = isDragging ? 2 : 1.5;
  ctx.strokeRect(viewportPixels.x, viewportPixels.y, viewportWidth, viewportHeight);
}

// Custom comparison function for memo
function arePropsEqual(prev: MinimapCanvasProps, next: MinimapCanvasProps): boolean {
  // Compare dimensions
  if (
    prev.dimensions.width !== next.dimensions.width ||
    prev.dimensions.height !== next.dimensions.height ||
    prev.dimensions.cellWidth !== next.dimensions.cellWidth ||
    prev.dimensions.cellHeight !== next.dimensions.cellHeight
  ) {
    return false;
  }

  // Compare viewport (with small epsilon for floating point)
  const epsilon = 0.0001;
  if (
    Math.abs(prev.viewport.x - next.viewport.x) > epsilon ||
    Math.abs(prev.viewport.y - next.viewport.y) > epsilon ||
    Math.abs(prev.viewport.width - next.viewport.width) > epsilon ||
    Math.abs(prev.viewport.height - next.viewport.height) > epsilon
  ) {
    return false;
  }

  // Compare isDragging
  if (prev.isDragging !== next.isDragging) {
    return false;
  }

  // Compare events array (shallow - assumes events are stable references)
  if (prev.events.length !== next.events.length) {
    return false;
  }

  // If all checks pass, props are equal
  return true;
}

// Memoize to prevent unnecessary re-renders
export const MinimapCanvas = memo(MinimapCanvasComponent, arePropsEqual);
