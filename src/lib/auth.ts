/**
 * Authentication helpers for User Management API
 */
import type { SupabaseClient } from "@supabase/supabase-js";

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
