/**
 * MSW Handlers for API Mocking
 * Mock NocoDB API endpoints for integration tests
 * Per test-plan.md section 3.2
 */

import { http, HttpResponse } from "msw";

// Use test environment URL (same as in vitest setup)
const BASE_URL = "http://localhost:3000/api";

// Mock data
const mockGridEvents = [
  {
    id: "rec_1",
    symbol: "CPD",
    occurrence_date: "2025-01-15",
    event_type: "BLACK_SWAN_DOWN",
    percent_change: -12.5,
    open: 100,
    high: 102,
    low: 87.5,
    close: 87.5,
    volume: 1000000,
  },
  {
    id: "rec_2",
    symbol: "PKN",
    occurrence_date: "2025-01-14",
    event_type: "BLACK_SWAN_UP",
    percent_change: 15.3,
    open: 80,
    high: 92.24,
    low: 80,
    close: 92.24,
    volume: 850000,
  },
  {
    id: "rec_3",
    symbol: "PKO",
    occurrence_date: "2025-01-13",
    event_type: "VOLATILITY_UP",
    percent_change: 8.2,
    open: 50,
    high: 54.1,
    low: 50,
    close: 54.1,
    volume: 500000,
  },
];

const mockEventDetails = {
  id: "rec_1",
  symbol: "CPD",
  occurrence_date: "2025-01-15",
  event_type: "BLACK_SWAN_DOWN",
  percent_change: -12.5,
  open: 100,
  high: 102,
  low: 87.5,
  close: 87.5,
  volume: 1000000,
  first_summary: {
    id: "summary_1",
    summary: "Duży spadek cen spowodowany negatywnymi wiadomościami o wynikach finansowych.",
    article_sentiment: "negative",
    identified_causes: ["Słabe wyniki finansowe", "Obniżenie rekomendacji analityków"],
    predicted_trend_probability: {
      further_decline: 0.6,
      recovery: 0.4,
    },
    recommended_action: {
      action: "SELL",
      justification: "Wysokie ryzyko dalszych spadków",
    },
    keywords: ["spadek", "wyniki", "rekomendacje"],
    source_article_url: "https://example.com/article-1",
    date: "2025-01-15",
  },
  historic_data: [
    { date: "2025-01-08", close: 95 },
    { date: "2025-01-09", close: 97 },
    { date: "2025-01-10", close: 98 },
    { date: "2025-01-11", close: 99 },
    { date: "2025-01-12", close: 100 },
    { date: "2025-01-15", close: 87.5 },
  ],
};

const mockSummaries = [
  {
    id: "summary_1",
    symbol: "CPD",
    occurrence_date: "2025-01-15",
    summary: "Duży spadek cen spowodowany negatywnymi wiadomościami.",
    article_sentiment: "negative",
    date: "2025-01-15",
  },
  {
    id: "summary_2",
    symbol: "CPD",
    occurrence_date: "2025-01-15",
    summary: "Analitycy obniżają rekomendacje dla spółki.",
    article_sentiment: "negative",
    date: "2025-01-16",
  },
];

export const handlers = [
  // GET /api/nocodb/grid
  http.get(`${BASE_URL}/nocodb/grid`, ({ request }) => {
    const url = new URL(request.url);
    const range = url.searchParams.get("range") || "week";
    const symbols = url.searchParams.get("symbols");

    // Validate range
    if (!["week", "month", "quarter"].includes(range)) {
      return HttpResponse.json(
        {
          success: false,
          error: { message: "range must be one of: week, month, quarter" },
        },
        { status: 400 }
      );
    }

    // Filter by symbols if provided
    let filteredEvents = mockGridEvents;
    if (symbols) {
      const symbolList = symbols.split(",");
      filteredEvents = mockGridEvents.filter((event) => symbolList.includes(event.symbol));
    }

    return HttpResponse.json({
      success: true,
      data: {
        events: filteredEvents,
        range,
        symbols: symbols ? symbols.split(",") : [],
        cached_at: new Date().toISOString(),
      },
      timestamp: Date.now(),
    });
  }),

  // GET /api/nocodb/events/:id
  http.get(`${BASE_URL}/nocodb/events/:id`, ({ params }) => {
    const { id } = params;

    // Validate ID format
    if (!id || typeof id !== "string" || !id.startsWith("rec_")) {
      return HttpResponse.json(
        {
          success: false,
          error: { message: "Invalid NocoDB record ID format" },
        },
        { status: 400 }
      );
    }

    // Check if event exists
    const event = mockGridEvents.find((e) => e.id === id);
    if (!event) {
      return HttpResponse.json(
        {
          success: false,
          error: { message: "Event not found" },
        },
        { status: 404 }
      );
    }

    return HttpResponse.json({
      success: true,
      data: {
        event: mockEventDetails,
        cached_at: new Date().toISOString(),
      },
      timestamp: Date.now(),
    });
  }),

  // GET /api/nocodb/summaries
  http.get(`${BASE_URL}/nocodb/summaries`, ({ request }) => {
    const url = new URL(request.url);
    const symbol = url.searchParams.get("symbol");
    const occurrenceDate = url.searchParams.get("occurrence_date");

    // Validate required params
    if (!symbol || !occurrenceDate) {
      return HttpResponse.json(
        {
          success: false,
          error: { message: "symbol and occurrence_date are required" },
        },
        { status: 400 }
      );
    }

    // Filter summaries
    const filteredSummaries = mockSummaries.filter((s) => s.symbol === symbol && s.occurrence_date === occurrenceDate);

    return HttpResponse.json({
      success: true,
      data: {
        summaries: filteredSummaries,
        cached_at: new Date().toISOString(),
      },
      timestamp: Date.now(),
    });
  }),

  // GET /api/users/me
  http.get(`${BASE_URL}/users/me`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        user: {
          auth_uid: "test-uuid-123",
          email: "test@example.com",
          subscription_status: "active",
          trial_expires_at: null,
          current_period_end: "2025-02-15T00:00:00Z",
          created_at: "2025-01-01T00:00:00Z",
        },
      },
      timestamp: Date.now(),
    });
  }),

  // Rate limiting - 429 Too Many Requests
  http.get(`${BASE_URL}/nocodb/grid-rate-limited`, () => {
    return HttpResponse.json(
      {
        success: false,
        error: { message: "Rate limit exceeded", code: "RATE_LIMIT_EXCEEDED" },
      },
      {
        status: 429,
        headers: {
          "X-RateLimit-Remaining": "0",
          "Retry-After": "60",
        },
      }
    );
  }),

  // 401 Unauthorized
  http.get(`${BASE_URL}/nocodb/grid-unauthorized`, () => {
    return HttpResponse.json(
      {
        success: false,
        error: { message: "Unauthorized", code: "UNAUTHORIZED" },
      },
      { status: 401 }
    );
  }),

  // 500 Server Error
  http.get(`${BASE_URL}/nocodb/grid-error`, () => {
    return HttpResponse.json(
      {
        success: false,
        error: { message: "Internal Server Error", code: "INTERNAL_ERROR" },
      },
      { status: 500 }
    );
  }),

  // Test endpoints for retry logic
  http.get(`${BASE_URL}/test-retry`, () => {
    return HttpResponse.json(
      {
        success: true,
        data: { message: "Success after retries" },
      },
      { status: 200 }
    );
  }),

  http.get(`${BASE_URL}/test-no-retry`, () => {
    return HttpResponse.json(
      {
        success: false,
        error: { message: "Bad Request" },
      },
      { status: 400 }
    );
  }),

  http.get(`${BASE_URL}/test-max-retry`, () => {
    return HttpResponse.json(
      {
        success: false,
        error: { message: "Service Unavailable" },
      },
      { status: 503 }
    );
  }),

  http.get(`${BASE_URL}/test-rate-limit`, () => {
    return HttpResponse.json(
      {
        success: false,
        error: { message: "Rate limit exceeded" },
      },
      { status: 429 }
    );
  }),

  http.get(`${BASE_URL}/test-401`, () => {
    return HttpResponse.json(
      {
        success: false,
        error: { message: "Unauthorized" },
      },
      { status: 401 }
    );
  }),

  // POST/DELETE test endpoints
  http.post(`${BASE_URL}/test-post`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      success: true,
      data: { received: body },
      timestamp: Date.now(),
    });
  }),

  http.delete(`${BASE_URL}/test-delete/:id`, ({ params }) => {
    return HttpResponse.json({
      success: true,
      data: { deleted: params.id },
      timestamp: Date.now(),
    });
  }),
];
