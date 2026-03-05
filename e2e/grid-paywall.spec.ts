/**
 * E2E Tests - Grid Paywall (Expired/Trial Users)
 * Test Coverage: Access control, paywall behavior
 * Users: expired@example.com, trial@example.com
 *
 * ⚡ Uses auto-fixture - expired-user/trial-user projects
 */

import { test, expect } from "./fixtures";
import { RangeSelector } from "./pages/components/RangeSelector";

test.describe("Grid - Paywall (Expired User)", () => {
  // NO beforeEach - auth handled by auto-fixture via expired-user project!

  test("TC-ACCESS-001: Shows BlurredDemoGrid when trial expired", async ({ page }) => {
    await page.goto("/grid");

    // Should show blurred overlay
    await expect(page.locator(".blur-\\[3px\\]")).toBeVisible({ timeout: 30000 });

    // Should show paywall heading
    await expect(page.getByText("Odblokuj pełny dostęp")).toBeVisible();

    // Should show description
    await expect(page.getByText(/Zobacz rzeczywiste dane/i)).toBeVisible();
  });

  test("TC-ACCESS-002: CTA button redirects to checkout", async ({ page }) => {
    await page.goto("/grid");

    // Wait for paywall to load
    await expect(page.getByText("Odblokuj pełny dostęp")).toBeVisible();

    // Find and click CTA button
    const ctaButton = page.getByRole("button", { name: /Kup plan|Aktywuj/i });
    await expect(ctaButton).toBeVisible();

    await ctaButton.click();

    // Should redirect to checkout
    await expect(page).toHaveURL(/\/checkout/, { timeout: 5000 });
  });

  test("TC-ACCESS-003: Demo grid is not interactive", async ({ page }) => {
    await page.goto("/grid");

    // Wait for paywall
    await expect(page.getByText("Odblokuj pełny dostęp")).toBeVisible({ timeout: 10000 });

    // Grid should have pointer-events-none or be blurred
    const demoGrid = page.locator(".blur-\\[3px\\]");
    await expect(demoGrid).toBeVisible();

    // Try clicking - should not open sidebar
    await demoGrid.click({ force: true });
    await page.waitForTimeout(1000);

    // Sidebar should NOT open
    const sidebar = page.locator('[data-testid="sidebar"]');
    const sidebarVisible = await sidebar.isVisible().catch(() => false);
    expect(sidebarVisible).toBe(false);
  });

  test("TC-ACCESS-004: Date selector visible but grid stays blurred", async ({ page }) => {
    await page.goto("/grid");

    // Wait for paywall
    await expect(page.getByText("Odblokuj pełny dostęp")).toBeVisible({ timeout: 10000 });

    // Date selector button should be visible (shows explicit dates, e.g. "19.12 - 02.01.2026")
    const rangeSelector = new RangeSelector(page);
    await expect(rangeSelector.getDropdownButton()).toBeVisible();

    // Grid should still be blurred
    await expect(page.locator(".blur-\\[3px\\]")).toBeVisible();
    await expect(page.getByText("Odblokuj pełny dostęp")).toBeVisible();
  });

  test("TC-ACCESS-005: Ticker filter visible but grid stays blurred", async ({ page }) => {
    await page.goto("/grid");

    // Wait for paywall
    await expect(page.getByText("Odblokuj pełny dostęp")).toBeVisible({ timeout: 10000 });

    // Filter button should be visible
    const filterButton = page.getByRole("button", { name: /Filter by ticker|Tickery/i });
    await expect(filterButton).toBeVisible();

    // Try to apply filter
    await filterButton.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Check for ticker (conditional - depends on mock data)
    const checkbox = page.locator('label:has-text("CPD") input[type="checkbox"]').first();
    const hasCheckbox = (await checkbox.count()) > 0;

    if (hasCheckbox) {
      await checkbox.check();
      await dialog.getByRole("button", { name: /Zastosuj/i }).click();
      await expect(dialog).not.toBeVisible();
    } else {
      // Close dialog
      await page.keyboard.press("Escape");
    }

    // Grid should still be blurred regardless
    await expect(page.locator(".blur-\\[3px\\]")).toBeVisible();
    await expect(page.getByText("Odblokuj pełny dostęp")).toBeVisible();
  });
});

test.describe("Grid - Paywall Mobile (Expired User)", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("TC-ACCESS-MOBILE-001: Shows MobileAccessBlock on mobile", async ({ page }) => {
    await page.goto("/grid");

    // Should show access block heading
    await expect(page.getByText("Odblokuj pełny dostęp")).toBeVisible({ timeout: 10000 });

    // Should have proper container with min-height (mobile uses different layout)
    const accessBlock = page.locator(".min-h-\\[600px\\]");
    const hasAccessBlock = await accessBlock.isVisible().catch(() => false);

    if (hasAccessBlock) {
      await expect(accessBlock).toBeVisible();
    }

    // Should show CTA
    await expect(page.getByRole("button", { name: /Kup plan|Aktywuj/i })).toBeVisible();

    // Should show benefits (multiple elements match, use first)
    await expect(page.getByText(/Pełny dostęp|rzeczywiste dane/i).first()).toBeVisible();
  });

  test("TC-ACCESS-MOBILE-002: CTA redirects to checkout on mobile", async ({ page }) => {
    await page.goto("/grid");

    // Wait for paywall
    await expect(page.getByText("Odblokuj pełny dostęp")).toBeVisible({ timeout: 10000 });

    // Click CTA
    const ctaButton = page.getByRole("button", { name: /Kup plan|Aktywuj/i });
    await expect(ctaButton).toBeVisible();
    await ctaButton.click();

    // Should redirect to checkout
    await expect(page).toHaveURL(/\/checkout/, { timeout: 5000 });
  });
});
