/**
 * Subscription Service Layer
 * Handles business logic for subscription management with Stripe integration
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../db/database.types";
import { stripe } from "../lib/stripe";
import { AuditService } from "./audit.service";
import { SubscriptionError, StripeError, NoCustomerError, UserNotFoundError, DatabaseError } from "../lib/errors";
import type {
  SubscriptionStatusDTO,
  CheckoutSessionDTO,
  PortalSessionDTO,
  CheckoutSessionParams,
  PortalSessionParams,
  AppUserSubscriptionData,
} from "../types/subscription.types";

type AppUser = Database["public"]["Tables"]["app_users"]["Row"];

/**
 * Stripe Error Type with extended properties
 */
interface StripeErrorType extends Error {
  type?: string;
  code?: string;
  statusCode?: number;
}

/**
 * Service class for subscription management operations
 */
export class SubscriptionService {
  private auditService: AuditService;

  constructor(private supabase: SupabaseClient<Database>) {
    this.auditService = new AuditService(supabase);
  }

  /**
   * Get current subscription status for user
   * @param authUid - User's auth_uid
   * @returns Subscription status with access information
   */
  async getSubscriptionStatus(authUid: string): Promise<SubscriptionStatusDTO> {
    try {
      const { data, error } = await this.supabase
        .from("app_users")
        .select("auth_uid, subscription_status, trial_expires_at, current_period_end, plan_id, stripe_subscription_id")
        .eq("auth_uid", authUid)
        .is("deleted_at", null)
        .single();

      if (error) {
        console.error("Database error in getSubscriptionStatus:", error);
        throw new DatabaseError("Failed to fetch user subscription", error);
      }

      if (!data) {
        throw new UserNotFoundError();
      }

      const has_access = this.calculateAccess(data as AppUserSubscriptionData);

      return {
        subscription_status: data.subscription_status,
        trial_expires_at: data.trial_expires_at,
        current_period_end: data.current_period_end,
        plan_id: data.plan_id,
        stripe_subscription_id: data.stripe_subscription_id,
        has_access,
      };
    } catch (error) {
      if (error instanceof SubscriptionError) {
        throw error;
      }
      console.error("Unexpected error in getSubscriptionStatus:", error);
      throw new SubscriptionError("Failed to get subscription status", "UNKNOWN_ERROR", 500);
    }
  }

  /**
   * Calculate if user has access to the application
   * @param user - User subscription data
   * @returns true if user has access (trial or active subscription)
   */
  private calculateAccess(user: AppUserSubscriptionData): boolean {
    const now = new Date();

    // Check if trial is still valid
    const trialValid = user.trial_expires_at && new Date(user.trial_expires_at) > now;

    // Check if subscription status allows access
    const statusActive = ["trial", "active"].includes(user.subscription_status);

    return statusActive || !!trialValid;
  }

  /**
   * Get user profile with all subscription data
   * @param authUid - User's auth_uid
   * @returns User profile data
   */
  private async getUserProfile(authUid: string): Promise<AppUser> {
    const { data, error } = await this.supabase
      .from("app_users")
      .select("*")
      .eq("auth_uid", authUid)
      .is("deleted_at", null)
      .single();

    if (error) {
      console.error("Database error in getUserProfile:", error);
      throw new DatabaseError("Failed to fetch user profile", error);
    }

    if (!data) {
      throw new UserNotFoundError();
    }

    return data;
  }

  /**
   * Create or retrieve Stripe customer for user
   * @param authUid - User's auth_uid
   * @returns Stripe customer ID
   */
  async createOrGetStripeCustomer(authUid: string): Promise<string> {
    try {
      // Get user profile
      const user = await this.getUserProfile(authUid);

      // Return existing customer if already created
      if (user.stripe_customer_id) {
        return user.stripe_customer_id;
      }

      // Get email from Supabase Auth
      const { data: authUser, error: authError } = await this.supabase.auth.admin.getUserById(authUid);

      if (authError || !authUser?.user?.email) {
        console.error("Failed to get user email:", authError);
        throw new DatabaseError("Failed to get user email for Stripe customer");
      }

      // Create Stripe customer
      const customer = await stripe.customers.create({
        email: authUser.user.email,
        metadata: {
          auth_uid: authUid,
        },
      });

      // Update app_users with stripe_customer_id
      const { error: updateError } = await this.supabase
        .from("app_users")
        .update({
          stripe_customer_id: customer.id,
          updated_at: new Date().toISOString(),
        })
        .eq("auth_uid", authUid);

      if (updateError) {
        console.error("Failed to update user with stripe_customer_id:", updateError);
        throw new DatabaseError("Failed to save Stripe customer ID");
      }

      // Log to audit trail
      await this.auditService.logSubscriptionChange({
        user_id: authUid,
        change_type: "stripe_customer_created",
        previous: null,
        current: { stripe_customer_id: customer.id },
      });

      return customer.id;
    } catch (error) {
      if (error instanceof SubscriptionError) {
        throw error;
      }

      if (error instanceof Error && "type" in error) {
        // Stripe error
        const stripeError = error as StripeErrorType;
        console.error("Stripe API error in createOrGetStripeCustomer:", error);
        throw new StripeError("Failed to create Stripe customer", stripeError.message);
      }

      console.error("Unexpected error in createOrGetStripeCustomer:", error);
      throw new SubscriptionError("Failed to create customer", "UNKNOWN_ERROR", 500);
    }
  }

  /**
   * Create Stripe Checkout session for subscription
   * @param authUid - User's auth_uid
   * @param params - Checkout session parameters
   * @returns Checkout session URL and ID
   */
  async createCheckoutSession(
    authUid: string,
    params: Omit<CheckoutSessionParams, "customer_id">
  ): Promise<CheckoutSessionDTO> {
    try {
      // Get or create Stripe customer
      const customerId = await this.createOrGetStripeCustomer(authUid);

      // Create checkout session
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        line_items: [
          {
            price: params.price_id,
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: params.success_url,
        cancel_url: params.cancel_url,
        allow_promotion_codes: true,
        billing_address_collection: "auto",
        metadata: {
          auth_uid: authUid,
          customer_id: customerId,
        },
      });

      if (!session.url) {
        throw new StripeError("Stripe checkout session created but URL is missing");
      }

      return {
        checkout_url: session.url,
        session_id: session.id,
      };
    } catch (error) {
      if (error instanceof SubscriptionError) {
        throw error;
      }

      if (error instanceof Error && "type" in error) {
        // Stripe error
        const stripeError = error as StripeErrorType;
        console.error("Stripe API error in createCheckoutSession:", {
          type: stripeError.type,
          message: stripeError.message,
          code: stripeError.code,
        });
        throw new StripeError("Failed to create checkout session", stripeError.message || "Unknown Stripe error");
      }

      console.error("Unexpected error in createCheckoutSession:", error);
      throw new SubscriptionError("Failed to create checkout session", "UNKNOWN_ERROR", 500);
    }
  }

  /**
   * Create Stripe Customer Portal session
   * @param authUid - User's auth_uid
   * @param params - Portal session parameters
   * @returns Portal session URL
   */
  async createPortalSession(
    authUid: string,
    params: Omit<PortalSessionParams, "customer_id">
  ): Promise<PortalSessionDTO> {
    try {
      // Get user profile
      const user = await this.getUserProfile(authUid);

      // Check if user has Stripe customer
      if (!user.stripe_customer_id) {
        throw new NoCustomerError();
      }

      // Create portal session
      const session = await stripe.billingPortal.sessions.create({
        customer: user.stripe_customer_id,
        return_url: params.return_url,
      });

      return {
        portal_url: session.url,
      };
    } catch (error) {
      if (error instanceof SubscriptionError) {
        throw error;
      }

      if (error instanceof Error && "type" in error) {
        // Stripe error
        const stripeError = error as StripeErrorType;
        console.error("Stripe API error in createPortalSession:", {
          type: stripeError.type,
          message: stripeError.message,
          code: stripeError.code,
        });
        throw new StripeError("Failed to create portal session", stripeError.message || "Unknown Stripe error");
      }

      console.error("Unexpected error in createPortalSession:", error);
      throw new SubscriptionError("Failed to create portal session", "UNKNOWN_ERROR", 500);
    }
  }
}
