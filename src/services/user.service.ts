/**
 * User Service Layer
 * Handles business logic for user management operations
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../db/database.types";

type AppUser = Database["public"]["Tables"]["app_users"]["Row"];

export interface InitializeUserDTO {
  auth_uid: string;
  email?: string;
}

export type UserProfileDTO = AppUser;

/**
 * Service class for user management operations
 */
export class UserService {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Inicjalizuje rekord użytkownika z 7-dniowym trialem.
   * @param dto - Dane użytkownika do inicjalizacji
   * @returns Utworzony rekord użytkownika lub błąd
   */
  async initializeUser(dto: InitializeUserDTO) {
    const now = new Date().toISOString();
    const trialExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await this.supabase
      .from("app_users")
      .insert({
        auth_uid: dto.auth_uid,
        role: "user",
        subscription_status: "trial",
        trial_expires_at: trialExpires,
        metadata: {},
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    return { data, error };
  }

  /**
   * Pobiera profil użytkownika.
   * @param authUid - UUID użytkownika z auth
   * @returns Profil użytkownika lub null
   */
  async getUserProfile(authUid: string): Promise<UserProfileDTO | null> {
    const { data, error } = await this.supabase
      .from("app_users")
      .select("*")
      .eq("auth_uid", authUid)
      .is("deleted_at", null)
      .single();

    if (error) {
      console.error("Error fetching user profile:", error);
      return null;
    }

    return data;
  }

  /**
   * Aktualizuje metadata użytkownika.
   * @param authUid - UUID użytkownika
   * @param metadata - Nowe metadata
   * @returns Zaktualizowany rekord lub błąd
   */
  async updateUserMetadata(authUid: string, metadata: Record<string, unknown>) {
    const { data, error } = await this.supabase
      .from("app_users")
      .update({
        metadata: metadata as unknown as Database["public"]["Tables"]["app_users"]["Update"]["metadata"],
        updated_at: new Date().toISOString(),
      })
      .eq("auth_uid", authUid)
      .is("deleted_at", null)
      .select()
      .single();

    return { data, error };
  }

  /**
   * Soft-delete konta użytkownika (GDPR compliance).
   * @param authUid - UUID użytkownika
   * @returns Zaktualizowany rekord z deleted_at lub błąd
   */
  async softDeleteUser(authUid: string) {
    const deletedAt = new Date().toISOString();

    const { data, error } = await this.supabase
      .from("app_users")
      .update({ deleted_at: deletedAt })
      .eq("auth_uid", authUid)
      .is("deleted_at", null)
      .select()
      .single();

    return { data, error, deletedAt };
  }
}
