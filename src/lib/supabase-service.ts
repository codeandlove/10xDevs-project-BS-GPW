/**
 * Supabase Service Role Client
 *
 * IMPORTANT: This client bypasses Row Level Security (RLS)
 * USE ONLY for server-side operations like webhooks, cron jobs, admin tasks
 * NEVER expose this client to frontend or user-accessible code
 *
 * Purpose:
 * - Stripe webhooks (write subscription data without user session)
 * - Background jobs (data processing, cleanup)
 * - Admin operations (user management, analytics)
 *
 * Reference: stripe-webhooks-implementation-plan.md (Section 9.4, line 950-975)
 * This implementation is 100% identical to the original plan.
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "../db/database.types";

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    "Missing Supabase service role credentials. " +
      "Please check PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env"
  );
}

/**
 * Create Supabase client with service role (bypasses RLS)
 *
 * @returns Supabase client with admin privileges
 *
 * @example
 * ```typescript
 * // In webhook endpoint
 * const supabase = createSupabaseServiceClient();
 * await supabase.from("app_users").update({ ... }).eq("auth_uid", userId);
 * ```
 */
export function createSupabaseServiceClient() {
  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
