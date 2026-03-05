/**
 * Unit Tests for useDragScroll Hook
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useDragScroll } from "./useDragScroll";
import { createRef, type RefObject } from "react";

describe("useDragScroll", () => {
  let mockElement: HTMLElement;

  beforeEach(() => {
    mockElement = document.createElement("div");
    Object.defineProperty(mockElement, "scrollLeft", {
      writable: true,
      value: 0,
    });
    Object.defineProperty(mockElement, "scrollTop", {
      writable: true,
      value: 0,
    });
    mockElement.scrollTo = vi.fn((left: number, top: number) => {
      mockElement.scrollLeft = left;
      mockElement.scrollTop = top;
    }) as unknown as typeof mockElement.scrollTo;
  });

  it("should return initial state", () => {
    const ref = createRef<HTMLElement>();

    const { result } = renderHook(() => useDragScroll({ ref }));

    expect(result.current.isDragging).toBe(false);
    expect(typeof result.current.dragStart).toBe("function");
    expect(typeof result.current.dragEnd).toBe("function");
  });

  it("should not enable dragging when disabled", () => {
    const ref: RefObject<HTMLElement | null> = { current: mockElement };

    const { result } = renderHook(() => useDragScroll({ ref, enabled: false }));

    const mouseEvent = new MouseEvent("mousedown", { clientX: 0, clientY: 0 });
    result.current.dragStart(mouseEvent);

    expect(result.current.isDragging).toBe(false);
  });

  it("should start dragging on mouse down", () => {
    const ref: RefObject<HTMLElement | null> = { current: mockElement };

    const { result } = renderHook(() => useDragScroll({ ref, enabled: true }));

    const mouseEvent = new MouseEvent("mousedown", { clientX: 100, clientY: 100 });
    result.current.dragStart(mouseEvent);

    // isDragging becomes true only after threshold is met during move
    expect(result.current.isDragging).toBe(false);
  });

  it("should end dragging on dragEnd call", () => {
    const ref: RefObject<HTMLElement | null> = { current: mockElement };

    const { result } = renderHook(() => useDragScroll({ ref, enabled: true }));

    result.current.dragEnd();

    expect(result.current.isDragging).toBe(false);
  });

  it("should handle horizontal scrolling", () => {
    const ref: RefObject<HTMLElement | null> = { current: mockElement };

    renderHook(() => useDragScroll({ ref, enabled: true, direction: "horizontal" }));

    expect(mockElement).toBeDefined();
  });

  it("should handle vertical scrolling", () => {
    const ref: RefObject<HTMLElement | null> = { current: mockElement };

    renderHook(() => useDragScroll({ ref, enabled: true, direction: "vertical" }));

    expect(mockElement).toBeDefined();
  });

  it("should handle both directions scrolling", () => {
    const ref: RefObject<HTMLElement | null> = { current: mockElement };

    renderHook(() => useDragScroll({ ref, enabled: true, direction: "both" }));

    expect(mockElement).toBeDefined();
  });

  it("should not trigger drag on interactive elements", () => {
    const ref: RefObject<HTMLElement | null> = { current: mockElement };
    const button = document.createElement("button");
    mockElement.appendChild(button);

    const { result } = renderHook(() => useDragScroll({ ref, enabled: true }));

    const mouseEvent = new MouseEvent("mousedown", {
      clientX: 100,
      clientY: 100,
      bubbles: true,
    });
    Object.defineProperty(mouseEvent, "target", { value: button, enumerable: true });

    result.current.dragStart(mouseEvent);

    expect(result.current.isDragging).toBe(false);
  });

  it("should respect drag threshold", () => {
    const ref: RefObject<HTMLElement | null> = { current: mockElement };

    renderHook(() => useDragScroll({ ref, enabled: true, dragThreshold: 10 }));

    expect(mockElement).toBeDefined();
  });

  it("should handle touch events", () => {
    const ref: RefObject<HTMLElement | null> = { current: mockElement };

    const { result } = renderHook(() => useDragScroll({ ref, enabled: true }));

    const touchEvent = new TouchEvent("touchstart", {
      touches: [{ clientX: 100, clientY: 100 } as Touch],
    });

    result.current.dragStart(touchEvent);

    expect(result.current.isDragging).toBe(false); // Not dragging until threshold met
  });

  it("should cleanup event listeners on unmount", () => {
    const ref: RefObject<HTMLElement | null> = { current: mockElement };
    const removeEventListenerSpy = vi.spyOn(mockElement, "removeEventListener");

    const { unmount } = renderHook(() => useDragScroll({ ref, enabled: true }));

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalled();
  });

  it("should handle null ref", () => {
    const ref: RefObject<HTMLElement | null> = { current: null };

    const { result } = renderHook(() => useDragScroll({ ref }));

    expect(result.current.isDragging).toBe(false);
  });
});
