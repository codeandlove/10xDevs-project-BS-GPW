/**
 * Subscription Status Component
 * Displays subscription/trial status with dates
 */

import type { UserProfileDTO } from "@/types/types";
import { getSubscriptionStatusLabel, getSubscriptionStatusColor, formatDate, daysRemaining } from "@/lib/ui-utils";

interface SubscriptionStatusProps {
  profile: UserProfileDTO;
}

export function SubscriptionStatus({ profile }: SubscriptionStatusProps) {
  const { subscription_status, trial_expires_at, current_period_end, plan_id } = profile;

  const statusLabel = getSubscriptionStatusLabel(subscription_status);
  const statusColor = getSubscriptionStatusColor(subscription_status);

  const getStatusMessage = () => {
    if (subscription_status === "trial" && trial_expires_at) {
      const days = daysRemaining(trial_expires_at);
      return {
        title: "Trial aktywny",
        message: `Wygasa ${formatDate(trial_expires_at)}`,
        detail: days !== null && days > 0 ? `Pozostało ${days} dni` : "Wygasł",
      };
    }

    if (subscription_status === "active" && current_period_end) {
      return {
        title: "Subskrypcja aktywna",
        message: `Odnawia się ${formatDate(current_period_end)}`,
        detail: plan_id ? `Plan: ${plan_id}` : "",
      };
    }

    if (subscription_status === "past_due") {
      return {
        title: "Problem z płatnością",
        message: "Zaktualizuj metodę płatności",
        detail: "Twoja subskrypcja może zostać zawieszona",
      };
    }

    if (subscription_status === "canceled") {
      return {
        title: "Subskrypcja anulowana",
        message: current_period_end ? `Dostęp do ${formatDate(current_period_end)}` : "Brak aktywnej subskrypcji",
        detail: "",
      };
    }

    return {
      title: "Brak aktywnej subskrypcji",
      message: "Kup plan, aby uzyskać dostęp",
      detail: "",
    };
  };

  const statusInfo = getStatusMessage();

  return (
    <div className="rounded-lg border p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">Status subskrypcji</span>
        <span className={`rounded-full border px-3 py-1 text-xs font-medium ${statusColor}`}>{statusLabel}</span>
      </div>

      <div>
        <p className="mb-1 font-semibold">{statusInfo.title}</p>
        <p className="text-sm text-muted-foreground">{statusInfo.message}</p>
        {statusInfo.detail && <p className="mt-1 text-xs text-muted-foreground">{statusInfo.detail}</p>}
      </div>
    </div>
  );
}
