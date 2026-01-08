/**
 * Auth Context for managing user session
 * Uses React Context + Supabase client
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabaseClient } from "@/db/supabase.client";
import { apiClient } from "@/lib/api-client";
import { clearGridCache } from "@/hooks/useClientCache";
import type { UserProfileDTO } from "@/types/types";

interface AuthContextValue {
  user: User | null;
  profile: UserProfileDTO | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfileDTO | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user profile from API
  const fetchProfile = async () => {
    try {
      // apiClient.get extracts data from { success, data, timestamp }
      // API returns { user: UserProfileDTO } in data
      const data = await apiClient.get<{ user: UserProfileDTO }>("/api/users/me");
      setProfile(data.user || null);
    } catch {
      // Silent fail - profile will remain null
    }
  };

  // Refresh profile data
  const refreshProfile = async () => {
    if (user) {
      await fetchProfile();
    }
  };

  // Sign out
  const signOut = async () => {
    await supabaseClient.auth.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);

    // Clear cached grid data but preserve user preferences (GDPR-ready)
    // Removes cache: cache:grid:*, cache:event:*, cache:summary:* (events, summaries, details)
    // Preserves: gpw:preferences:* (symbols, range selections)
    clearGridCache();
  };

  // Initialize auth state
  useEffect(() => {
    // Get initial session
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile();
      }
      setIsLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile();
      } else {
        setProfile(null);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const value: AuthContextValue = {
    user,
    profile,
    session,
    isLoading,
    isAuthenticated: !!user,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to use auth context
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
