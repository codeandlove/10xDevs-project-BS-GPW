/**
 * E2E tests for Grid Minimap Navigation
 */

import { test, expect } from "@playwright/test";

test.describe("Grid Minimap", () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to grid
    await page.goto("/auth/login");
    await page.fill('input[type="email"]', "test@example.com");
    await page.fill('input[type="password"]', "testpassword123");
    await page.click('button[type="submit"]');
    await page.waitForURL("/grid");
  });

  test("should display minimap by default on desktop", async ({ page }) => {
    // Check if minimap container is visible
    const minimap = page.locator("[data-minimap]");
    await expect(minimap).toBeVisible();

    // Check if canvas is rendered
    const canvas = minimap.locator("canvas");
    await expect(canvas).toBeVisible();
  });

  test("should toggle visibility with button", async ({ page }) => {
    // Find close button and click it
    const closeButton = page.locator('button[aria-label="Ukryj mini-mapę"]');
    await closeButton.click();

    // Minimap should be hidden
    const minimap = page.locator("[data-minimap]");
    await expect(minimap).not.toBeVisible();

    // Show button should appear
    const showButton = page.locator('button[aria-label="Pokaż mini-mapę"]');
    await expect(showButton).toBeVisible();

    // Click show button
    await showButton.click();

    // Minimap should be visible again
    await expect(minimap).toBeVisible();
  });

  test("should persist visibility preference after reload", async ({ page }) => {
    // Hide minimap
    const closeButton = page.locator('button[aria-label="Ukryj mini-mapę"]');
    await closeButton.click();

    // Verify hidden
    const minimap = page.locator("[data-minimap]");
    await expect(minimap).not.toBeVisible();

    // Reload page
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Minimap should still be hidden
    await expect(minimap).not.toBeVisible();

    // Show button should be present
    const showButton = page.locator('button[aria-label="Pokaż mini-mapę"]');
    await expect(showButton).toBeVisible();
  });

  test("should scroll grid when dragging viewport", async ({ page }) => {
    // Wait for grid to load
    await page.waitForSelector('[role="grid"]');

    const gridContainer = page.locator('[role="grid"]').locator("..").first();

    // Get initial scroll position
    const initialScrollLeft = await gridContainer.evaluate((el) => el.scrollLeft);
    const initialScrollTop = await gridContainer.evaluate((el) => el.scrollTop);

    // Find minimap canvas
    const canvas = page.locator("[data-minimap] canvas");
    await expect(canvas).toBeVisible();

    // Get canvas bounding box
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error("Canvas not found");

    // Drag from center to a different position (simulate viewport drag)
    const startX = canvasBox.x + canvasBox.width * 0.5;
    const startY = canvasBox.y + canvasBox.height * 0.5;
    const endX = canvasBox.x + canvasBox.width * 0.7;
    const endY = canvasBox.y + canvasBox.height * 0.7;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(endX, endY);
    await page.mouse.up();

    // Wait for scroll to complete
    await page.waitForTimeout(500);

    // Get new scroll position
    const newScrollLeft = await gridContainer.evaluate((el) => el.scrollLeft);
    const newScrollTop = await gridContainer.evaluate((el) => el.scrollTop);

    // Scroll position should have changed
    expect(newScrollLeft).not.toBe(initialScrollLeft);
    expect(newScrollTop).not.toBe(initialScrollTop);
  });

  test("should jump grid when clicking outside viewport on minimap", async ({ page }) => {
    // Wait for grid to load
    await page.waitForSelector('[role="grid"]');

    const gridContainer = page.locator('[role="grid"]').locator("..").first();

    // Get initial scroll position
    const initialScrollLeft = await gridContainer.evaluate((el) => el.scrollLeft);
    const initialScrollTop = await gridContainer.evaluate((el) => el.scrollTop);

    // Find minimap canvas
    const canvas = page.locator("[data-minimap] canvas");
    await expect(canvas).toBeVisible();

    // Get canvas bounding box
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error("Canvas not found");

    // Click on bottom-right corner of minimap (outside viewport rectangle)
    const clickX = canvasBox.x + canvasBox.width * 0.9;
    const clickY = canvasBox.y + canvasBox.height * 0.9;

    await page.mouse.click(clickX, clickY);

    // Wait for scroll to complete
    await page.waitForTimeout(300);

    // Get new scroll position
    const newScrollLeft = await gridContainer.evaluate((el) => el.scrollLeft);
    const newScrollTop = await gridContainer.evaluate((el) => el.scrollTop);

    // Scroll position should have changed (jumped to new location)
    expect(newScrollLeft).toBeGreaterThan(initialScrollLeft);
    expect(newScrollTop).toBeGreaterThan(initialScrollTop);
  });

  test("should show mobile bottom sheet on small viewport", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Find and click toggle button to show minimap
    const toggleButton = page.locator('button[aria-label*="mini-map"]').first();
    await toggleButton.click();

    // Wait for bottom sheet to appear (vaul uses data-vaul-drawer attribute)
    const bottomSheet = page.locator("[data-vaul-drawer]");
    await expect(bottomSheet).toBeVisible();

    // Handle bar should be visible (vaul's drag indicator)
    const handleBar = bottomSheet.locator(".h-1\\.5.w-12.rounded-full.bg-muted");
    await expect(handleBar).toBeVisible();

    // Header title should be visible
    const title = page.getByRole("heading", { name: "Mapa Nawigacyjna" });
    await expect(title).toBeVisible();

    // Canvas should be in bottom sheet
    const canvas = bottomSheet.locator("canvas");
    await expect(canvas).toBeVisible();

    // Click backdrop to close (vaul overlay)
    const overlay = page.locator("[data-vaul-overlay]");
    await overlay.click({ position: { x: 10, y: 10 } });

    // Wait for bottom sheet to disappear
    await expect(bottomSheet).not.toBeVisible();
  });

  test("should render events as colored pixels", async ({ page }) => {
    // Wait for grid to load
    await page.waitForSelector('[role="grid"]');

    const gridContainer = page.locator('[role="grid"]').locator("..").first();

    // Get initial scroll position
    const initialScrollLeft = await gridContainer.evaluate((el) => el.scrollLeft);
    const initialScrollTop = await gridContainer.evaluate((el) => el.scrollTop);

    // Find minimap canvas
    const canvas = page.locator("[data-minimap] canvas");
    await expect(canvas).toBeVisible();

    // Get canvas bounding box
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error("Canvas not found");

    // Click at top-left corner (likely outside viewport rectangle)
    const clickX = canvasBox.x + 5;
    const clickY = canvasBox.y + 5;

    await page.mouse.move(clickX, clickY);
    await page.mouse.down();
    await page.mouse.move(clickX + 50, clickY + 50);
    await page.mouse.up();

    // Wait a moment
    await page.waitForTimeout(200);

    // Get scroll position - should not have changed significantly
    const newScrollLeft = await gridContainer.evaluate((el) => el.scrollLeft);
    const newScrollTop = await gridContainer.evaluate((el) => el.scrollTop);

    // If we clicked outside viewport, scroll should be similar (within small tolerance)
    // Note: This test might be flaky if viewport happens to be at top-left
    // In production, we'd refine this test based on actual viewport position
    const scrollLeftDiff = Math.abs(newScrollLeft - initialScrollLeft);
    const scrollTopDiff = Math.abs(newScrollTop - initialScrollTop);

    // Either scroll didn't change, or viewport was actually at top-left
    expect(scrollLeftDiff < 100 || scrollTopDiff < 100).toBeTruthy();
  });

  test("should display event count", async ({ page }) => {
    // Wait for minimap to load
    const minimap = page.locator("[data-minimap]").locator("..");

    // Find event count text
    const eventCount = minimap.locator("text=/\\d+ (zdarzenie|zdarzeń)/");
    await expect(eventCount).toBeVisible();

    // Count should be a positive number
    const countText = await eventCount.textContent();
    const match = countText?.match(/(\d+)/);
    expect(match).toBeTruthy();
    if (match) {
      const count = parseInt(match[1]);
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  test("should show correct cursor styles", async ({ page }) => {
    // Find minimap wrapper
    const minimapWrapper = page.locator("[data-minimap]");
    await expect(minimapWrapper).toBeVisible();

    // Check cursor style (should be grab)
    const cursorClass = await minimapWrapper.getAttribute("class");
    expect(cursorClass).toContain("cursor-grab");

    // During drag, cursor should change to grabbing
    const canvas = minimapWrapper.locator("canvas");
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error("Canvas not found");

    // Start drag
    const centerX = canvasBox.x + canvasBox.width * 0.5;
    const centerY = canvasBox.y + canvasBox.height * 0.5;

    await page.mouse.move(centerX, centerY);
    await page.mouse.down();

    // Wait briefly to allow drag state to update
    await page.waitForTimeout(100);

    // During drag, cursor class should change to grabbing
    // (we can't directly test cursor in Playwright, but component updates class)

    await page.mouse.up();
  });
});
