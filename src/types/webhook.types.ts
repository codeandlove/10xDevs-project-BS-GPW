/**
 * Stripe Webhook Types
 * Types for webhook event processing and database records
 */

import type Stripe from "stripe";
import type { Database } from "../db/database.types";

/**
 * Stripe webhook event type
 */
export type StripeWebhookEvent = Stripe.Event;

/**
 * Supported webhook event types
 */
export type WebhookEventType =
  | "customer.subscription.created"
  | "customer.subscription.updated"
  | "customer.subscription.deleted"
  | "invoice.payment_succeeded"
  | "invoice.payment_failed";

/**
 * Webhook processing result
 */
export interface WebhookProcessingResult {
  received: boolean;
  event_id: string;
  already_processed?: boolean;
  user_id?: string;
  changes_applied?: boolean;
}

/**
 * Webhook event record for database
 */
export interface WebhookEventRecord {
  id?: string;
  event_id: string;
  payload: Record<string, unknown>;
  received_at?: string;
  processed_at?: string | null;
  status?: "received" | "processing" | "processed" | "failed";
  error?: string | null;
  user_id?: string | null;
}

/**
 * Subscription update data
 */
export interface SubscriptionUpdateData {
  stripe_subscription_id?: string;
  subscription_status?: Database["public"]["Enums"]["subscription_status"];
  current_period_end?: string;
  plan_id?: string;
  updated_at?: string;
  trial_expires_at?: string | null;
}

/**
 * Process event parameters
 */
export interface ProcessEventParams {
  event: StripeWebhookEvent;
}

/**
 * Process event result
 */
export interface ProcessEventResult {
  success: boolean;
  user_id?: string;
  changes_applied: boolean;
  already_processed?: boolean;
  error?: string;
}
