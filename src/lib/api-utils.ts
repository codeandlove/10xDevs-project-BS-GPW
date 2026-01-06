/**
 * API Response Utilities
 * Standard response formatters for API endpoints
 * Zgodnie z api-plan.md sekcja 5.1
 */

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  timestamp: string;
}

/**
 * Standard error response format zgodnie z api-plan.md sekcja 5.1
 */
export interface ApiErrorResponse {
  error: string; // Short error message (required)
  message?: string; // Detailed explanation (optional)
  details?: string[]; // Array of validation errors (optional) - zgodnie z api-plan.md
}

/**
 * Create a standardized success response
 */
export function createSuccessResponse<T>(data: T, status = 200): Response {
  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };

  return new Response(JSON.stringify(response), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

/**
 * Create a standardized error response zgodnie z api-plan.md sekcja 5.1
 * @param error - Short error message (required)
 * @param status - HTTP status code (default: 500)
 * @param message - Detailed explanation (optional)
 * @param details - Array of validation errors (optional)
 */
export function createErrorResponse(error: string, status = 500, message?: string, details?: string[]): Response {
  const response: ApiErrorResponse = {
    error,
    ...(message && { message }),
    ...(details && { details }),
  };

  return new Response(JSON.stringify(response), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

/**
 * Convert Zod fieldErrors to string array for API response
 * Helper dla konwersji Zod validation errors do formatu zgodnego z api-plan.md
 */
export function zodErrorsToArray(fieldErrors: Record<string, string[] | undefined>): string[] {
  const errors: string[] = [];
  for (const [field, messages] of Object.entries(fieldErrors)) {
    if (messages) {
      errors.push(...messages.map((msg) => `${field}: ${msg}`));
    }
  }
  return errors;
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}
