/**
 * Manage Subscription Button Component
 * Handles Stripe Portal redirect
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ExternalLink, Loader2 } from "lucide-react";

interface ManageSubscriptionButtonProps {
  onError?: (error: Error) => void;
}

export function ManageSubscriptionButton({ onError }: ManageSubscriptionButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/subscriptions/create-portal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          return_url: window.location.href,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create portal session");
      }

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
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
