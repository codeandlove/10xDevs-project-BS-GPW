import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("Utils", () => {
  describe("cn (className merger)", () => {
    it("should merge single class name", () => {
      const result = cn("text-red-500");
      expect(result).toBe("text-red-500");
    });

    it("should merge multiple class names", () => {
      const result = cn("text-red-500", "bg-blue-200");
      expect(result).toContain("text-red-500");
      expect(result).toContain("bg-blue-200");
    });

    it("should handle conditional classes", () => {
      const isActive = true;
      const result = cn("base-class", isActive && "active-class");
      expect(result).toContain("base-class");
      expect(result).toContain("active-class");
    });

    it("should omit false conditional classes", () => {
      const isActive = false;
      const result = cn("base-class", isActive && "active-class");
      expect(result).toBe("base-class");
      expect(result).not.toContain("active-class");
    });

    it("should merge conflicting Tailwind classes (twMerge)", () => {
      // twMerge should keep the last conflicting class
      const result = cn("px-2", "px-4");
      expect(result).toBe("px-4");
      expect(result).not.toContain("px-2");
    });

    it("should handle arrays of classes", () => {
      const result = cn(["text-sm", "font-bold"]);
      expect(result).toContain("text-sm");
      expect(result).toContain("font-bold");
    });

    it("should handle objects with boolean values", () => {
      const result = cn({
        "text-red-500": true,
        "bg-blue-200": false,
        "font-bold": true,
      });
      expect(result).toContain("text-red-500");
      expect(result).toContain("font-bold");
      expect(result).not.toContain("bg-blue-200");
    });

    it("should handle mixed inputs (strings, arrays, objects)", () => {
      const result = cn("base", ["text-sm"], { "font-bold": true, hidden: false });
      expect(result).toContain("base");
      expect(result).toContain("text-sm");
      expect(result).toContain("font-bold");
      expect(result).not.toContain("hidden");
    });

    it("should handle undefined and null gracefully", () => {
      const result = cn("base", undefined, null, "text-sm");
      expect(result).toContain("base");
      expect(result).toContain("text-sm");
    });

    it("should handle empty input", () => {
      const result = cn();
      expect(result).toBe("");
    });

    it("should deduplicate classes", () => {
      const result = cn("text-sm", "text-sm", "font-bold");
      // Should only contain text-sm once
      const matches = result.match(/text-sm/g);
      expect(matches?.length).toBe(1);
    });

    it("should work with complex Tailwind utility chains", () => {
      const result = cn("hover:bg-blue-500", "focus:ring-2", "active:scale-95");
      expect(result).toContain("hover:bg-blue-500");
      expect(result).toContain("focus:ring-2");
      expect(result).toContain("active:scale-95");
    });
  });
});
