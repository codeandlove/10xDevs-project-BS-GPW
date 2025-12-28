/**
 * POST /api/webhooks/stripe
 *
 * Stripe webhook endpoint for processing subscription events
 * Requires Stripe signature verification (NOT Bearer token auth)
 */

import type { APIRoute } from "astro";
import { stripe } from "@/lib/stripe";
import { WebhookService } from "@/services/webhook.service";
import { SignatureVerificationError, MissingSignatureError } from "@/lib/webhook-errors";

export const prerender = false;

const webhookSecret = import.meta.env.STRIPE_WEBHOOK_SECRET;

/**
 * POST /api/webhooks/stripe
 * Receives and processes Stripe webhook events
 *
 * Security: Verifies Stripe signature before processing
 * Idempotency: Prevents duplicate event processing via database constraint
 * Always returns 200 OK to Stripe (errors logged internally)
 */
export const POST: APIRoute = async ({ request, locals }) => {
  const { supabase } = locals;
  let eventId = "unknown";

  try {
    // [1] Get raw body (required for signature verification)
    const rawBody = await request.text();

    // [2] Get Stripe signature from headers
    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      throw new MissingSignatureError();
    }

    // [3] Verify webhook signature
    let event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
      eventId = event.id;
    } catch (err) {
      console.error("[WEBHOOK] Signature verification failed:", err);
      throw new SignatureVerificationError();
    }

    console.log("[WEBHOOK] Signature verified for event:", eventId);

    // [4] Process event with service layer
    const webhookService = new WebhookService(supabase);
    const result = await webhookService.processEvent(event);

    // [5] Return 200 OK with result
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
      console.error("[WEBHOOK] Authentication failed:", {
        event_id: eventId,
        error: error.message,
      });

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
    console.error("[WEBHOOK] Processing error (returning 200 to Stripe):", {
      event_id: eventId,
      error: error instanceof Error ? error.message : "Unknown error",
    });

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
