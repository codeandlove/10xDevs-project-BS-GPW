/**
 * POST /api/webhooks/stripe
 *
 * Stripe webhook endpoint for processing subscription events
 * Requires Stripe signature verification (NOT Bearer token auth)
 *
 * Reference: stripe-webhooks-implementation-plan.md (Section 9.4, line 866-920)
 * This implementation follows the original plan exactly.
 */

import type { APIRoute } from "astro";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { WebhookService } from "@/services/webhook.service";
import { SignatureVerificationError, MissingSignatureError } from "@/lib/webhook-errors";
import { createSupabaseServiceClient } from "@/lib/supabase-service";

const webhookSecret = import.meta.env.STRIPE_WEBHOOK_SECRET;

/**
 * POST /api/webhooks/stripe
 * Receives and processes Stripe webhook events
 *
 * Security: Verifies Stripe signature before processing
 * Database: Uses Service Role client to bypass RLS (webhooks have no user session)
 * Idempotency: Prevents duplicate event processing via database constraint
 * Always returns 200 OK to Stripe (errors logged internally)
 */
export const POST: APIRoute = async ({ request }) => {
  let eventId = "unknown";

  try {
    // [1] Get raw body (required for signature verification)
    const rawBody = await request.text();

    // [2] Get Stripe signature from headers
    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      return new Response(
        JSON.stringify({
          error: "Missing stripe-signature header",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // [3] Verify webhook signature
    let event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
      eventId = event.id;
    } catch (err) {
      return new Response(
        JSON.stringify({
          error: "Webhook signature verification failed",
          message: err instanceof Error ? err.message : "Unknown error",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // [4] DEBUG - Return diagnostic info for checkout.session.completed
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      return new Response(
        JSON.stringify({
          received: true,
          debug: {
            hasServiceKey: !!import.meta.env.SUPABASE_SERVICE_ROLE_KEY,
            serviceKeyLength: import.meta.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0,
            hasSupabaseUrl: !!import.meta.env.PUBLIC_SUPABASE_URL,
            supabaseUrl: import.meta.env.PUBLIC_SUPABASE_URL,
            customer: session.customer,
            authUid: session.metadata?.auth_uid,
            subscription: session.subscription,
            eventId: event.id,
            mode: session.mode,
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // [5] For other events, process normally
    const supabase = createSupabaseServiceClient();
    const webhookService = new WebhookService(supabase);
    const result = await webhookService.processEvent(event);

    // [6] Return 200 OK with result
    return new Response(
      JSON.stringify({
        received: true,
        event_id: eventId,
        already_processed: result.already_processed,
        changes_applied: result.changes_applied,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    // [6] Handle signature verification errors (return 400)
    if (error instanceof SignatureVerificationError || error instanceof MissingSignatureError) {
      return new Response(
        JSON.stringify({
          error: error.message,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // [7] For all other errors, return 200 OK to prevent Stripe retries
    // Error already logged in service layer
    return new Response(
      JSON.stringify({
        received: true,
        event_id: eventId,
        error: "Processing failed",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
