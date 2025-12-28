/**
 * GET /api/nocodb/events/:id
 *
 * Retrieves detailed Black Swan Event with first AI summary and historic data
 * Requires active subscription (trial or paid)
 * Rate limited: 60 requests per minute
 */

import type { APIRoute } from "astro";
import { NocoDBClient } from "@/lib/nocodb-client";
import { NocoDBService } from "@/services/nocodb.service";
import { EventIdSchema } from "@/lib/nocodb-validation";
import { checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limiter";
import { getAuthUid } from "@/lib/auth";
import { ZodError } from "zod";

export const prerender = false;

/**
 * GET /api/nocodb/events/:id
 * Path parameter: id (NocoDB record ID starting with rec_)
 */
export const GET: APIRoute = async ({ params, request, locals }) => {
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

    // [4] Validate event ID
    const eventId = params.id;
    if (!eventId) {
      return new Response(JSON.stringify({ error: "Event ID is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      EventIdSchema.parse(eventId);
    } catch (error) {
      if (error instanceof ZodError) {
        return new Response(
          JSON.stringify({
            error: "Invalid event ID",
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

    const eventDetailsResponse = await nocoDBService.getEventDetails(eventId);

    // [6] Return response with rate limit headers
    return new Response(JSON.stringify(eventDetailsResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...getRateLimitHeaders(rateLimitResult),
      },
    });
  } catch (error) {
    console.error("[NocoDB Event Details] Error:", error);

    // Handle NocoDB-specific errors
    if (error && typeof error === "object" && "statusCode" in error) {
      const nocoError = error as { statusCode: number; message: string; code?: string };

      // Handle 404 specifically
      if (nocoError.statusCode === 404 || nocoError.code === "NOT_FOUND") {
        return new Response(
          JSON.stringify({
            error: "Event not found",
            message: "The requested Black Swan event does not exist",
          }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

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
