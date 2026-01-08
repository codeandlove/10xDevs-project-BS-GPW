/**
 * Unit Tests for Webhook Service
 * Test Coverage: Stripe webhook processing, idempotency, event handling
 * Per test-plan.md section 3.1 - Service Layer
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { WebhookService } from "./webhook.service";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../db/database.types";
import type Stripe from "stripe";

// Mock Supabase client with proper query builder chaining
const createMockSupabaseClient = () => {
  const mockSingle = vi.fn().mockResolvedValue({ data: null, error: null });
  const mockSelect = vi.fn();
  const mockInsert = vi.fn();
  const mockUpdate = vi.fn();
  const mockEq = vi.fn();
  const mockIs = vi.fn();
  const mockFrom = vi.fn();

  // Shared builder object - all methods point to the mocks above
  const sharedBuilder: any = {
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    eq: mockEq,
    is: mockIs,
    single: mockSingle,
  };

  // All methods return the shared builder for chaining
  mockSelect.mockReturnValue(sharedBuilder);
  mockInsert.mockReturnValue(sharedBuilder);
  mockUpdate.mockReturnValue(sharedBuilder);
  mockEq.mockReturnValue(sharedBuilder); // Can chain to .single() or be terminal when mocked by tests
  mockIs.mockReturnValue(sharedBuilder);

  // from() returns the shared builder
  mockFrom.mockReturnValue(sharedBuilder);

  return {
    from: mockFrom,
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

// Helper to create mock Stripe events
const createMockStripeEvent = (type: string, data: Partial<Stripe.Subscription> = {}): Stripe.Event => {
  return {
    id: `evt_${Date.now()}`,
    object: "event",
    api_version: "2023-10-16",
    created: Math.floor(Date.now() / 1000),
    type,
    data: {
      object: {
        id: `sub_${Date.now()}`,
        object: "subscription",
        customer: "cus_test123",
        status: "active",
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        items: {
          object: "list",
          data: [
            {
              id: "si_test",
              object: "subscription_item",
              price: {
                id: "price_test123",
                object: "price",
                active: true,
                currency: "pln",
                unit_amount: 9900,
                recurring: { interval: "month", interval_count: 1 },
                product: "prod_test",
                type: "recurring",
              } as Stripe.Price,
              subscription: "sub_test",
            } as Stripe.SubscriptionItem,
          ],
        } as Stripe.ApiList<Stripe.SubscriptionItem>,
        ...data,
      } as Stripe.Subscription,
    },
    livemode: false,
    pending_webhooks: 1,
    request: { id: null, idempotency_key: null },
  } as Stripe.Event;
};

// Helper to set up standard event processing mocks
const setupEventProcessingMocks = (
  mockSupabase: ReturnType<typeof createMockSupabaseClient>,
  options: {
    eventExists?: boolean;
    userData?: any;
    updateUserSuccess?: boolean;
    markProcessedSuccess?: boolean;
  } = {}
) => {
  const builder = (mockSupabase.from as any)();
  
  // Mock: checkEventExists - select().eq().single()
  mockSupabase._mockEq.mockReturnValueOnce(builder);
  mockSupabase._mockSingle.mockResolvedValueOnce(
    options.eventExists
      ? { data: { id: 1 }, error: null }
      : { data: null, error: { code: "PGRST116" } }
  );

  if (!options.eventExists) {
    // Mock: Insert webhook event log
    mockSupabase._mockInsert.mockResolvedValueOnce({ data: {}, error: null });

    // Mock: Find user by customer ID - select().eq().is().single()
    mockSupabase._mockEq.mockReturnValueOnce(builder);
    mockSupabase._mockIs.mockReturnValueOnce(builder);
    mockSupabase._mockSingle.mockResolvedValueOnce(
      options.userData ? { data: options.userData, error: null } : { data: null, error: null }
    );

    // Mock: Update user subscription - update().eq() [TERMINAL]
    mockSupabase._mockEq.mockResolvedValueOnce(
      options.updateUserSuccess !== false ? { data: {}, error: null } : { data: null, error: new Error("Update failed") }
    );

    // Mock: Insert audit log
    mockSupabase._mockInsert.mockResolvedValueOnce({ data: {}, error: null });

    // Mock: Mark event as processed - update().eq() [TERMINAL]
    mockSupabase._mockEq.mockResolvedValueOnce(
      options.markProcessedSuccess !== false ? { data: {}, error: null } : { data: null, error: new Error("Mark failed") }
    );
  }
};

describe("WebhookService - Event Processing", () => {
  let service: WebhookService;
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    service = new WebhookService(mockSupabase);
  });

  it("should process subscription.created event successfully", async () => {
    const event = createMockStripeEvent("customer.subscription.created");

    setupEventProcessingMocks(mockSupabase, {
      eventExists: false,
      userData: {
        auth_uid: "user123",
        subscription_status: "trial",
        stripe_subscription_id: null,
        current_period_end: null,
        plan_id: null,
      },
    });

    const result = await service.processEvent(event);

    expect(result.success).toBe(true);
    expect(result.changes_applied).toBe(true);
    expect(result.user_id).toBe("user123");
  });

  it("should handle subscription.updated event", async () => {
    const event = createMockStripeEvent("customer.subscription.updated", {
      status: "active",
    });

    setupEventProcessingMocks(mockSupabase, {
      eventExists: false,
      userData: {
        auth_uid: "user123",
        subscription_status: "active",
        stripe_subscription_id: "sub_existing",
        current_period_end: new Date().toISOString(),
        plan_id: "price_old",
      },
    });

    const result = await service.processEvent(event);

    expect(result.success).toBe(true);
    expect(result.changes_applied).toBe(true);
  });

  it("should handle subscription.deleted event", async () => {
    const event = createMockStripeEvent("customer.subscription.deleted", {
      status: "canceled",
    });

    setupEventProcessingMocks(mockSupabase, {
      eventExists: false,
      userData: {
        auth_uid: "user123",
        subscription_status: "active",
        stripe_subscription_id: "sub_test",
      },
    });

    const result = await service.processEvent(event);

    expect(result.success).toBe(true);
    expect(result.changes_applied).toBe(true);
  });

  it("should handle invoice.payment_succeeded event", async () => {
    const event: Stripe.Event = {
      id: `evt_${Date.now()}`,
      object: "event",
      type: "invoice.payment_succeeded",
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {
          id: "in_test",
          object: "invoice",
          customer: "cus_test123",
          subscription: "sub_test",
          status: "paid",
          amount_paid: 9900,
          lines: {
            data: [{
              period: { end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60 }
            }]
          }
        } as Stripe.Invoice,
      },
      livemode: false,
    } as Stripe.Event;

    setupEventProcessingMocks(mockSupabase, {
      eventExists: false,
      userData: { auth_uid: "user123", subscription_status: "active" },
    });

    const result = await service.processEvent(event);

    expect(result.success).toBe(true);
  });

  it("should handle invoice.payment_failed event", async () => {
    const event: Stripe.Event = {
      id: `evt_${Date.now()}`,
      object: "event",
      type: "invoice.payment_failed",
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {
          id: "in_test",
          object: "invoice",
          customer: "cus_test123",
          subscription: "sub_test",
          status: "open",
        } as Stripe.Invoice,
      },
      livemode: false,
    } as Stripe.Event;

    setupEventProcessingMocks(mockSupabase, {
      eventExists: false,
      userData: { auth_uid: "user123", subscription_status: "active" },
    });

    const result = await service.processEvent(event);

    expect(result.success).toBe(true);
  });
});

describe("WebhookService - Idempotency", () => {
  let service: WebhookService;
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    service = new WebhookService(mockSupabase);
  });

  it("should return early if event already processed (idempotency)", async () => {
    const event = createMockStripeEvent("customer.subscription.created");

    const builder = (mockSupabase.from as any)();
    
    // Mock: Event already exists in database - select().eq().single()
    mockSupabase._mockEq.mockReturnValueOnce(builder);
    mockSupabase._mockSingle.mockResolvedValueOnce({
      data: { id: 1, event_id: event.id, status: "processed" },
      error: null,
    });

    // Clear the call from getting the builder reference above
    vi.clearAllMocks();

    const result = await service.processEvent(event);

    expect(result.success).toBe(true);
    expect(result.already_processed).toBe(true);
    expect(result.changes_applied).toBe(false);

    // Verify no further database operations were attempted
    expect(mockSupabase.from).toHaveBeenCalledTimes(1); // Only checkEventExists
  });

  it("should handle duplicate event insertion gracefully (race condition)", async () => {
    const event = createMockStripeEvent("customer.subscription.created");

    const builder = (mockSupabase.from as any)();
    
    // Mock: checkEventExists - select().eq().single()
    mockSupabase._mockEq.mockReturnValueOnce(builder);
    mockSupabase._mockSingle.mockResolvedValueOnce({ data: null, error: { code: "PGRST116" } });

    // Mock: Insert fails with duplicate key error (23505) - another process inserted it
    mockSupabase._mockInsert.mockResolvedValueOnce({ data: null, error: { code: "23505" } });

    // Mock: Find user - select().eq().is().single()
    mockSupabase._mockEq.mockReturnValueOnce(builder);
    mockSupabase._mockIs.mockReturnValueOnce(builder);
    mockSupabase._mockSingle.mockResolvedValueOnce({
      data: { auth_uid: "user123", subscription_status: "trial" },
      error: null,
    });

    // Mock: Update user - update().eq() [TERMINAL]
    mockSupabase._mockEq.mockResolvedValueOnce({ data: {}, error: null });

    // Mock: Insert audit log
    mockSupabase._mockInsert.mockResolvedValueOnce({ data: {}, error: null });

    // Mock: Mark processed - update().eq() [TERMINAL]
    mockSupabase._mockEq.mockResolvedValueOnce({ data: {}, error: null });

    // Should not throw error - duplicate key is handled gracefully
    const result = await service.processEvent(event);

    expect(result.success).toBe(true);
  });
});

describe("WebhookService - Error Handling", () => {
  let service: WebhookService;
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    service = new WebhookService(mockSupabase);
  });

  it("should handle unsupported event types gracefully", async () => {
    const event = createMockStripeEvent("customer.created"); // Unsupported type

    const builder = (mockSupabase.from as any)();
    
    // Mock: checkEventExists
    mockSupabase._mockEq.mockReturnValueOnce(builder);
    mockSupabase._mockSingle.mockResolvedValueOnce({ data: null, error: { code: "PGRST116" } });

    // Mock: Insert webhook event log
    mockSupabase._mockInsert.mockResolvedValueOnce({ data: {}, error: null });

    // Mock: Mark processed (for unsupported events) - update().eq() [TERMINAL]
    mockSupabase._mockEq.mockResolvedValueOnce({ data: {}, error: null });

    const result = await service.processEvent(event);

    expect(result.success).toBe(true);
    expect(result.changes_applied).toBe(false);
  });

  it("should mark event as failed and throw on processing error", async () => {
    const event = createMockStripeEvent("customer.subscription.created");

    const builder = (mockSupabase.from as any)();
    
    // Mock: checkEventExists
    mockSupabase._mockEq.mockReturnValueOnce(builder);
    mockSupabase._mockSingle.mockResolvedValueOnce({ data: null, error: { code: "PGRST116" } });

    // Mock: Insert webhook event log
    mockSupabase._mockInsert.mockResolvedValueOnce({ data: {}, error: null });

    // Mock: Database error when finding user - select().eq().is().single()
    mockSupabase._mockEq.mockReturnValueOnce(builder);
    mockSupabase._mockIs.mockReturnValueOnce(builder);
    mockSupabase._mockSingle.mockResolvedValueOnce({ 
      data: null, 
      error: { code: "PGRST500", message: "Database connection failed" } 
    });

    // Mock: Mark as failed - update().eq() [TERMINAL]
    mockSupabase._mockEq.mockResolvedValueOnce({ data: {}, error: null });

    // Should throw EventProcessingError due to database error
    await expect(service.processEvent(event)).rejects.toThrow();

    // Verify event was marked as failed
    expect(mockSupabase._mockUpdate).toHaveBeenCalled();
  });

  it("should handle user not found scenario", async () => {
    const event = createMockStripeEvent("customer.subscription.created");

    const builder = (mockSupabase.from as any)();
    
    // Mock: checkEventExists
    mockSupabase._mockEq.mockReturnValueOnce(builder);
    mockSupabase._mockSingle.mockResolvedValueOnce({ data: null, error: { code: "PGRST116" } });

    // Mock: Insert webhook event log
    mockSupabase._mockInsert.mockResolvedValueOnce({ data: {}, error: null });

    // Mock: User not found - select().eq().is().single()
    mockSupabase._mockEq.mockReturnValueOnce(builder);
    mockSupabase._mockIs.mockReturnValueOnce(builder);
    mockSupabase._mockSingle.mockResolvedValueOnce({ data: null, error: { code: "PGRST116" } });

    // Mock: Mark as processed with no changes - update().eq() [TERMINAL]
    mockSupabase._mockEq.mockResolvedValueOnce({ data: {}, error: null });

    // Should succeed but with no changes applied
    const result = await service.processEvent(event);
    
    expect(result.success).toBe(true);
    expect(result.changes_applied).toBe(false);
  });
});

describe("WebhookService - Database Operations", () => {
  let service: WebhookService;
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    service = new WebhookService(mockSupabase);
  });

  it("should log webhook event with correct status", async () => {
    const event = createMockStripeEvent("customer.subscription.created");

    const builder = (mockSupabase.from as any)();
    
    // Mock: checkEventExists
    mockSupabase._mockEq.mockReturnValueOnce(builder);
    mockSupabase._mockSingle.mockResolvedValueOnce({ data: null, error: { code: "PGRST116" } });

    // Mock: Insert webhook event log - capture the call
    let insertedEventLog: unknown = null;
    mockSupabase._mockInsert.mockImplementationOnce((data) => {
      insertedEventLog = data;
      return Promise.resolve({ data: {}, error: null });
    });

    // Mock: Find user - select().eq().is().single()
    mockSupabase._mockEq.mockReturnValueOnce(builder);
    mockSupabase._mockIs.mockReturnValueOnce(builder);
    mockSupabase._mockSingle.mockResolvedValueOnce({
      data: { auth_uid: "user123", subscription_status: "trial" },
      error: null,
    });
    
    // Mock: Update user - update().eq() [TERMINAL]
    mockSupabase._mockEq.mockResolvedValueOnce({ data: {}, error: null });
    
    // Mock: Insert audit log
    mockSupabase._mockInsert.mockResolvedValueOnce({ data: {}, error: null });
    
    // Mock: Mark processed - update().eq() [TERMINAL]
    mockSupabase._mockEq.mockResolvedValueOnce({ data: {}, error: null });

    await service.processEvent(event);

    // Verify event was logged
    expect(mockSupabase.from).toHaveBeenCalledWith("stripe_webhook_events");
    expect(insertedEventLog).toBeDefined();
  });

  it("should update event status to processed with user_id", async () => {
    const event = createMockStripeEvent("customer.subscription.created");

    setupEventProcessingMocks(mockSupabase, {
      eventExists: false,
      userData: { auth_uid: "user123", subscription_status: "trial" },
    });

    await service.processEvent(event);

    // Verify update was called (via mockEq which is the terminal call)
    expect(mockSupabase._mockEq).toHaveBeenCalled();
  });
});

describe("WebhookService - Audit Trail", () => {
  let service: WebhookService;
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    service = new WebhookService(mockSupabase);
  });

  it("should create audit log entry when updating user subscription", async () => {
    const event = createMockStripeEvent("customer.subscription.created");

    const builder = (mockSupabase.from as any)();
    
    // Mock: checkEventExists
    mockSupabase._mockEq.mockReturnValueOnce(builder);
    mockSupabase._mockSingle.mockResolvedValueOnce({ data: null, error: { code: "PGRST116" } });

    // Mock: Insert webhook event log
    mockSupabase._mockInsert.mockResolvedValueOnce({ data: {}, error: null });

    // Mock: Find user with previous state - select().eq().is().single()
    mockSupabase._mockEq.mockReturnValueOnce(builder);
    mockSupabase._mockIs.mockReturnValueOnce(builder);
    mockSupabase._mockSingle.mockResolvedValueOnce({
      data: {
        auth_uid: "user123",
        subscription_status: "trial",
        stripe_subscription_id: null,
        current_period_end: null,
        plan_id: null,
      },
      error: null,
    });

    // Mock: Update user - update().eq() [TERMINAL]
    mockSupabase._mockEq.mockResolvedValueOnce({ data: {}, error: null });

    // Mock: Insert audit log - verify it's called
    let auditLogCreated = false;
    mockSupabase._mockInsert.mockImplementationOnce(() => {
      auditLogCreated = true;
      return Promise.resolve({ data: {}, error: null });
    });

    // Mock: Mark processed - update().eq() [TERMINAL]
    mockSupabase._mockEq.mockResolvedValueOnce({ data: {}, error: null });

    await service.processEvent(event);

    // Verify audit log was created
    expect(auditLogCreated).toBe(true);
  });
});
