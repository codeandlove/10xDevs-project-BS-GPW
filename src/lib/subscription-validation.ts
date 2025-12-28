/**
 * Subscription Management Validation
 * Zod schemas and validation helpers for subscription endpoints
 */

import { z } from "zod";

/**
 * Schema for POST /api/subscriptions/create-checkout
 */
export const CreateCheckoutSchema = z.object({
  price_id: z.string().min(1, "price_id is required").startsWith("price_", "Invalid Stripe price ID format"),
  success_url: z.string().url("Invalid success_url format"),
  cancel_url: z.string().url("Invalid cancel_url format"),
});

/**
 * Schema for POST /api/subscriptions/create-portal
 */
export const CreatePortalSchema = z.object({
  return_url: z.string().url("Invalid return_url format"),
});

/**
 * Type guards for validation
 */
export type CreateCheckoutInput = z.infer<typeof CreateCheckoutSchema>;
export type CreatePortalInput = z.infer<typeof CreatePortalSchema>;
