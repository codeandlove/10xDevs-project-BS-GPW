/**
 * E2E Tests - Summary Sidebar/Drawer
 * Test Coverage: Opening, closing, focus management, cache
 * Per test-plan.md section 4.2 (TC-SIDEBAR-001 to TC-SIDEBAR-004)
 */

import { test, expect } from "@playwright/test";
import { loginViaAPI } from "./helpers/auth.helper";
import { setupNocoDBMocks } from "./helpers/mock-nocodb.helper";

test.describe("Summary View - Opening Sidebar", () => {
  test.beforeEach(async ({ page }) => {
    // Setup API mocks FIRST
    await setupNocoDBMocks(page);

    // Login via API
    await loginViaAPI(page, {
      email: "test@example.com",
      password: "Test123!@#",
    });

    await page.goto("/grid");
    await expect(page.locator('[role="grid"]')).toBeVisible({ timeout: 10000 });
  });

  test("TC-SIDEBAR-001: Open sidebar by clicking event cell", async ({ page }) => {
    // Click on event cell
    const eventCell = page.locator('[data-has-event="true"]').first();

    if ((await eventCell.count()) > 0) {
      await eventCell.click();

      // Sidebar should open
      await expect(page.locator('[role="dialog"]')).toBeVisible();
      await expect(page.locator("#sidebar-title")).toContainText("Szczegóły wydarzenia");

      // Verify overlay is visible
      const overlay = page.locator('[role="dialog"] ~ div').first();
      await expect(overlay).toBeVisible();
    }
  });

  test("TC-SIDEBAR-001: Sidebar has correct width (33% on desktop)", async ({ page }) => {
    const eventCell = page.locator('[data-has-event="true"]').first();

    if ((await eventCell.count()) > 0) {
      await eventCell.click();

      const sidebar = page.locator('[role="dialog"]');
      await expect(sidebar).toBeVisible();

      // Check width is approximately 33% of viewport
      const sidebarBox = await sidebar.boundingBox();
      const viewportSize = page.viewportSize();

      if (sidebarBox && viewportSize) {
        const widthPercentage = (sidebarBox.width / viewportSize.width) * 100;
        expect(widthPercentage).toBeGreaterThan(30);
        expect(widthPercentage).toBeLessThan(40);
      }
    }
  });

  test("TC-SIDEBAR-001: URL updated with eventId param", async ({ page }) => {
    const eventCell = page.locator('[data-has-event="true"]').first();

    if ((await eventCell.count()) > 0) {
      await eventCell.click();

      // URL should contain eventId
      await expect(page).toHaveURL(/eventId=/);
    }
  });

  test("TC-SIDEBAR-001: Focus on close button initially", async ({ page }) => {
    const eventCell = page.locator('[data-has-event="true"]').first();

    if ((await eventCell.count()) > 0) {
      await eventCell.click();

      const closeButton = page.locator('[role="dialog"] [aria-label="Zamknij"]');
      await expect(closeButton).toBeFocused();
    }
  });

  test("TC-SIDEBAR-001: Displays event details", async ({ page }) => {
    const eventCell = page.locator('[data-has-event="true"]').first();

    if ((await eventCell.count()) > 0) {
      await eventCell.click();

      const sidebar = page.locator('[role="dialog"]');
      await expect(sidebar).toBeVisible();

      // Should show event details
      await expect(sidebar.locator('[data-testid="event-symbol"]')).toBeVisible();
      await expect(sidebar.locator('[data-testid="event-date"]')).toBeVisible();
      await expect(sidebar.locator('[data-testid="percent-change"]')).toBeVisible();
    }
  });
});

test.describe("Summary View - Closing Sidebar", () => {
  test.beforeEach(async ({ page }) => {
    // Setup API mocks
    await setupNocoDBMocks(page);

    // Login via API
    await loginViaAPI(page, {
      email: "test@example.com",
      password: "Test123!@#",
    });

    await page.goto("/grid");
    await expect(page.locator('[role="grid"]')).toBeVisible({ timeout: 10000 });

    // Open sidebar
    const eventCell = page.locator('[data-has-event="true"]').first();
    if ((await eventCell.count()) > 0) {
      await eventCell.click();
      await expect(page.locator('[role="dialog"]')).toBeVisible();
    }
  });

  test("TC-SIDEBAR-002: Close sidebar with ESC key", async ({ page }) => {
    const sidebar = page.locator('[role="dialog"]');

    if ((await sidebar.count()) > 0) {
      // Press ESC
      await page.keyboard.press("Escape");

      // Sidebar should close immediately
      await expect(sidebar).not.toBeVisible({ timeout: 100 });

      // URL should be clean (no eventId)
      await expect(page).not.toHaveURL(/eventId=/);
    }
  });

  test("TC-SIDEBAR-002: Close sidebar with X button", async ({ page }) => {
    const sidebar = page.locator('[role="dialog"]');

    if ((await sidebar.count()) > 0) {
      // Click X button
      await page.click('[role="dialog"] [aria-label="Zamknij"]');

      // Sidebar should close
      await expect(sidebar).not.toBeVisible();
      await expect(page).not.toHaveURL(/eventId=/);
    }
  });

  test("TC-SIDEBAR-002: Close sidebar by clicking overlay", async ({ page }) => {
    const sidebar = page.locator('[role="dialog"]');

    if ((await sidebar.count()) > 0) {
      // Click overlay (outside sidebar)
      await page.click("body", { position: { x: 10, y: 10 } });

      // Sidebar should close
      await expect(sidebar).not.toBeVisible();
    }
  });

  test("TC-SIDEBAR-002: Focus returns to grid after closing", async ({ page }) => {
    const sidebar = page.locator('[role="dialog"]');

    if ((await sidebar.count()) > 0) {
      await page.keyboard.press("Escape");
      await expect(sidebar).not.toBeVisible();

      // Focus should return to grid
      const grid = page.locator('[role="grid"]');
      await expect(grid).toBeFocused();
    }
  });
});

test.describe("Summary View - Focus Management", () => {
  test.beforeEach(async ({ page }) => {
    // Setup API mocks
    await setupNocoDBMocks(page);

    // Login via API
    await loginViaAPI(page, {
      email: "test@example.com",
      password: "Test123!@#",
    });

    await page.goto("/grid");

    const eventCell = page.locator('[data-has-event="true"]').first();
    if ((await eventCell.count()) > 0) {
      await eventCell.click();
      await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 10000 });
    }
  });

  test("TC-SIDEBAR-003: Focus trap - Tab cycles within sidebar", async ({ page }) => {
    const sidebar = page.locator('[role="dialog"]');

    if ((await sidebar.count()) > 0) {
      // Get all focusable elements
      const focusableElements = sidebar.locator(
        'button, a, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      const count = await focusableElements.count();

      if (count > 1) {
        // Focus should be on first element (close button)
        const firstElement = focusableElements.first();
        await expect(firstElement).toBeFocused();

        // Tab to last element
        for (let i = 0; i < count - 1; i++) {
          await page.keyboard.press("Tab");
        }

        // Tab again should cycle back to first
        await page.keyboard.press("Tab");
        await expect(firstElement).toBeFocused();
      }
    }
  });

  test("TC-SIDEBAR-003: Shift+Tab cycles backwards", async ({ page }) => {
    const sidebar = page.locator('[role="dialog"]');

    if ((await sidebar.count()) > 0) {
      const focusableElements = sidebar.locator("button, a, [href]");
      const count = await focusableElements.count();

      if (count > 1) {
        // Currently on first element, Shift+Tab should go to last
        await page.keyboard.press("Shift+Tab");

        const lastElement = focusableElements.last();
        await expect(lastElement).toBeFocused();
      }
    }
  });
});

test.describe("Summary View - Cache for Event Details", () => {
  test("TC-SIDEBAR-004: First open fetches from API", async ({ page }) => {
    // Setup mocks
    await setupNocoDBMocks(page);
    await loginViaAPI(page, {
      email: "test@example.com",
      password: "Test123!@#",
    });

    await page.goto("/grid");
    await expect(page.locator('[role="grid"]')).toBeVisible();

    const eventCell = page.locator('[data-has-event="true"]').first();

    if ((await eventCell.count()) > 0) {
      // Get event ID
      const eventId = await eventCell.getAttribute("data-event-id");

      // Open sidebar
      await eventCell.click();
      await expect(page.locator('[role="dialog"]')).toBeVisible();

      // Wait for data to load
      await page.waitForTimeout(500);

      // Check cache
      const cacheKey = await page.evaluate((id) => {
        return localStorage.getItem(`gpw:cache:v1:black_swans|id=${id}`);
      }, eventId);

      expect(cacheKey).toBeTruthy();
    }
  });

  test("TC-SIDEBAR-004: Second open uses cache (instant render)", async ({ page }) => {
    await page.goto("/grid");
    const eventCell = page.locator('[data-has-event="true"]').first();

    if ((await eventCell.count()) > 0) {
      // First open
      await eventCell.click();
      await expect(page.locator('[role="dialog"]')).toBeVisible();
      await page.waitForTimeout(500);

      // Close
      await page.keyboard.press("Escape");
      await expect(page.locator('[role="dialog"]')).not.toBeVisible();

      // Second open (should be instant from cache)
      const startTime = Date.now();
      await eventCell.click();
      await expect(page.locator('[role="dialog"]')).toBeVisible();
      const loadTime = Date.now() - startTime;

      // Should be very fast (< 100ms)
      expect(loadTime).toBeLessThan(100);
    }
  });

  test("TC-SIDEBAR-004: Retry button appears on error", async ({ page }) => {
    // Setup mocks and login
    await loginViaAPI(page, {
      email: "test@example.com",
      password: "Test123!@#",
    });

    // Mock grid API normally but events API with error
    await setupNocoDBMocks(page);

    // Mock API to return error for event details
    await page.route("**/api/nocodb/events/*", (route) => {
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ success: false, error: { message: "Server error" } }),
      });
    });

    await page.goto("/grid");
    const eventCell = page.locator('[data-has-event="true"]').first();

    if ((await eventCell.count()) > 0) {
      await eventCell.click();
      await expect(page.locator('[role="dialog"]')).toBeVisible();

      // Should show error message
      await expect(page.getByText(/błąd/i)).toBeVisible();

      // Retry button should be present
      const retryButton = page.getByRole("button", { name: /spróbuj ponownie/i });
      await expect(retryButton).toBeVisible();
    }
  });
});

test.describe("Summary View - History API", () => {
  test("TC-SIDEBAR: Browser back closes sidebar", async ({ page }) => {
    // Setup mocks
    await setupNocoDBMocks(page);
    await loginViaAPI(page, {
      email: "test@example.com",
      password: "Test123!@#",
    });

    await page.goto("/grid");
    const eventCell = page.locator('[data-has-event="true"]').first();

    if ((await eventCell.count()) > 0) {
      // Open sidebar (pushes state to history)
      await eventCell.click();
      await expect(page.locator('[role="dialog"]')).toBeVisible();
      await expect(page).toHaveURL(/eventId=/);

      // Browser back
      await page.goBack();

      // Sidebar should close
      await expect(page.locator('[role="dialog"]')).not.toBeVisible();
      await expect(page).not.toHaveURL(/eventId=/);
    }
  });

  test("TC-SIDEBAR: Browser forward reopens sidebar", async ({ page }) => {
    // Setup mocks
    await setupNocoDBMocks(page);
    await loginViaAPI(page, {
      email: "test@example.com",
      password: "Test123!@#",
    });

    await page.goto("/grid");
    const eventCell = page.locator('[data-has-event="true"]').first();

    if ((await eventCell.count()) > 0) {
      await eventCell.click();
      await expect(page.locator('[role="dialog"]')).toBeVisible();

      // Back
      await page.goBack();
      await expect(page.locator('[role="dialog"]')).not.toBeVisible();

      // Forward
      await page.goForward();

      // Sidebar should reopen
      await expect(page.locator('[role="dialog"]')).toBeVisible();
      await expect(page).toHaveURL(/eventId=/);
    }
  });
});

test.describe("Summary View - Mobile Drawer", () => {
  test.use({
    viewport: { width: 375, height: 667 }, // iPhone SE size
  });

  test("TC-SIDEBAR: Drawer opens from bottom on mobile", async ({ page }) => {
    // Setup mocks
    await setupNocoDBMocks(page);
    await loginViaAPI(page, {
      email: "test@example.com",
      password: "Test123!@#",
    });

    await page.goto("/grid");
    const eventCell = page.locator('[data-has-event="true"]').first();

    if ((await eventCell.count()) > 0) {
      await eventCell.click();

      const drawer = page.locator('[role="dialog"]');
      await expect(drawer).toBeVisible();

      // Check it's positioned at bottom (height ~70%)
      const drawerBox = await drawer.boundingBox();
      const viewportSize = page.viewportSize();

      if (drawerBox && viewportSize) {
        const heightPercentage = (drawerBox.height / viewportSize.height) * 100;
        expect(heightPercentage).toBeGreaterThan(60);
        expect(heightPercentage).toBeLessThan(80);
      }
    }
  });
});
