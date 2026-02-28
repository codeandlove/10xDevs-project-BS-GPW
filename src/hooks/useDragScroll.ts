/**
 * useDragScroll - Drag-and-drop scrolling hook
 *
 * Enables users to scroll content by clicking and dragging (like Google Maps).
 * Particularly useful for horizontal scrolling on desktop and mobile devices.
 *
 * Features:
 * - Mouse and touch support (desktop + mobile)
 * - Configurable drag threshold to prevent accidental drags
 * - Direction control (horizontal, vertical, or both)
 * - Automatic cursor style management
 * - Prevents text selection during drag
 * - Excludes interactive elements (buttons, links, inputs)
 *
 * @example
 * ```tsx
 * const scrollRef = useRef<HTMLDivElement>(null);
 * const { isDragging } = useDragScroll({
 *   ref: scrollRef,
 *   enabled: true,
 *   direction: 'horizontal',
 *   dragThreshold: 5,
 * });
 *
 * return (
 *   <div
 *     ref={scrollRef}
 *     className={isDragging ? 'cursor-grabbing' : 'cursor-grab'}
 *   >
 *     {content}
 *   </div>
 * );
 * ```
 */

import { useEffect, useState, useCallback, useRef } from "react";
import type { RefObject } from "react";

interface UseDragScrollProps {
  /** Ref to the scrollable element */
  ref: RefObject<HTMLElement>;
  /** Enable/disable drag scrolling (default: true) */
  enabled?: boolean;
  /** Scroll direction (default: 'both') */
  direction?: "horizontal" | "vertical" | "both";
  /** Minimum pixel movement to start drag (prevents accidental drags) */
  dragThreshold?: number;
}

interface UseDragScrollReturn {
  /** Whether user is currently dragging */
  isDragging: boolean;
  /** Start drag programmatically (for custom handling) */
  dragStart: (e: MouseEvent | TouchEvent) => void;
  /** End drag programmatically */
  dragEnd: () => void;
}

/**
 * Check if element is interactive (should not trigger drag)
 */
function isInteractiveElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;

  const tagName = target.tagName.toLowerCase();
  const interactiveTags = ["button", "a", "input", "textarea", "select"];

  // Check if element itself is interactive
  if (interactiveTags.includes(tagName)) return true;

  // Check if element has role="button" or is contenteditable
  if (target.getAttribute("role") === "button") return true;
  if (target.contentEditable === "true") return true;

  // Check if element is inside an interactive parent
  let parent = target.parentElement;
  while (parent) {
    const parentTag = parent.tagName.toLowerCase();
    if (interactiveTags.includes(parentTag)) return true;
    if (parent.getAttribute("role") === "button") return true;
    parent = parent.parentElement;
  }

  return false;
}

/**
 * useDragScroll hook
 *
 * Enables drag-to-scroll functionality on any scrollable element.
 * Works with both mouse (desktop) and touch (mobile) events.
 *
 * @param props - Configuration options
 * @returns Object with isDragging state and control functions
 */
export function useDragScroll({
  ref,
  enabled = true,
  direction = "both",
  dragThreshold = 5,
}: UseDragScrollProps): UseDragScrollReturn {
  const [isDragging, setIsDragging] = useState(false);
  const [isPointerDown, setIsPointerDown] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [scrollPos, setScrollPos] = useState({ left: 0, top: 0 });
  const draggedRef = useRef(false); // Track if user actually dragged

  const dragStart = useCallback(
    (e: MouseEvent | TouchEvent) => {
      const element = ref.current;
      if (!element || !enabled) return;

      // Don't trigger drag on interactive elements
      if (isInteractiveElement(e.target)) return;

      // Get initial position (mouse or touch)
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

      setIsPointerDown(true);
      setStartPos({ x: clientX, y: clientY });
      setScrollPos({ left: element.scrollLeft, top: element.scrollTop });
      draggedRef.current = false; // Reset drag flag

      // Prevent text selection during drag
      e.preventDefault();
    },
    [ref, enabled]
  );

  const dragMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!isPointerDown) return;

      const element = ref.current;
      if (!element || !enabled) return;

      // Get current position
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

      // Calculate movement
      const deltaX = clientX - startPos.x;
      const deltaY = clientY - startPos.y;

      // Check if moved beyond threshold
      const movedEnough = Math.abs(deltaX) > dragThreshold || Math.abs(deltaY) > dragThreshold;

      if (movedEnough && !isDragging) {
        setIsDragging(true);
        draggedRef.current = true; // Mark as dragged
      }

      if (!movedEnough) return;

      // Apply scroll based on direction
      // Using scrollTo() to avoid react-compiler false positive about mutations
      const newScrollLeft =
        direction === "horizontal" || direction === "both" ? scrollPos.left - deltaX : element.scrollLeft;

      const newScrollTop =
        direction === "vertical" || direction === "both" ? scrollPos.top - deltaY : element.scrollTop;

      element.scrollTo(newScrollLeft, newScrollTop);

      // Prevent default to stop momentum scrolling on mobile
      e.preventDefault();
    },
    [ref, enabled, direction, dragThreshold, startPos, scrollPos, isPointerDown, isDragging]
  );

  const dragEnd = useCallback(() => {
    setIsDragging(false);
    setIsPointerDown(false);
  }, []);

  useEffect(() => {
    const element = ref.current;
    if (!element || !enabled) return;

    // Mouse events
    const handleMouseDown = (e: MouseEvent) => dragStart(e);
    const handleMouseMove = (e: MouseEvent) => dragMove(e);
    const handleMouseUp = () => dragEnd();
    const handleMouseLeave = () => dragEnd();

    // Touch events
    const handleTouchStart = (e: TouchEvent) => dragStart(e);
    const handleTouchMove = (e: TouchEvent) => dragMove(e);
    const handleTouchEnd = () => dragEnd();

    // Prevent clicks if user dragged
    const handleClick = (e: MouseEvent) => {
      if (draggedRef.current) {
        e.preventDefault();
        e.stopPropagation();
        draggedRef.current = false; // Reset after preventing click
      }
    };

    // Add event listeners
    element.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    element.addEventListener("mouseleave", handleMouseLeave);
    element.addEventListener("click", handleClick, true); // Capture phase to stop clicks early

    element.addEventListener("touchstart", handleTouchStart, { passive: false });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd);

    // Cleanup
    return () => {
      element.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      element.removeEventListener("mouseleave", handleMouseLeave);
      element.removeEventListener("click", handleClick, true);

      element.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [ref, enabled, dragStart, dragMove, dragEnd]);

  return {
    isDragging,
    dragStart,
    dragEnd,
  };
}
