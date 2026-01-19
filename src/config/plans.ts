/**
 * Subscription Plans Configuration
 * Centralized configuration for Stripe pricing
 */

export interface SubscriptionPlan {
  id: string;
  name: string;
  price_id: string; // Stripe Price ID
  price_monthly: number; // Cena w PLN/miesiąc
  features: string[];
  recommended?: boolean;
}

/**
 * Available subscription plans
 * In MVP we have only one plan, but structure allows easy expansion
 */
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "pro",
    name: "Pro",
    price_id: import.meta.env.PUBLIC_STRIPE_PRICE_ID_PRO || "price_default",
    price_monthly: 99,
    features: [
      "Pełen dostęp do Black Swan Grid",
      "Nieograniczone AI summaries",
      "Historyczne dane GPW",
      "Analizy i rekomendacje AI",
      "Wsparcie email",
    ],
    recommended: true,
  },
];

/**
 * Get default plan (first plan or recommended)
 */
export function getDefaultPlan(): SubscriptionPlan {
  return SUBSCRIPTION_PLANS.find((p) => p.recommended) || SUBSCRIPTION_PLANS[0];
}

/**
 * Get plan by id
 */
export function getPlanById(id: string): SubscriptionPlan | undefined {
  return SUBSCRIPTION_PLANS.find((p) => p.id === id);
}
