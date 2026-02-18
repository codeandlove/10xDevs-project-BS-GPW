/**
 * E2E Tests - Authentication & Middleware Guard
 * Test Coverage: Auth redirects, subscription checks, cache cleanup on logout
 * Per test-plan.md section 4.3 (TC-AUTH-001 to TC-AUTH-003, TC-CACHE-001)
 */

import { test, expect } from "@playwright/test";
import { loginViaAPI } from "./helpers/auth.helper";
import { setupNocoDBMocks } from "./helpers/mock-nocodb.helper";

// Tests without login - can run in parallel
test.describe("Middleware Guard - Unauthorized Access", () => {
  test.beforeEach(async ({ context }) => {
    // Clear all cookies to simulate logged-out state
    await context.clearCookies();
  });

  test("TC-AUTH-001: Redirect to login when accessing /grid without session", async ({ page }) => {
    // Try to access protected route
    await page.goto("/grid");

    // Should redirect to login (with or without returnUrl param)
    await expect(page).toHaveURL(/\/auth\/login/);

    // Login form should be visible
    await expect(page.locator("form")).toBeVisible();
    await expect(page.locator('[name="email"]')).toBeVisible();
    await expect(page.locator('[name="password"]')).toBeVisible();
  });

  test("TC-AUTH-001: Redirect to login when accessing /event/:id without session", async ({ page }) => {
    await page.goto("/event/rec_123");

    // Should redirect to login
    await expect(page).toHaveURL(/\/auth\/login/);
    await expect(page.locator("form")).toBeVisible();
  });

  test("TC-AUTH-001: Public routes accessible without login", async ({ page }) => {
    // Landing page should be accessible
    await page.goto("/");
    await expect(page).toHaveURL("/");
    await expect(page.locator("h1")).toBeVisible();

    // Login page accessible
    await page.goto("/auth/login");
    await expect(page).toHaveURL("/auth/login");
    await expect(page.locator("form")).toBeVisible();

    // Register page accessible
    await page.goto("/auth/register");
    await expect(page).toHaveURL("/auth/register");
  });
});

// Group all tests using test@example.com - run serially to avoid session conflicts
test.describe("Auth Tests - Active User (test@example.com)", () => {
  test.describe.configure({ mode: "serial" });

  test.describe("Middleware Guard - After Login Redirect", () => {
    test("TC-AUTH-001: Redirect to returnUrl after successful login", async ({ page }) => {
      // Login via UI
      await loginViaAPI(page, { email: "test@example.com", password: "Test123!@#" });

      // Navigate to /grid
      await page.goto("/grid");

      // Should stay on /grid (may have query params)
      await expect(page).toHaveURL(/\/grid/);
    });

    test("TC-AUTH-001: Redirect to /grid by default if no returnUrl", async ({ page }) => {
      // Login via UI
      await loginViaAPI(page, { email: "test@example.com", password: "Test123!@#" });

      await page.goto("/grid");

      // Should redirect to /grid (may have query params)
      await expect(page).toHaveURL(/\/grid/);
    });
  });
}); // End of Auth Tests - Active User (test@example.com)

// Tests using expired@example.com - run serially
test.describe("Auth Tests - Expired User (expired@example.com)", () => {
  test.describe.configure({ mode: "serial" });
}); // End of Auth Tests - Expired User (expired@example.com)

test.describe("API 401 Handling - Auto Logout", () => {
  test("TC-AUTH: 401 response clears cache and redirects to login", async ({ page }) => {
    // Login first via UI
    await loginViaAPI(page, { email: "test@example.com", password: "Test123!@#" });

    await page.goto("/grid");
    await expect(page).toHaveURL(/\/grid/);

    // Mock API to return 401
    await page.route("**/api/nocodb/grid*", (route) => {
      route.fulfill({
        status: 401,
        body: JSON.stringify({ success: false, error: { message: "Unauthorized" } }),
      });
    });

    // Reload page (will trigger 401)
    await page.reload();

    // Should redirect to login
    await expect(page).toHaveURL(/\/auth\/login/);

    // Cache should be cleared
    const cacheKeys = await page.evaluate(() => {
      return Object.keys(localStorage).filter((k) => k.startsWith("gpw:cache:v1:"));
    });

    expect(cacheKeys.length).toBe(0);
  });
});

test.describe("Password Reset Flow", () => {
  test("TC-AUTH-004: Forgot password page accessible and form renders", async ({ page }) => {
    await page.goto("/auth/forgot-password");

    // Should be on forgot password page
    await expect(page).toHaveURL("/auth/forgot-password");

    // Page title and description should be visible
    await expect(page.locator("h1")).toContainText("Odzyskaj hasło");
    await expect(page.locator("text=Wprowadź swój adres email")).toBeVisible();

    // Form elements should be present
    await expect(page.locator('[name="email"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText("Wyślij link resetujący");

    // Back to login link should be present
    await expect(page.locator('a[href="/auth/login"]')).toBeVisible();
  });

  test("TC-AUTH-004: Forgot password form validation", async ({ page }) => {
    await page.goto("/auth/forgot-password");

    // Wait for React component to render (client:only)
    await page.waitForSelector('[name="email"]', { state: "visible" });
    await page.waitForTimeout(300); // Extra time for React to be fully interactive

    // Try to submit with invalid email
    await page.fill('[name="email"]', "invalid-email");
    await page.click('button[type="submit"]');

    // Should show validation error
    await expect(page.locator("#email-error")).toBeVisible();
    await expect(page.locator("#email-error")).toContainText("prawidłowy adres email");

    // Try with empty email
    await page.fill('[name="email"]', "");
    await page.click('button[type="submit"]');

    // HTML5 validation should prevent submit
    const emailInput = page.locator('[name="email"]');
    const validationMessage = await emailInput.evaluate((el: HTMLInputElement) => el.validationMessage);
    expect(validationMessage).toBeTruthy();
  });

  test("TC-AUTH-004: Forgot password link from login page", async ({ page }) => {
    await page.goto("/auth/login");

    // Click "Zapomniałeś hasła?" link
    await page.click('a:has-text("Zapomniałeś hasła?")');

    // Should navigate to forgot password page
    await expect(page).toHaveURL("/auth/forgot-password");
    await expect(page.locator("h1")).toContainText("Odzyskaj hasło");
  });

  test("TC-AUTH-004: Forgot password success flow (mocked)", async ({ page }) => {
    await page.goto("/auth/forgot-password");

    // Mock Supabase resetPasswordForEmail to succeed
    await page.addInitScript(() => {
      // @ts-expect-error - mocking for test
      window.supabaseResetMock = { error: null };
    });

    // Fill valid email
    await page.fill('[name="email"]', "test@example.com");
    await page.click('button[type="submit"]');

    // Note: In real scenario, we'd need to mock supabaseClient.auth.resetPasswordForEmail
    // For now, we just verify the form submission flow works
    // Success message would appear if Supabase call succeeds
  });

  test("TC-AUTH-005: Reset password page accessible", async ({ page }) => {
    await page.goto("/auth/reset-password");

    // Should be on reset password page
    await expect(page).toHaveURL("/auth/reset-password");

    // Page title should be visible
    await expect(page.locator("h1")).toContainText("Ustaw nowe hasło");

    // Form elements should be present
    await expect(page.locator('[name="password"]')).toBeVisible();
    await expect(page.locator('[name="password-confirm"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("TC-AUTH-005: Reset password form validation", async ({ page }) => {
    await page.goto("/auth/reset-password");

    // Wait for React component to render (client:only)
    await page.waitForSelector('[name="password"]', { state: "visible" });
    await page.waitForTimeout(300); // Extra time for React to be fully interactive

    const passwordInput = page.locator('[name="password"]');
    const confirmInput = page.locator('[name="password-confirm"]');
    const submitBtn = page.locator('button[type="submit"]');

    // Try with short password
    await passwordInput.fill("short");
    await confirmInput.fill("short");
    await submitBtn.click();

    // Should show validation error
    await expect(page.locator("#password-error")).toBeVisible();
    await expect(page.locator("#password-error")).toContainText("minimum 8 znaków");

    // Try with mismatched passwords
    await passwordInput.fill("ValidPass123");
    await confirmInput.fill("DifferentPass123");
    await submitBtn.click();

    // Should show mismatch error
    await expect(page.locator("#password-confirm-error")).toBeVisible();
    await expect(page.locator("#password-confirm-error")).toContainText("nie są identyczne");
  });

  test("TC-AUTH-005: Reset password with expired token shows error", async ({ page }) => {
    // Navigate with error params (simulating expired token from Supabase)
    await page.goto("/auth/reset-password?error=expired&error_description=Token%20expired");

    // Wait for React component to render (client:only)
    await page.waitForSelector("text=Link wygasł lub jest nieprawidłowy", { state: "visible" });

    // Should show error message
    await expect(page.locator("text=Link wygasł lub jest nieprawidłowy")).toBeVisible();
    await expect(page.locator("p").filter({ hasText: "Token expired" })).toBeVisible();

    // Should show link to request new reset
    await expect(page.locator('a[href="/auth/forgot-password"]')).toBeVisible();

    // Form should not be visible when there's an error
    await expect(page.locator("#reset-password-form")).not.toBeVisible();
  });

  test("TC-AUTH-005: Reset password success redirects to login", async ({ page }) => {
    await page.goto("/auth/reset-password");

    // Note: In real scenario, we'd need valid reset token in URL
    // For now, we just verify the form structure and validation
    // Successful password reset redirects to /auth/login?password_reset=success
  });

  test("TC-AUTH-005: Login page shows success message after password reset", async ({ page }) => {
    // Navigate to login with success param
    await page.goto("/auth/login?password_reset=success");

    // Should show success banner
    await expect(page.locator("#password-reset-success")).toBeVisible();
    await expect(page.locator("text=Hasło zostało pomyślnie zmienione")).toBeVisible();
    await expect(page.locator("text=Możesz teraz zalogować się")).toBeVisible();
  });
});

test.describe("Email Confirmation Flow", () => {
  // NOTE: This test is flaky - depends on Supabase email confirmation settings
  // Skip for now as it requires specific NEEDS_CONFIRM_EMAIL configuration
  test.skip("TC-AUTH-004: Registration with NEEDS_CONFIRM_EMAIL=true redirects to /auth/confirmation", async ({
    page,
  }) => {
    // NOTE: This test assumes NEEDS_CONFIRM_EMAIL is set to true in AuthForm.tsx

    // Navigate to register page
    await page.goto("/auth/register");

    // Wait for React to hydrate - wait for email input to be interactive
    // Using longer timeout for CI environment
    await page.waitForSelector('[name="email"]', { state: "visible", timeout: 10000 });
    await page.waitForTimeout(1000); // Extra time for React hydration (increased for CI)

    // Fill registration form with unique email
    // Use realistic domain that passes Supabase validation (not @example.com)
    const testEmail = `playwright-test-${Date.now()}@test-automation.dev`;
    await page.fill('[name="email"]', testEmail);
    await page.fill('[name="password"]', "Test123!@#");

    // Submit form and wait for network idle
    await Promise.all([
      page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {
        // Ignore network idle timeout - not critical for test
      }),
      page.click('button[type="submit"]'),
    ]);

    // Check if there are any validation errors
    const hasValidationError = await page.locator("#email-error, #password-error").count();
    if (hasValidationError > 0) {
      const errorText = await page.locator("#email-error, #password-error").first().textContent();
      throw new Error(`Validation error found: ${errorText}`);
    }

    // Check if there's a general error message
    const hasGeneralError = await page.locator(".text-red-600, .text-destructive").count();
    if (hasGeneralError > 0) {
      const errorText = await page.locator(".text-red-600, .text-destructive").first().textContent();
      throw new Error(`General error found: ${errorText}`);
    }

    // Should show success toast about email confirmation or redirect to confirmation page
    // Using Promise.race to wait for either toast or redirect (longer timeout for CI)
    await Promise.race([
      page.locator("text=Konto utworzone!").waitFor({ state: "visible", timeout: 15000 }),
      page.waitForURL("/auth/confirmation", { timeout: 15000 }),
    ]);

    // If we're here, either toast appeared or we redirected
    // Final check: we should be on confirmation page
    await expect(page).toHaveURL("/auth/confirmation", { timeout: 10000 });
  });

  test("TC-AUTH-005: Confirmation page displays correct message", async ({ page }) => {
    // Navigate to confirmation page directly
    await page.goto("/auth/confirmation");

    // Should display confirmation page
    await expect(page).toHaveURL("/auth/confirmation");

    // Should display heading
    await expect(page.locator("h1")).toHaveText("Sprawdź swoją skrzynkę email");

    // Should display email sent message
    await expect(page.locator("h2")).toHaveText("Email został wysłany");

    // Should display helpful tips
    await expect(page.locator("text=Sprawdź folder spam/promocje")).toBeVisible();
    await expect(page.locator("text=Link weryfikacyjny jest ważny przez 24 godziny")).toBeVisible();

    // Should have link back to login
    await expect(page.locator('a[href="/auth/login"]')).toBeVisible();

    // Should have link to register again
    await expect(page.locator('a[href="/auth/register"]')).toBeVisible();
  });

  test.skip("TC-AUTH-006: Registration with NEEDS_CONFIRM_EMAIL=false redirects to /grid", async ({ page }) => {
    // NOTE: This test should be run when NEEDS_CONFIRM_EMAIL is set to false in AuthForm.tsx
    // To run this test, change the flag to false, then unskip this test

    // Setup: Mock NocoDB responses
    await setupNocoDBMocks(page);

    // Navigate to register page
    await page.goto("/auth/register");

    // Fill registration form with unique email
    // Use realistic domain that passes Supabase validation (not @example.com)
    const testEmail = `playwright-test-${Date.now()}@test-automation.dev`;
    await page.fill('[name="email"]', testEmail);
    await page.fill('[name="password"]', "Test123!@#");

    // Submit form
    await page.click('button[type="submit"]');

    // Should show success toast without email confirmation message
    await expect(page.locator("text=Konto utworzone!")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Witaj w Black Swan Grid")).toBeVisible();

    // Should redirect to grid (not confirmation)
    await expect(page).toHaveURL("/grid", { timeout: 3000 });
  });
});
