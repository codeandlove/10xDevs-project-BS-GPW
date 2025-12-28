/**
 * POST /api/subscriptions/create-portal
 *
 * Create Stripe Customer Portal session for subscription management
 * Requires authentication via Bearer token
 */

import type { APIRoute } from "astro";
import { SubscriptionService } from "@/services/subscription.service";
import { getAuthUid } from "@/lib/auth";
import { createSuccessResponse, createErrorResponse } from "@/lib/api-utils";
import { CreatePortalSchema } from "@/lib/subscription-validation";
import { isAllowedUrl } from "@/config/allowed-domains";
import { SubscriptionError, InvalidUrlError } from "@/lib/errors";

export const prerender = false;

/**
 * POST /api/subscriptions/create-portal
 * Creates Stripe Customer Portal session and returns portal URL
 *
 * Request Body:
 * {
 *   "return_url": "https://app.example.com/account"
 * }
 */
export const POST: APIRoute = async ({ request, locals }) => {
  const { supabase } = locals;

  try {
    // [1] Authentication
    const authUid = await getAuthUid(request, supabase);
    if (!authUid) {
      return createErrorResponse("Unauthorized", 401, "UNAUTHORIZED");
    }

    // [2] Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return createErrorResponse("Invalid JSON", 400, "INVALID_JSON");
    }

    // [3] Validate with Zod schema
    const validation = CreatePortalSchema.safeParse(body);
    if (!validation.success) {
      return createErrorResponse("Validation failed", 400, "VALIDATION_ERROR", validation.error.flatten().fieldErrors);
    }

    const { return_url } = validation.data;

    // [4] Validate URL against whitelist
    if (!isAllowedUrl(return_url)) {
      throw new InvalidUrlError("return_url is not in the allowed domains list");
    }

    // [5] Business logic
    const subscriptionService = new SubscriptionService(supabase);
    const result = await subscriptionService.createPortalSession(authUid, {
      return_url,
    });

    // [6] Response
    return createSuccessResponse(result, 200);
  } catch (error) {
    // [7] Error handling
    if (error instanceof SubscriptionError) {
      return createErrorResponse(error.message, error.statusCode, error.code, error.details);
    }

    console.error("Unexpected error in POST /api/subscriptions/create-portal:", error);
    return createErrorResponse("An unexpected error occurred", 500, "UNKNOWN_ERROR");
  }
};
