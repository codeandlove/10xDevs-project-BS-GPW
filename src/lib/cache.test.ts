/**
 * Unit Tests for cache.ts (hashSymbols utility)
 */

import { describe, it, expect } from "vitest";
import { hashSymbols } from "./cache";

describe("cache - hashSymbols", () => {
  it("should return 'all' for empty array", () => {
    const result = hashSymbols([]);

    expect(result).toBe("all");
  });

  it("should return comma-separated string for <=5 symbols", () => {
    const result = hashSymbols(["PKN", "PKO", "CDR"]);

    expect(result).toBe("CDR,PKN,PKO");
  });

  it("should sort symbols alphabetically", () => {
    const result = hashSymbols(["ZZZ", "AAA", "MMM"]);

    expect(result).toBe("AAA,MMM,ZZZ");
  });

  it("should handle single symbol", () => {
    const result = hashSymbols(["PKN"]);

    expect(result).toBe("PKN");
  });

  it("should handle exactly 5 symbols", () => {
    const result = hashSymbols(["A", "B", "C", "D", "E"]);

    expect(result).toBe("A,B,C,D,E");
  });

  it("should return hash for >5 symbols", () => {
    const symbols = ["A", "B", "C", "D", "E", "F"];
    const result = hashSymbols(symbols);

    expect(result).toHaveLength(8);
    expect(result).toMatch(/^[0-9a-f]{8}$/);
  });

  it("should return same hash for same symbols in different order", () => {
    const hash1 = hashSymbols(["PKN", "PKO", "CDR", "CCC", "JSW", "PZU"]);
    const hash2 = hashSymbols(["PZU", "JSW", "CCC", "CDR", "PKO", "PKN"]);

    expect(hash1).toBe(hash2);
  });

  it("should return different hashes for different symbol sets", () => {
    const hash1 = hashSymbols(["A", "B", "C", "D", "E", "F"]);
    const hash2 = hashSymbols(["X", "Y", "Z", "W", "V", "U"]);

    expect(hash1).not.toBe(hash2);
  });

  it("should handle large arrays (>100 symbols)", () => {
    const largeArray = Array.from({ length: 200 }, (_, i) => `SYM${i}`);
    const result = hashSymbols(largeArray);

    expect(result).toHaveLength(8);
    expect(result).toMatch(/^[0-9a-f]{8}$/);
  });

  it("should produce consistent hashes", () => {
    const symbols = ["PKN", "PKO", "CDR", "CCC", "JSW", "PZU"];

    const hash1 = hashSymbols(symbols);
    const hash2 = hashSymbols(symbols);
    const hash3 = hashSymbols(symbols);

    expect(hash1).toBe(hash2);
    expect(hash2).toBe(hash3);
  });

  it("should handle symbols with special characters", () => {
    const result = hashSymbols(["PKN-PL", "PKO.WA", "CDR_OLD"]);

    expect(result).toBe("CDR_OLD,PKN-PL,PKO.WA");
  });

  it("should handle duplicate symbols by keeping them", () => {
    const result = hashSymbols(["PKN", "PKN", "PKO"]);

    expect(result).toBe("PKN,PKN,PKO");
  });
});
