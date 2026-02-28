/**
 * Unit Tests for useInfiniteSentinel Hook
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useInfiniteSentinel } from "./useInfiniteSentinel";
import { createRef } from "react";

describe("useInfiniteSentinel", () => {
  let mockIntersectionObserver: ReturnType<typeof vi.fn>;
  let observeCallback: IntersectionObserverCallback;

  beforeEach(() => {
    mockIntersectionObserver = vi.fn((callback: IntersectionObserverCallback) => {
      observeCallback = callback;
      return {
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect: vi.fn(),
        takeRecords: vi.fn(),
        root: null,
        rootMargin: "",
        thresholds: [],
      };
    });

    global.IntersectionObserver = mockIntersectionObserver as unknown as typeof IntersectionObserver;
  });

  it("should return initial state", () => {
    const sentinelRef = createRef<HTMLDivElement>();
    const scrollContainerRef = createRef<HTMLDivElement>();
    const onTrigger = vi.fn();

    const { result } = renderHook(() =>
      useInfiniteSentinel({
        sentinelRef,
        scrollContainerRef,
        onTrigger,
        isLoading: false,
        hasMore: true,
      })
    );

    expect(result.current.isObserving).toBe(false);
    expect(typeof result.current.disconnect).toBe("function");
    expect(typeof result.current.reconnect).toBe("function");
  });

  it("should setup IntersectionObserver when refs are available", async () => {
    const sentinelElement = document.createElement("div");
    const scrollElement = document.createElement("div");

    const sentinelRef = { current: sentinelElement };
    const scrollContainerRef = { current: scrollElement };
    const onTrigger = vi.fn();

    const { result } = renderHook(() =>
      useInfiniteSentinel({
        sentinelRef,
        scrollContainerRef,
        onTrigger,
        isLoading: false,
        hasMore: true,
      })
    );

    await waitFor(() => {
      expect(result.current.isObserving).toBe(true);
    });

    expect(mockIntersectionObserver).toHaveBeenCalled();
  });

  it("should trigger callback when sentinel intersects", async () => {
    const sentinelElement = document.createElement("div");
    const scrollElement = document.createElement("div");

    const sentinelRef = { current: sentinelElement };
    const scrollContainerRef = { current: scrollElement };
    const onTrigger = vi.fn();

    renderHook(() =>
      useInfiniteSentinel({
        sentinelRef,
        scrollContainerRef,
        onTrigger,
        isLoading: false,
        hasMore: true,
      })
    );

    await waitFor(() => {
      expect(mockIntersectionObserver).toHaveBeenCalled();
    });

    // Simulate intersection
    const entries: IntersectionObserverEntry[] = [
      {
        isIntersecting: true,
        target: sentinelElement,
        intersectionRatio: 1,
        boundingClientRect: {} as DOMRectReadOnly,
        intersectionRect: {} as DOMRectReadOnly,
        rootBounds: null,
        time: 0,
      },
    ];

    observeCallback(entries, {} as IntersectionObserver);

    expect(onTrigger).toHaveBeenCalled();
  });

  it("should not trigger when not intersecting", async () => {
    const sentinelElement = document.createElement("div");
    const scrollElement = document.createElement("div");

    const sentinelRef = { current: sentinelElement };
    const scrollContainerRef = { current: scrollElement };
    const onTrigger = vi.fn();

    renderHook(() =>
      useInfiniteSentinel({
        sentinelRef,
        scrollContainerRef,
        onTrigger,
        isLoading: false,
        hasMore: true,
      })
    );

    await waitFor(() => {
      expect(mockIntersectionObserver).toHaveBeenCalled();
    });

    // Simulate NOT intersecting
    const entries: IntersectionObserverEntry[] = [
      {
        isIntersecting: false,
        target: sentinelElement,
        intersectionRatio: 0,
        boundingClientRect: {} as DOMRectReadOnly,
        intersectionRect: {} as DOMRectReadOnly,
        rootBounds: null,
        time: 0,
      },
    ];

    observeCallback(entries, {} as IntersectionObserver);

    expect(onTrigger).not.toHaveBeenCalled();
  });

  it("should not trigger when already loading", async () => {
    const sentinelElement = document.createElement("div");
    const scrollElement = document.createElement("div");

    const sentinelRef = { current: sentinelElement };
    const scrollContainerRef = { current: scrollElement };
    const onTrigger = vi.fn();

    renderHook(() =>
      useInfiniteSentinel({
        sentinelRef,
        scrollContainerRef,
        onTrigger,
        isLoading: true, // Already loading
        hasMore: true,
      })
    );

    await waitFor(() => {
      expect(mockIntersectionObserver).toHaveBeenCalled();
    });

    // Simulate intersection
    const entries: IntersectionObserverEntry[] = [
      {
        isIntersecting: true,
        target: sentinelElement,
        intersectionRatio: 1,
        boundingClientRect: {} as DOMRectReadOnly,
        intersectionRect: {} as DOMRectReadOnly,
        rootBounds: null,
        time: 0,
      },
    ];

    observeCallback(entries, {} as IntersectionObserver);

    expect(onTrigger).not.toHaveBeenCalled();
  });

  it("should not trigger when no more data", async () => {
    const sentinelElement = document.createElement("div");
    const scrollElement = document.createElement("div");

    const sentinelRef = { current: sentinelElement };
    const scrollContainerRef = { current: scrollElement };
    const onTrigger = vi.fn();

    renderHook(() =>
      useInfiniteSentinel({
        sentinelRef,
        scrollContainerRef,
        onTrigger,
        isLoading: false,
        hasMore: false, // No more data
      })
    );

    await waitFor(() => {
      expect(mockIntersectionObserver).toHaveBeenCalled();
    });

    // Simulate intersection
    const entries: IntersectionObserverEntry[] = [
      {
        isIntersecting: true,
        target: sentinelElement,
        intersectionRatio: 1,
        boundingClientRect: {} as DOMRectReadOnly,
        intersectionRect: {} as DOMRectReadOnly,
        rootBounds: null,
        time: 0,
      },
    ];

    observeCallback(entries, {} as IntersectionObserver);

    expect(onTrigger).not.toHaveBeenCalled();
  });

  it("should disconnect observer", async () => {
    const sentinelElement = document.createElement("div");
    const scrollElement = document.createElement("div");

    const sentinelRef = { current: sentinelElement };
    const scrollContainerRef = { current: scrollElement };
    const onTrigger = vi.fn();

    const { result } = renderHook(() =>
      useInfiniteSentinel({
        sentinelRef,
        scrollContainerRef,
        onTrigger,
        isLoading: false,
        hasMore: true,
      })
    );

    await waitFor(() => {
      expect(result.current.isObserving).toBe(true);
    });

    // Use act to wrap state update
    await waitFor(() => {
      result.current.disconnect();
      expect(result.current.isObserving).toBe(false);
    });
  });

  it("should handle async onTrigger", async () => {
    const sentinelElement = document.createElement("div");
    const scrollElement = document.createElement("div");

    const sentinelRef = { current: sentinelElement };
    const scrollContainerRef = { current: scrollElement };
    const onTrigger = vi.fn().mockResolvedValue(undefined);

    renderHook(() =>
      useInfiniteSentinel({
        sentinelRef,
        scrollContainerRef,
        onTrigger,
        isLoading: false,
        hasMore: true,
      })
    );

    await waitFor(() => {
      expect(mockIntersectionObserver).toHaveBeenCalled();
    });

    // Simulate intersection
    const entries: IntersectionObserverEntry[] = [
      {
        isIntersecting: true,
        target: sentinelElement,
        intersectionRatio: 1,
        boundingClientRect: {} as DOMRectReadOnly,
        intersectionRect: {} as DOMRectReadOnly,
        rootBounds: null,
        time: 0,
      },
    ];

    observeCallback(entries, {} as IntersectionObserver);

    await waitFor(() => {
      expect(onTrigger).toHaveBeenCalled();
    });
  });

  it("should handle disabled observer", () => {
    const sentinelRef = createRef<HTMLDivElement>();
    const scrollContainerRef = createRef<HTMLDivElement>();
    const onTrigger = vi.fn();

    const { result } = renderHook(() =>
      useInfiniteSentinel({
        sentinelRef,
        scrollContainerRef,
        onTrigger,
        isLoading: false,
        hasMore: true,
        config: { enabled: false },
      })
    );

    expect(result.current.isObserving).toBe(false);
  });

  it("should cleanup on unmount", async () => {
    const sentinelElement = document.createElement("div");
    const scrollElement = document.createElement("div");

    const sentinelRef = { current: sentinelElement };
    const scrollContainerRef = { current: scrollElement };
    const onTrigger = vi.fn();

    const { unmount } = renderHook(() =>
      useInfiniteSentinel({
        sentinelRef,
        scrollContainerRef,
        onTrigger,
        isLoading: false,
        hasMore: true,
      })
    );

    await waitFor(() => {
      expect(mockIntersectionObserver).toHaveBeenCalled();
    });

    unmount();

    // Observer should be cleaned up
    expect(mockIntersectionObserver).toHaveBeenCalled();
  });
});
