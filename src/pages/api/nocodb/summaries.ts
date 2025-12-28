/**
 * GET /api/nocodb/summaries
 *
 * Retrieves all AI summaries for a specific Black Swan event
 * Requires active subscription (trial or paid)
 * Rate limited: 60 requests per minute
 */

import type { APIRoute } from "astro";
import { NocoDBClient } from "@/lib/nocodb-client";
import { NocoDBService } from "@/services/nocodb.service";
import { SummariesQuerySchema } from "@/lib/nocodb-validation";
import { checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limiter";
import { getAuthUid } from "@/lib/auth";
import { ZodError } from "zod";
import type { EventType } from "@/types/nocodb.types";

export const prerender = false;

/**
 * GET /api/nocodb/summaries
 * Query parameters: symbol, occurrence_date, event_type?
 */
export const GET: APIRoute = async ({ request, locals }) => {
  const { supabase } = locals;

  try {
    // [1] Extract and verify auth token
    const authUid = await getAuthUid(request, supabase);
    if (!authUid) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // [2] Check user subscription status
    const { data: user, error: userError } = await supabase
      .from("app_users")
      .select("subscription_status, trial_expires_at")
      .eq("auth_uid", authUid)
      .is("deleted_at", null)
      .single();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Check if user has active subscription or trial
    const now = new Date();
    const trialExpiresAt = user.trial_expires_at ? new Date(user.trial_expires_at) : null;
    const hasActiveSubscription = user.subscription_status === "active" || user.subscription_status === "trial";
    const hasValidTrial = trialExpiresAt && trialExpiresAt > now;

    if (!hasActiveSubscription && !hasValidTrial) {
      return new Response(
        JSON.stringify({
          error: "Subscription required",
          message: "Active subscription or trial required to access Black Swan data",
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // [3] Check rate limit
    const rateLimitResult = checkRateLimit(authUid);
    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({
          error: "Rate limit exceeded",
          message: `Too many requests. Please try again in ${rateLimitResult.retryAfter} seconds.`,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            ...getRateLimitHeaders(rateLimitResult),
          },
        }
      );
    }

    // [4] Parse and validate query parameters
    const url = new URL(request.url);
    const queryParams = {
      symbol: url.searchParams.get("symbol"),
      occurrence_date: url.searchParams.get("occurrence_date"),
      event_type: url.searchParams.get("event_type") || undefined,
    };

    let validatedParams;
    try {
      validatedParams = SummariesQuerySchema.parse(queryParams);
    } catch (error) {
      if (error instanceof ZodError) {
        return new Response(
          JSON.stringify({
            error: "Invalid query parameters",
            details: error.errors.map((e) => ({ path: e.path.join("."), message: e.message })),
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
      throw error;
    }

    // [5] Call NocoDB service
    const nocoDBClient = new NocoDBClient();
    const nocoDBService = new NocoDBService(nocoDBClient);

    const summariesResponse = await nocoDBService.getEventSummaries(
      validatedParams.symbol.toUpperCase(),
      validatedParams.occurrence_date,
      validatedParams.event_type as EventType | undefined
    );

    // [6] Return response with rate limit headers
    return new Response(JSON.stringify(summariesResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...getRateLimitHeaders(rateLimitResult),
      },
    });
  } catch (error) {
    console.error("[NocoDB Summaries] Error:", error);

    // Handle NocoDB-specific errors
    if (error && typeof error === "object" && "statusCode" in error) {
      const nocoError = error as { statusCode: number; message: string };
      return new Response(
        JSON.stringify({
          error: "NocoDB API error",
          message: nocoError.message,
        }),
        {
          status: nocoError.statusCode >= 500 ? 502 : nocoError.statusCode,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Generic error
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
