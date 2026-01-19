/**
 * useCheckout hook
 * Handles Stripe Checkout session creation and redirect
 */

import { useState, useCallback } from "react";
import type { CheckoutSessionDTO } from "@/types/subscription.types";
import { supabaseClient } from "@/db/supabase.client";

interface UseCheckoutOptions {
  priceId: string;
  successUrl?: string;
  cancelUrl?: string;
}

interface UseCheckoutReturn {
  initiateCheckout: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function useCheckout({
  priceId,
  successUrl = `${window.location.origin}/checkout/success`,
  cancelUrl = `${window.location.origin}/checkout/cancel`,
}: UseCheckoutOptions): UseCheckoutReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initiateCheckout = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Get Supabase session token
      const {
        data: { session },
        error: sessionError,
      } = await supabaseClient.auth.getSession();

      if (sessionError || !session) {
        throw new Error("Nie jesteś zalogowany. Zaloguj się, aby kontynuować.");
      }

      // Call create-checkout API
      const response = await fetch("/api/subscriptions/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          price_id: priceId,
          success_url: successUrl,
          cancel_url: cancelUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || "Nie udało się utworzyć sesji płatności");
      }

      const checkoutData = data.data as CheckoutSessionDTO;

      // Redirect to Stripe Checkout
      window.location.href = checkoutData.checkout_url;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Wystąpił błąd. Spróbuj ponownie.";
      setError(message);
      setIsLoading(false);
    }
  }, [priceId, successUrl, cancelUrl]);

  return {
    initiateCheckout,
    isLoading,
    error,
  };
}
