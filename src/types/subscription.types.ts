/**
 * Subscription Management Types
 * DTOs for subscription-related API endpoints
 */

import type { Database } from "../db/database.types";

// ============================================
// Request DTOs
// ============================================

export interface CreateCheckoutDTO {
  price_id: string;
  success_url: string;
  cancel_url: string;
}

export interface CreatePortalDTO {
  return_url: string;
}

// ============================================
// Response DTOs
// ============================================

export interface SubscriptionStatusDTO {
  subscription_status: Database["public"]["Enums"]["subscription_status"];
  trial_expires_at: string | null;
  current_period_end: string | null;
  plan_id: string | null;
  stripe_subscription_id: string | null;
  has_access: boolean;
}

export interface CheckoutSessionDTO {
  checkout_url: string;
  session_id: string;
}

export interface PortalSessionDTO {
  portal_url: string;
}

// ============================================
// Service Types
// ============================================

export interface StripeCustomerCreateParams {
  auth_uid: string;
  email: string;
}

export interface CheckoutSessionParams {
  customer_id: string;
  price_id: string;
  success_url: string;
  cancel_url: string;
}

export interface PortalSessionParams {
  customer_id: string;
  return_url: string;
}

// ============================================
// Internal Types
// ============================================

export type SubscriptionStatus = Database["public"]["Enums"]["subscription_status"];

export interface AppUserSubscriptionData {
  auth_uid: string;
  subscription_status: SubscriptionStatus;
  trial_expires_at: string | null;
  current_period_end: string | null;
  plan_id: string | null;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
}
