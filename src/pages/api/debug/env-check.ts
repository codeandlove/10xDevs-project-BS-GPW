/**
 * DEBUG endpoint - check env vars
 * Access: GET /api/debug/env-check
 * DELETE AFTER DEBUGGING!
 */

import type { APIRoute } from "astro";

export const GET: APIRoute = async () => {
  return new Response(
    JSON.stringify({
      hasServiceKey: !!import.meta.env.SUPABASE_SERVICE_ROLE_KEY,
      serviceKeyLength: import.meta.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0,
      hasSupabaseUrl: !!import.meta.env.PUBLIC_SUPABASE_URL,
      supabaseUrl: import.meta.env.PUBLIC_SUPABASE_URL,
      hasWebhookSecret: !!import.meta.env.STRIPE_WEBHOOK_SECRET,
      webhookSecretLength: import.meta.env.STRIPE_WEBHOOK_SECRET?.length || 0,
      nodeEnv: import.meta.env.NODE_ENV,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
};
