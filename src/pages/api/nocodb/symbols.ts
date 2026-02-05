/**
 * GET /api/nocodb/symbols
 *
 * Retrieves all active GPW symbols (tickers) from GPW_Symbols table
 * Authorization handled by middleware (src/middleware/index.ts)
 * Rate limited: 60 requests per minute
 * Response cached for 24h (client-side)
 *
 * Query parameters:
 * - range (optional): week|month|3months|6months - if provided, includes eventCount for each symbol
 */

import type { APIRoute } from "astro";
import { NocoDBClient } from "@/lib/nocodb-client";
import { NocoDBService } from "@/services/nocodb.service";
import { checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limiter";
import { getAuthUid } from "@/lib/auth";
import type { DateRange } from "@/types/nocodb.types";

export const prerender = false;

/**
 * GET /api/nocodb/symbols?range=week
 * Query params:
 * - range (optional): DateRange - if provided, aggregates event counts per symbol
 * Returns: { symbols: GPWSymbol[], total_count: number, cached_at: string }
 */
export const GET: APIRoute = async ({ request, locals }) => {
  const { supabase } = locals;

  try {
    // [1] Get authenticated user ID (middleware already verified auth + subscription)
    const authUid = await getAuthUid(request, supabase);
    if (!authUid) {
      // This should not happen if middleware works correctly
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // [2] Check rate limit (60 requests per minute per user)
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

    // [3] Parse query parameters
    const url = new URL(request.url);
    const range = url.searchParams.get("range") as DateRange | null;

    // [4] Fetch symbols from NocoDB (with optional event counts)
    const client = new NocoDBClient();
    const service = new NocoDBService(client);

    const symbolsResponse = await service.getActiveSymbols(range);

    // [5] Return response with cache headers
    return new Response(JSON.stringify(symbolsResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        // Cache for 24h if no range (static symbols), 5min if range (dynamic event counts)
        "Cache-Control": range ? "private, max-age=300" : "private, max-age=86400",
        ...getRateLimitHeaders(rateLimitResult),
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Failed to fetch GPW symbols",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
