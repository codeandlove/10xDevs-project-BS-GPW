/**
 * Unit Tests for UI Utility Functions
 * Test Coverage: formatDate, formatPercentChange, getEventTypeColor, getSentimentColor, getSentimentLabel
 * Per test-plan.md section 3.1
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  formatDate,
  formatDateShort,
  formatPercentChange,
  getEventTypeColor,
  getEventTypeBadgeVariant,
  getSentimentColor,
  getSentimentLabel,
  getActionColor,
  getActionLabel,
  daysRemaining,
  getSubscriptionStatusLabel,
  getSubscriptionStatusColor,
  getDatesInRange,
  debounce,
  throttle,
} from "@/lib/ui-utils";
import { getEventTypeCellColor } from "@/config/event-type-colors";
import type { EventType } from "@/types/nocodb.types";

describe("UI Utils - Date Formatting", () => {
  it("formatDate should format date to Polish locale", () => {
    const result = formatDate("2025-01-15");
    expect(result).toBe("15 stycznia 2025");
  });

  it("formatDate should handle different locales", () => {
    const result = formatDate("2025-01-15", "en-US");
    expect(result).toBe("January 15, 2025");
  });

  it("formatDateShort should format date to short format", () => {
    const result = formatDateShort("2025-01-15");
    expect(result).toMatch(/sty|Jan/i); // "sty 15" in Polish or "Jan 15" depending on locale
  });

  it("formatDateShort should handle different locales", () => {
    const result = formatDateShort("2025-01-15", "en-US");
    expect(result).toBe("Jan 15");
  });

  it("getDatesInRange should return 7 dates for week", () => {
    const dates = getDatesInRange("week");
    expect(dates).toHaveLength(7);
    expect(dates[0]).toMatch(/^\d{4}-\d{2}-\d{2}$/); // YYYY-MM-DD format
  });

  it("getDatesInRange should return 30 dates for month", () => {
    const dates = getDatesInRange("month");
    expect(dates).toHaveLength(30);
  });

  it("getDatesInRange should return 90 dates for quarter", () => {
    const dates = getDatesInRange("quarter");
    expect(dates).toHaveLength(90);
  });

  it("getDatesInRange should return dates in ascending order (oldest to newest)", () => {
    const dates = getDatesInRange("week");
    const firstDate = new Date(dates[0]);
    const lastDate = new Date(dates[dates.length - 1]);
    expect(firstDate.getTime()).toBeLessThan(lastDate.getTime());
  });
});

describe("UI Utils - Percent Change Formatting", () => {
  it("formatPercentChange should add + sign for positive values", () => {
    expect(formatPercentChange(5.67)).toBe("+5.67%");
  });

  it("formatPercentChange should not add + sign for negative values", () => {
    expect(formatPercentChange(-3.45)).toBe("-3.45%");
  });

  it("formatPercentChange should handle zero", () => {
    expect(formatPercentChange(0)).toBe("0.00%");
  });

  it("formatPercentChange should round to 2 decimal places", () => {
    expect(formatPercentChange(12.3456)).toBe("+12.35%");
    expect(formatPercentChange(-8.9876)).toBe("-8.99%");
  });
});

describe("UI Utils - Event Type Colors", () => {
  it("getEventTypeColor should return green for BLACK_SWAN_UP", () => {
    const result = getEventTypeColor("BLACK_SWAN_UP");
    expect(result).toContain("bg-green-100");
    expect(result).toContain("text-green-900");
  });

  it("getEventTypeColor should return red for BLACK_SWAN_DOWN", () => {
    const result = getEventTypeColor("BLACK_SWAN_DOWN");
    expect(result).toContain("bg-red-100");
    expect(result).toContain("text-red-900");
  });

  it("getEventTypeColor should return orange for VOLATILITY_UP", () => {
    const result = getEventTypeColor("VOLATILITY_UP");
    expect(result).toContain("bg-orange-100");
  });

  it("getEventTypeColor should return yellow for VOLATILITY_DOWN", () => {
    const result = getEventTypeColor("VOLATILITY_DOWN");
    expect(result).toContain("bg-yellow-100");
  });

  it("getEventTypeColor should return blue for BIG_MOVE", () => {
    const result = getEventTypeColor("BIG_MOVE");
    expect(result).toContain("bg-blue-100");
  });

  it("getEventTypeColor should return gray for unknown type", () => {
    const result = getEventTypeColor("UNKNOWN_TYPE");
    expect(result).toContain("bg-gray-100");
  });

  it("getEventTypeBadgeVariant should return correct variants", () => {
    expect(getEventTypeBadgeVariant("BLACK_SWAN_DOWN")).toBe("destructive");
    expect(getEventTypeBadgeVariant("BLACK_SWAN_UP")).toBe("default");
    expect(getEventTypeBadgeVariant("VOLATILITY_UP")).toBe("secondary");
  });

  it("getEventTypeColor should return same values as getEventTypeCellColor", () => {
    const eventTypes: EventType[] = [
      "BLACK_SWAN_UP",
      "BLACK_SWAN_DOWN",
      "VOLATILITY_UP",
      "VOLATILITY_DOWN",
      "BIG_MOVE",
    ];

    eventTypes.forEach((type) => {
      expect(getEventTypeColor(type)).toBe(getEventTypeCellColor(type));
    });
  });

  it("getEventTypeColor should return fallback for unknown event type", () => {
    expect(getEventTypeColor("UNKNOWN")).toContain("gray");
  });
});

describe("UI Utils - Sentiment", () => {
  it("getSentimentColor should return green for positive", () => {
    expect(getSentimentColor("positive")).toContain("text-green-600");
    expect(getSentimentColor("POSITIVE")).toContain("text-green-600"); // Case insensitive
  });

  it("getSentimentColor should return red for negative", () => {
    expect(getSentimentColor("negative")).toContain("text-red-600");
    expect(getSentimentColor("NEGATIVE")).toContain("text-red-600");
  });

  it("getSentimentColor should return gray for neutral", () => {
    expect(getSentimentColor("neutral")).toContain("text-gray-600");
  });

  it("getSentimentColor should return gray for unknown", () => {
    expect(getSentimentColor("unknown")).toContain("text-gray-600");
  });

  it("getSentimentLabel should return Polish labels", () => {
    expect(getSentimentLabel("positive")).toBe("Pozytywny");
    expect(getSentimentLabel("negative")).toBe("Negatywny");
    expect(getSentimentLabel("neutral")).toBe("Neutralny");
  });

  it("getSentimentLabel should be case insensitive", () => {
    expect(getSentimentLabel("POSITIVE")).toBe("Pozytywny");
    expect(getSentimentLabel("NeGaTiVe")).toBe("Negatywny");
  });

  it('getSentimentLabel should return "Nieznany" for unknown', () => {
    expect(getSentimentLabel("unknown")).toBe("Nieznany");
  });
});

describe("UI Utils - Recommended Actions", () => {
  it("getActionColor should return green for BUY", () => {
    expect(getActionColor("BUY")).toContain("text-green-700");
    expect(getActionColor("buy")).toContain("text-green-700"); // Case insensitive
  });

  it("getActionColor should return red for SELL", () => {
    expect(getActionColor("SELL")).toContain("text-red-700");
  });

  it("getActionColor should return yellow for HOLD", () => {
    expect(getActionColor("HOLD")).toContain("text-yellow-700");
  });

  it("getActionColor should return gray for unknown", () => {
    expect(getActionColor("UNKNOWN")).toContain("text-gray-700");
  });

  it("getActionLabel should return Polish labels", () => {
    expect(getActionLabel("BUY")).toBe("Kup");
    expect(getActionLabel("SELL")).toBe("Sprzedaj");
    expect(getActionLabel("HOLD")).toBe("Trzymaj");
  });

  it("getActionLabel should be case insensitive", () => {
    expect(getActionLabel("buy")).toBe("Kup");
    expect(getActionLabel("SeLl")).toBe("Sprzedaj");
  });

  it("getActionLabel should return original value for unknown", () => {
    expect(getActionLabel("CUSTOM_ACTION")).toBe("CUSTOM_ACTION");
  });
});

describe("UI Utils - Days Remaining", () => {
  beforeEach(() => {
    // Mock current date to 2025-01-15
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("daysRemaining should calculate positive days", () => {
    const result = daysRemaining("2025-01-20");
    expect(result).toBe(5);
  });

  it("daysRemaining should calculate negative days (expired)", () => {
    const result = daysRemaining("2025-01-10");
    expect(result).toBeLessThan(0);
  });

  it("daysRemaining should return null for null input", () => {
    expect(daysRemaining(null)).toBeNull();
  });

  it("daysRemaining should handle today", () => {
    const result = daysRemaining("2025-01-15");
    // Use Math.abs to handle -0 vs 0 issue
    expect(Math.abs(result ?? 0)).toBe(0);
  });
});

describe("UI Utils - Subscription Status", () => {
  it("getSubscriptionStatusLabel should return Polish labels", () => {
    expect(getSubscriptionStatusLabel("trial")).toBe("Trial");
    expect(getSubscriptionStatusLabel("active")).toBe("Aktywna");
    expect(getSubscriptionStatusLabel("past_due")).toBe("Zaległość w płatnościach");
    expect(getSubscriptionStatusLabel("canceled")).toBe("Anulowana");
    expect(getSubscriptionStatusLabel("expired")).toBe("Wygasła");
  });

  it('getSubscriptionStatusLabel should return "Nieznany" for unknown', () => {
    expect(getSubscriptionStatusLabel("unknown")).toBe("Nieznany");
  });

  it("getSubscriptionStatusColor should return correct colors", () => {
    expect(getSubscriptionStatusColor("trial")).toContain("text-blue-700");
    expect(getSubscriptionStatusColor("active")).toContain("text-green-700");
    expect(getSubscriptionStatusColor("past_due")).toContain("text-orange-700");
    expect(getSubscriptionStatusColor("canceled")).toContain("text-red-700");
    expect(getSubscriptionStatusColor("expired")).toContain("text-red-700");
  });

  it("getSubscriptionStatusColor should return gray for unknown", () => {
    expect(getSubscriptionStatusColor("unknown")).toContain("text-gray-700");
  });
});

describe("UI Utils - Debounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("debounce should delay function execution", () => {
    const mockFn = vi.fn();
    const debouncedFn = debounce(mockFn, 500);

    debouncedFn("test");
    expect(mockFn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(499);
    expect(mockFn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(mockFn).toHaveBeenCalledWith("test");
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it("debounce should reset timer on multiple calls", () => {
    const mockFn = vi.fn();
    const debouncedFn = debounce(mockFn, 500);

    debouncedFn("first");
    vi.advanceTimersByTime(300);
    debouncedFn("second");
    vi.advanceTimersByTime(300);
    debouncedFn("third");
    vi.advanceTimersByTime(500);

    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith("third");
  });
});

describe("UI Utils - Throttle", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("throttle should execute immediately on first call", () => {
    const mockFn = vi.fn();
    const throttledFn = throttle(mockFn, 500);

    throttledFn("test");
    expect(mockFn).toHaveBeenCalledWith("test");
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it("throttle should ignore calls within limit period", () => {
    const mockFn = vi.fn();
    const throttledFn = throttle(mockFn, 500);

    throttledFn("first");
    throttledFn("second");
    throttledFn("third");

    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith("first");
  });

  it("throttle should allow call after limit period", () => {
    const mockFn = vi.fn();
    const throttledFn = throttle(mockFn, 500);

    throttledFn("first");
    vi.advanceTimersByTime(500);
    throttledFn("second");

    expect(mockFn).toHaveBeenCalledTimes(2);
    expect(mockFn).toHaveBeenNthCalledWith(1, "first");
    expect(mockFn).toHaveBeenNthCalledWith(2, "second");
  });
});
