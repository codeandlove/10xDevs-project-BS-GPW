import { describe, it, expect } from "vitest";
import {
  SubscriptionError,
  ValidationError,
  InvalidUrlError,
  StripeError,
  NoCustomerError,
  UserNotFoundError,
  DatabaseError,
  UnknownError,
} from "./errors";

describe("Error Classes", () => {
  describe("SubscriptionError", () => {
    it("should create error with all properties", () => {
      const error = new SubscriptionError("Test error", "TEST_CODE", 400, ["detail1", "detail2"]);

      expect(error.message).toBe("Test error");
      expect(error.code).toBe("TEST_CODE");
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual(["detail1", "detail2"]);
      expect(error.name).toBe("SubscriptionError");
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(SubscriptionError);
    });

    it("should create error without details", () => {
      const error = new SubscriptionError("Test error", "TEST_CODE", 500);

      expect(error.message).toBe("Test error");
      expect(error.code).toBe("TEST_CODE");
      expect(error.statusCode).toBe(500);
      expect(error.details).toBeUndefined();
    });

    it("should have stack trace", () => {
      const error = new SubscriptionError("Test error", "TEST_CODE", 400);

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain("SubscriptionError");
    });
  });

  describe("ValidationError", () => {
    it("should create validation error with details", () => {
      const error = new ValidationError("Invalid input", ["Field 'email' is required", "Field 'name' is too short"]);

      expect(error.message).toBe("Invalid input");
      expect(error.code).toBe("VALIDATION_ERROR");
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual(["Field 'email' is required", "Field 'name' is too short"]);
      expect(error.name).toBe("ValidationError");
      expect(error).toBeInstanceOf(ValidationError);
      expect(error).toBeInstanceOf(SubscriptionError);
    });

    it("should create validation error without details", () => {
      const error = new ValidationError("Invalid input");

      expect(error.message).toBe("Invalid input");
      expect(error.code).toBe("VALIDATION_ERROR");
      expect(error.statusCode).toBe(400);
      expect(error.details).toBeUndefined();
    });
  });

  describe("InvalidUrlError", () => {
    it("should create error with default message", () => {
      const error = new InvalidUrlError();

      expect(error.message).toBe("URL is not in the allowed domains list");
      expect(error.code).toBe("INVALID_URL");
      expect(error.statusCode).toBe(400);
      expect(error.name).toBe("InvalidUrlError");
      expect(error).toBeInstanceOf(InvalidUrlError);
      expect(error).toBeInstanceOf(SubscriptionError);
    });

    it("should create error with custom message", () => {
      const error = new InvalidUrlError("Custom URL error");

      expect(error.message).toBe("Custom URL error");
      expect(error.code).toBe("INVALID_URL");
      expect(error.statusCode).toBe(400);
    });
  });

  describe("StripeError", () => {
    it("should create Stripe error with details", () => {
      const error = new StripeError("Payment failed", ["Card declined", "Insufficient funds"]);

      expect(error.message).toBe("Payment failed");
      expect(error.code).toBe("STRIPE_ERROR");
      expect(error.statusCode).toBe(500);
      expect(error.details).toEqual(["Card declined", "Insufficient funds"]);
      expect(error.name).toBe("StripeError");
      expect(error).toBeInstanceOf(StripeError);
      expect(error).toBeInstanceOf(SubscriptionError);
    });

    it("should create Stripe error without details", () => {
      const error = new StripeError("Payment failed");

      expect(error.message).toBe("Payment failed");
      expect(error.code).toBe("STRIPE_ERROR");
      expect(error.statusCode).toBe(500);
      expect(error.details).toBeUndefined();
    });
  });

  describe("NoCustomerError", () => {
    it("should create error with default message", () => {
      const error = new NoCustomerError();

      expect(error.message).toBe("No subscription found");
      expect(error.code).toBe("NO_CUSTOMER");
      expect(error.statusCode).toBe(404);
      expect(error.name).toBe("NoCustomerError");
      expect(error).toBeInstanceOf(NoCustomerError);
      expect(error).toBeInstanceOf(SubscriptionError);
    });

    it("should create error with custom message", () => {
      const error = new NoCustomerError("Customer not found in Stripe");

      expect(error.message).toBe("Customer not found in Stripe");
      expect(error.code).toBe("NO_CUSTOMER");
      expect(error.statusCode).toBe(404);
    });
  });

  describe("UserNotFoundError", () => {
    it("should create error with default message", () => {
      const error = new UserNotFoundError();

      expect(error.message).toBe("User not found");
      expect(error.code).toBe("USER_NOT_FOUND");
      expect(error.statusCode).toBe(404);
      expect(error.name).toBe("UserNotFoundError");
      expect(error).toBeInstanceOf(UserNotFoundError);
      expect(error).toBeInstanceOf(SubscriptionError);
    });

    it("should create error with custom message", () => {
      const error = new UserNotFoundError("User does not exist");

      expect(error.message).toBe("User does not exist");
      expect(error.code).toBe("USER_NOT_FOUND");
      expect(error.statusCode).toBe(404);
    });
  });

  describe("DatabaseError", () => {
    it("should create database error with details", () => {
      const error = new DatabaseError("Query failed", ["Connection timeout", "Retry limit exceeded"]);

      expect(error.message).toBe("Query failed");
      expect(error.code).toBe("DATABASE_ERROR");
      expect(error.statusCode).toBe(500);
      expect(error.details).toEqual(["Connection timeout", "Retry limit exceeded"]);
      expect(error.name).toBe("DatabaseError");
      expect(error).toBeInstanceOf(DatabaseError);
      expect(error).toBeInstanceOf(SubscriptionError);
    });

    it("should create database error without details", () => {
      const error = new DatabaseError("Query failed");

      expect(error.message).toBe("Query failed");
      expect(error.code).toBe("DATABASE_ERROR");
      expect(error.statusCode).toBe(500);
      expect(error.details).toBeUndefined();
    });
  });

  describe("UnknownError", () => {
    it("should create error with default message", () => {
      const error = new UnknownError();

      expect(error.message).toBe("An unexpected error occurred");
      expect(error.code).toBe("UNKNOWN_ERROR");
      expect(error.statusCode).toBe(500);
      expect(error.name).toBe("UnknownError");
      expect(error).toBeInstanceOf(UnknownError);
      expect(error).toBeInstanceOf(SubscriptionError);
    });

    it("should create error with custom message", () => {
      const error = new UnknownError("Something went wrong");

      expect(error.message).toBe("Something went wrong");
      expect(error.code).toBe("UNKNOWN_ERROR");
      expect(error.statusCode).toBe(500);
    });
  });

  describe("Error inheritance chain", () => {
    it("all custom errors should inherit from SubscriptionError", () => {
      const errors = [
        new ValidationError("test"),
        new InvalidUrlError(),
        new StripeError("test"),
        new NoCustomerError(),
        new UserNotFoundError(),
        new DatabaseError("test"),
        new UnknownError(),
      ];

      errors.forEach((error) => {
        expect(error).toBeInstanceOf(SubscriptionError);
        expect(error).toBeInstanceOf(Error);
      });
    });

    it("all custom errors should have correct status codes", () => {
      expect(new ValidationError("test").statusCode).toBe(400);
      expect(new InvalidUrlError().statusCode).toBe(400);
      expect(new NoCustomerError().statusCode).toBe(404);
      expect(new UserNotFoundError().statusCode).toBe(404);
      expect(new StripeError("test").statusCode).toBe(500);
      expect(new DatabaseError("test").statusCode).toBe(500);
      expect(new UnknownError().statusCode).toBe(500);
    });

    it("all custom errors should have unique error codes", () => {
      const errorCodes = [
        new ValidationError("test").code,
        new InvalidUrlError().code,
        new StripeError("test").code,
        new NoCustomerError().code,
        new UserNotFoundError().code,
        new DatabaseError("test").code,
        new UnknownError().code,
      ];

      const uniqueCodes = new Set(errorCodes);
      expect(uniqueCodes.size).toBe(errorCodes.length);
    });
  });

  describe("Error catching and type checking", () => {
    it("should be catchable and type-checkable", () => {
      try {
        throw new ValidationError("Invalid email");
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        if (error instanceof ValidationError) {
          expect(error.code).toBe("VALIDATION_ERROR");
          expect(error.statusCode).toBe(400);
        }
      }
    });

    it("should preserve error context in catch blocks", () => {
      try {
        throw new DatabaseError("Connection failed", ["Timeout after 30s"]);
      } catch (error) {
        if (error instanceof DatabaseError) {
          expect(error.details).toEqual(["Timeout after 30s"]);
          expect(error.message).toBe("Connection failed");
        }
      }
    });
  });
});
