/**
 * Auth helper for E2E tests
 */

import type { Page } from "@playwright/test";

export interface LoginOptions {
  email: string;
  password: string;
}

export interface SubscriptionState {
  subscription_status: "active" | "trial" | "canceled" | "past_due";
  trial_expires_at: string | null;
  current_period_end?: string | null;
}

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.PUBLIC_SUPABASE_ANON_KEY;

/**
 * Login via UI (form submission)
 * This is the RECOMMENDED approach for E2E tests as it:
 * - Tests the real user flow
 * - Works reliably with Supabase session initialization
 * - Doesn't rely on timing-sensitive localStorage manipulation
 *
 * @param page - Playwright page object
 * @param options - Login credentials (defaults to test@example.com)
 */
export async function loginViaUI(
  page: Page,
  options: LoginOptions = { email: "test@example.com", password: "Test123!@#" }
) {
  // Navigate to login page
  await page.goto("/auth/login");

  // Wait for form to be ready
  await page.waitForSelector('input[type="email"]', { state: "visible" });
  await page.waitForSelector('input[type="password"]', { state: "visible" });
  await page.waitForSelector('button[type="submit"]', { state: "visible" });

  // Fill and submit login form
  await page.fill('input[type="email"]', options.email);
  await page.fill('input[type="password"]', options.password);

  // Click submit button
  await page.click('button[type="submit"]');

  // Wait for redirect to happen (app has 1s setTimeout before redirect)
  // Wait up to 5s for URL to change away from /auth/login
  await page.waitForURL((url) => !url.pathname.includes("/auth/login"), { timeout: 5000 });
}

/**
 * Legacy: Login via API call
 * DEPRECATED: Use loginViaUI() instead
 *
 * This approach sets localStorage directly but doesn't work reliably
 * in production builds due to Supabase client initialization timing.
 *
 * @deprecated Use loginViaUI() instead
 */
export async function loginViaAPI(page: Page, { email, password }: LoginOptions) {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase URL or Anon Key is not set in environment variables");
  }

  const response = await page.request.post(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    headers: {
      apikey: supabaseAnonKey,
      "Content-Type": "application/json",
    },
    data: { email, password },
  });

  if (!response.ok()) {
    const error = await response.json();
    throw new Error(`Login failed: ${JSON.stringify(error)}`);
  }

  const authData = await response.json();

  // Extract hostname from Supabase URL for storage key
  const url = new URL(supabaseUrl);
  const storageKey = `sb-${url.hostname.replace(/\./g, "-")}-auth-token`;

  // Set auth tokens in localStorage AND cookies
  await page.goto("/");

  // Set in localStorage (for client-side Supabase client)
  await page.evaluate(
    ({ data, key }) => {
      const authToken = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: data.expires_at,
        expires_in: data.expires_in,
        token_type: data.token_type,
        user: data.user,
      };
      localStorage.setItem(key, JSON.stringify(authToken));
    },
    { data: authData, key: storageKey }
  );

  // Explicitly set session in Supabase client
  // This is needed because Supabase client doesn't automatically detect localStorage changes
  await page.evaluate(
    async ({ accessToken, refreshToken }) => {
      // Import Supabase client dynamically
      // @ts-expect-error - Dynamic import in browser context, path resolved by Astro at runtime
      const { supabaseClient } = await import("/src/db/supabase.client.ts");

      // Set session explicitly - this updates the client's internal state
      await supabaseClient.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
    },
    {
      accessToken: authData.access_token,
      refreshToken: authData.refresh_token,
    }
  );

  // Set cookies for server-side middleware
  await page.context().addCookies([
    {
      name: storageKey,
      value: JSON.stringify({
        access_token: authData.access_token,
        refresh_token: authData.refresh_token,
      }),
      domain: "localhost",
      path: "/",
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
    },
    {
      name: "sb-access-token",
      value: authData.access_token,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
    {
      name: "sb-refresh-token",
      value: authData.refresh_token,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
  ]);

  return authData;
}

/**
 * Setup subscription state for test user
 * Mocks /api/users/me and Supabase app_users query
 * Use this before loginViaAPI() to ensure correct subscription state is returned
 *
 * @example
 * await setupSubscriptionState(page, "expired@example.com", {
 *   subscription_status: "canceled",
 *   trial_expires_at: "2025-01-01T00:00:00Z",
 * });
 * await loginViaAPI(page, { email: "expired@example.com", password: "Test123!@#" });
 */
export async function setupSubscriptionState(page: Page, email: string, state: SubscriptionState) {
  const authUid = `test-user-${email.split("@")[0]}`;

  // Mock /api/users/me
  await page.route("**/api/users/me", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          user: {
            auth_uid: authUid,
            email,
            subscription_status: state.subscription_status,
            trial_expires_at: state.trial_expires_at,
            current_period_end: state.current_period_end || null,
            deleted_at: null,
          },
        },
      }),
    });
  });

  // Mock Supabase app_users query
  await page.route("**/rest/v1/app_users**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          auth_uid: authUid,
          email,
          subscription_status: state.subscription_status,
          trial_expires_at: state.trial_expires_at,
          current_period_end: state.current_period_end || null,
          deleted_at: null,
        },
      ]),
    });
  });
}
