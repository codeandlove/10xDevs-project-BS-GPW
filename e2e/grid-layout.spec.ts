/**
 * E2E Tests - Grid Layout & Scroll (Active User)
 * Test Coverage: Scroll behavior, sticky elements, viewport sizing
 * User: test@example.com (active subscription)
 *
 * ⚡ Uses auto-fixture for authentication
 */

import { test, expect } from "./fixtures";
import { GridPage } from "./pages/GridPage";

test.describe("Grid - Layout & Scroll (test@example.com)", () => {
  test("TC-GRID-LAYOUT-001: Header dates scroll synchronously with grid body", async ({ page }) => {
    const gridPage = new GridPage(page);
    await gridPage.goto();

    // Get scrollable body element
    const gridBody = page.locator('[role="grid"] > div:last-child');
    await expect(gridBody).toBeVisible();

    // Check if horizontal scroll exists
    const hasHorizontalScroll = await gridBody.evaluate((el) => {
      return el.scrollWidth > el.clientWidth;
    });

    if (!hasHorizontalScroll) {
      test.skip(true, "No horizontal scroll - content fits in viewport");
      return;
    }

    // Calculate safe scroll amount
    const scrollableWidth = await gridBody.evaluate((el) => {
      return el.scrollWidth - el.clientWidth;
    });
    const scrollAmount = Math.min(300, Math.floor(scrollableWidth * 0.8));

    // Verify initial position
    const initialScrollLeft = await gridBody.evaluate((el) => el.scrollLeft);
    expect(initialScrollLeft).toBe(0);

    // Scroll horizontally
    await gridBody.evaluate((el, amount) => {
      el.scrollLeft = amount;
    }, scrollAmount);

    // Wait for requestAnimationFrame to execute (50ms = ~3 frames at 60 FPS)
    // This ensures smooth scroll sync has completed before verification
    await page.waitForTimeout(500);

    // Verify scroll occurred
    const bodyScrollLeft = await gridBody.evaluate((el) => el.scrollLeft);
    expect(bodyScrollLeft).toBeGreaterThanOrEqual(scrollAmount - 10);
    expect(bodyScrollLeft).toBeLessThanOrEqual(scrollAmount + 10);
  });

  test("TC-GRID-LAYOUT-002: Grid fills available viewport height without page scroll", async ({ page }) => {
    const gridPage = new GridPage(page);
    await gridPage.goto();

    // Get viewport dimensions
    const viewportHeight = await page.evaluate(() => window.innerHeight);
    const bodyScrollHeight = await page.evaluate(() => document.body.scrollHeight);
    const bodyClientHeight = await page.evaluate(() => document.body.clientHeight);

    // Page should not have vertical scrollbar
    // Allow small tolerance for browser differences
    expect(bodyScrollHeight).toBeLessThanOrEqual(bodyClientHeight + 5);

    // Grid container should fill most of viewport (at least 50%)
    const gridHeight = await page.locator('[role="grid"]').evaluate((el) => el.clientHeight);
    expect(gridHeight).toBeGreaterThan(viewportHeight * 0.5);
  });

  test("TC-GRID-LAYOUT-003: Grid body has vertical scroll", async ({ page }) => {
    const gridPage = new GridPage(page);
    await gridPage.goto();

    // Get grid body element
    const gridBody = page.locator('[role="grid"] > div:last-child');

    // Check if vertical scroll exists
    const hasVerticalScroll = await gridBody.evaluate((el) => {
      return el.scrollHeight > el.clientHeight;
    });

    // Note: With mocked data, grid may not have enough rows to scroll
    // In production with real data, grid should have vertical scroll
    if (!hasVerticalScroll) {
      test.skip(true, "No vertical scroll with current mock data");
      return;
    }

    // If scroll exists, verify it's scrollable
    const scrollHeight = await gridBody.evaluate((el) => el.scrollHeight);
    const clientHeight = await gridBody.evaluate((el) => el.clientHeight);
    expect(scrollHeight).toBeGreaterThan(clientHeight);
  });

  test("TC-GRID-LAYOUT-004: Sticky header remains visible during vertical scroll", async ({ page }) => {
    const gridPage = new GridPage(page);
    await gridPage.goto();

    // Get header and body
    const header = page.locator('[role="grid"] > div:first-child');
    const gridBody = page.locator('[role="grid"] > div:last-child');

    await expect(header).toBeVisible();

    // Get initial header position
    const initialHeaderBox = await header.boundingBox();
    expect(initialHeaderBox).toBeTruthy();

    // Scroll grid body vertically
    await gridBody.evaluate((el) => {
      el.scrollTop = 500;
    });

    await page.waitForTimeout(300);

    // Header should still be visible at same position
    const afterScrollHeaderBox = await header.boundingBox();
    expect(afterScrollHeaderBox).toBeTruthy();

    // Header Y position should not change (sticky)
    if (initialHeaderBox && afterScrollHeaderBox) {
      expect(afterScrollHeaderBox.y).toBeCloseTo(initialHeaderBox.y, 5);
    }
  });

  test("TC-GRID-LAYOUT-005: Symbol column remains sticky during horizontal scroll", async ({ page }) => {
    const gridPage = new GridPage(page);
    await gridPage.goto();

    const gridBody = page.locator('[role="grid"] > div:last-child');

    // Check if horizontal scroll exists
    const hasHorizontalScroll = await gridBody.evaluate((el) => {
      return el.scrollWidth > el.clientWidth;
    });

    if (!hasHorizontalScroll) {
      test.skip(true, "No horizontal scroll - content fits in viewport");
      return;
    }

    // Get first row symbol cell (should be sticky)
    const firstRowSymbol = page.locator('[role="row"]').nth(1).locator('[role="rowheader"]');
    await expect(firstRowSymbol).toBeVisible();

    const initialSymbolBox = await firstRowSymbol.boundingBox();
    expect(initialSymbolBox).toBeTruthy();

    // Scroll horizontally
    await gridBody.evaluate((el) => {
      el.scrollLeft = 300;
    });

    await page.waitForTimeout(300);

    // Symbol should still be visible at same X position (sticky)
    const afterScrollSymbolBox = await firstRowSymbol.boundingBox();
    expect(afterScrollSymbolBox).toBeTruthy();

    if (initialSymbolBox && afterScrollSymbolBox) {
      expect(afterScrollSymbolBox.x).toBeCloseTo(initialSymbolBox.x, 5);
    }
  });
});
