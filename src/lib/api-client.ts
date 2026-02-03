/**
 * API Client
 * Centralized fetch wrapper with error handling and retry logic
 */

interface FetchOptions extends RequestInit {
  retry?: number;
  retryDelay?: number;
  skipAuth?: boolean; // Skip automatic auth header injection
}

class APIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message);
    this.name = "APIError";
  }
}

/**
 * Convert relative URL to absolute URL for testing environment
 */
function normalizeUrl(url: string): string {
  // If URL is already absolute, return as is
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  // In test environment, prepend base URL
  if (typeof window !== "undefined" && import.meta.env?.MODE === "test") {
    return `http://localhost:3000${url}`;
  }

  return url;
}

/**
 * Enhanced fetch with error handling and retry
 */
async function fetchWithRetry(url: string, options: FetchOptions = {}): Promise<Response> {
  const { retry = 3, retryDelay = 1000, skipAuth = false, ...fetchOptions } = options;
  let lastError: Error | null = null;

  // Normalize URL for test environment
  const normalizedUrl = normalizeUrl(url);

  // Get auth token from localStorage to avoid getSession() deadlock
  // Supabase stores session in localStorage with key pattern: sb-{project-ref}-auth-token
  if (!skipAuth && typeof window !== "undefined" && typeof localStorage !== "undefined") {
    try {
      const keys = Object.keys(localStorage);
      const authKey = keys.find((key) => key.includes("sb-") && key.includes("-auth-token"));

      if (authKey) {
        const sessionData = localStorage.getItem(authKey);
        if (sessionData) {
          const session = JSON.parse(sessionData);
          const accessToken = session.access_token || session.accessToken;

          if (accessToken) {
            const headers = new Headers(fetchOptions.headers || {});
            headers.set("Authorization", `Bearer ${accessToken}`);
            fetchOptions.headers = headers;
          }
        }
      }
    } catch {
      // Silent fail - continue without auth header
    }
  }

  for (let attempt = 0; attempt <= retry; attempt++) {
    try {
      const response = await fetch(normalizedUrl, fetchOptions);

      // Handle non-OK responses
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        // Extract message from either errorData.message or errorData.error.message
        const errorMessage =
          errorData.message || errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`;
        const errorCode = errorData.code || errorData.error?.code;

        const apiError = new APIError(errorMessage, response.status, errorCode);

        // Handle 401 Unauthorized - clear cache and redirect to login
        if (response.status === 401) {
          // Dynamic import to avoid circular dependency
          import("@/hooks/useClientCache").then(({ clearGridCache }) => {
            clearGridCache();
            window.location.href = "/auth/login";
          });
        }

        throw apiError;
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown error");

      // Don't retry on client errors (4xx)
      if (error instanceof APIError && error.status && error.status >= 400 && error.status < 500) {
        throw error;
      }

      // Retry on network errors or 5xx
      if (attempt < retry) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
        continue;
      }

      throw lastError;
    }
  }

  throw lastError || new Error("Failed to fetch");
}

/**
 * API Client methods
 */
export const apiClient = {
  /**
   * GET request
   */
  async get<T>(url: string, options?: FetchOptions): Promise<T> {
    const response = await fetchWithRetry(url, {
      ...options,
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });
    const json = await response.json();
    // Extract data from success response format: { success: true, data: T, timestamp: string }
    return json.data ?? json;
  },

  /**
   * POST request
   */
  async post<T>(url: string, data?: unknown, options?: FetchOptions): Promise<T> {
    const response = await fetchWithRetry(url, {
      ...options,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    });
    const json = await response.json();
    // Extract data from success response format: { success: true, data: T, timestamp: string }
    return json.data ?? json;
  },

  /**
   * PUT request
   */
  async put<T>(url: string, data?: unknown, options?: FetchOptions): Promise<T> {
    const response = await fetchWithRetry(url, {
      ...options,
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    });
    const json = await response.json();
    // Extract data from success response format: { success: true, data: T, timestamp: string }
    return json.data ?? json;
  },

  /**
   * DELETE request
   */
  async delete<T>(url: string, options?: FetchOptions): Promise<T> {
    const response = await fetchWithRetry(url, {
      ...options,
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });
    const json = await response.json();
    // Extract data from success response format: { success: true, data: T, timestamp: string }
    return json.data ?? json;
  },
};

/**
 * API endpoints
 */
export const API_ENDPOINTS = {
  // NocoDB
  gridData: (range: string, symbols?: string, endDate?: string) => {
    const params = new URLSearchParams({ range });
    if (symbols) params.append("symbols", symbols);
    if (endDate) params.append("end_date", endDate);
    return `/api/nocodb/grid?${params.toString()}`;
  },
  eventDetails: (eventId: string) => `/api/nocodb/events/${eventId}`,
  summaries: (symbol: string, occurrenceDate: string, eventType?: string) => {
    const params = new URLSearchParams({ symbol, occurrence_date: occurrenceDate });
    if (eventType) params.append("event_type", eventType);
    return `/api/nocodb/summaries?${params.toString()}`;
  },
  symbols: () => "/api/nocodb/symbols",

  // Users
  userProfile: () => "/api/users/me",
  initializeUser: () => "/api/users/initialize",

  // Subscriptions
  createCheckout: () => "/api/subscriptions/create-checkout",
  createPortal: () => "/api/subscriptions/create-portal",
  subscriptionStatus: () => "/api/subscriptions/status",
};
