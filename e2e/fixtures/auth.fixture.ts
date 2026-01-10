/**
 * Auth fixtures for E2E tests
 * Provides helper functions to mock authentication
 */

import { Page } from "@playwright/test";

export interface MockUser {
  id: string;
  email: string;
  subscription_status: "active" | "trial" | "canceled";
  trial_expires_at: string | null;
}

export const MOCK_USERS = {
  active: {
    id: "test-user-active",
    email: "test@example.com",
    subscription_status: "active" as const,
    trial_expires_at: null,
  },
  trial: {
    id: "test-user-trial",
    email: "trial@example.com",
    subscription_status: "trial" as const,
    trial_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  expired: {
    id: "test-user-expired",
    email: "expired@example.com",
    subscription_status: "canceled" as const,
    trial_expires_at: "2025-01-01T00:00:00Z",
  },
  userB: {
    id: "test-user-b",
    email: "userb@example.com",
    subscription_status: "active" as const,
    trial_expires_at: null,
  },
};

/**
 * Mock Supabase authentication for a user
 */
export async function mockAuth(page: Page, user: MockUser) {
  // Mock Supabase session cookie
  await page.context().addCookies([
    {
      name: "sb-access-token",
      value: `mock-token-${user.id}`,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
    {
      name: "sb-refresh-token",
      value: `mock-refresh-${user.id}`,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
  ]);

  // Mock middleware user check
  await page.route("**/api/**", async (route) => {
    const url = route.request().url();

    // Allow through non-auth API calls
    if (!url.includes("/auth/") && !url.includes("/users/")) {
      return route.continue();
    }

    // Mock user initialization
    if (url.includes("/users/initialize")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { user },
        }),
      });
    }

    // Mock user profile fetch
    if (url.includes("/users/me")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { user },
        }),
      });
    }

    route.continue();
  });
}

/**
 * Mock login action - intercepts Supabase auth and simulates successful login
 */
export async function mockLoginFlow(page: Page, email: string) {
  const user = Object.values(MOCK_USERS).find((u) => u.email === email) || MOCK_USERS.active;

  // Intercept Supabase auth API calls
  await page.route("**/auth/v1/**", async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (url.includes("/token") && method === "POST") {
      // Sign in with password
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          access_token: `mock-token-${user.id}`,
          token_type: "bearer",
          expires_in: 3600,
          refresh_token: `mock-refresh-${user.id}`,
          user: {
            id: user.id,
            email: user.email,
            app_metadata: {},
            user_metadata: {},
            aud: "authenticated",
            created_at: new Date().toISOString(),
          },
        }),
      });
    }

    if (url.includes("/signup") && method === "POST") {
      // Sign up
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          access_token: `mock-token-${user.id}`,
          token_type: "bearer",
          expires_in: 3600,
          refresh_token: `mock-refresh-${user.id}`,
          user: {
            id: user.id,
            email: user.email,
            app_metadata: {},
            user_metadata: {},
            aud: "authenticated",
            created_at: new Date().toISOString(),
          },
        }),
      });
    }

    if (url.includes("/session")) {
      // Get session
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          access_token: `mock-token-${user.id}`,
          token_type: "bearer",
          expires_in: 3600,
          refresh_token: `mock-refresh-${user.id}`,
          user: {
            id: user.id,
            email: user.email,
            app_metadata: {},
            user_metadata: {},
            aud: "authenticated",
            created_at: new Date().toISOString(),
          },
        }),
      });
    }

    route.continue();
  });

  await mockAuth(page, user);
}

/**
 * Clear authentication
 */
export async function clearAuth(page: Page) {
  await page.context().clearCookies();
  await page.route("**/auth/v1/**", (route) => route.abort());
  await page.route("**/api/**", (route) => route.abort());
}
