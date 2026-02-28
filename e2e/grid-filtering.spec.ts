/**
 * E2E Tests - Grid Filtering (Active User)
 * Test Coverage: Range selection, ticker filtering
 * User: test@example.com (active subscription)
 *
 * ⚡ Uses auto-fixture (e2e/fixtures.ts) - authenticated automatically per project
 */

import { test, expect } from "./fixtures";
import { GridPage } from "./pages/GridPage";

test.describe("Grid - Filtering (test@example.com)", () => {
  // NO beforeEach - auth handled by auto-fixture!

  test("TC-GRID-RANGE-001: Change range to month", async ({ page }) => {
    const gridPage = new GridPage(page);
    await gridPage.goto();

    // Change to month range
    await gridPage.rangeSelector.selectRange("month");

    // Grid should update
    expect(await gridPage.isGridVisible()).toBe(true);
  });

  test("TC-GRID-RANGE-002: Change range to quarter", async ({ page }) => {
    const gridPage = new GridPage(page);
    await gridPage.goto();

    // Change to quarter range
    await gridPage.rangeSelector.selectRange("quarter");

    // Verify selection
    const selected = await gridPage.rangeSelector.getSelectedRange();
    expect(selected).toBe("quarter");
  });

  test("TC-GRID-RANGE-003: Range persists on page reload", async ({ page }) => {
    const gridPage = new GridPage(page);
    await gridPage.goto();

    // Select month
    await gridPage.rangeSelector.selectRange("month");

    // Reload page
    await page.reload();
    await gridPage.waitForGridReady();

    // Verify month is still selected
    const selected = await gridPage.rangeSelector.getSelectedRange();
    expect(selected).toBe("month");
  });

  // TC-GRID-FILTER-001: Removed - functionality already covered by TC-FILTER-001 to TC-FILTER-005 in grid-filtering-advanced.spec.ts
});
