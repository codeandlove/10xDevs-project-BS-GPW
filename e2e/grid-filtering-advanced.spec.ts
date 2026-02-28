/**
 * E2E Tests - Grid Advanced Filtering
 * Test Coverage: Search, multi-select, localStorage, mobile
 * User: test@example.com (active subscription)
 *
 * ⚡ Uses auto-fixture - active-user project
 */

import { test, expect } from "./fixtures";
import { GridPage } from "./pages/GridPage";

test.describe("Grid - Advanced Filtering (test@example.com)", () => {
  // NO beforeEach - auth handled by auto-fixture!

  test("TC-FILTER-001: Filter by single ticker", async ({ page }) => {
    const gridPage = new GridPage(page);
    await gridPage.goto();

    // Open filter and select only 1 ticker (PKN)
    await gridPage.tickerFilter.open();

    // Deselect all first, then select only PKN
    await gridPage.tickerFilter.deselectAll();
    await gridPage.tickerFilter.selectTicker("PKN");

    // Verify apply button shows 1 selected
    const selectedCount = await gridPage.tickerFilter.getSelectedCount();
    expect(selectedCount).toBe(1);

    await gridPage.tickerFilter.apply();

    // Verify URL updated with symbols param
    await expect(page).toHaveURL(/symbols=/);

    // Verify badge shows 1
    const badgeCount = await gridPage.tickerFilter.getBadgeCount();
    expect(badgeCount).toBe("1");
  });

  test("TC-FILTER-002: Filter by multiple tickers", async ({ page }) => {
    const gridPage = new GridPage(page);
    await gridPage.goto();

    // Select only 2 tickers
    await gridPage.tickerFilter.open();

    // Deselect all first, then select 2 specific tickers
    await gridPage.tickerFilter.deselectAll();
    await gridPage.tickerFilter.selectTickers(["CPD", "PKN"]);

    // Verify apply button shows 2 selected
    const selectedCount = await gridPage.tickerFilter.getSelectedCount();
    expect(selectedCount).toBe(2);

    await gridPage.tickerFilter.apply();

    // Verify badge shows 2
    const badgeCount = await gridPage.tickerFilter.getBadgeCount();
    expect(badgeCount).toBe("2");
  });

  test("TC-FILTER-003: Filters saved in localStorage", async ({ page }) => {
    const gridPage = new GridPage(page);
    await gridPage.goto();

    // Keep only PKN (uncheck CPD and PKO)
    await gridPage.tickerFilter.open();
    await gridPage.tickerFilter.deselectTickers(["CPD", "PKO"]);
    await gridPage.tickerFilter.apply();

    // Check localStorage for saved preferences
    const localStorage = await page.evaluate(() => JSON.stringify(window.localStorage));

    expect(localStorage).toBeTruthy();
    expect(localStorage).toContain("PKN");
  });

  test("TC-FILTER-004: Replace filters with different tickers", async ({ page }) => {
    const gridPage = new GridPage(page);
    await gridPage.goto();

    // First, apply filter with PKN only
    await gridPage.tickerFilter.open();
    await gridPage.tickerFilter.deselectAll();
    await gridPage.tickerFilter.selectTicker("PKN");
    await gridPage.tickerFilter.apply();

    // Verify badge shows 1
    let badgeCount = await gridPage.tickerFilter.getBadgeCount();
    expect(badgeCount).toBe("1");

    // Now replace PKN with CPD
    await gridPage.tickerFilter.open();
    await gridPage.tickerFilter.deselectAll();
    await gridPage.tickerFilter.selectTicker("CPD");
    await gridPage.tickerFilter.apply();

    // Badge should still show 1 (but different ticker now)
    badgeCount = await gridPage.tickerFilter.getBadgeCount();
    expect(badgeCount).toBe("1");
  });

  test("TC-FILTER-005: Search filters ticker list", async ({ page }) => {
    const gridPage = new GridPage(page);
    await gridPage.goto();

    await gridPage.tickerFilter.open();

    // Search for specific ticker
    await gridPage.tickerFilter.search("PKN");

    // Verify checkbox for PKN is visible
    const pknCheckbox = page.locator("#ticker-PKN").first();
    await expect(pknCheckbox).toBeVisible();
  });
});

test.describe("Grid - Advanced Filtering Mobile", () => {
  // Mobile viewport
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE

  test.skip("TC-FILTER-MOBILE-001: Bottom sheet opens and is scrollable", async ({ page }) => {
    // NOTE: On mobile (< 768px), filters are in hamburger menu, not separate buttons
    // Mobile UI uses different layout - would need to test hamburger menu navigation
    // Desktop has separate filter buttons in header
    const gridPage = new GridPage(page);
    await gridPage.goto();

    // Open filter (should be bottom sheet on mobile)
    await gridPage.tickerFilter.open();

    // Wait for bottom sheet to be visible
    await page.waitForTimeout(500);

    // Bottom sheet content should be visible
    const bottomSheet = page.locator('[data-vaul-drawer]').first();
    await expect(bottomSheet).toBeVisible({ timeout: 5000 });

    // Search input should be enabled
    const searchInput = page.getByPlaceholder(/Szukaj po symbolu/i);
    await expect(searchInput).toBeEnabled();

    // Check if bottom sheet body is scrollable
    const body = page.locator('[data-vaul-drawer] > [role="dialog"]').first();
    const isScrollable = await body.evaluate((el) => {
      return el.scrollHeight > el.clientHeight;
    });

    // With 15+ symbols, bottom sheet should be scrollable on mobile
    expect(isScrollable).toBe(true);
  });

  test.skip("TC-FILTER-MOBILE-002: Touch targets meet WCAG requirements", async ({ page }) => {
    // NOTE: Mobile UI uses hamburger menu - test would need hamburger navigation
    // Verify touch targets are at least 44x44px for accessibility
    const gridPage = new GridPage(page);
    await gridPage.goto();

    await gridPage.tickerFilter.open();
    await page.waitForTimeout(500);

    // Get first checkbox label (should be at least 44x44 for WCAG)
    const firstLabel = page.locator('label[for^="ticker-"]').first();
    await expect(firstLabel).toBeVisible({ timeout: 5000 });

    const box = await firstLabel.boundingBox();
    if (!box) {
      test.skip(true, "Could not get label bounding box");
      return;
    }

    // WCAG 2.1 Level AAA: Touch targets should be at least 44x44 pixels
    expect(box.height).toBeGreaterThanOrEqual(44);
  });
});

test.describe("Grid - Advanced Filtering Desktop", () => {
  test.use({ viewport: { width: 1280, height: 720 } }); // Desktop

  test("TC-FILTER-DESKTOP-001: Dialog opens centered (not bottom sheet)", async ({ page }) => {
    const gridPage = new GridPage(page);
    await gridPage.goto();

    await gridPage.tickerFilter.open();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Get dialog position
    const box = await dialog.boundingBox();
    if (!box) {
      test.skip(true, "Could not get dialog bounding box");
      return;
    }

    // Dialog should be roughly centered (not at bottom like mobile)
    const viewportHeight = 720;
    const dialogCenter = box.y + box.height / 2;
    const viewportCenter = viewportHeight / 2;

    // Allow 200px tolerance for centering
    const isRoughlyCentered = Math.abs(dialogCenter - viewportCenter) < 200;
    expect(isRoughlyCentered).toBe(true);
  });
});
