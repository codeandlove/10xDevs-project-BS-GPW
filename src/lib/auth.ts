/**
 * Authentication helpers for User Management API
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserProfileDTO } from "@/types/types";

/**
 * Ekstraktuje auth_uid z tokenu sesji Supabase.
 * @param request - Request object z Astro
 * @param supabase - Supabase client z locals
 * @returns auth_uid użytkownika lub null jeśli brak autoryzacji
 */
export async function getAuthUid(request: Request, supabase: SupabaseClient): Promise<string | null> {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }

    const token = authHeader.substring(7);
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
      return null;
    }

    return data.user.id;
  } catch (err) {
    console.error("Error extracting auth UID:", err);
    return null;
  }
}

/**
 * Sprawdza czy użytkownik ma aktywną subskrypcję
 * Zgodnie z api-plan.md sekcja 4.1: Authorization Helpers
 * @param profile - Profil użytkownika
 * @returns true jeśli ma aktywną subskrypcję (trial lub paid)
 */
export function hasActiveSubscription(profile: UserProfileDTO | null): boolean {
  if (!profile) return false;

  // Sprawdź czy nie jest usunięty (soft delete)
  if (profile.deleted_at) return false;

  // Sprawdź status subskrypcji - paid subscription
  if (profile.subscription_status === "active") return true;

  // Sprawdź trial - musi być w okresie ważności
  if (profile.subscription_status === "trial" && profile.trial_expires_at) {
    const trialExpiry = new Date(profile.trial_expires_at);
    const now = new Date();
    return trialExpiry > now;
  }

  return false;
}

/**
 * Sprawdza czy trial użytkownika jest aktywny
 * @param profile - Profil użytkownika
 * @returns true jeśli trial jest aktywny (nie wygasł i status = trial)
 */
export function isTrialActive(profile: UserProfileDTO | null): boolean {
  if (!profile || !profile.trial_expires_at) return false;

  const trialExpiry = new Date(profile.trial_expires_at);
  const now = new Date();
  return trialExpiry > now && profile.subscription_status === "trial";
}

/**
 * Sprawdza czy użytkownik ma dostęp do premium features
 * Alias dla hasActiveSubscription - lepiej wyraża intencję w kontekście autoryzacji
 * @param profile - Profil użytkownika
 * @returns true jeśli użytkownik może korzystać z premium features
 */
export function canAccessPremiumFeatures(profile: UserProfileDTO | null): boolean {
  return hasActiveSubscription(profile);
}
