/**
 * Quick Validation Test - GridQuerySchema
 * Tests all 3 modes of elastic endpoint
 */

import { describe, it, expect } from "vitest";
import { GridQuerySchema } from "../nocodb-validation";

describe("GridQuerySchema - Elastic Approach", () => {
  describe("Mode 1: Explicit date range", () => {
    it("should accept start_date + end_date", () => {
      const result = GridQuerySchema.safeParse({
        start_date: "2026-01-01",
        end_date: "2026-02-18",
        symbols: "ABC,XYZ",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.start_date).toBe("2026-01-01");
        expect(result.data.end_date).toBe("2026-02-18");
        expect(result.data.symbols).toBe("ABC,XYZ");
      }
    });

    it("should reject if start_date >= end_date", () => {
      const result = GridQuerySchema.safeParse({
        start_date: "2026-02-18",
        end_date: "2026-01-01",
      });

      expect(result.success).toBe(false);
    });

    it("should reject if only start_date provided", () => {
      const result = GridQuerySchema.safeParse({
        start_date: "2026-01-01",
      });

      expect(result.success).toBe(false);
    });
  });

  describe("Mode 2: Range with anchor", () => {
    it("should accept range + end_date", () => {
      const result = GridQuerySchema.safeParse({
        range: "week",
        end_date: "2026-02-18",
        symbols: "ABC",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.range).toBe("week");
        expect(result.data.end_date).toBe("2026-02-18");
      }
    });

    it("should accept all range values", () => {
      expect(GridQuerySchema.safeParse({ range: "week" }).success).toBe(true);
      expect(GridQuerySchema.safeParse({ range: "month" }).success).toBe(true);
      expect(GridQuerySchema.safeParse({ range: "quarter" }).success).toBe(true);
    });
  });

  describe("Mode 3: Range only (backward compatible)", () => {
    it("should accept range without end_date", () => {
      const result = GridQuerySchema.safeParse({
        range: "week",
        symbols: "ABC,XYZ",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.range).toBe("week");
        expect(result.data.symbols).toBe("ABC,XYZ");
      }
    });

    it("should accept range with empty symbols (smartInitialization case)", () => {
      const result = GridQuerySchema.safeParse({
        range: "week",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.range).toBe("week");
      }
    });
  });

  describe("Invalid cases", () => {
    it("should reject if no range and no dates", () => {
      const result = GridQuerySchema.safeParse({
        symbols: "ABC",
      });

      expect(result.success).toBe(false);
    });

    it("should reject invalid date format", () => {
      const result = GridQuerySchema.safeParse({
        start_date: "2026-01-01",
        end_date: "invalid-date",
      });

      expect(result.success).toBe(false);
    });

    it("should reject invalid range value", () => {
      const result = GridQuerySchema.safeParse({
        range: "year",
      });

      expect(result.success).toBe(false);
    });

    it("should reject if end_date without start_date and without range", () => {
      const result = GridQuerySchema.safeParse({
        end_date: "2026-02-18",
      });

      expect(result.success).toBe(false);
    });
  });

  describe("Symbols validation", () => {
    it("should accept valid symbols", () => {
      const result = GridQuerySchema.safeParse({
        range: "week",
        symbols: "ABC,XYZ,QWE",
      });

      expect(result.success).toBe(true);
    });

    it("should reject symbols longer than 10 chars", () => {
      const result = GridQuerySchema.safeParse({
        range: "week",
        symbols: "VERYLONGSYMBOL",
      });

      expect(result.success).toBe(false);
    });

    it("should accept empty symbols", () => {
      const result = GridQuerySchema.safeParse({
        range: "week",
        symbols: "",
      });

      expect(result.success).toBe(true);
    });
  });
});
