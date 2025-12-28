/**
 * Custom Error Classes for Subscription Management
 * Provides structured error handling with HTTP status codes
 */

/**
 * Base error class for subscription-related errors
 */
export class SubscriptionError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
    public details?: unknown
  ) {
    super(message);
    this.name = "SubscriptionError";
    Error.captureStackTrace?.(this, this.constructor);
  }
}

/**
 * Validation error (400 Bad Request)
 */
export class ValidationError extends SubscriptionError {
  constructor(message: string, details?: unknown) {
    super(message, "VALIDATION_ERROR", 400, details);
    this.name = "ValidationError";
  }
}

/**
 * Invalid URL error (400 Bad Request)
 */
export class InvalidUrlError extends SubscriptionError {
  constructor(message = "URL is not in the allowed domains list") {
    super(message, "INVALID_URL", 400);
    this.name = "InvalidUrlError";
  }
}

/**
 * Stripe API error (500 Internal Server Error)
 */
export class StripeError extends SubscriptionError {
  constructor(message: string, details?: unknown) {
    super(message, "STRIPE_ERROR", 500, details);
    this.name = "StripeError";
  }
}

/**
 * No Stripe customer found (404 Not Found)
 */
export class NoCustomerError extends SubscriptionError {
  constructor(message = "No subscription found") {
    super(message, "NO_CUSTOMER", 404);
    this.name = "NoCustomerError";
  }
}

/**
 * User not found error (404 Not Found)
 */
export class UserNotFoundError extends SubscriptionError {
  constructor(message = "User not found") {
    super(message, "USER_NOT_FOUND", 404);
    this.name = "UserNotFoundError";
  }
}

/**
 * Database error (500 Internal Server Error)
 */
export class DatabaseError extends SubscriptionError {
  constructor(message: string, details?: unknown) {
    super(message, "DATABASE_ERROR", 500, details);
    this.name = "DatabaseError";
  }
}

/**
 * Unknown error (500 Internal Server Error)
 */
export class UnknownError extends SubscriptionError {
  constructor(message = "An unexpected error occurred") {
    super(message, "UNKNOWN_ERROR", 500);
    this.name = "UnknownError";
  }
}
