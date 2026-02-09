/**
 * Hook for handling minimap drag interactions
 *
 * Manages mouse events for dragging viewport rectangle and synchronizing with grid scroll
 */

/* eslint-disable react-compiler/react-compiler */

import { useRef, useEffect, useCallback } from "react";
import type { MinimapDimensions, MinimapViewport } from "@/types/minimap.types";
import { normalizePosition } from "@/lib/minimap-utils";

interface UseMinimapDragProps {
  /** Physical dimensions of minimap canvas */
  dimensions: MinimapDimensions;
  /** Current viewport rectangle */
  viewport: MinimapViewport;
  /** Grid scroll container element */
  gridScrollElement: HTMLElement | null;
  /** Callback when drag starts */
  onDragStart: () => void;
  /** Callback when drag ends */
  onDragEnd: () => void;
}

interface UseMinimapDragReturn {
  /** Mouse down handler for canvas */
  handleMouseDown: (e: React.MouseEvent<HTMLElement>) => void;
  /** Native touch start handler to pass to canvas */
  handleTouchStart: ((e: TouchEvent) => void) | undefined;
}

/**
 * Custom hook for minimap drag and click interaction
 *
 * Features:
 * - Click inside viewport - start dragging with offset tracking
 * - Click outside viewport - jump grid to center viewport on click position
 * - Viewport clamping - can't drag outside minimap bounds
 * - Smooth grid scrolling synchronized with drag/jump
 * - Global mouse listeners with proper cleanup
 *
 * @example
 * const { handleMouseDown } = useMinimapDrag({
 *   dimensions,
 *   viewport,
 *   gridScrollElement: parentRef.current,
 *   onDragStart: () => setIsDragging(true),
 *   onDragEnd: () => setIsDragging(false)
 * });
 *
 * <canvas onMouseDown={handleMouseDown} />
 */
export function useMinimapDrag({
  dimensions,
  viewport,
  gridScrollElement,
  onDragStart,
  onDragEnd,
}: UseMinimapDragProps): UseMinimapDragReturn {
  // Use refs to avoid re-creating listeners on every render
  const isDraggingRef = useRef<boolean>(false);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const canvasElementRef = useRef<HTMLCanvasElement | null>(null);

  /**
   * Check if click position is inside viewport rectangle
   */
  const isInsideViewport = useCallback(
    (clickX: number, clickY: number, canvas: HTMLCanvasElement): boolean => {
      const rect = canvas.getBoundingClientRect();
      const x = clickX - rect.left;
      const y = clickY - rect.top;

      // Convert viewport normalized coords to pixels
      const viewportX = viewport.x * dimensions.width;
      const viewportY = viewport.y * dimensions.height;
      const viewportWidth = viewport.width * dimensions.width;
      const viewportHeight = viewport.height * dimensions.height;

      return x >= viewportX && x <= viewportX + viewportWidth && y >= viewportY && y <= viewportY + viewportHeight;
    },
    [viewport, dimensions]
  );

  /**
   * Handle mouse down on canvas - start drag if inside viewport, or jump if outside
   */
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      // Find canvas element (may be inside a div wrapper)
      const element = e.currentTarget;
      const canvas = element.tagName === "CANVAS" ? (element as HTMLCanvasElement) : element.querySelector("canvas");

      if (!canvas || !gridScrollElement) return;

      canvasElementRef.current = canvas;

      // Prevent text selection
      e.preventDefault();

      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      // Check if click is inside viewport rectangle
      const isInside = isInsideViewport(e.clientX, e.clientY, canvas);

      if (isInside) {
        // DRAG MODE: Click inside viewport - start dragging
        const viewportX = viewport.x * dimensions.width;
        const viewportY = viewport.y * dimensions.height;

        dragOffsetRef.current = {
          x: clickX - viewportX,
          y: clickY - viewportY,
        };

        isDraggingRef.current = true;
        onDragStart();
      } else {
        // JUMP MODE: Click outside viewport - center viewport on click position
        const normalized = normalizePosition(clickX, clickY, dimensions);

        // Calculate target position to center viewport on click
        const targetX = normalized.x - viewport.width / 2;
        const targetY = normalized.y - viewport.height / 2;

        // Clamp to valid range
        const clampedX = Math.max(0, Math.min(1 - viewport.width, targetX));
        const clampedY = Math.max(0, Math.min(1 - viewport.height, targetY));

        // Convert to scroll position
        const totalContentWidth = gridScrollElement.scrollWidth;
        const totalContentHeight = gridScrollElement.scrollHeight;

        gridScrollElement.scrollLeft = clampedX * totalContentWidth;
        gridScrollElement.scrollTop = clampedY * totalContentHeight;
      }
    },
    [isInsideViewport, viewport, dimensions, gridScrollElement, onDragStart]
  );

  /**
   * Handle touch events - stable callback function
   */
  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (!gridScrollElement) return;

      const canvas = e.currentTarget as HTMLCanvasElement;
      const touch = e.touches[0];
      if (!touch) return;

      // Prevent default immediately on canvas touch
      e.preventDefault();
      e.stopPropagation();

      canvasElementRef.current = canvas;
      const rect = canvas.getBoundingClientRect();
      const clickX = touch.clientX - rect.left;
      const clickY = touch.clientY - rect.top;
      const isInside = isInsideViewport(touch.clientX, touch.clientY, canvas);

      if (isInside) {
        // DRAG MODE
        const viewportX = viewport.x * dimensions.width;
        const viewportY = viewport.y * dimensions.height;
        dragOffsetRef.current = { x: clickX - viewportX, y: clickY - viewportY };
        isDraggingRef.current = true;
        onDragStart();

        const handleTouchMoveLocal = (moveEvent: TouchEvent) => {
          if (!isDraggingRef.current || !canvasElementRef.current || !gridScrollElement) return;
          const moveTouch = moveEvent.touches[0];
          if (!moveTouch) return;
          moveEvent.preventDefault();

          const moveRect = canvasElementRef.current.getBoundingClientRect();
          const moveTouchX = moveTouch.clientX - moveRect.left;
          const moveTouchY = moveTouch.clientY - moveRect.top;
          const newViewportX = moveTouchX - dragOffsetRef.current.x;
          const newViewportY = moveTouchY - dragOffsetRef.current.y;
          const normalized = normalizePosition(newViewportX, newViewportY, dimensions);
          const clampedX = Math.max(0, Math.min(1 - viewport.width, normalized.x));
          const clampedY = Math.max(0, Math.min(1 - viewport.height, normalized.y));
          gridScrollElement.scrollLeft = clampedX * gridScrollElement.scrollWidth;
          gridScrollElement.scrollTop = clampedY * gridScrollElement.scrollHeight;
        };

        const handleTouchEndLocal = () => {
          canvas.removeEventListener("touchmove", handleTouchMoveLocal);
          if (isDraggingRef.current) {
            isDraggingRef.current = false;
            onDragEnd();
          }
        };

        canvas.addEventListener("touchmove", handleTouchMoveLocal, { passive: false });
        canvas.addEventListener("touchend", handleTouchEndLocal, { once: true });
        canvas.addEventListener("touchcancel", handleTouchEndLocal, { once: true });
      } else {
        // JUMP MODE
        const normalized = normalizePosition(clickX, clickY, dimensions);
        const targetX = normalized.x - viewport.width / 2;
        const targetY = normalized.y - viewport.height / 2;
        const clampedX = Math.max(0, Math.min(1 - viewport.width, targetX));
        const clampedY = Math.max(0, Math.min(1 - viewport.height, targetY));
        gridScrollElement.scrollLeft = clampedX * gridScrollElement.scrollWidth;
        gridScrollElement.scrollTop = clampedY * gridScrollElement.scrollHeight;
      }
    },
    [viewport, dimensions, gridScrollElement, isInsideViewport, onDragStart, onDragEnd]
  );

  /**
   * Handle mouse/touch move - update scroll position if dragging
   */
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !canvasElementRef.current || !gridScrollElement) {
        return;
      }

      const canvas = canvasElementRef.current;
      const rect = canvas.getBoundingClientRect();

      // Calculate new viewport position accounting for drag offset
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const newViewportX = mouseX - dragOffsetRef.current.x;
      const newViewportY = mouseY - dragOffsetRef.current.y;

      // Normalize to 0-1 range
      const normalized = normalizePosition(newViewportX, newViewportY, dimensions);

      // Clamp to valid range (viewport can't extend beyond bounds)
      const clampedX = Math.max(0, Math.min(1 - viewport.width, normalized.x));
      const clampedY = Math.max(0, Math.min(1 - viewport.height, normalized.y));

      // Convert normalized position to scroll position
      const totalContentWidth = gridScrollElement.scrollWidth;
      const totalContentHeight = gridScrollElement.scrollHeight;

      gridScrollElement.scrollLeft = clampedX * totalContentWidth;
      gridScrollElement.scrollTop = clampedY * totalContentHeight;
    };

    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        onDragEnd();
      }
    };

    const handleTouchEnd = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        onDragEnd();
      }
    };

    // Add global listeners for both mouse and touch
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    // Note: touchmove is added directly to canvas in handleTouchStart, not globally
    // This allows better control of passive behavior and prevents scroll blocking
    window.addEventListener("touchend", handleTouchEnd);
    window.addEventListener("touchcancel", handleTouchEnd);

    // Cleanup
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [dimensions, viewport.width, viewport.height, gridScrollElement, onDragEnd]);

  return { handleMouseDown, handleTouchStart };
}
