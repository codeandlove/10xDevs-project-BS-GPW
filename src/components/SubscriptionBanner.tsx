/**
 * Subscription Banner Component
 * Displays trial/subscription status information with CTAs
 */

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { daysRemaining } from "@/lib/ui-utils";
import type { UserProfileDTO } from "@/types/types";

interface SubscriptionBannerProps {
  profile: UserProfileDTO;
  onDismiss?: () => void;
  onUpgrade?: () => void;
}

export function SubscriptionBanner({ profile, onDismiss, onUpgrade }: SubscriptionBannerProps) {
  const bannerInfo = useMemo(() => {
    const { subscription_status, trial_expires_at, current_period_end } = profile;

    // Trial expiring soon
    if (subscription_status === "trial" && trial_expires_at) {
      const days = daysRemaining(trial_expires_at);
      if (days !== null && days <= 3 && days > 0) {
        return {
          type: "warning" as const,
          icon: "⏰",
          title: `Trial wygasa za ${days} ${days === 1 ? "dzień" : "dni"}`,
          message: "Kup plan, aby zachować dostęp do wszystkich funkcji.",
          cta: "Kup plan",
          showCta: true,
        };
      }
      if (days !== null && days <= 0) {
        return {
          type: "error" as const,
          icon: "🚫",
          title: "Trial wygasł",
          message: "Twój okres próbny dobiegł końca. Kup plan, aby kontynuować.",
          cta: "Kup plan",
          showCta: true,
        };
      }
    }

    // Active subscription expiring soon
    if (subscription_status === "active" && current_period_end) {
      const days = daysRemaining(current_period_end);
      if (days !== null && days <= 7 && days > 0) {
        return {
          type: "info" as const,
          icon: "📅",
          title: `Subskrypcja wygasa za ${days} ${days === 1 ? "dzień" : "dni"}`,
          message: "Twoja subskrypcja zostanie automatycznie odnowiona.",
          cta: "Zarządzaj subskrypcją",
          showCta: true,
        };
      }
    }

    // Past due
    if (subscription_status === "past_due") {
      return {
        type: "error" as const,
        icon: "💳",
        title: "Problem z płatnością",
        message: "Nie udało się przetworzyć płatności. Zaktualizuj metodę płatności.",
        cta: "Zaktualizuj płatność",
        showCta: true,
      };
    }

    // Canceled
    if (subscription_status === "canceled") {
      return {
        type: "warning" as const,
        icon: "⚠️",
        title: "Subskrypcja anulowana",
        message: "Twoja subskrypcja została anulowana. Odnów, aby kontynuować.",
        cta: "Odnów subskrypcję",
        showCta: true,
      };
    }

    return null;
  }, [profile]);

  if (!bannerInfo) return null;

  const colorClasses = {
    warning: "bg-yellow-50 border-yellow-300 text-yellow-900",
    error: "bg-red-50 border-red-300 text-red-900",
    info: "bg-blue-50 border-blue-300 text-blue-900",
  };

  return (
    <div className={`relative border-b px-4 py-3 ${colorClasses[bannerInfo.type]}`} role="alert" aria-live="polite">
      <div className="container mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl" aria-hidden="true">
            {bannerInfo.icon}
          </span>
          <div>
            <p className="font-semibold">{bannerInfo.title}</p>
            <p className="text-sm opacity-90">{bannerInfo.message}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {bannerInfo.showCta && (
            <Button onClick={onUpgrade} size="sm" variant={bannerInfo.type === "error" ? "destructive" : "default"}>
              {bannerInfo.cta}
            </Button>
          )}
          {onDismiss && (
            <button onClick={onDismiss} className="rounded p-1 hover:bg-black/10" aria-label="Zamknij powiadomienie">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Compact version for mobile
 */
export function SubscriptionBannerCompact({ profile, onUpgrade }: SubscriptionBannerProps) {
  const { subscription_status, trial_expires_at } = profile;

  if (subscription_status === "trial" && trial_expires_at) {
    const days = daysRemaining(trial_expires_at);
    if (days !== null && days <= 3 && days > 0) {
      return (
        <div className="bg-yellow-50 px-4 py-2 text-center text-sm">
          <span className="font-medium">Trial wygasa za {days} dni.</span>{" "}
          <button onClick={onUpgrade} className="font-semibold underline">
            Kup plan
          </button>
        </div>
      );
    }
  }

  return null;
}
