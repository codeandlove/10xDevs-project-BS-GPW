/**
 * GET /api/nocodb/grid
 *
 * Retrieves Black Swan Events for grid view with date range filtering
 * Requires active subscription (trial or paid)
 * Rate limited: 60 requests per minute
 *
 * Supports 3 modes:
 * 1. Explicit dates: ?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
 * 2. Range with anchor: ?range=week&end_date=YYYY-MM-DD
 * 3. Range only: ?range=week (calculates from today)
 */

import type { APIRoute } from "astro";
import type { DateRange } from "@/types/nocodb.types";
import { NocoDBClient } from "@/lib/nocodb-client";
import { NocoDBService } from "@/services/nocodb.service";
import { GridQuerySchema } from "@/lib/nocodb-validation";
import { checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limiter";
import { getAuthUid } from "@/lib/auth";
import { ZodError } from "zod";

export const prerender = false;

/**
 * Helper: Get chunk size from range
 */
function getChunkSizeFromRange(range: DateRange): number {
  switch (range) {
    case "week":
      return 7;
    case "month":
      return 30;
    case "quarter":
      return 90;
    default:
      return 7;
  }
}

/**
 * GET /api/nocodb/grid
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
      const retryAfter = rateLimitResult.resetAt ? Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000) : 60;

      return new Response(
        JSON.stringify({
          error: "Rate limit exceeded",
          message: `Too many requests. Please try again in ${retryAfter} seconds.`,
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

    // [4] Parse query parameters with elastic approach (3 modes)
    const url = new URL(request.url);
    const rawParams = {
      start_date: url.searchParams.get("start_date") || undefined,
      end_date: url.searchParams.get("end_date") || undefined,
      range: (url.searchParams.get("range") as DateRange | null) || undefined,
      symbols: url.searchParams.get("symbols") || undefined,
    };

    // Determine date range using priority logic
    let startDate: string;
    let endDate: string;

    if (rawParams.start_date && rawParams.end_date) {
      startDate = rawParams.start_date;
      endDate = rawParams.end_date;
    } else if (rawParams.range && rawParams.end_date) {
      const chunkSize = getChunkSizeFromRange(rawParams.range);
      const end = new Date(rawParams.end_date);
      const start = new Date(end);
      start.setDate(start.getDate() - chunkSize);

      startDate = start.toISOString().split("T")[0];
      endDate = rawParams.end_date;
    } else if (rawParams.range) {
      const chunkSize = getChunkSizeFromRange(rawParams.range);
      const today = new Date();
      const start = new Date(today);
      start.setDate(start.getDate() - chunkSize);

      startDate = start.toISOString().split("T")[0];
      endDate = today.toISOString().split("T")[0];
    } else {
      return new Response(
        JSON.stringify({
          error: "Invalid parameters",
          message: "Must provide either (start_date + end_date) OR range",
          examples: ["?start_date=2026-01-01&end_date=2026-02-18", "?range=week&end_date=2026-02-18", "?range=week"],
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate parameters
    // Validate parameters
    let validatedParams;
    try {
      validatedParams = GridQuerySchema.parse({
        start_date: startDate,
        end_date: endDate,
        range: rawParams.range,
        symbols: rawParams.symbols,
      });
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

    // [5] Parse symbols if provided
    const symbols = validatedParams.symbols
      ? validatedParams.symbols.split(",").map((s) => s.trim().toUpperCase())
      : undefined;

    // [6] Call NocoDB service with explicit dates
    const nocoDBClient = new NocoDBClient();
    const nocoDBService = new NocoDBService(nocoDBClient);

    const gridResponse = await nocoDBService.getGridEvents(startDate, endDate, symbols);

    // [7] Return response with rate limit headers
    return new Response(JSON.stringify(gridResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...getRateLimitHeaders(rateLimitResult),
      },
    });
  } catch (error) {
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
