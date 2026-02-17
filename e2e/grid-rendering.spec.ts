/**
 * E2E Tests - Grid Rendering (Active User)
 * Test Coverage: Basic rendering, performance, data display
 * User: test@example.com (active subscription)
 *
 * ⚡ Uses auto-fixture (e2e/fixtures.ts) - authenticated automatically per project
 */

import { test, expect } from "./fixtures";
import { GridPage } from "./pages/GridPage";

test.describe("Grid - Rendering (test@example.com)", () => {
  // NO beforeEach - auth handled by auto-fixture!

  test("TC-GRID-001: Grid renders with default range", async ({ page }) => {
    const gridPage = new GridPage(page);

    // Navigate to grid
    await gridPage.goto();

    // Verify grid is visible
    expect(await gridPage.isGridVisible()).toBe(true);

    // Verify default range is week
    const selectedRange = await gridPage.rangeSelector.getSelectedRange();
    expect(selectedRange).toBe("week");

    // Verify grid has data
    expect(await gridPage.hasData()).toBe(true);
  });

  test("TC-GRID-002: Grid loads within performance threshold", async ({ page }) => {
    const gridPage = new GridPage(page);

    // Measure load time
    const loadTime = await gridPage.measureLoadTime();

    // Should load in < 5s (relaxed for E2E)
    expect(loadTime).toBeLessThan(5000);
  });

  test("TC-GRID-003: Grid displays correct structure", async ({ page }) => {
    const gridPage = new GridPage(page);
    await gridPage.goto();

    // Verify headers exist
    const headers = await gridPage.getHeaders();
    expect(headers.length).toBeGreaterThan(0);

    // Verify rows exist
    const rowCount = await gridPage.getRowCount();
    expect(rowCount).toBeGreaterThan(0);

    // Verify event cells (optional - may be 0 with mocks)
    const eventCells = gridPage.getEventCells();
    const cellCount = await eventCells.count();

    // If event cells exist, verify they have data
    if (cellCount > 0) {
      const firstCell = eventCells.first();
      await expect(firstCell).toBeVisible();
      // Event cells should contain percent change
      await expect(firstCell).toContainText(/%/);
    }
  });

  test("TC-GRID-004: Empty state shown when no events", async () => {
    // This test requires empty grid mock - already tested in old grid.spec.ts
    test.skip();
  });
});
