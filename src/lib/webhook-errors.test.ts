import { describe, it, expect } from "vitest";
import {
  WebhookError,
  SignatureVerificationError,
  EventProcessingError,
  WebhookUserNotFoundError,
  WebhookDatabaseError,
  MissingSignatureError,
} from "./webhook-errors";

describe("Webhook Error Classes", () => {
  describe("WebhookError", () => {
    it("should create error with all properties", () => {
      const error = new WebhookError("Test error", "TEST_CODE", 500, true);

      expect(error.message).toBe("Test error");
      expect(error.code).toBe("TEST_CODE");
      expect(error.statusCode).toBe(500);
      expect(error.retryable).toBe(true);
      expect(error.name).toBe("WebhookError");
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(WebhookError);
    });

    it("should default retryable to false", () => {
      const error = new WebhookError("Test", "CODE", 400);

      expect(error.retryable).toBe(false);
    });

    it("should have stack trace", () => {
      const error = new WebhookError("Test", "CODE", 500);

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain("WebhookError");
    });
  });

  describe("SignatureVerificationError", () => {
    it("should create error with default message", () => {
      const error = new SignatureVerificationError();

      expect(error.message).toBe("Invalid webhook signature");
      expect(error.code).toBe("INVALID_SIGNATURE");
      expect(error.statusCode).toBe(400);
      expect(error.retryable).toBe(false);
      expect(error.name).toBe("SignatureVerificationError");
      expect(error).toBeInstanceOf(SignatureVerificationError);
      expect(error).toBeInstanceOf(WebhookError);
    });

    it("should create error with custom message", () => {
      const error = new SignatureVerificationError("Custom signature error");

      expect(error.message).toBe("Custom signature error");
      expect(error.code).toBe("INVALID_SIGNATURE");
      expect(error.statusCode).toBe(400);
      expect(error.retryable).toBe(false);
    });

    it("should not be retryable", () => {
      const error = new SignatureVerificationError();
      expect(error.retryable).toBe(false);
    });
  });

  describe("EventProcessingError", () => {
    it("should create retryable error by default", () => {
      const error = new EventProcessingError("Processing failed");

      expect(error.message).toBe("Processing failed");
      expect(error.code).toBe("PROCESSING_ERROR");
      expect(error.statusCode).toBe(500);
      expect(error.retryable).toBe(true);
      expect(error.name).toBe("EventProcessingError");
      expect(error).toBeInstanceOf(EventProcessingError);
      expect(error).toBeInstanceOf(WebhookError);
    });

    it("should create non-retryable error when specified", () => {
      const error = new EventProcessingError("Fatal error", false);

      expect(error.message).toBe("Fatal error");
      expect(error.retryable).toBe(false);
    });

    it("should be retryable by default", () => {
      const error = new EventProcessingError("Temporary failure");
      expect(error.retryable).toBe(true);
    });
  });

  describe("WebhookUserNotFoundError", () => {
    it("should create error with customer ID in message", () => {
      const error = new WebhookUserNotFoundError("cus_123");

      expect(error.message).toBe("User not found for customer: cus_123");
      expect(error.code).toBe("USER_NOT_FOUND");
      expect(error.statusCode).toBe(404);
      expect(error.retryable).toBe(false);
      expect(error.name).toBe("WebhookUserNotFoundError");
      expect(error).toBeInstanceOf(WebhookUserNotFoundError);
      expect(error).toBeInstanceOf(WebhookError);
    });

    it("should not be retryable", () => {
      const error = new WebhookUserNotFoundError("cus_456");
      expect(error.retryable).toBe(false);
    });

    it("should format message with different customer IDs", () => {
      const error1 = new WebhookUserNotFoundError("cus_test123");
      const error2 = new WebhookUserNotFoundError("cus_prod789");

      expect(error1.message).toContain("cus_test123");
      expect(error2.message).toContain("cus_prod789");
    });
  });

  describe("WebhookDatabaseError", () => {
    it("should create retryable database error by default", () => {
      const error = new WebhookDatabaseError("Connection failed");

      expect(error.message).toBe("Connection failed");
      expect(error.code).toBe("DATABASE_ERROR");
      expect(error.statusCode).toBe(500);
      expect(error.retryable).toBe(true);
      expect(error.name).toBe("WebhookDatabaseError");
      expect(error).toBeInstanceOf(WebhookDatabaseError);
      expect(error).toBeInstanceOf(WebhookError);
    });

    it("should create non-retryable database error when specified", () => {
      const error = new WebhookDatabaseError("Constraint violation", false);

      expect(error.message).toBe("Constraint violation");
      expect(error.retryable).toBe(false);
    });

    it("should be retryable by default", () => {
      const error = new WebhookDatabaseError("Timeout");
      expect(error.retryable).toBe(true);
    });
  });

  describe("MissingSignatureError", () => {
    it("should create error with default message", () => {
      const error = new MissingSignatureError();

      expect(error.message).toBe("Missing stripe-signature header");
      expect(error.code).toBe("MISSING_SIGNATURE");
      expect(error.statusCode).toBe(400);
      expect(error.retryable).toBe(false);
      expect(error.name).toBe("MissingSignatureError");
      expect(error).toBeInstanceOf(MissingSignatureError);
      expect(error).toBeInstanceOf(WebhookError);
    });

    it("should create error with custom message", () => {
      const error = new MissingSignatureError("Signature header not found");

      expect(error.message).toBe("Signature header not found");
      expect(error.code).toBe("MISSING_SIGNATURE");
      expect(error.statusCode).toBe(400);
    });

    it("should not be retryable", () => {
      const error = new MissingSignatureError();
      expect(error.retryable).toBe(false);
    });
  });

  describe("Error inheritance and type checking", () => {
    it("all webhook errors should inherit from WebhookError", () => {
      const errors = [
        new SignatureVerificationError(),
        new EventProcessingError("test"),
        new WebhookUserNotFoundError("cus_123"),
        new WebhookDatabaseError("test"),
        new MissingSignatureError(),
      ];

      errors.forEach((error) => {
        expect(error).toBeInstanceOf(WebhookError);
        expect(error).toBeInstanceOf(Error);
      });
    });

    it("all webhook errors should have correct status codes", () => {
      expect(new SignatureVerificationError().statusCode).toBe(400);
      expect(new MissingSignatureError().statusCode).toBe(400);
      expect(new WebhookUserNotFoundError("cus_123").statusCode).toBe(404);
      expect(new EventProcessingError("test").statusCode).toBe(500);
      expect(new WebhookDatabaseError("test").statusCode).toBe(500);
    });

    it("all webhook errors should have unique error codes", () => {
      const errorCodes = [
        new SignatureVerificationError().code,
        new EventProcessingError("test").code,
        new WebhookUserNotFoundError("cus_123").code,
        new WebhookDatabaseError("test").code,
        new MissingSignatureError().code,
      ];

      const uniqueCodes = new Set(errorCodes);
      expect(uniqueCodes.size).toBe(errorCodes.length);
    });

    it("should identify retryable vs non-retryable errors", () => {
      const retryableErrors = [new EventProcessingError("test"), new WebhookDatabaseError("test")];

      const nonRetryableErrors = [
        new SignatureVerificationError(),
        new WebhookUserNotFoundError("cus_123"),
        new MissingSignatureError(),
      ];

      retryableErrors.forEach((error) => {
        expect(error.retryable).toBe(true);
      });

      nonRetryableErrors.forEach((error) => {
        expect(error.retryable).toBe(false);
      });
    });
  });

  describe("Error catching and handling", () => {
    it("should be catchable and type-checkable", () => {
      try {
        throw new SignatureVerificationError();
      } catch (error) {
        expect(error).toBeInstanceOf(SignatureVerificationError);
        if (error instanceof SignatureVerificationError) {
          expect(error.code).toBe("INVALID_SIGNATURE");
          expect(error.statusCode).toBe(400);
        }
      }
    });

    it("should preserve error context in catch blocks", () => {
      try {
        throw new WebhookUserNotFoundError("cus_test123");
      } catch (error) {
        if (error instanceof WebhookUserNotFoundError) {
          expect(error.message).toContain("cus_test123");
          expect(error.retryable).toBe(false);
        }
      }
    });

    it("should support retry logic based on retryable flag", () => {
      const retryableError = new EventProcessingError("Temporary failure");
      const nonRetryableError = new SignatureVerificationError();

      // Simulated retry logic
      const shouldRetry = (error: WebhookError) => error.retryable;

      expect(shouldRetry(retryableError)).toBe(true);
      expect(shouldRetry(nonRetryableError)).toBe(false);
    });
  });
});
