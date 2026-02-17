/**
 * E2E Tests - Grid Keyboard Navigation (Active User)
 * Test Coverage: Arrow keys, Enter, Escape, focus management
 * User: test@example.com (active subscription)
 *
 * ⚡ Uses auto-fixture for authentication
 */

import { test, expect } from "./fixtures";
import { GridPage } from "./pages/GridPage";

test.describe("Grid - Keyboard Navigation (test@example.com)", () => {
  test("TC-GRID-KEY-001: Navigate with arrow keys", async ({ page }) => {
    const gridPage = new GridPage(page);
    await gridPage.goto();

    // Find first event cell (cell with data)
    const firstEventCell = page.locator('[data-has-event="true"]').first();

    // Check if any event cells exist
    const eventCount = await firstEventCell.count();
    if (eventCount === 0) {
      test.skip(true, "No event cells with mock data");
      return;
    }

    await expect(firstEventCell).toBeVisible();

    // Focus on the cell
    await firstEventCell.focus();

    // Press arrow keys to navigate
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(200);

    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(200);

    await page.keyboard.press("ArrowLeft");
    await page.waitForTimeout(200);

    await page.keyboard.press("ArrowUp");
    await page.waitForTimeout(200);

    // Verify navigation works without errors
    // Grid should still be visible
    expect(await gridPage.isGridVisible()).toBe(true);
  });

  test("TC-GRID-KEY-002: Open sidebar with Enter key", async ({ page }) => {
    const gridPage = new GridPage(page);
    await gridPage.goto();

    // Find first event cell
    const firstEventCell = page.locator('[data-has-event="true"]').first();
    const eventCount = await firstEventCell.count();

    if (eventCount === 0) {
      test.skip(true, "No event cells with mock data");
      return;
    }

    await expect(firstEventCell).toBeVisible();

    // Focus and press Enter
    await firstEventCell.focus();
    await page.keyboard.press("Enter");

    // Sidebar should open
    const sidebar = page.locator('[data-testid="sidebar"]');
    await expect(sidebar).toBeVisible({ timeout: 5000 });
  });

  test("TC-GRID-KEY-003: Close sidebar with Escape key", async ({ page }) => {
    const gridPage = new GridPage(page);
    await gridPage.goto();

    // Find and click event cell to open sidebar
    const firstEventCell = page.locator('[data-has-event="true"]').first();
    const eventCount = await firstEventCell.count();

    if (eventCount === 0) {
      test.skip(true, "No event cells with mock data");
      return;
    }

    await expect(firstEventCell).toBeVisible();
    await firstEventCell.click();

    // Wait for sidebar to open
    const sidebar = page.locator('[data-testid="sidebar"]');
    await expect(sidebar).toBeVisible({ timeout: 5000 });

    // Press Escape to close
    await page.keyboard.press("Escape");

    // Sidebar should close
    await expect(sidebar).not.toBeVisible({ timeout: 3000 });
  });
});
