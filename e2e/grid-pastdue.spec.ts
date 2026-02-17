/**
 * E2E Tests - Grid Past Due User
 * Test Coverage: Past due subscription access (no access = paywall)
 * User: expired@example.com with past_due state override
 *
 * ⚡ Uses expired-user auto-fixture + setupSubscriptionState override
 */

import { test, expect } from "./fixtures";
import { setupSubscriptionState } from "./helpers/auth.helper";

test.describe("Grid - Past Due Subscription (expired@example.com)", () => {
  // Auto-fixture handles login, then we override subscription state

  test("TC-ACCESS-PASTDUE-001: Shows BlurredDemoGrid for past_due subscription", async ({ page }) => {
    // Override to past_due AFTER auto-login
    await setupSubscriptionState(page, "expired@example.com", {
      subscription_status: "past_due",
      trial_expires_at: null,
      current_period_end: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    });

    await page.goto("/grid");

    // Should show paywall (past_due = no access)
    await expect(page.locator(".blur-\\[3px\\]")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Odblokuj pełny dostęp")).toBeVisible();

    // Should show CTA to renew
    const ctaButton = page.getByRole("button", { name: /Kup plan|Odnów/i });
    await expect(ctaButton).toBeVisible();
  });

  test("TC-PASTDUE-002: Past due user can renew via CTA", async ({ page }) => {
    // Override to past_due AFTER auto-login
    await setupSubscriptionState(page, "expired@example.com", {
      subscription_status: "past_due",
      trial_expires_at: null,
      current_period_end: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    });

    await page.goto("/grid");

    // Wait for paywall
    await expect(page.getByText("Odblokuj pełny dostęp")).toBeVisible({ timeout: 10000 });

    // Click renew CTA
    const ctaButton = page.getByRole("button", { name: /Kup plan|Odnów/i });
    await ctaButton.click();

    // Should redirect to checkout (or account page for renewal)
    await expect(page).toHaveURL(/\/(checkout|account)/, { timeout: 5000 });
  });
});
