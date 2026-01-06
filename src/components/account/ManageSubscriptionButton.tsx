/**
 * Manage Subscription Button Component
 * Handles Stripe Portal redirect
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ExternalLink, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api-client";

interface ManageSubscriptionButtonProps {
  onError?: (error: Error) => void;
}

export function ManageSubscriptionButton({ onError }: ManageSubscriptionButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);

    try {
      const data = await apiClient.post<{ portal_url?: string }>("/api/subscriptions/create-portal", {
        return_url: window.location.href,
      });

      if (data.portal_url) {
        window.location.href = data.portal_url;
      } else {
        throw new Error("No portal URL returned");
      }
    } catch (error) {
      console.error("Failed to open Stripe Portal:", error);
      if (onError) {
        onError(error instanceof Error ? error : new Error("Failed to open Stripe Portal"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button onClick={handleClick} disabled={isLoading} className="w-full gap-2">
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Ładowanie...</span>
        </>
      ) : (
        <>
          <ExternalLink className="h-4 w-4" />
          <span>Zarządzaj subskrypcją</span>
        </>
      )}
    </Button>
  );
}
