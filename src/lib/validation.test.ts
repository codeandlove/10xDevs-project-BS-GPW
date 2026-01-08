/**
 * Unit Tests for Validation Helpers
 * Test Coverage: isUUID, isEmail, isValidMetadata
 * Per test-plan.md section 3.1
 */

import { describe, it, expect } from "vitest";
import { isUUID, isEmail, isValidMetadata } from "@/lib/validation";

describe("Validation - isUUID", () => {
  it("should return true for valid UUID v4", () => {
    const validUUIDs = [
      "123e4567-e89b-12d3-a456-426614174000",
      "A987FBC9-4BED-3078-CF07-9141BA07C9F3",
      "a987fbc9-4bed-3078-cf07-9141ba07c9f3",
      "00000000-0000-0000-0000-000000000000",
    ];

    validUUIDs.forEach((uuid) => {
      expect(isUUID(uuid)).toBe(true);
    });
  });

  it("should return false for invalid UUIDs", () => {
    const invalidUUIDs = [
      "not-a-uuid",
      "123e4567-e89b-12d3-a456", // Too short
      "123e4567-e89b-12d3-a456-426614174000-extra", // Too long
      "123e4567e89b12d3a456426614174000", // Missing dashes
      "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", // Invalid characters
      "",
      "123e4567-e89b-12d3-a456-42661417400g", // Invalid character 'g'
    ];

    invalidUUIDs.forEach((uuid) => {
      expect(isUUID(uuid)).toBe(false);
    });
  });

  it("should return false for non-string values", () => {
    expect(isUUID(123)).toBe(false);
    expect(isUUID(null)).toBe(false);
    expect(isUUID(undefined)).toBe(false);
    expect(isUUID({})).toBe(false);
    expect(isUUID([])).toBe(false);
    expect(isUUID(true)).toBe(false);
  });

  it("should be case-insensitive", () => {
    const uuid = "123e4567-E89B-12D3-A456-426614174000";
    expect(isUUID(uuid)).toBe(true);
    expect(isUUID(uuid.toLowerCase())).toBe(true);
    expect(isUUID(uuid.toUpperCase())).toBe(true);
  });
});

describe("Validation - isEmail", () => {
  it("should return true for valid email addresses", () => {
    const validEmails = [
      "test@example.com",
      "user.name@domain.co.uk",
      "first+last@company.org",
      "email123@test-domain.com",
      "a@b.c",
      "user_name@example.com",
    ];

    validEmails.forEach((email) => {
      expect(isEmail(email)).toBe(true);
    });
  });

  it("should return false for invalid email addresses", () => {
    const invalidEmails = [
      "not-an-email",
      "@example.com", // Missing local part
      "user@", // Missing domain
      "user@domain", // Missing TLD
      "user @domain.com", // Space in local part
      "user@domain .com", // Space in domain
      "user@@domain.com", // Double @
      "user@domain@com", // Multiple @
      "",
      "user",
      "@",
    ];

    invalidEmails.forEach((email) => {
      expect(isEmail(email)).toBe(false);
    });
  });

  it("should return false for non-string values", () => {
    expect(isEmail(123)).toBe(false);
    expect(isEmail(null)).toBe(false);
    expect(isEmail(undefined)).toBe(false);
    expect(isEmail({})).toBe(false);
    expect(isEmail([])).toBe(false);
    expect(isEmail(true)).toBe(false);
  });

  it("should handle edge cases", () => {
    // Very long but valid email
    const longEmail = "a".repeat(64) + "@" + "b".repeat(63) + ".com";
    expect(isEmail(longEmail)).toBe(true);

    // Email with numbers
    expect(isEmail("user123@domain456.com")).toBe(true);

    // Email with hyphens
    expect(isEmail("user-name@test-domain.com")).toBe(true);
  });
});

describe("Validation - isValidMetadata", () => {
  it("should return true for valid metadata objects", () => {
    const validMetadata = [
      {},
      { key: "value" },
      { string: "text", number: 123, boolean: true },
      { nested: { object: { deep: "value" } } },
      { array: [1, 2, 3] }, // Array as property value is OK
      { null_value: null }, // null as property value is OK
      { undefined_value: undefined },
    ];

    validMetadata.forEach((metadata) => {
      expect(isValidMetadata(metadata)).toBe(true);
    });
  });

  it("should return false for non-object values", () => {
    expect(isValidMetadata(null)).toBe(false);
    expect(isValidMetadata(undefined)).toBe(false);
    expect(isValidMetadata("string")).toBe(false);
    expect(isValidMetadata(123)).toBe(false);
    expect(isValidMetadata(true)).toBe(false);
    expect(isValidMetadata([])).toBe(false); // Array is not valid metadata
    expect(isValidMetadata([1, 2, 3])).toBe(false);
  });

  it("should accept empty object", () => {
    expect(isValidMetadata({})).toBe(true);
  });

  it("should accept object with various data types as values", () => {
    const metadata = {
      string: "value",
      number: 42,
      boolean: true,
      null: null,
      array: [1, 2, 3],
      object: { nested: "value" },
    };
    expect(isValidMetadata(metadata)).toBe(true);
  });

  it("should reject arrays even with object-like properties", () => {
    const arrayLikeObject = [1, 2, 3];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (arrayLikeObject as any).customProperty = "value";
    expect(isValidMetadata(arrayLikeObject)).toBe(false);
  });

  it("should handle Date objects", () => {
    // Date is an object, so it should pass
    expect(isValidMetadata(new Date())).toBe(true);
  });

  it("should handle class instances", () => {
    class TestClass {
      prop = "value";
    }
    const instance = new TestClass();
    expect(isValidMetadata(instance)).toBe(true);
  });
});
