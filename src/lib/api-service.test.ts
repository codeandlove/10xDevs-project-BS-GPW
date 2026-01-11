import { describe, it, expect, vi, beforeEach } from "vitest";
import * as apiService from "./api-service";
import { apiClient } from "./api-client";

// Mock apiClient
vi.mock("./api-client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
  API_ENDPOINTS: {
    gridData: vi.fn(
      (range, symbols, endDate) =>
        `/api/nocodb/grid?range=${range}${symbols ? `&symbols=${symbols}` : ""}${endDate ? `&end_date=${endDate}` : ""}`
    ),
    eventDetails: vi.fn((id) => `/api/nocodb/events/${id}`),
    summaries: vi.fn(
      (symbol, date, type) =>
        `/api/nocodb/summaries?symbol=${symbol}&occurrence_date=${date}${type ? `&event_type=${type}` : ""}`
    ),
    userProfile: vi.fn(() => "/api/users/me"),
    initializeUser: vi.fn(() => "/api/users/initialize"),
    createCheckout: vi.fn(() => "/api/subscriptions/create-checkout"),
    createPortal: vi.fn(() => "/api/subscriptions/create-portal"),
    subscriptionStatus: vi.fn(() => "/api/subscriptions/status"),
  },
}));

describe("API Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchGridData", () => {
    it("should fetch grid data with range only", async () => {
      const mockResponse = { events: [], total: 0 };
      vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

      const result = await apiService.fetchGridData("week");

      expect(apiClient.get).toHaveBeenCalledWith(expect.stringContaining("range=week"));
      expect(result).toEqual(mockResponse);
    });

    it("should fetch grid data with symbols", async () => {
      const mockResponse = { events: [], total: 0 };
      vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

      const result = await apiService.fetchGridData("month", ["PKO", "PZU"]);

      expect(apiClient.get).toHaveBeenCalledWith(expect.stringContaining("symbols=PKO,PZU"));
      expect(result).toEqual(mockResponse);
    });

    it("should fetch grid data with custom end date", async () => {
      const mockResponse = { events: [], total: 0 };
      vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

      const result = await apiService.fetchGridData("quarter", [], "2024-12-31");

      expect(apiClient.get).toHaveBeenCalledWith(expect.stringContaining("end_date=2024-12-31"));
      expect(result).toEqual(mockResponse);
    });

    it("should fetch grid data with all parameters", async () => {
      const mockResponse = { events: [{ id: "1" }], total: 1 };
      vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

      const result = await apiService.fetchGridData("week", ["PKO"], "2024-01-15");

      expect(apiClient.get).toHaveBeenCalledWith(expect.stringContaining("range=week"));
      expect(apiClient.get).toHaveBeenCalledWith(expect.stringContaining("symbols=PKO"));
      expect(apiClient.get).toHaveBeenCalledWith(expect.stringContaining("end_date=2024-01-15"));
      expect(result).toEqual(mockResponse);
    });

    it("should handle empty symbols array", async () => {
      const mockResponse = { events: [], total: 0 };
      vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

      await apiService.fetchGridData("month", []);

      const callArg = vi.mocked(apiClient.get).mock.calls[0][0];
      expect(callArg).not.toContain("symbols=");
    });
  });

  describe("fetchEventDetails", () => {
    it("should fetch event details by ID", async () => {
      const mockEvent = {
        id: "event-123",
        symbol: "PKO",
        occurrence_date: "2024-01-01",
      };
      vi.mocked(apiClient.get).mockResolvedValue(mockEvent);

      const result = await apiService.fetchEventDetails("event-123");

      expect(apiClient.get).toHaveBeenCalledWith("/api/nocodb/events/event-123");
      expect(result).toEqual(mockEvent);
    });

    it("should handle UUID event IDs", async () => {
      const uuid = "123e4567-e89b-12d3-a456-426614174000";
      const mockEvent = { id: uuid };
      vi.mocked(apiClient.get).mockResolvedValue(mockEvent);

      const result = await apiService.fetchEventDetails(uuid);

      expect(apiClient.get).toHaveBeenCalledWith(`/api/nocodb/events/${uuid}`);
      expect(result).toEqual(mockEvent);
    });
  });

  describe("fetchSummaries", () => {
    it("should fetch summaries with symbol and date", async () => {
      const mockSummaries = { summaries: [], total: 0 };
      vi.mocked(apiClient.get).mockResolvedValue(mockSummaries);

      const result = await apiService.fetchSummaries("PKO", "2024-01-01");

      expect(apiClient.get).toHaveBeenCalledWith(expect.stringContaining("symbol=PKO"));
      expect(apiClient.get).toHaveBeenCalledWith(expect.stringContaining("occurrence_date=2024-01-01"));
      expect(result).toEqual(mockSummaries);
    });

    it("should fetch summaries with event type filter", async () => {
      const mockSummaries = { summaries: [{ id: "1" }], total: 1 };
      vi.mocked(apiClient.get).mockResolvedValue(mockSummaries);

      const result = await apiService.fetchSummaries("PZU", "2024-01-15", "revenue_drop");

      expect(apiClient.get).toHaveBeenCalledWith(expect.stringContaining("symbol=PZU"));
      expect(apiClient.get).toHaveBeenCalledWith(expect.stringContaining("occurrence_date=2024-01-15"));
      expect(apiClient.get).toHaveBeenCalledWith(expect.stringContaining("event_type=revenue_drop"));
      expect(result).toEqual(mockSummaries);
    });

    it("should handle undefined event type", async () => {
      const mockSummaries = { summaries: [], total: 0 };
      vi.mocked(apiClient.get).mockResolvedValue(mockSummaries);

      await apiService.fetchSummaries("PKO", "2024-01-01", undefined);

      const callArg = vi.mocked(apiClient.get).mock.calls[0][0];
      expect(callArg).toContain("symbol=PKO");
      expect(callArg).toContain("occurrence_date=2024-01-01");
    });
  });

  describe("fetchUserProfile", () => {
    it("should fetch user profile", async () => {
      const mockProfile = {
        auth_uid: "user-123",
        email: "user@example.com",
        subscription_status: "active",
      };
      vi.mocked(apiClient.get).mockResolvedValue(mockProfile);

      const result = await apiService.fetchUserProfile();

      expect(apiClient.get).toHaveBeenCalledWith("/api/users/me");
      expect(result).toEqual(mockProfile);
    });
  });

  describe("initializeUser", () => {
    it("should initialize user with auth_uid only", async () => {
      const mockResponse = { success: true };
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      const result = await apiService.initializeUser("user-123");

      expect(apiClient.post).toHaveBeenCalledWith(
        "/api/users/initialize",
        { auth_uid: "user-123", email: undefined },
        { skipAuth: true }
      );
      expect(result).toEqual(mockResponse);
    });

    it("should initialize user with email", async () => {
      const mockResponse = { success: true };
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      const result = await apiService.initializeUser("user-456", "user@example.com");

      expect(apiClient.post).toHaveBeenCalledWith(
        "/api/users/initialize",
        { auth_uid: "user-456", email: "user@example.com" },
        { skipAuth: true }
      );
      expect(result).toEqual(mockResponse);
    });

    it("should use skipAuth option for initialization", async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ success: true });

      await apiService.initializeUser("user-789");

      const options = vi.mocked(apiClient.post).mock.calls[0][2];
      expect(options).toEqual({ skipAuth: true });
    });
  });

  describe("createCheckoutSession", () => {
    it("should create checkout session with price ID", async () => {
      const mockSession = { sessionId: "sess_123", url: "https://checkout.stripe.com/..." };
      vi.mocked(apiClient.post).mockResolvedValue(mockSession);

      const result = await apiService.createCheckoutSession("price_123");

      expect(apiClient.post).toHaveBeenCalledWith("/api/subscriptions/create-checkout", { price_id: "price_123" });
      expect(result).toEqual(mockSession);
    });

    it("should handle different price IDs", async () => {
      const mockSession = { sessionId: "sess_456" };
      vi.mocked(apiClient.post).mockResolvedValue(mockSession);

      await apiService.createCheckoutSession("price_pro_monthly");

      expect(apiClient.post).toHaveBeenCalledWith("/api/subscriptions/create-checkout", {
        price_id: "price_pro_monthly",
      });
    });
  });

  describe("createPortalSession", () => {
    it("should create portal session with default return URL", async () => {
      const mockSession = { url: "https://billing.stripe.com/..." };
      vi.mocked(apiClient.post).mockResolvedValue(mockSession);

      // Mock window.location.href
      Object.defineProperty(window, "location", {
        value: { href: "http://localhost:3000/account" },
        writable: true,
      });

      const result = await apiService.createPortalSession();

      expect(apiClient.post).toHaveBeenCalledWith("/api/subscriptions/create-portal", {
        return_url: "http://localhost:3000/account",
      });
      expect(result).toEqual(mockSession);
    });

    it("should create portal session with custom return URL", async () => {
      const mockSession = { url: "https://billing.stripe.com/..." };
      vi.mocked(apiClient.post).mockResolvedValue(mockSession);

      const result = await apiService.createPortalSession("https://app.example.com/success");

      expect(apiClient.post).toHaveBeenCalledWith("/api/subscriptions/create-portal", {
        return_url: "https://app.example.com/success",
      });
      expect(result).toEqual(mockSession);
    });
  });

  describe("getSubscriptionStatus", () => {
    it("should get subscription status", async () => {
      const mockStatus = {
        subscription_status: "active",
        has_access: true,
        trial_expires_at: null,
      };
      vi.mocked(apiClient.get).mockResolvedValue(mockStatus);

      const result = await apiService.getSubscriptionStatus();

      expect(apiClient.get).toHaveBeenCalledWith("/api/subscriptions/status");
      expect(result).toEqual(mockStatus);
    });

    it("should handle trial subscription status", async () => {
      const mockStatus = {
        subscription_status: "trial",
        has_access: true,
        trial_expires_at: "2024-01-15T00:00:00Z",
      };
      vi.mocked(apiClient.get).mockResolvedValue(mockStatus);

      const result = await apiService.getSubscriptionStatus();

      expect(result).toEqual(mockStatus);
    });
  });

  describe("Error handling", () => {
    it("should propagate errors from apiClient.get", async () => {
      const error = new Error("Network error");
      vi.mocked(apiClient.get).mockRejectedValue(error);

      await expect(apiService.fetchUserProfile()).rejects.toThrow("Network error");
    });

    it("should propagate errors from apiClient.post", async () => {
      const error = new Error("API error");
      vi.mocked(apiClient.post).mockRejectedValue(error);

      await expect(apiService.initializeUser("user-123")).rejects.toThrow("API error");
    });
  });
});
