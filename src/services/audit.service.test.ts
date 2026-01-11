import { describe, it, expect, beforeEach, vi } from "vitest";
import { AuditService } from "./audit.service";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../db/database.types";

describe("AuditService", () => {
  let auditService: AuditService;
  let mockSupabase: SupabaseClient<Database>;
  let mockFrom: ReturnType<typeof vi.fn>;
  let mockInsert: ReturnType<typeof vi.fn>;
  let mockSelect: ReturnType<typeof vi.fn>;
  let mockSingle: ReturnType<typeof vi.fn>;
  let mockEq: ReturnType<typeof vi.fn>;
  let mockOrder: ReturnType<typeof vi.fn>;
  let mockLimit: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFrom = vi.fn();
    mockInsert = vi.fn();
    mockSelect = vi.fn();
    mockSingle = vi.fn();
    mockEq = vi.fn();
    mockOrder = vi.fn();
    mockLimit = vi.fn();

    mockSupabase = {
      from: mockFrom,
    } as unknown as SupabaseClient<Database>;

    auditService = new AuditService(mockSupabase);
  });

  describe("logSubscriptionChange", () => {
    it("should log subscription change successfully", async () => {
      const mockAuditEntry = {
        id: "audit-123",
        user_id: "user-123",
        change_type: "subscription_created",
        previous: null,
        current: { status: "active", plan: "pro" },
        created_at: "2024-01-01T00:00:00Z",
      };

      const sharedBuilder = {
        insert: mockInsert,
        select: mockSelect,
        single: mockSingle,
      };

      mockFrom.mockReturnValue(sharedBuilder);
      mockInsert.mockReturnValue(sharedBuilder);
      mockSelect.mockReturnValue(sharedBuilder);
      mockSingle.mockResolvedValue({ data: mockAuditEntry, error: null });

      const result = await auditService.logSubscriptionChange({
        user_id: "user-123",
        change_type: "subscription_created",
        previous: null,
        current: { status: "active", plan: "pro" },
      });

      expect(result.data).toEqual(mockAuditEntry);
      expect(result.error).toBeNull();
      expect(mockFrom).toHaveBeenCalledWith("subscription_audit");
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "user-123",
          change_type: "subscription_created",
          previous: null,
          current: { status: "active", plan: "pro" },
          created_at: expect.any(String),
        })
      );
    });

    it("should handle database error gracefully", async () => {
      const dbError = { message: "Database error", code: "500" };

      const sharedBuilder = {
        insert: mockInsert,
        select: mockSelect,
        single: mockSingle,
      };

      mockFrom.mockReturnValue(sharedBuilder);
      mockInsert.mockReturnValue(sharedBuilder);
      mockSelect.mockReturnValue(sharedBuilder);
      mockSingle.mockResolvedValue({ data: null, error: dbError });

      const result = await auditService.logSubscriptionChange({
        user_id: "user-123",
        change_type: "subscription_updated",
        previous: { status: "trial" },
        current: { status: "active" },
      });

      expect(result.data).toBeNull();
      expect(result.error).toEqual(dbError);
    });

    it("should log subscription update with previous and current state", async () => {
      const mockAuditEntry = {
        id: "audit-456",
        user_id: "user-456",
        change_type: "subscription_updated",
        previous: { status: "trial", plan: "free" },
        current: { status: "active", plan: "pro" },
        created_at: "2024-01-02T00:00:00Z",
      };

      const sharedBuilder = {
        insert: mockInsert,
        select: mockSelect,
        single: mockSingle,
      };

      mockFrom.mockReturnValue(sharedBuilder);
      mockInsert.mockReturnValue(sharedBuilder);
      mockSelect.mockReturnValue(sharedBuilder);
      mockSingle.mockResolvedValue({ data: mockAuditEntry, error: null });

      const result = await auditService.logSubscriptionChange({
        user_id: "user-456",
        change_type: "subscription_updated",
        previous: { status: "trial", plan: "free" },
        current: { status: "active", plan: "pro" },
      });

      expect(result.data).toEqual(mockAuditEntry);
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "user-456",
          change_type: "subscription_updated",
          previous: { status: "trial", plan: "free" },
          current: { status: "active", plan: "pro" },
        })
      );
    });

    it("should log subscription cancellation", async () => {
      const mockAuditEntry = {
        id: "audit-789",
        user_id: "user-789",
        change_type: "subscription_deleted",
        previous: { status: "active", plan: "pro" },
        current: { status: "canceled", plan: "free" },
        created_at: "2024-01-03T00:00:00Z",
      };

      const sharedBuilder = {
        insert: mockInsert,
        select: mockSelect,
        single: mockSingle,
      };

      mockFrom.mockReturnValue(sharedBuilder);
      mockInsert.mockReturnValue(sharedBuilder);
      mockSelect.mockReturnValue(sharedBuilder);
      mockSingle.mockResolvedValue({ data: mockAuditEntry, error: null });

      const result = await auditService.logSubscriptionChange({
        user_id: "user-789",
        change_type: "subscription_deleted",
        previous: { status: "active", plan: "pro" },
        current: { status: "canceled", plan: "free" },
      });

      expect(result.data).toEqual(mockAuditEntry);
      expect(result.error).toBeNull();
    });
  });

  describe("getUserAuditHistory", () => {
    it("should fetch user audit history with default limit", async () => {
      const mockHistory = [
        {
          id: "audit-1",
          user_id: "user-123",
          change_type: "subscription_updated",
          previous: { status: "trial" },
          current: { status: "active" },
          created_at: "2024-01-02T00:00:00Z",
        },
        {
          id: "audit-2",
          user_id: "user-123",
          change_type: "subscription_created",
          previous: null,
          current: { status: "trial" },
          created_at: "2024-01-01T00:00:00Z",
        },
      ];

      const sharedBuilder = {
        select: mockSelect,
        eq: mockEq,
        order: mockOrder,
        limit: mockLimit,
      };

      mockFrom.mockReturnValue(sharedBuilder);
      mockSelect.mockReturnValue(sharedBuilder);
      mockEq.mockReturnValue(sharedBuilder);
      mockOrder.mockReturnValue(sharedBuilder);
      mockLimit.mockResolvedValue({ data: mockHistory, error: null });

      const result = await auditService.getUserAuditHistory("user-123");

      expect(result.data).toEqual(mockHistory);
      expect(result.error).toBeNull();
      expect(mockFrom).toHaveBeenCalledWith("subscription_audit");
      expect(mockSelect).toHaveBeenCalledWith("*");
      expect(mockEq).toHaveBeenCalledWith("user_id", "user-123");
      expect(mockOrder).toHaveBeenCalledWith("created_at", { ascending: false });
      expect(mockLimit).toHaveBeenCalledWith(50);
    });

    it("should fetch user audit history with custom limit", async () => {
      const mockHistory = [
        {
          id: "audit-1",
          user_id: "user-456",
          change_type: "subscription_updated",
          previous: { status: "trial" },
          current: { status: "active" },
          created_at: "2024-01-01T00:00:00Z",
        },
      ];

      const sharedBuilder = {
        select: mockSelect,
        eq: mockEq,
        order: mockOrder,
        limit: mockLimit,
      };

      mockFrom.mockReturnValue(sharedBuilder);
      mockSelect.mockReturnValue(sharedBuilder);
      mockEq.mockReturnValue(sharedBuilder);
      mockOrder.mockReturnValue(sharedBuilder);
      mockLimit.mockResolvedValue({ data: mockHistory, error: null });

      const result = await auditService.getUserAuditHistory("user-456", 10);

      expect(result.data).toEqual(mockHistory);
      expect(mockLimit).toHaveBeenCalledWith(10);
    });

    it("should return empty array on database error", async () => {
      const dbError = { message: "Database error", code: "500" };

      const sharedBuilder = {
        select: mockSelect,
        eq: mockEq,
        order: mockOrder,
        limit: mockLimit,
      };

      mockFrom.mockReturnValue(sharedBuilder);
      mockSelect.mockReturnValue(sharedBuilder);
      mockEq.mockReturnValue(sharedBuilder);
      mockOrder.mockReturnValue(sharedBuilder);
      mockLimit.mockResolvedValue({ data: null, error: dbError });

      const result = await auditService.getUserAuditHistory("user-789");

      expect(result.data).toEqual([]);
      expect(result.error).toEqual(dbError);
    });

    it("should handle empty audit history", async () => {
      const sharedBuilder = {
        select: mockSelect,
        eq: mockEq,
        order: mockOrder,
        limit: mockLimit,
      };

      mockFrom.mockReturnValue(sharedBuilder);
      mockSelect.mockReturnValue(sharedBuilder);
      mockEq.mockReturnValue(sharedBuilder);
      mockOrder.mockReturnValue(sharedBuilder);
      mockLimit.mockResolvedValue({ data: [], error: null });

      const result = await auditService.getUserAuditHistory("user-new");

      expect(result.data).toEqual([]);
      expect(result.error).toBeNull();
    });

    it("should sort results by created_at in descending order", async () => {
      const mockHistory = [
        { id: "audit-3", created_at: "2024-01-03T00:00:00Z" },
        { id: "audit-2", created_at: "2024-01-02T00:00:00Z" },
        { id: "audit-1", created_at: "2024-01-01T00:00:00Z" },
      ];

      const sharedBuilder = {
        select: mockSelect,
        eq: mockEq,
        order: mockOrder,
        limit: mockLimit,
      };

      mockFrom.mockReturnValue(sharedBuilder);
      mockSelect.mockReturnValue(sharedBuilder);
      mockEq.mockReturnValue(sharedBuilder);
      mockOrder.mockReturnValue(sharedBuilder);
      mockLimit.mockResolvedValue({ data: mockHistory, error: null });

      const result = await auditService.getUserAuditHistory("user-123");

      expect(result.data).toEqual(mockHistory);
      expect(mockOrder).toHaveBeenCalledWith("created_at", { ascending: false });
    });
  });
});
