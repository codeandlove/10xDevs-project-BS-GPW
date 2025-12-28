/**
 * GET /api/subscriptions/status
 *
 * Retrieve current user's subscription status
 * Requires authentication via Bearer token
 */

import type { APIRoute } from "astro";
import { SubscriptionService } from "@/services/subscription.service";
import { getAuthUid } from "@/lib/auth";
import { createSuccessResponse, createErrorResponse } from "@/lib/api-utils";
import { SubscriptionError } from "@/lib/errors";

export const prerender = false;

/**
 * GET /api/subscriptions/status
 * Returns subscription status with access information
 */
export const GET: APIRoute = async ({ request, locals }) => {
  const { supabase } = locals;

  try {
    // [1] Authentication
    const authUid = await getAuthUid(request, supabase);
    if (!authUid) {
      return createErrorResponse("Unauthorized", 401, "UNAUTHORIZED");
    }

    // [2] Business logic
    const subscriptionService = new SubscriptionService(supabase);
    const status = await subscriptionService.getSubscriptionStatus(authUid);

    // [3] Response
    return createSuccessResponse(status, 200);
  } catch (error) {
    // [4] Error handling
    if (error instanceof SubscriptionError) {
      return createErrorResponse(error.message, error.statusCode, error.code, error.details);
    }

    console.error("Unexpected error in GET /api/subscriptions/status:", error);
    return createErrorResponse("An unexpected error occurred", 500, "UNKNOWN_ERROR");
  }
};
