/**
 * Audit Service Layer
 * Handles logging of subscription changes for compliance and debugging
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../db/database.types";

type SubscriptionAuditInsert = Database["public"]["Tables"]["subscription_audit"]["Insert"];

export interface AuditLogEntry {
  user_id: string;
  change_type: string;
  previous: Record<string, unknown> | null;
  current: Record<string, unknown> | null;
}

/**
 * Service class for audit logging operations
 */
export class AuditService {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Loguje zmianę w subskrypcji użytkownika.
   * @param entry - Dane audytu do zapisania
   * @returns Utworzony rekord audytu lub błąd
   */
  async logSubscriptionChange(entry: AuditLogEntry) {
    const auditData: SubscriptionAuditInsert = {
      user_id: entry.user_id,
      change_type: entry.change_type,
      previous: entry.previous as unknown as Database["public"]["Tables"]["subscription_audit"]["Insert"]["previous"],
      current: entry.current as unknown as Database["public"]["Tables"]["subscription_audit"]["Insert"]["current"],
      created_at: new Date().toISOString(),
    };

    const { data, error } = await this.supabase.from("subscription_audit").insert(auditData).select().single();

    if (error) {
      // Log error but don't fail the main operation
      console.error("Failed to log audit entry:", error);
    }

    return { data, error };
  }

  /**
   * Pobiera historię zmian subskrypcji dla użytkownika.
   * @param userId - UUID użytkownika
   * @param limit - Maksymalna liczba wpisów (domyślnie 50)
   * @returns Lista wpisów audytu
   */
  async getUserAuditHistory(userId: string, limit = 50) {
    const { data, error } = await this.supabase
      .from("subscription_audit")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching audit history:", error);
      return { data: [], error };
    }

    return { data, error: null };
  }
}
