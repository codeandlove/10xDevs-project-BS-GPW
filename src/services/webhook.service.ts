/**
 * Webhook Service Layer
 * Handles Stripe webhook event processing, idempotency, and database updates
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../db/database.types";
import type Stripe from "stripe";
import { stripe } from "../lib/stripe";
import { EventProcessingError, WebhookDatabaseError } from "../lib/webhook-errors";
import type { ProcessEventResult, SubscriptionUpdateData, WebhookEventType } from "../types/webhook.types";

type AppUser = Database["public"]["Tables"]["app_users"]["Row"];

/**
 * Supported webhook event types
 */
const SUPPORTED_EVENTS: WebhookEventType[] = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.payment_succeeded",
  "invoice.payment_failed",
];

/**
 * Service class for webhook processing
 */
export class WebhookService {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Main entry point for processing webhook events
   * @param event - Verified Stripe event
   * @returns Processing result with success status
   */
  async processEvent(event: Stripe.Event): Promise<ProcessEventResult> {
    try {
      // [1] Check if event already processed (idempotency)
      const alreadyProcessed = await this.checkEventExists(event.id);
      if (alreadyProcessed) {
        return {
          success: true,
          already_processed: true,
          changes_applied: false,
        };
      }

      // [2] Log event as received
      await this.logWebhookEvent(event, "processing");

      // [3] Check if event type is supported
      if (!SUPPORTED_EVENTS.includes(event.type as WebhookEventType)) {
        await this.markEventProcessed(event.id);
        return {
          success: true,
          changes_applied: false,
        };
      }

      // [4] Process based on event type
      const result = await this.handleEventType(event);

      // [5] Mark as processed
      await this.markEventProcessed(event.id, result.user_id);

      return {
        success: true,
        ...result,
      };
    } catch (error) {
      // [6] Mark as failed
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      await this.markEventFailed(event.id, errorMessage);

      throw new EventProcessingError(errorMessage);
    }
  }

  /**
   * Check if event already exists in database
   * @param eventId - Stripe event ID
   * @returns True if event exists
   */
  private async checkEventExists(eventId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from("stripe_webhook_events")
      .select("id")
      .eq("event_id", eventId)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = not found (expected)
    }

    return !!data;
  }

  /**
   * Log webhook event to database
   * @param event - Stripe event
   * @param status - Initial status
   */
  private async logWebhookEvent(event: Stripe.Event, status: "received" | "processing" = "received"): Promise<void> {
    const { error } = await this.supabase.from("stripe_webhook_events").insert({
      event_id: event.id,
      payload: event as unknown as Database["public"]["Tables"]["stripe_webhook_events"]["Insert"]["payload"],
      received_at: new Date().toISOString(),
      status,
    });

    // Handle duplicate key error (23505) - this is expected for idempotency
    if (error && error.code !== "23505") {
      throw new WebhookDatabaseError("Failed to log webhook event");
    }
  }

  /**
   * Mark event as successfully processed
   * @param eventId - Stripe event ID
   * @param userId - Optional user ID who was affected
   */
  private async markEventProcessed(eventId: string, userId?: string): Promise<void> {
    const { error } = await this.supabase
      .from("stripe_webhook_events")
      .update({
        status: "processed",
        processed_at: new Date().toISOString(),
        user_id: userId || null,
        error: null,
      })
      .eq("event_id", eventId);

    if (error) {
      // Silently ignore - marking as processed is not critical
    }
  }

  /**
   * Mark event as failed
   * @param eventId - Stripe event ID
   * @param errorMessage - Error message
   */
  private async markEventFailed(eventId: string, errorMessage: string): Promise<void> {
    const { error } = await this.supabase
      .from("stripe_webhook_events")
      .update({
        status: "failed",
        processed_at: new Date().toISOString(),
        error: errorMessage,
      })
      .eq("event_id", eventId);

    if (error) {
      // Silently ignore - marking as failed is not critical
    }
  }

  /**
   * Route event to appropriate handler based on type
   * @param event - Stripe event
   * @returns Processing result
   */
  private async handleEventType(event: Stripe.Event): Promise<Omit<ProcessEventResult, "success">> {
    switch (event.type) {
      case "checkout.session.completed":
        return this.handleCheckoutCompleted(event);

      case "customer.subscription.created":
        return this.handleSubscriptionCreated(event);

      case "customer.subscription.updated":
        return this.handleSubscriptionUpdated(event);

      case "customer.subscription.deleted":
        return this.handleSubscriptionDeleted(event);

      case "invoice.payment_succeeded":
        return this.handlePaymentSucceeded(event);

      case "invoice.payment_failed":
        return this.handlePaymentFailed(event);

      default:
        return { changes_applied: false };
    }
  }

  /**
   * Handle checkout.session.completed event
   * This is the FIRST event sent after successful payment in Stripe Checkout
   * PRIORITY: Process immediately to provide instant subscription activation
   *
   * Flow:
   * 1. Verify session mode is "subscription" (skip one-time payments)
   * 2. Find user by customer_id
   * 3. Extract subscription_id from session
   * 4. Fetch full subscription details from Stripe API
   * 5. Update user with complete subscription data
   * 6. Create audit trail
   *
   * @param event - Stripe checkout.session.completed event
   * @returns Processing result with user_id and changes_applied flag
   */
  private async handleCheckoutCompleted(event: Stripe.Event): Promise<Omit<ProcessEventResult, "success">> {
    const session = event.data.object as Stripe.Checkout.Session;

    // [1] Only handle subscription checkouts (skip one-time payments)
    if (session.mode !== "subscription") {
      return { changes_applied: false };
    }

    // [2] Find user by Stripe customer ID
    const user = await this.findUserByCustomer(session.customer as string);
    if (!user) {
      return { changes_applied: false };
    }

    // [3] Get current state for audit trail
    const previousState = {
      subscription_status: user.subscription_status,
      stripe_subscription_id: user.stripe_subscription_id,
      current_period_end: user.current_period_end,
      plan_id: user.plan_id,
    };

    // [4] Extract subscription ID from checkout session
    const subscriptionId = session.subscription as string;
    if (!subscriptionId) {
      // Edge case: subscription not yet created (very rare)
      // Will be handled by customer.subscription.created fallback
      return { changes_applied: false };
    }

    // [5] Fetch full subscription details from Stripe API
    // IMPORTANT: Checkout session doesn't include all subscription fields
    // We need: current_period_end, plan_id (price_id), status
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    // [6] Calculate new state
    const newState: SubscriptionUpdateData = {
      stripe_subscription_id: subscription.id,
      subscription_status: "active", // Checkout completed = active subscription
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      plan_id: subscription.items.data[0]?.price?.id || undefined,
      trial_expires_at: null, // Clear trial when subscription activates
      updated_at: new Date().toISOString(),
    };

    // [7] Update user with audit trail
    await this.updateUserWithAudit(
      user.auth_uid,
      previousState,
      newState,
      "checkout_completed" // New audit change_type
    );

    return {
      user_id: user.auth_uid,
      changes_applied: true,
    };
  }

  /**
   * Handle customer.subscription.created event
   */
  private async handleSubscriptionCreated(event: Stripe.Event): Promise<Omit<ProcessEventResult, "success">> {
    const subscription = event.data.object as Stripe.Subscription;

    // Find user by customer ID
    const user = await this.findUserByCustomer(subscription.customer as string);
    if (!user) {
      return { changes_applied: false };
    }

    // Get current state for audit
    const previousState = {
      subscription_status: user.subscription_status,
      stripe_subscription_id: user.stripe_subscription_id,
      current_period_end: user.current_period_end,
      plan_id: user.plan_id,
    };

    // Calculate new state
    const newState: SubscriptionUpdateData = {
      stripe_subscription_id: subscription.id,
      subscription_status: "active",
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      plan_id: subscription.items.data[0]?.price?.id || undefined,
      trial_expires_at: null, // Clear trial when subscription activates
      updated_at: new Date().toISOString(),
    };

    // Update with audit trail
    await this.updateUserWithAudit(user.auth_uid, previousState, newState, "subscription_created");

    return {
      user_id: user.auth_uid,
      changes_applied: true,
    };
  }

  /**
   * Handle customer.subscription.updated event
   */
  private async handleSubscriptionUpdated(event: Stripe.Event): Promise<Omit<ProcessEventResult, "success">> {
    const subscription = event.data.object as Stripe.Subscription;

    const user = await this.findUserByCustomer(subscription.customer as string);
    if (!user) {
      return { changes_applied: false };
    }

    const previousState = {
      subscription_status: user.subscription_status,
      current_period_end: user.current_period_end,
      plan_id: user.plan_id,
    };

    // Map Stripe status to our enum
    let subscriptionStatus: Database["public"]["Enums"]["subscription_status"];
    switch (subscription.status) {
      case "active":
        subscriptionStatus = "active";
        break;
      case "past_due":
        subscriptionStatus = "past_due";
        break;
      case "canceled":
      case "unpaid":
        subscriptionStatus = "canceled";
        break;
      case "trialing":
        subscriptionStatus = "trial";
        break;
      default:
        subscriptionStatus = user.subscription_status; // Keep existing
    }

    const newState: SubscriptionUpdateData = {
      subscription_status: subscriptionStatus,
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      plan_id: subscription.items.data[0]?.price?.id || undefined,
      updated_at: new Date().toISOString(),
    };

    await this.updateUserWithAudit(user.auth_uid, previousState, newState, "subscription_updated");

    return {
      user_id: user.auth_uid,
      changes_applied: true,
    };
  }

  /**
   * Handle customer.subscription.deleted event
   */
  private async handleSubscriptionDeleted(event: Stripe.Event): Promise<Omit<ProcessEventResult, "success">> {
    const subscription = event.data.object as Stripe.Subscription;

    const user = await this.findUserByCustomer(subscription.customer as string);
    if (!user) {
      return { changes_applied: false };
    }

    const previousState = {
      subscription_status: user.subscription_status,
      current_period_end: user.current_period_end,
    };

    const newState: SubscriptionUpdateData = {
      subscription_status: "canceled",
      current_period_end: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000).toISOString()
        : user.current_period_end || undefined,
      updated_at: new Date().toISOString(),
    };

    await this.updateUserWithAudit(user.auth_uid, previousState, newState, "subscription_canceled");

    return {
      user_id: user.auth_uid,
      changes_applied: true,
    };
  }

  /**
   * Handle invoice.payment_succeeded event
   */
  private async handlePaymentSucceeded(event: Stripe.Event): Promise<Omit<ProcessEventResult, "success">> {
    const invoice = event.data.object as Stripe.Invoice;

    if (!invoice.subscription) {
      return { changes_applied: false };
    }

    const user = await this.findUserByCustomer(invoice.customer as string);
    if (!user) {
      return { changes_applied: false };
    }

    const previousState = {
      subscription_status: user.subscription_status,
      current_period_end: user.current_period_end,
    };

    const periodEnd = invoice.lines.data[0]?.period?.end;
    const newState: SubscriptionUpdateData = {
      subscription_status: "active",
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : user.current_period_end || undefined,
      updated_at: new Date().toISOString(),
    };

    await this.updateUserWithAudit(user.auth_uid, previousState, newState, "payment_succeeded");

    return {
      user_id: user.auth_uid,
      changes_applied: true,
    };
  }

  /**
   * Handle invoice.payment_failed event
   */
  private async handlePaymentFailed(event: Stripe.Event): Promise<Omit<ProcessEventResult, "success">> {
    const invoice = event.data.object as Stripe.Invoice;

    if (!invoice.subscription) {
      return { changes_applied: false };
    }

    const user = await this.findUserByCustomer(invoice.customer as string);
    if (!user) {
      return { changes_applied: false };
    }

    const previousState = {
      subscription_status: user.subscription_status,
    };

    const newState: SubscriptionUpdateData = {
      subscription_status: "past_due",
      updated_at: new Date().toISOString(),
    };

    await this.updateUserWithAudit(user.auth_uid, previousState, newState, "payment_failed");

    return {
      user_id: user.auth_uid,
      changes_applied: true,
    };
  }

  /**
   * Find user by Stripe customer ID
   * @param customerId - Stripe customer ID
   * @returns User record or null
   */
  private async findUserByCustomer(customerId: string): Promise<AppUser | null> {
    const { data, error } = await this.supabase
      .from("app_users")
      .select("*")
      .eq("stripe_customer_id", customerId)
      .is("deleted_at", null)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // Not found
        return null;
      }
      throw new WebhookDatabaseError("Failed to find user");
    }

    return data;
  }

  /**
   * Update user subscription data with audit trail
   * @param authUid - User's auth_uid
   * @param previousState - Previous state for audit
   * @param newState - New state to apply
   * @param changeType - Type of change for audit
   */
  private async updateUserWithAudit(
    authUid: string,
    previousState: Record<string, unknown>,
    newState: SubscriptionUpdateData,
    changeType: string
  ): Promise<void> {
    // Update app_users
    const { error: updateError } = await this.supabase.from("app_users").update(newState).eq("auth_uid", authUid);

    if (updateError) {
      throw new WebhookDatabaseError("Failed to update user");
    }

    // Log to subscription_audit
    const { error: auditError } = await this.supabase.from("subscription_audit").insert({
      user_id: authUid,
      change_type: changeType,
      previous: previousState as Database["public"]["Tables"]["subscription_audit"]["Insert"]["previous"],
      current: newState as Database["public"]["Tables"]["subscription_audit"]["Insert"]["current"],
      created_at: new Date().toISOString(),
    });

    if (auditError) {
      // Don't throw - audit is not critical
    }
  }
}
