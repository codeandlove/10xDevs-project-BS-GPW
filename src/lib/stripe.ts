/**
 * Stripe Client Configuration
 * Initializes and exports configured Stripe instance
 */

import Stripe from "stripe";

const stripeSecretKey = import.meta.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  throw new Error("Missing STRIPE_SECRET_KEY environment variable");
}

/**
 * Configured Stripe client instance
 * - API Version: 2025-02-24.acacia (latest stable)
 * - Timeout: 10 seconds
 * - TypeScript support enabled
 */
export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2025-02-24.acacia",
  typescript: true,
  timeout: 10000, // 10 seconds
  maxNetworkRetries: 2,
});
