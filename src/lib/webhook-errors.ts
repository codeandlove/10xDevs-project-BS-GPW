/**
 * Webhook Error Classes
 * Specialized error handling for Stripe webhook processing
 */

/**
 * Base webhook error class
 */
export class WebhookError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
    public retryable = false
  ) {
    super(message);
    this.name = "WebhookError";
    Error.captureStackTrace?.(this, this.constructor);
  }
}

/**
 * Signature verification failed (400)
 */
export class SignatureVerificationError extends WebhookError {
  constructor(message = "Invalid webhook signature") {
    super(message, "INVALID_SIGNATURE", 400, false);
    this.name = "SignatureVerificationError";
  }
}

/**
 * Event processing error (500)
 */
export class EventProcessingError extends WebhookError {
  constructor(message: string, retryable = true) {
    super(message, "PROCESSING_ERROR", 500, retryable);
    this.name = "EventProcessingError";
  }
}

/**
 * User not found for webhook event (404)
 */
export class WebhookUserNotFoundError extends WebhookError {
  constructor(customerId: string) {
    super(`User not found for customer: ${customerId}`, "USER_NOT_FOUND", 404, false);
    this.name = "WebhookUserNotFoundError";
  }
}

/**
 * Database error during webhook processing (500)
 */
export class WebhookDatabaseError extends WebhookError {
  constructor(message: string, retryable = true) {
    super(message, "DATABASE_ERROR", 500, retryable);
    this.name = "WebhookDatabaseError";
  }
}

/**
 * Missing signature header (400)
 */
export class MissingSignatureError extends WebhookError {
  constructor(message = "Missing stripe-signature header") {
    super(message, "MISSING_SIGNATURE", 400, false);
    this.name = "MissingSignatureError";
  }
}
