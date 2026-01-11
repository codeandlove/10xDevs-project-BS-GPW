/**
 * POST /api/subscriptions/create-checkout
 *
 * Create Stripe Checkout session for subscription purchase
 * Requires authentication via Bearer token
 */

import type { APIRoute } from "astro";
import { SubscriptionService } from "@/services/subscription.service";
import { getAuthUidAndToken } from "@/lib/auth";
import { createSuccessResponse, createErrorResponse, zodErrorsToArray } from "@/lib/api-utils";
import { CreateCheckoutSchema } from "@/lib/subscription-validation";
import { isAllowedUrl } from "@/config/allowed-domains";
import { SubscriptionError, InvalidUrlError } from "@/lib/errors";

export const prerender = false;

/**
 * POST /api/subscriptions/create-checkout
 * Creates Stripe Checkout session and returns checkout URL
 *
 * Request Body:
 * {
 *   "price_id": "price_xxx",
 *   "success_url": "https://app.example.com/success",
 *   "cancel_url": "https://app.example.com/cancel"
 * }
 */
export const POST: APIRoute = async ({ request, locals }) => {
  const { supabase } = locals;

  try {
    // [1] Authentication
    const auth = await getAuthUidAndToken(request, supabase);
    if (!auth) {
      return createErrorResponse("Unauthorized", 401, "UNAUTHORIZED");
    }

    const { authUid, token } = auth;

    // [2] Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return createErrorResponse("Invalid JSON", 400, "INVALID_JSON");
    }

    // [3] Validate with Zod schema
    const validation = CreateCheckoutSchema.safeParse(body);
    if (!validation.success) {
      return createErrorResponse(
        "Validation failed",
        400,
        "VALIDATION_ERROR",
        zodErrorsToArray(validation.error.flatten().fieldErrors)
      );
    }

    const { price_id, success_url, cancel_url } = validation.data;

    // [4] Validate URLs against whitelist
    if (!isAllowedUrl(success_url)) {
      throw new InvalidUrlError("success_url is not in the allowed domains list");
    }

    if (!isAllowedUrl(cancel_url)) {
      throw new InvalidUrlError("cancel_url is not in the allowed domains list");
    }

    // [5] Business logic - pass token to service
    const subscriptionService = new SubscriptionService(supabase);
    const result = await subscriptionService.createCheckoutSession(authUid, token, {
      price_id,
      success_url,
      cancel_url,
    });

    // [6] Response
    return createSuccessResponse(result, 200);
  } catch (error) {
    // [7] Error handling
    if (error instanceof SubscriptionError) {
      return createErrorResponse(error.message, error.statusCode, error.code, error.details);
    }

    return createErrorResponse("An unexpected error occurred", 500, "UNKNOWN_ERROR");
  }
};
