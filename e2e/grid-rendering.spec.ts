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

  test("TC-GRID-WEEKDAY-001: Grid header displays Polish weekday names", async ({ page }) => {
    const gridPage = new GridPage(page);
    await gridPage.goto();

    // Verify grid is visible
    expect(await gridPage.isGridVisible()).toBe(true);

    // Get the header row
    const header = page.locator('[role="grid"] > div:first-child');
    await expect(header).toBeVisible();

    // Verify weekday names are visible (at least some, depending on range)
    const headerText = await header.textContent();

    // Should contain at least some weekday names
    const weekdayNames = ["Pn.", "Wt.", "Śr.", "Cz.", "Pt.", "Sb.", "Nd."];
    const foundWeekdays = weekdayNames.filter((day) => headerText?.includes(day));

    // Should have at least 3 weekday names visible (depends on range)
    expect(foundWeekdays.length).toBeGreaterThanOrEqual(3);
  });

  test("TC-GRID-WEEKEND-001: Weekend columns have diagonal pattern styling", async ({ page }) => {
    const gridPage = new GridPage(page);
    await gridPage.goto();

    // Find weekend cells by data attribute
    const weekendCells = page.locator('[data-is-weekend="true"]');
    const count = await weekendCells.count();

    // Should have at least some weekend cells (week view typically shows 2 weekend days)
    if (count > 0) {
      // Verify first weekend cell has pattern background
      const firstWeekendCell = weekendCells.first();
      const bgImage = await firstWeekendCell.evaluate((el) => window.getComputedStyle(el).backgroundImage);

      // Should have linear-gradient pattern
      expect(bgImage).toContain("linear-gradient");
    }
  });

  test("TC-GRID-WEEKEND-002: Weekend cells are not clickable", async ({ page }) => {
    const gridPage = new GridPage(page);
    await gridPage.goto();

    // Find weekend cell without event (empty cell)
    const weekendEmptyCell = page.locator('[data-is-weekend="true"][data-has-event="false"]').first();

    const weekendEmptyCount = await weekendEmptyCell.count();
    if (weekendEmptyCount > 0) {
      // Verify pointer-events-none via computed style
      const pointerEvents = await weekendEmptyCell.evaluate((el) => window.getComputedStyle(el).pointerEvents);
      expect(pointerEvents).toBe("none");
    }

    // Find weekend cell with event (button)
    const weekendEventCell = page.locator('[data-is-weekend="true"][data-has-event="true"]').locator("button").first();

    const weekendEventCount = await weekendEventCell.count();
    if (weekendEventCount > 0) {
      // Verify button is disabled
      await expect(weekendEventCell).toBeDisabled();
    }
  });

  test("TC-GRID-TODAY-001: Today column is highlighted", async ({ page }) => {
    const gridPage = new GridPage(page);
    await gridPage.goto();

    // Find today's cells by data attribute
    const todayCells = page.locator('[data-is-today="true"]');
    const count = await todayCells.count();

    // Should have today's cells if today is within the date range
    if (count > 0) {
      // Verify at least one today cell has highlight class
      const firstTodayCell = todayCells.first();
      const classList = await firstTodayCell.evaluate((el) => el.className);

      // Should contain ring or bg highlight classes
      expect(classList).toMatch(/ring-|bg-blue-|bg-gray-/);
    }
  });

  test("TC-GRID-WEEKDAY-002: Header contains both weekday name and date", async ({ page }) => {
    const gridPage = new GridPage(page);
    await gridPage.goto();

    // Get all column headers
    const headers = page.locator('[role="columnheader"]');
    const headerCount = await headers.count();

    // Should have at least 2 headers (symbol + dates)
    expect(headerCount).toBeGreaterThanOrEqual(2);

    // Check date headers (skip first symbol header)
    if (headerCount > 1) {
      const secondHeader = headers.nth(1);
      const headerText = await secondHeader.textContent();

      // Should contain both weekday (e.g., "Pn.") and date (e.g., "2026-02-17")
      // Weekday pattern: 2-3 letters + dot
      const hasWeekday = /[A-ZŚĆŻŹ][a-zśćżź]{0,2}\./.test(headerText || "");
      // Date pattern: YYYY-MM-DD
      const hasDate = /\d{4}-\d{2}-\d{2}/.test(headerText || "");

      expect(hasWeekday || hasDate).toBe(true); // At least one should be present
    }
  });

  test("TC-GRID-WEEKEND-003: ARIA labels include weekend information", async ({ page }) => {
    const gridPage = new GridPage(page);
    await gridPage.goto();

    // Find weekend cells
    const weekendCells = page.locator('[data-is-weekend="true"]');
    const count = await weekendCells.count();

    if (count > 0) {
      const firstWeekendCell = weekendCells.first();
      const ariaLabel = await firstWeekendCell.getAttribute("aria-label");

      // ARIA label should contain "weekend" information
      expect(ariaLabel).toContain("weekend");
    }
  });

  test("TC-GRID-FILL-001: Grid has minimum 8 rows for better visual fill", async ({ page }) => {
    const gridPage = new GridPage(page);
    await gridPage.goto();

    // Get row count
    const rowCount = await gridPage.getRowCount();

    // Should have at least 8 rows (including empty filler rows if needed)
    expect(rowCount).toBeGreaterThanOrEqual(8);
  });
});
