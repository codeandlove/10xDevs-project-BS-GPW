import { describe, it, expect, vi, beforeEach } from "vitest";
import { getAuthUid, getAuthUidAndToken, hasActiveSubscription, isTrialActive, canAccessPremiumFeatures } from "./auth";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserProfileDTO } from "@/types/types";

describe("Auth Helpers", () => {
  let mockSupabase: SupabaseClient;

  beforeEach(() => {
    mockSupabase = {
      auth: {
        getUser: vi.fn(),
      },
    } as unknown as SupabaseClient;
  });

  describe("getAuthUid", () => {
    it("should return auth_uid for valid bearer token", async () => {
      const mockRequest = new Request("http://localhost:3000", {
        headers: { authorization: "Bearer valid-token-123" },
      });

      vi.mocked(mockSupabase.auth.getUser).mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      } as never);

      const result = await getAuthUid(mockRequest, mockSupabase);

      expect(result).toBe("user-123");
      expect(mockSupabase.auth.getUser).toHaveBeenCalledWith("valid-token-123");
    });

    it("should return null if authorization header is missing", async () => {
      const mockRequest = new Request("http://localhost:3000");

      const result = await getAuthUid(mockRequest, mockSupabase);

      expect(result).toBeNull();
      expect(mockSupabase.auth.getUser).not.toHaveBeenCalled();
    });

    it("should return null if authorization header does not start with Bearer", async () => {
      const mockRequest = new Request("http://localhost:3000", {
        headers: { authorization: "Basic invalid-auth" },
      });

      const result = await getAuthUid(mockRequest, mockSupabase);

      expect(result).toBeNull();
      expect(mockSupabase.auth.getUser).not.toHaveBeenCalled();
    });

    it("should return null if supabase.auth.getUser returns error", async () => {
      const mockRequest = new Request("http://localhost:3000", {
        headers: { authorization: "Bearer invalid-token" },
      });

      vi.mocked(mockSupabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: { message: "Invalid token", name: "AuthError", status: 401 },
      } as never);

      const result = await getAuthUid(mockRequest, mockSupabase);

      expect(result).toBeNull();
    });

    it("should return null if user is not found", async () => {
      const mockRequest = new Request("http://localhost:3000", {
        headers: { authorization: "Bearer valid-token" },
      });

      vi.mocked(mockSupabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null,
      } as never);

      const result = await getAuthUid(mockRequest, mockSupabase);

      expect(result).toBeNull();
    });

    it("should return null if exception is thrown", async () => {
      const mockRequest = new Request("http://localhost:3000", {
        headers: { authorization: "Bearer valid-token" },
      });

      vi.mocked(mockSupabase.auth.getUser).mockRejectedValue(new Error("Network error"));

      const result = await getAuthUid(mockRequest, mockSupabase);

      expect(result).toBeNull();
    });
  });

  describe("getAuthUidAndToken", () => {
    it("should return both authUid and token for valid bearer token", async () => {
      const mockRequest = new Request("http://localhost:3000", {
        headers: { authorization: "Bearer valid-token-456" },
      });

      vi.mocked(mockSupabase.auth.getUser).mockResolvedValue({
        data: { user: { id: "user-456" } },
        error: null,
      } as never);

      const result = await getAuthUidAndToken(mockRequest, mockSupabase);

      expect(result).toEqual({
        authUid: "user-456",
        token: "valid-token-456",
      });
      expect(mockSupabase.auth.getUser).toHaveBeenCalledWith("valid-token-456");
    });

    it("should return null if authorization header is missing", async () => {
      const mockRequest = new Request("http://localhost:3000");

      const result = await getAuthUidAndToken(mockRequest, mockSupabase);

      expect(result).toBeNull();
    });

    it("should return null if authorization header does not start with Bearer", async () => {
      const mockRequest = new Request("http://localhost:3000", {
        headers: { authorization: "Basic invalid-auth" },
      });

      const result = await getAuthUidAndToken(mockRequest, mockSupabase);

      expect(result).toBeNull();
    });

    it("should return null if supabase.auth.getUser returns error", async () => {
      const mockRequest = new Request("http://localhost:3000", {
        headers: { authorization: "Bearer invalid-token" },
      });

      vi.mocked(mockSupabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: { message: "Invalid token", name: "AuthError", status: 401 },
      } as never);

      const result = await getAuthUidAndToken(mockRequest, mockSupabase);

      expect(result).toBeNull();
    });

    it("should return null if exception is thrown", async () => {
      const mockRequest = new Request("http://localhost:3000", {
        headers: { authorization: "Bearer valid-token" },
      });

      vi.mocked(mockSupabase.auth.getUser).mockRejectedValue(new Error("Network error"));

      const result = await getAuthUidAndToken(mockRequest, mockSupabase);

      expect(result).toBeNull();
    });
  });

  describe("hasActiveSubscription", () => {
    it("should return true for active paid subscription", () => {
      const profile: UserProfileDTO = {
        auth_uid: "user-123",
        role: "user",
        subscription_status: "active",
        trial_expires_at: null,
        current_period_end: "2025-01-01T00:00:00Z",
        plan_id: null,
        deleted_at: null,
        stripe_customer_id: "cus_123",
        metadata: {},
        created_at: "2024-01-01T00:00:00Z",
      };

      expect(hasActiveSubscription(profile)).toBe(true);
    });

    it("should return true for active trial within validity period", () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);

      const profile: UserProfileDTO = {
        auth_uid: "user-123",
        role: "user",
        subscription_status: "trial",
        trial_expires_at: futureDate.toISOString(),
        current_period_end: null,
        plan_id: null,
        deleted_at: null,
        stripe_customer_id: null,
        metadata: {},
        created_at: "2024-01-01T00:00:00Z",
      };

      expect(hasActiveSubscription(profile)).toBe(true);
    });

    it("should return false for expired trial", () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);

      const profile: UserProfileDTO = {
        auth_uid: "user-123",
        role: "user",
        subscription_status: "trial",
        trial_expires_at: pastDate.toISOString(),
        current_period_end: null,
        plan_id: null,
        deleted_at: null,
        stripe_customer_id: null,
        metadata: {},
        created_at: "2024-01-01T00:00:00Z",
      };

      expect(hasActiveSubscription(profile)).toBe(false);
    });

    it("should return false for canceled subscription", () => {
      const profile: UserProfileDTO = {
        auth_uid: "user-123",
        role: "user",
        subscription_status: "canceled",
        trial_expires_at: null,
        current_period_end: "2025-01-01T00:00:00Z",
        plan_id: null,
        deleted_at: null,
        stripe_customer_id: "cus_123",
        metadata: {},
        created_at: "2024-01-01T00:00:00Z",
      };

      expect(hasActiveSubscription(profile)).toBe(false);
    });

    it("should return false for soft-deleted user", () => {
      const profile: UserProfileDTO = {
        auth_uid: "user-123",
        role: "user",
        subscription_status: "active",
        trial_expires_at: null,
        current_period_end: "2025-01-01T00:00:00Z",
        plan_id: null,
        deleted_at: "2024-01-15T00:00:00Z",
        stripe_customer_id: "cus_123",
        metadata: {},
        created_at: "2024-01-01T00:00:00Z",
      };

      expect(hasActiveSubscription(profile)).toBe(false);
    });

    it("should return false for null profile", () => {
      expect(hasActiveSubscription(null)).toBe(false);
    });

    it("should return false for trial without trial_expires_at", () => {
      const profile: UserProfileDTO = {
        auth_uid: "user-123",
        role: "user",
        subscription_status: "trial",
        trial_expires_at: null,
        current_period_end: null,
        plan_id: null,
        deleted_at: null,
        stripe_customer_id: null,
        metadata: {},
        created_at: "2024-01-01T00:00:00Z",
      };

      expect(hasActiveSubscription(profile)).toBe(false);
    });
  });

  describe("isTrialActive", () => {
    it("should return true for active trial within validity period", () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 3);

      const profile: UserProfileDTO = {
        auth_uid: "user-123",
        role: "user",
        subscription_status: "trial",
        trial_expires_at: futureDate.toISOString(),
        current_period_end: null,
        plan_id: null,
        deleted_at: null,
        stripe_customer_id: null,
        metadata: {},
        created_at: "2024-01-01T00:00:00Z",
      };

      expect(isTrialActive(profile)).toBe(true);
    });

    it("should return false for expired trial", () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const profile: UserProfileDTO = {
        auth_uid: "user-123",
        role: "user",
        subscription_status: "trial",
        trial_expires_at: pastDate.toISOString(),
        current_period_end: null,
        plan_id: null,
        deleted_at: null,
        stripe_customer_id: null,
        metadata: {},
        created_at: "2024-01-01T00:00:00Z",
      };

      expect(isTrialActive(profile)).toBe(false);
    });

    it("should return false for null profile", () => {
      expect(isTrialActive(null)).toBe(false);
    });

    it("should return false for trial without trial_expires_at", () => {
      const profile: UserProfileDTO = {
        auth_uid: "user-123",
        role: "user",
        subscription_status: "trial",
        trial_expires_at: null,
        current_period_end: null,
        plan_id: null,
        deleted_at: null,
        stripe_customer_id: null,
        metadata: {},
        created_at: "2024-01-01T00:00:00Z",
      };

      expect(isTrialActive(profile)).toBe(false);
    });

    it("should return false for active paid subscription (not trial)", () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 3);

      const profile: UserProfileDTO = {
        auth_uid: "user-123",
        role: "user",
        subscription_status: "active",
        trial_expires_at: futureDate.toISOString(),
        current_period_end: null,
        plan_id: null,
        deleted_at: null,
        stripe_customer_id: "cus_123",
        metadata: {},
        created_at: "2024-01-01T00:00:00Z",
      };

      expect(isTrialActive(profile)).toBe(false);
    });
  });

  describe("canAccessPremiumFeatures", () => {
    it("should return true for active paid subscription", () => {
      const profile: UserProfileDTO = {
        auth_uid: "user-123",
        role: "user",
        subscription_status: "active",
        trial_expires_at: null,
        current_period_end: "2025-01-01T00:00:00Z",
        plan_id: null,
        deleted_at: null,
        stripe_customer_id: "cus_123",
        metadata: {},
        created_at: "2024-01-01T00:00:00Z",
      };

      expect(canAccessPremiumFeatures(profile)).toBe(true);
    });

    it("should return true for active trial", () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);

      const profile: UserProfileDTO = {
        auth_uid: "user-123",
        role: "user",
        subscription_status: "trial",
        trial_expires_at: futureDate.toISOString(),
        current_period_end: null,
        plan_id: null,
        deleted_at: null,
        stripe_customer_id: null,
        metadata: {},
        created_at: "2024-01-01T00:00:00Z",
      };

      expect(canAccessPremiumFeatures(profile)).toBe(true);
    });

    it("should return false for expired subscription", () => {
      const profile: UserProfileDTO = {
        auth_uid: "user-123",
        role: "user",
        subscription_status: "canceled",
        trial_expires_at: null,
        current_period_end: "2025-01-01T00:00:00Z",
        plan_id: null,
        deleted_at: null,
        stripe_customer_id: "cus_123",
        metadata: {},
        created_at: "2024-01-01T00:00:00Z",
      };

      expect(canAccessPremiumFeatures(profile)).toBe(false);
    });

    it("should return false for null profile", () => {
      expect(canAccessPremiumFeatures(null)).toBe(false);
    });

    it("should be an alias for hasActiveSubscription", () => {
      const profile: UserProfileDTO = {
        auth_uid: "user-123",
        role: "user",
        subscription_status: "active",
        trial_expires_at: null,
        current_period_end: "2025-01-01T00:00:00Z",
        plan_id: null,
        deleted_at: null,
        stripe_customer_id: "cus_123",
        metadata: {},
        created_at: "2024-01-01T00:00:00Z",
      };

      expect(canAccessPremiumFeatures(profile)).toBe(hasActiveSubscription(profile));
    });
  });
});
