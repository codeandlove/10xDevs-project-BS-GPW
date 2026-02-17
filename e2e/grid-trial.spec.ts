/**
 * E2E Tests - Grid Trial User
 * Test Coverage: Trial user access, full grid functionality
 * User: trial@example.com (active trial)
 *
 * ⚡ Uses auto-fixture - trial-user project
 */

import { test, expect } from "./fixtures";
import { GridPage } from "./pages/GridPage";

test.describe("Grid - Trial User (trial@example.com)", () => {
  // NO beforeEach - auth handled by auto-fixture!

  test("TC-TRIAL-001: Shows real grid with active trial", async ({ page }) => {
    const gridPage = new GridPage(page);
    await gridPage.goto();

    // Real grid should be visible
    expect(await gridPage.isGridVisible()).toBe(true);

    // No paywall
    const paywall = page.getByText("Odblokuj pełny dostęp");
    const paywallVisible = await paywall.isVisible().catch(() => false);
    expect(paywallVisible).toBe(false);
  });

  test("TC-TRIAL-002: Trial user has full grid functionality", async ({ page }) => {
    const gridPage = new GridPage(page);
    await gridPage.goto();

    // Grid should be interactive
    expect(await gridPage.isGridVisible()).toBe(true);

    // Should be able to change range
    await gridPage.rangeSelector.selectRange("month");
    const selected = await gridPage.rangeSelector.getSelectedRange();
    expect(selected).toBe("month");
  });
});
