/**
 * CheckoutLoader component
 * Displays loading state while creating Stripe Checkout session
 */

import { useEffect } from "react";
import { useCheckout } from "@/hooks/useCheckout";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle } from "lucide-react";

interface CheckoutLoaderProps {
  priceId: string;
}

export default function CheckoutLoader({ priceId }: CheckoutLoaderProps) {
  const { initiateCheckout, isLoading, error } = useCheckout({
    priceId,
  });

  // Auto-initiate checkout on mount
  useEffect(() => {
    initiateCheckout();
  }, [initiateCheckout]);

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center">
        <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-600" />
        <h2 className="mb-2 text-xl font-semibold text-gray-900">Wystąpił błąd</h2>
        <p className="mb-6 text-sm text-gray-600">{error}</p>
        <Button onClick={initiateCheckout} disabled={isLoading}>
          Spróbuj ponownie
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
      <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-blue-600" />
      <h2 className="mb-2 text-xl font-semibold text-gray-900">Przygotowujemy płatność...</h2>
      <p className="text-sm text-gray-600">Zaraz zostaniesz przekierowany do bezpiecznej strony płatności.</p>
      <p className="mt-4 text-xs text-gray-500">Może to potrwać kilka sekund. Nie odświeżaj strony.</p>
    </div>
  );
}
