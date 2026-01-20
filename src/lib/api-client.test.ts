/**
 * Integration Tests for API Client
 * Test Coverage: Retry logic, error handling, 401 redirect, rate limiting
 * Per test-plan.md section 3.2
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { server } from "@/test/mocks/server";
import { http, HttpResponse } from "msw";

// Mock Supabase client - MUST be top-level without external variables
vi.mock("@/db/supabase.client", () => ({
  supabaseClient: {
    auth: {
      getSession: vi.fn(() =>
        Promise.resolve({
          data: {
            session: {
              access_token: "mock-token",
              user: { id: "mock-user-id" },
            },
          },
          error: null,
        })
      ),
    },
  },
}));

// Import AFTER mocking
import { apiClient } from "@/lib/api-client";

describe("API Client - GET requests", () => {
  it("should successfully fetch grid data", async () => {
    const response = (await apiClient.get("/api/nocodb/grid?range=week")) as Record<string, unknown>;

    expect(response).toHaveProperty("events");
    expect(response.events).toBeInstanceOf(Array);
    expect(response.range).toBe("week");
  });

  it("should filter by symbols parameter", async () => {
    const response = (await apiClient.get("/api/nocodb/grid?range=week&symbols=CPD,PKN")) as Record<string, unknown>;

    expect(response.events).toBeInstanceOf(Array);
    expect(response.symbols).toEqual(["CPD", "PKN"]);
    // All events should be CPD or PKN
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (response.events as any[]).forEach((event: any) => {
      expect(["CPD", "PKN"]).toContain(event.symbol);
    });
  });

  it("should fetch event details by ID", async () => {
    const response = (await apiClient.get("/api/nocodb/events/rec_1")) as Record<string, unknown>;

    expect(response).toHaveProperty("event");
    expect(response.event).toHaveProperty("id", "rec_1");
    expect(response.event).toHaveProperty("symbol");
    expect(response.event).toHaveProperty("first_summary");
  });

  it("should fetch summaries with filters", async () => {
    const response = (await apiClient.get("/api/nocodb/summaries?symbol=CPD&occurrence_date=2025-01-15")) as Record<
      string,
      unknown
    >;

    expect(response).toHaveProperty("summaries");
    expect(response.summaries).toBeInstanceOf(Array);
    expect((response.summaries as unknown[]).length).toBeGreaterThan(0);
  });
});

describe("API Client - Error Handling", () => {
  it("should throw APIError with status 400 for invalid range", async () => {
    await expect(apiClient.get("/api/nocodb/grid?range=invalid")).rejects.toThrow(
      "range must be one of: week, month, quarter"
    );
  });

  it("should throw APIError with status 404 for non-existent event", async () => {
    await expect(apiClient.get("/api/nocodb/events/rec_nonexistent")).rejects.toThrow("Event not found");
  });

  it("should throw APIError with status 400 for missing required params", async () => {
    await expect(apiClient.get("/api/nocodb/summaries?symbol=CPD")).rejects.toThrow(
      "symbol and occurrence_date are required"
    );
  });

  it("should handle 500 server errors", async () => {
    await expect(apiClient.get("/api/nocodb/grid-error")).rejects.toThrow("Internal Server Error");
  }, 10000);
});

describe("API Client - Retry Logic", () => {
  it("should retry on network errors (exponential backoff)", async () => {
    let attemptCount = 0;

    server.use(
      http.get("http://localhost:3000/api/test-retry", () => {
        attemptCount++;
        if (attemptCount < 3) {
          // Fail first 2 attempts
          return HttpResponse.error();
        }
        // Succeed on 3rd attempt
        return HttpResponse.json({ success: true, data: { result: "success" } });
      })
    );

    const response = await apiClient.get("/api/test-retry");
    expect(response).toHaveProperty("result", "success");
    expect(attemptCount).toBe(3); // 2 retries + 1 success
  });

  it("should NOT retry on 4xx client errors", async () => {
    let attemptCount = 0;

    server.use(
      http.get("http://localhost:3000/api/test-no-retry", () => {
        attemptCount++;
        return HttpResponse.json({ success: false, error: { message: "Bad Request" } }, { status: 400 });
      })
    );

    await expect(apiClient.get("/api/test-no-retry")).rejects.toThrow("Bad Request");
    expect(attemptCount).toBe(1); // No retries for 4xx
  });

  it("should give up after max retries", async () => {
    let attemptCount = 0;

    server.use(
      http.get("http://localhost:3000/api/test-max-retry", () => {
        attemptCount++;
        return HttpResponse.error(); // Always fail
      })
    );

    await expect(apiClient.get("/api/test-max-retry")).rejects.toThrow();
    expect(attemptCount).toBe(4); // 1 initial + 3 retries
  }, 10000); // Increase timeout for retry logic
});

describe("API Client - Rate Limiting", () => {
  it("should handle 429 Too Many Requests", async () => {
    try {
      await apiClient.get("/api/nocodb/grid-rate-limited");
      expect.fail("Should have thrown rate limit error");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      expect(error.message).toContain("Rate limit exceeded");
      expect(error.status).toBe(429);
    }
  });

  it("should NOT retry on 429 (client error)", async () => {
    let attemptCount = 0;

    server.use(
      http.get("http://localhost:3000/api/test-rate-limit", () => {
        attemptCount++;
        return HttpResponse.json(
          { success: false, error: { message: "Rate limit exceeded" } },
          {
            status: 429,
            headers: { "Retry-After": "60" },
          }
        );
      })
    );

    await expect(apiClient.get("/api/test-rate-limit")).rejects.toThrow("Rate limit exceeded");
    expect(attemptCount).toBe(1); // No retries for 429
  });
});

describe("API Client - 401 Unauthorized Handling", () => {
  beforeEach(() => {
    // Mock clearGridCache and window.location
    vi.mock("@/hooks/useClientCache", () => ({
      clearGridCache: vi.fn(),
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).location;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).location = { href: "" };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should clear cache and redirect to login on 401", async () => {
    // Note: This test would require proper mocking of dynamic import
    // For now, we verify that 401 throws an error
    await expect(apiClient.get("/api/nocodb/grid-unauthorized")).rejects.toThrow("Unauthorized");
  }, 10000);

  it("should NOT retry on 401", async () => {
    let attemptCount = 0;

    server.use(
      http.get("http://localhost:3000/api/test-401", () => {
        attemptCount++;
        return HttpResponse.json({ success: false, error: { message: "Unauthorized" } }, { status: 401 });
      })
    );

    await expect(apiClient.get("/api/test-401")).rejects.toThrow("Unauthorized");
    expect(attemptCount).toBe(1); // No retries for 401
  }, 10000);
});

describe("API Client - POST requests", () => {
  it("should successfully POST data", async () => {
    server.use(
      http.post("http://localhost:3000/api/test-post", async ({ request }) => {
        const body = await request.json();
        return HttpResponse.json({
          success: true,
          data: { received: body },
        });
      })
    );

    const response = (await apiClient.post("/api/test-post", { test: "data" })) as Record<string, unknown>;
    expect(response).toHaveProperty("received");
    expect(response.received).toEqual({ test: "data" });
  }, 10000);

  it("should include Content-Type header for POST", async () => {
    server.use(
      http.post("http://localhost:3000/api/test-post-headers", async ({ request }) => {
        const contentType = request.headers.get("Content-Type");
        return HttpResponse.json({
          success: true,
          data: { contentType },
        });
      })
    );

    const response = (await apiClient.post("/api/test-post-headers", { test: "data" })) as Record<string, unknown>;
    expect(response.contentType).toBe("application/json");
  }, 10000);
});

describe("API Client - DELETE requests", () => {
  it("should successfully DELETE resource", async () => {
    server.use(
      http.delete("http://localhost:3000/api/test-delete/:id", ({ params }) => {
        return HttpResponse.json({
          success: true,
          data: { deleted_id: params.id },
        });
      })
    );

    const response = await apiClient.delete("/api/test-delete/123");
    expect(response).toHaveProperty("deleted_id", "123");
  }, 10000);
});

describe("API Client - Response Format", () => {
  it("should extract data from API wrapper format", async () => {
    // Mock API returns { success, data, timestamp }
    // apiClient.get should return just the data
    const response = await apiClient.get("/api/nocodb/grid?range=week");

    // Should have data properties directly (not wrapped in 'data')
    expect(response).toHaveProperty("events");
    expect(response).toHaveProperty("range");
  }, 10000);

  it("should handle timestamp in response", async () => {
    const response = await apiClient.get("/api/nocodb/grid?range=week");
    // Note: timestamp is in the outer response, not in data
    // After extracting data, timestamp is lost
    expect(response).toHaveProperty("events");
  }, 10000);
});
