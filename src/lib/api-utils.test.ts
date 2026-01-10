import { describe, it, expect } from "vitest";
import { createSuccessResponse, createErrorResponse, zodErrorsToArray, isValidUUID } from "./api-utils";

describe("API Utils", () => {
  describe("createSuccessResponse", () => {
    it("should create success response with default status 200", async () => {
      const data = { userId: "123", name: "Test User" };
      const response = createSuccessResponse(data);

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("application/json");

      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data).toEqual(data);
      expect(body.timestamp).toBeDefined();
      expect(new Date(body.timestamp).getTime()).toBeGreaterThan(0);
    });

    it("should create success response with custom status code", async () => {
      const data = { created: true };
      const response = createSuccessResponse(data, 201);

      expect(response.status).toBe(201);

      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data).toEqual(data);
    });

    it("should handle null data", async () => {
      const response = createSuccessResponse(null);

      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeNull();
      expect(body.timestamp).toBeDefined();
    });

    it("should handle array data", async () => {
      const data = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const response = createSuccessResponse(data);

      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data).toEqual(data);
      expect(Array.isArray(body.data)).toBe(true);
    });

    it("should include ISO timestamp", async () => {
      const response = createSuccessResponse({ test: true });

      const body = await response.json();
      expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(() => new Date(body.timestamp)).not.toThrow();
    });

    it("should handle complex nested objects", async () => {
      const complexData = {
        user: {
          id: "user-123",
          profile: {
            name: "John Doe",
            settings: {
              theme: "dark",
              notifications: true,
            },
          },
        },
        metadata: {
          createdAt: "2024-01-01",
          tags: ["tag1", "tag2"],
        },
      };

      const response = createSuccessResponse(complexData);
      const body = await response.json();

      expect(body.data).toEqual(complexData);
    });
  });

  describe("createErrorResponse", () => {
    it("should create error response with default status 500", async () => {
      const response = createErrorResponse("Internal error");

      expect(response.status).toBe(500);
      expect(response.headers.get("Content-Type")).toBe("application/json");

      const body = await response.json();
      expect(body.error).toBe("Internal error");
      expect(body.message).toBeUndefined();
      expect(body.details).toBeUndefined();
    });

    it("should create error response with custom status code", async () => {
      const response = createErrorResponse("Not found", 404);

      expect(response.status).toBe(404);

      const body = await response.json();
      expect(body.error).toBe("Not found");
    });

    it("should include optional message", async () => {
      const response = createErrorResponse("Validation failed", 400, "Email field is required");

      const body = await response.json();
      expect(body.error).toBe("Validation failed");
      expect(body.message).toBe("Email field is required");
    });

    it("should include optional details array", async () => {
      const details = ["Field 'email' is required", "Field 'password' must be at least 8 characters"];
      const response = createErrorResponse("Validation error", 400, "Invalid input", details);

      const body = await response.json();
      expect(body.error).toBe("Validation error");
      expect(body.message).toBe("Invalid input");
      expect(body.details).toEqual(details);
    });

    it("should omit message if not provided", async () => {
      const response = createErrorResponse("Error", 500, undefined, ["detail1"]);

      const body = await response.json();
      expect(body.error).toBe("Error");
      expect(body.message).toBeUndefined();
      expect(body.details).toEqual(["detail1"]);
    });

    it("should omit details if not provided", async () => {
      const response = createErrorResponse("Error", 500, "Some message");

      const body = await response.json();
      expect(body.error).toBe("Error");
      expect(body.message).toBe("Some message");
      expect(body.details).toBeUndefined();
    });

    it("should handle 400 Bad Request errors", async () => {
      const response = createErrorResponse("Bad Request", 400, "Invalid parameters");

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("Bad Request");
    });

    it("should handle 401 Unauthorized errors", async () => {
      const response = createErrorResponse("Unauthorized", 401);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe("Unauthorized");
    });

    it("should handle 403 Forbidden errors", async () => {
      const response = createErrorResponse("Forbidden", 403, "Access denied");

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toBe("Forbidden");
      expect(body.message).toBe("Access denied");
    });
  });

  describe("zodErrorsToArray", () => {
    it("should convert Zod field errors to string array", () => {
      const fieldErrors = {
        email: ["Invalid email format", "Email is required"],
        password: ["Password must be at least 8 characters"],
      };

      const result = zodErrorsToArray(fieldErrors);

      expect(result).toEqual([
        "email: Invalid email format",
        "email: Email is required",
        "password: Password must be at least 8 characters",
      ]);
    });

    it("should handle empty errors object", () => {
      const result = zodErrorsToArray({});
      expect(result).toEqual([]);
    });

    it("should skip undefined error values", () => {
      const fieldErrors = {
        email: ["Invalid email"],
        password: undefined,
        username: ["Username taken"],
      };

      const result = zodErrorsToArray(fieldErrors);

      expect(result).toEqual(["email: Invalid email", "username: Username taken"]);
    });

    it("should handle single error per field", () => {
      const fieldErrors = {
        name: ["Name is required"],
      };

      const result = zodErrorsToArray(fieldErrors);
      expect(result).toEqual(["name: Name is required"]);
    });

    it("should handle multiple errors for same field", () => {
      const fieldErrors = {
        password: ["Too short", "Must contain number", "Must contain special character"],
      };

      const result = zodErrorsToArray(fieldErrors);

      expect(result).toEqual([
        "password: Too short",
        "password: Must contain number",
        "password: Must contain special character",
      ]);
    });

    it("should preserve field order", () => {
      const fieldErrors = {
        firstName: ["Required"],
        lastName: ["Required"],
        email: ["Invalid format"],
      };

      const result = zodErrorsToArray(fieldErrors);

      expect(result[0]).toContain("firstName");
      expect(result[1]).toContain("lastName");
      expect(result[2]).toContain("email");
    });
  });

  describe("isValidUUID", () => {
    it("should return true for valid UUID v4", () => {
      const validUUIDs = [
        "123e4567-e89b-12d3-a456-426614174000",
        "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        "550e8400-e29b-41d4-a716-446655440000",
        "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      ];

      validUUIDs.forEach((uuid) => {
        expect(isValidUUID(uuid)).toBe(true);
      });
    });

    it("should return true for uppercase UUIDs", () => {
      const uuid = "123E4567-E89B-12D3-A456-426614174000";
      expect(isValidUUID(uuid)).toBe(true);
    });

    it("should return true for lowercase UUIDs", () => {
      const uuid = "123e4567-e89b-12d3-a456-426614174000";
      expect(isValidUUID(uuid)).toBe(true);
    });

    it("should return false for invalid UUID format", () => {
      const invalidUUIDs = [
        "not-a-uuid",
        "123456",
        "",
        "123e4567-e89b-12d3-a456", // Too short
        "123e4567-e89b-12d3-a456-426614174000-extra", // Too long
        "123e4567e89b12d3a456426614174000", // Missing dashes
        "gggggggg-gggg-gggg-gggg-gggggggggggg", // Invalid hex characters
        "123e4567-e89b-12d3-a456-42661417400g", // Invalid character at end
      ];

      invalidUUIDs.forEach((uuid) => {
        expect(isValidUUID(uuid)).toBe(false);
      });
    });

    it("should return false for null or undefined", () => {
      expect(isValidUUID(null as unknown as string)).toBe(false);
      expect(isValidUUID(undefined as unknown as string)).toBe(false);
    });

    it("should return false for numbers", () => {
      expect(isValidUUID(12345 as unknown as string)).toBe(false);
    });

    it("should return false for objects", () => {
      expect(isValidUUID({} as unknown as string)).toBe(false);
      expect(isValidUUID([] as unknown as string)).toBe(false);
    });

    it("should handle UUIDs with mixed case", () => {
      const mixedCaseUUID = "123e4567-E89B-12d3-A456-426614174000";
      expect(isValidUUID(mixedCaseUUID)).toBe(true);
    });
  });
});
