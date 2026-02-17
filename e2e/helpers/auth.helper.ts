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

/**
 * DEPRECATED: Login via UI (form submission)
 * This function is no longer used in tests. Use loginViaAPI() instead.
 *
 * @deprecated Use loginViaAPI() for all E2E tests
 * @param page - Playwright page object
 * @param options - Login credentials (defaults to test@example.com)
 */
export async function loginViaUI(
  page: Page,
  options: LoginOptions = { email: "test@example.com", password: "Test123!@#" }
) {
  // eslint-disable-next-line no-console
  console.warn("loginViaUI is deprecated. Use loginViaAPI instead.");

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
 * Login via API call (RECOMMENDED)
 * This is the recommended approach for E2E tests as it:
 * - Is faster and more reliable than UI login
 * - Works with real Supabase authentication
 * - Properly sets up session cookies and localStorage
 *
 * @param page - Playwright page object
 * @param options - Login credentials
 */
export async function loginViaAPI(page: Page, { email, password }: LoginOptions) {
  // Navigate to login page
  await page.goto("/auth/login", { waitUntil: "domcontentloaded" });

  // Wait for form to be fully ready
  const emailInput = page.locator('input[type="email"]');
  const passwordInput = page.locator('input[type="password"]');

  await emailInput.waitFor({ state: "visible", timeout: 5000 });
  await passwordInput.waitFor({ state: "visible", timeout: 5000 });

  // Clear any existing values
  await emailInput.clear();
  await passwordInput.clear();

  // Type slowly to trigger React onChange handlers
  await emailInput.click();
  await emailInput.type(email, { delay: 50 });

  await passwordInput.click();
  await passwordInput.type(password, { delay: 50 });

  // Verify values were set correctly
  const emailValue = await emailInput.inputValue();
  const passwordValue = await passwordInput.inputValue();

  if (emailValue !== email) {
    throw new Error(`Email not filled correctly. Expected: ${email}, Got: ${emailValue}`);
  }
  if (passwordValue !== password) {
    throw new Error(`Password not filled correctly`);
  }

  // Submit form
  const submitButton = page.locator('button[type="submit"]');
  await submitButton.click();

  // Wait for successful login (URL changes away from /auth/login)
  await page.waitForURL((url) => !url.pathname.includes("/auth/login"), {
    timeout: 15000,
  });
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
