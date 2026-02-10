import { describe, it, expect } from "vitest";
import {
  EVENT_TYPE_COLORS,
  FALLBACK_COLORS,
  getEventTypeCellColor,
  getEventTypeBadgeColor,
  getEventTypePixelColor,
  getEventTypeLabel,
  getAllEventTypeColors,
} from "@/config/event-type-colors";
import type { EventType } from "@/types/nocodb.types";

describe("event-type-colors", () => {
  describe("EVENT_TYPE_COLORS", () => {
    it("should define colors for all event types", () => {
      const eventTypes: EventType[] = [
        "BLACK_SWAN_UP",
        "BLACK_SWAN_DOWN",
        "VOLATILITY_UP",
        "VOLATILITY_DOWN",
        "BIG_MOVE",
      ];

      eventTypes.forEach((type) => {
        expect(EVENT_TYPE_COLORS[type]).toBeDefined();
        expect(EVENT_TYPE_COLORS[type].cell).toBeTruthy();
        expect(EVENT_TYPE_COLORS[type].badge).toBeTruthy();
        expect(EVENT_TYPE_COLORS[type].pixel).toBeTruthy();
        expect(EVENT_TYPE_COLORS[type].label).toBeTruthy();
      });
    });

    it("should use correct color scheme for BLACK_SWAN_UP", () => {
      expect(EVENT_TYPE_COLORS.BLACK_SWAN_UP.cell).toContain("green");
      expect(EVENT_TYPE_COLORS.BLACK_SWAN_UP.badge).toBe("bg-green-500");
      expect(EVENT_TYPE_COLORS.BLACK_SWAN_UP.pixel).toBe("#22c55e");
    });

    it("should use correct color scheme for BLACK_SWAN_DOWN", () => {
      expect(EVENT_TYPE_COLORS.BLACK_SWAN_DOWN.cell).toContain("red");
      expect(EVENT_TYPE_COLORS.BLACK_SWAN_DOWN.badge).toBe("bg-red-500");
      expect(EVENT_TYPE_COLORS.BLACK_SWAN_DOWN.pixel).toBe("#ef4444");
    });

    it("should use correct color scheme for VOLATILITY_UP", () => {
      expect(EVENT_TYPE_COLORS.VOLATILITY_UP.cell).toContain("orange");
      expect(EVENT_TYPE_COLORS.VOLATILITY_UP.badge).toBe("bg-orange-500");
      expect(EVENT_TYPE_COLORS.VOLATILITY_UP.pixel).toBe("#f97316");
    });

    it("should use correct color scheme for VOLATILITY_DOWN", () => {
      expect(EVENT_TYPE_COLORS.VOLATILITY_DOWN.cell).toContain("yellow");
      expect(EVENT_TYPE_COLORS.VOLATILITY_DOWN.badge).toBe("bg-yellow-500");
      expect(EVENT_TYPE_COLORS.VOLATILITY_DOWN.pixel).toBe("#eab308");
    });

    it("should use correct color scheme for BIG_MOVE", () => {
      expect(EVENT_TYPE_COLORS.BIG_MOVE.cell).toContain("blue");
      expect(EVENT_TYPE_COLORS.BIG_MOVE.badge).toBe("bg-blue-500");
      expect(EVENT_TYPE_COLORS.BIG_MOVE.pixel).toBe("#3b82f6");
    });
  });

  describe("FALLBACK_COLORS", () => {
    it("should provide fallback colors", () => {
      expect(FALLBACK_COLORS.cell).toContain("gray");
      expect(FALLBACK_COLORS.badge).toBe("bg-gray-500");
      expect(FALLBACK_COLORS.pixel).toBe("#6b7280");
    });
  });

  describe("getEventTypeCellColor", () => {
    it("should return correct cell color for valid event type", () => {
      expect(getEventTypeCellColor("BLACK_SWAN_UP")).toBe("bg-green-100 text-green-900 border-green-300");
    });

    it("should return fallback color for unknown event type", () => {
      expect(getEventTypeCellColor("UNKNOWN" as EventType)).toBe(FALLBACK_COLORS.cell);
    });
  });

  describe("getEventTypeBadgeColor", () => {
    it("should return correct badge color for valid event type", () => {
      expect(getEventTypeBadgeColor("BLACK_SWAN_UP")).toBe("bg-green-500");
    });

    it("should return fallback color for unknown event type", () => {
      expect(getEventTypeBadgeColor("UNKNOWN" as EventType)).toBe(FALLBACK_COLORS.badge);
    });
  });

  describe("getEventTypePixelColor", () => {
    it("should return correct pixel color for valid event type", () => {
      expect(getEventTypePixelColor("BLACK_SWAN_UP")).toBe("#22c55e");
    });

    it("should return fallback color for unknown event type", () => {
      expect(getEventTypePixelColor("UNKNOWN" as EventType)).toBe(FALLBACK_COLORS.pixel);
    });
  });

  describe("getEventTypeLabel", () => {
    it("should return correct label for valid event type", () => {
      expect(getEventTypeLabel("BLACK_SWAN_UP")).toBe("Czarny Łabędź (wzrost)");
    });

    it("should return fallback label for unknown event type", () => {
      expect(getEventTypeLabel("UNKNOWN" as EventType)).toBe(FALLBACK_COLORS.label);
    });
  });

  describe("getAllEventTypeColors", () => {
    it("should return all event types with colors", () => {
      const all = getAllEventTypeColors();
      expect(all).toHaveLength(5);
      expect(all[0]).toHaveProperty("value");
      expect(all[0]).toHaveProperty("colors");
    });

    it("should return event types with all color variants", () => {
      const all = getAllEventTypeColors();
      all.forEach((item) => {
        expect(item.colors.cell).toBeTruthy();
        expect(item.colors.badge).toBeTruthy();
        expect(item.colors.pixel).toBeTruthy();
        expect(item.colors.label).toBeTruthy();
      });
    });
  });
});
