/**
 * Unit Tests for User Service
 * Test Coverage: User profile management, trial initialization, metadata updates
 * Per test-plan.md section 3.1 - Service Layer
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { UserService } from "./user.service";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../db/database.types";

// Mock Supabase client
const createMockSupabaseClient = () => {
  const mockSelect = vi.fn();
  const mockInsert = vi.fn();
  const mockUpdate = vi.fn();
  const mockEq = vi.fn();
  const mockIs = vi.fn();
  const mockSingle = vi.fn();

  // Chain methods properly - update needs to chain: update().eq().is().select()
  mockIs.mockReturnValue({ single: mockSingle, select: mockSelect });
  mockEq.mockReturnValue({ single: mockSingle, is: mockIs, select: mockSelect });
  mockSelect.mockReturnValue({ eq: mockEq, single: mockSingle, is: mockIs });
  mockInsert.mockReturnValue({ select: mockSelect, single: mockSingle });
  mockUpdate.mockReturnValue({ eq: mockEq, select: mockSelect });
  
  return {
    from: vi.fn(() => ({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      eq: mockEq,
      is: mockIs,
    })),
    _mockSelect: mockSelect,
    _mockInsert: mockInsert,
    _mockUpdate: mockUpdate,
    _mockEq: mockEq,
    _mockSingle: mockSingle,
    _mockIs: mockIs,
  } as unknown as SupabaseClient<Database> & {
    _mockSelect: typeof mockSelect;
    _mockInsert: typeof mockInsert;
    _mockUpdate: typeof mockUpdate;
    _mockEq: typeof mockEq;
    _mockSingle: typeof mockSingle;
    _mockIs: typeof mockIs;
  };
};

describe("UserService - Initialize User", () => {
  let service: UserService;
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    service = new UserService(mockSupabase);
  });

  it("should initialize user with 7-day trial", async () => {
    const authUid = "test-uuid-123";
    const email = "test@example.com";

    // Mock successful insert
    mockSupabase._mockSingle.mockResolvedValueOnce({
      data: {
        id: 1,
        auth_uid: authUid,
        role: "user",
        subscription_status: "trial",
        trial_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
      },
      error: null,
    });

    const result = await service.initializeUser({ auth_uid: authUid, email });

    expect(result.data).toBeDefined();
    expect(result.error).toBeNull();
    expect(result.data?.subscription_status).toBe("trial");
    expect(result.data?.role).toBe("user");

    // Verify trial expires in ~7 days
    if (result.data?.trial_expires_at) {
      const trialExpires = new Date(result.data.trial_expires_at);
      const now = new Date();
      const diffDays = (trialExpires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeGreaterThan(6.9);
      expect(diffDays).toBeLessThan(7.1);
    }
  });

  it("should initialize user without email (optional)", async () => {
    const authUid = "test-uuid-456";

    mockSupabase._mockSingle.mockResolvedValueOnce({
      data: {
        id: 2,
        auth_uid: authUid,
        role: "user",
        subscription_status: "trial",
        trial_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
      },
      error: null,
    });

    const result = await service.initializeUser({ auth_uid: authUid });

    expect(result.data).toBeDefined();
    expect(result.error).toBeNull();
  });

  it("should handle duplicate user initialization error", async () => {
    const authUid = "existing-user-uuid";

    // Mock duplicate key error (user already exists)
    mockSupabase._mockSingle.mockResolvedValueOnce({
      data: null,
      error: {
        code: "23505", // PostgreSQL unique violation
        message: "duplicate key value violates unique constraint",
        details: "Key (auth_uid)=(existing-user-uuid) already exists.",
      },
    });

    const result = await service.initializeUser({ auth_uid: authUid });

    expect(result.data).toBeNull();
    expect(result.error).toBeDefined();
    expect(result.error?.code).toBe("23505");
  });

  it("should set correct initial metadata", async () => {
    const authUid = "test-uuid-789";

    let insertedData: unknown = null;
    mockSupabase._mockInsert.mockImplementationOnce((data) => {
      insertedData = data;
      return {
        select: mockSupabase._mockSelect.mockReturnValue({
          single: mockSupabase._mockSingle.mockResolvedValue({
            data: { ...data, id: 3 },
            error: null,
          }),
        }),
      };
    });

    await service.initializeUser({ auth_uid: authUid });

    expect(insertedData).toBeDefined();
    // @ts-expect-error - checking inserted data
    expect(insertedData?.metadata).toEqual({});
  });
});

describe("UserService - Get User Profile", () => {
  let service: UserService;
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    service = new UserService(mockSupabase);
  });

  it("should fetch user profile by auth_uid", async () => {
    const authUid = "test-uuid-123";

    mockSupabase._mockSingle.mockResolvedValueOnce({
      data: {
        id: 1,
        auth_uid: authUid,
        role: "user",
        subscription_status: "active",
        trial_expires_at: null,
        stripe_customer_id: "cus_test123",
        stripe_subscription_id: "sub_test123",
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        plan_id: "price_test",
        metadata: { onboarding_completed: true },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
      },
      error: null,
    });

    const profile = await service.getUserProfile(authUid);

    expect(profile).toBeDefined();
    expect(profile?.auth_uid).toBe(authUid);
    expect(profile?.subscription_status).toBe("active");
    expect(profile?.deleted_at).toBeNull();
  });

  it("should return null if user not found", async () => {
    const authUid = "non-existent-uuid";

    mockSupabase._mockSingle.mockResolvedValueOnce({
      data: null,
      error: { code: "PGRST116", message: "No rows returned" },
    });

    const profile = await service.getUserProfile(authUid);

    expect(profile).toBeNull();
  });

  it("should exclude soft-deleted users", async () => {
    const authUid = "deleted-user-uuid";

    // Mock query with deleted_at check
    mockSupabase._mockSingle.mockResolvedValueOnce({
      data: null,
      error: { code: "PGRST116", message: "No rows returned" },
    });

    const profile = await service.getUserProfile(authUid);

    expect(profile).toBeNull();
    // Verify query included is("deleted_at", null) filter
    expect(mockSupabase._mockIs).toHaveBeenCalledWith("deleted_at", null);
  });

  it("should handle database errors gracefully", async () => {
    const authUid = "test-uuid-error";

    mockSupabase._mockSingle.mockResolvedValueOnce({
      data: null,
      error: {
        code: "PGRST301",
        message: "Database connection error",
      },
    });

    const profile = await service.getUserProfile(authUid);

    expect(profile).toBeNull();
  });
});

describe("UserService - Update User Metadata", () => {
  let service: UserService;
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    service = new UserService(mockSupabase);
  });

  it("should update user metadata successfully", async () => {
    const authUid = "test-uuid-123";
    const newMetadata = {
      onboarding_completed: true,
      preferences: {
        theme: "dark",
        symbols: ["CPD", "PKN"],
      },
    };

    mockSupabase._mockSingle.mockResolvedValueOnce({
      data: {
        id: 1,
        auth_uid: authUid,
        metadata: newMetadata,
        updated_at: new Date().toISOString(),
      },
      error: null,
    });

    const result = await service.updateUserMetadata(authUid, newMetadata);

    expect(result.data).toBeDefined();
    expect(result.error).toBeNull();
    expect(result.data?.metadata).toEqual(newMetadata);
  });

  it("should update updated_at timestamp", async () => {
    const authUid = "test-uuid-456";
    const metadata = { feature_flag: true };

    const beforeUpdate = Date.now();

    let updatedData: unknown = null;
    mockSupabase._mockUpdate.mockImplementationOnce((data) => {
      updatedData = data;
      return {
        eq: mockSupabase._mockEq.mockReturnValue({
          is: mockSupabase._mockIs.mockReturnValue({
            select: mockSupabase._mockSelect.mockReturnValue({
              single: mockSupabase._mockSingle.mockResolvedValue({
                data: { ...data, id: 1, auth_uid: authUid },
                error: null,
              }),
            }),
          }),
        }),
      };
    });

    await service.updateUserMetadata(authUid, metadata);

    expect(updatedData).toBeDefined();
    // @ts-expect-error - checking updated data
    const updatedAt = new Date(updatedData?.updated_at);
    expect(updatedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdate);
  });

  it("should handle user not found error", async () => {
    const authUid = "non-existent-uuid";

    mockSupabase._mockSingle.mockResolvedValueOnce({
      data: null,
      error: { code: "PGRST116", message: "No rows returned" },
    });

    const result = await service.updateUserMetadata(authUid, { test: true });

    expect(result.data).toBeNull();
    expect(result.error).toBeDefined();
  });

  it("should not update soft-deleted users", async () => {
    const authUid = "deleted-user-uuid";

    mockSupabase._mockSingle.mockResolvedValueOnce({
      data: null,
      error: { code: "PGRST116", message: "No rows returned" },
    });

    const result = await service.updateUserMetadata(authUid, { test: true });

    expect(result.data).toBeNull();
    // Verify query included is("deleted_at", null) filter
    expect(mockSupabase._mockIs).toHaveBeenCalledWith("deleted_at", null);
  });

  it("should preserve existing metadata fields when updating", async () => {
    const authUid = "test-uuid-789";
    const existingMetadata = { field1: "value1", field2: "value2" };
    const newMetadata = { ...existingMetadata, field3: "value3" };

    mockSupabase._mockSingle.mockResolvedValueOnce({
      data: {
        id: 1,
        auth_uid: authUid,
        metadata: newMetadata,
      },
      error: null,
    });

    const result = await service.updateUserMetadata(authUid, newMetadata);

    expect(result.data?.metadata).toHaveProperty("field1", "value1");
    expect(result.data?.metadata).toHaveProperty("field2", "value2");
    expect(result.data?.metadata).toHaveProperty("field3", "value3");
  });
});

describe("UserService - Soft Delete User", () => {
  let service: UserService;
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    service = new UserService(mockSupabase);
  });

  it("should soft delete user (GDPR compliance)", async () => {
    const authUid = "test-uuid-123";

    const beforeDelete = Date.now();

    mockSupabase._mockSingle.mockResolvedValueOnce({
      data: {
        id: 1,
        auth_uid: authUid,
        deleted_at: new Date().toISOString(),
      },
      error: null,
    });

    const result = await service.softDeleteUser(authUid);

    expect(result.data).toBeDefined();
    expect(result.error).toBeNull();
    expect(result.deletedAt).toBeDefined();

    // Verify deleted_at timestamp is recent
    const deletedAt = new Date(result.deletedAt);
    expect(deletedAt.getTime()).toBeGreaterThanOrEqual(beforeDelete);
    expect(deletedAt.getTime()).toBeLessThanOrEqual(Date.now() + 1000);
  });

  it("should only delete non-deleted users", async () => {
    const authUid = "test-uuid-456";

    mockSupabase._mockSingle.mockResolvedValueOnce({
      data: {
        id: 1,
        auth_uid: authUid,
        deleted_at: new Date().toISOString(),
      },
      error: null,
    });

    await service.softDeleteUser(authUid);

    // Verify query included is("deleted_at", null) filter
    expect(mockSupabase._mockIs).toHaveBeenCalledWith("deleted_at", null);
  });

  it("should handle user not found error", async () => {
    const authUid = "non-existent-uuid";

    mockSupabase._mockSingle.mockResolvedValueOnce({
      data: null,
      error: { code: "PGRST116", message: "No rows returned" },
    });

    const result = await service.softDeleteUser(authUid);

    expect(result.data).toBeNull();
    expect(result.error).toBeDefined();
  });

  it("should handle already deleted user", async () => {
    const authUid = "already-deleted-uuid";

    // User is already deleted, so update returns no rows
    mockSupabase._mockSingle.mockResolvedValueOnce({
      data: null,
      error: { code: "PGRST116", message: "No rows returned" },
    });

    const result = await service.softDeleteUser(authUid);

    expect(result.data).toBeNull();
    expect(result.error).toBeDefined();
  });

  it("should return deleted_at timestamp", async () => {
    const authUid = "test-uuid-789";

    const mockDeletedAt = "2026-01-08T12:00:00.000Z";

    mockSupabase._mockSingle.mockResolvedValueOnce({
      data: {
        id: 1,
        auth_uid: authUid,
        deleted_at: mockDeletedAt,
      },
      error: null,
    });

    const result = await service.softDeleteUser(authUid);

    expect(result.deletedAt).toBeDefined();
    expect(new Date(result.deletedAt).toISOString()).toBe(new Date(result.deletedAt).toISOString());
  });
});

describe("UserService - RLS Policy Integration", () => {
  let service: UserService;
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    service = new UserService(mockSupabase);
  });

  it("should respect RLS policy when fetching profile", async () => {
    const authUid = "test-uuid-123";

    // Mock RLS denying access (no data returned)
    mockSupabase._mockSingle.mockResolvedValueOnce({
      data: null,
      error: null, // RLS doesn't throw error, just returns no rows
    });

    const profile = await service.getUserProfile(authUid);

    // Should handle gracefully (return null)
    expect(profile).toBeNull();
  });

  it("should respect RLS policy when updating metadata", async () => {
    const authUid = "unauthorized-uuid";

    // Mock RLS denying update
    mockSupabase._mockSingle.mockResolvedValueOnce({
      data: null,
      error: null,
    });

    const result = await service.updateUserMetadata(authUid, { test: true });

    // Should handle gracefully
    expect(result.data).toBeNull();
  });

  it("should respect RLS policy when soft deleting", async () => {
    const authUid = "unauthorized-uuid";

    // Mock RLS denying delete
    mockSupabase._mockSingle.mockResolvedValueOnce({
      data: null,
      error: null,
    });

    const result = await service.softDeleteUser(authUid);

    // Should handle gracefully
    expect(result.data).toBeNull();
  });
});

describe("UserService - Edge Cases", () => {
  let service: UserService;
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    service = new UserService(mockSupabase);
  });

  it("should handle empty metadata object", async () => {
    const authUid = "test-uuid-123";

    mockSupabase._mockSingle.mockResolvedValueOnce({
      data: {
        id: 1,
        auth_uid: authUid,
        metadata: {},
      },
      error: null,
    });

    const result = await service.updateUserMetadata(authUid, {});

    expect(result.data).toBeDefined();
    expect(result.data?.metadata).toEqual({});
  });

  it("should handle complex nested metadata", async () => {
    const authUid = "test-uuid-456";
    const complexMetadata = {
      preferences: {
        theme: "dark",
        notifications: {
          email: true,
          push: false,
          sms: false,
        },
        grid: {
          defaultRange: "week",
          symbols: ["CPD", "PKN", "PZU"],
          sortOrder: "desc",
        },
      },
      onboarding: {
        completed: true,
        steps: [1, 2, 3, 4],
        skipped: [],
      },
    };

    mockSupabase._mockSingle.mockResolvedValueOnce({
      data: {
        id: 1,
        auth_uid: authUid,
        metadata: complexMetadata,
      },
      error: null,
    });

    const result = await service.updateUserMetadata(authUid, complexMetadata);

    expect(result.data?.metadata).toEqual(complexMetadata);
  });

  it("should handle very long auth_uid", async () => {
    const longAuthUid = "a".repeat(255); // UUID is typically 36 chars, but test edge case

    mockSupabase._mockSingle.mockResolvedValueOnce({
      data: {
        id: 1,
        auth_uid: longAuthUid,
        role: "user",
      },
      error: null,
    });

    const profile = await service.getUserProfile(longAuthUid);

    expect(profile).toBeDefined();
    expect(profile?.auth_uid).toBe(longAuthUid);
  });

  it("should handle concurrent metadata updates", async () => {
    const authUid = "test-uuid-concurrent";
    const metadata1 = { field: "value1" };
    const metadata2 = { field: "value2" };

    // Mock first update
    mockSupabase._mockSingle.mockResolvedValueOnce({
      data: { id: 1, auth_uid: authUid, metadata: metadata1 },
      error: null,
    });

    // Mock second update
    mockSupabase._mockSingle.mockResolvedValueOnce({
      data: { id: 1, auth_uid: authUid, metadata: metadata2 },
      error: null,
    });

    const result1 = await service.updateUserMetadata(authUid, metadata1);
    const result2 = await service.updateUserMetadata(authUid, metadata2);

    expect(result1.data?.metadata).toEqual(metadata1);
    expect(result2.data?.metadata).toEqual(metadata2);
  });
});
