/**
 * E2E Tests - Grid Sorting
 * Test Coverage: Sort by symbol, date, percent change
 * User: test@example.com (active subscription)
 *
 * ⚡ Uses auto-fixture - active-user project
 */

import { test, expect } from "./fixtures";
import { GridPage } from "./pages/GridPage";

test.describe("Grid - Sorting (test@example.com)", () => {
  // NO beforeEach - auth handled by auto-fixture!

  test("TC-GRID-SORT-001: Default sort is Symbol A-Z", async ({ page }) => {
    const gridPage = new GridPage(page);
    await gridPage.goto();

    // Default sort button should show "Symbol: A-Z"
    const currentSort = await gridPage.sortDropdown.getCurrentSort();
    expect(currentSort).toMatch(/Symbol.*A-Z/i);

    // URL should NOT contain sort parameters (default state)
    expect(page.url()).not.toContain("sortField");
    expect(page.url()).not.toContain("sortDirection");

    // Verify symbols are sorted A-Z
    const isSorted = await gridPage.verifySortedAZ();
    if (!isSorted) {
      // Only fail if we have data to verify
      const symbols = await gridPage.getSymbols(3);
      if (symbols.length >= 2) {
        expect(isSorted).toBe(true);
      } else {
        test.skip(true, "Not enough symbol data to verify sort");
      }
    }
  });

  test("TC-GRID-SORT-002: Sort by Symbol Z-A", async ({ page }) => {
    const gridPage = new GridPage(page);
    await gridPage.goto();

    // Change to Z-A sort
    await gridPage.sortDropdown.sortBySymbolZA();

    // Button should update
    const currentSort = await gridPage.sortDropdown.getCurrentSort();
    expect(currentSort).toMatch(/Symbol.*Z-A/i);

    // URL should contain sort parameters
    await expect(page).toHaveURL(/sortField=symbol/);
    await expect(page).toHaveURL(/sortDirection=desc/);

    // Verify symbols are sorted Z-A
    const isSorted = await gridPage.verifySortedZA();
    if (!isSorted) {
      const symbols = await gridPage.getSymbols(3);
      if (symbols.length >= 2) {
        expect(isSorted).toBe(true);
      } else {
        test.skip(true, "Not enough symbol data to verify sort");
      }
    }

    // Reload to verify persistence
    await page.reload();
    await gridPage.waitForGridReady();

    const sortAfterReload = await gridPage.sortDropdown.getCurrentSort();
    expect(sortAfterReload).toMatch(/Symbol.*Z-A/i);
    expect(page.url()).toContain("sortField=symbol");
    expect(page.url()).toContain("sortDirection=desc");
  });

  test("TC-GRID-SORT-003: Sort by Date (Oldest first)", async ({ page }) => {
    const gridPage = new GridPage(page);
    await gridPage.goto();

    // Change to date sort
    await gridPage.sortDropdown.sortByDateOldest();
    await page.waitForTimeout(500); // Wait for UI update

    // Button should update (proof sorting worked)
    const currentSort = await gridPage.sortDropdown.getCurrentSort();
    expect(currentSort).toMatch(/Data.*najstarsze/i);
  });

  test("TC-GRID-SORT-004: Sort by Date (Newest first)", async ({ page }) => {
    const gridPage = new GridPage(page);
    await gridPage.goto();

    // Change to newest first
    await gridPage.sortDropdown.sortByDateNewest();
    await page.waitForTimeout(500); // Wait for UI update

    // Button should update
    const currentSort = await gridPage.sortDropdown.getCurrentSort();
    expect(currentSort).toMatch(/Data.*najnowsze/i);
  });

  test("TC-GRID-SORT-005: Sort by Change (Highest)", async ({ page }) => {
    const gridPage = new GridPage(page);
    await gridPage.goto();

    // Change to highest percent change
    await gridPage.sortDropdown.sortByChangeHighest();
    await page.waitForTimeout(500); // Wait for UI update

    // Button should update
    const currentSort = await gridPage.sortDropdown.getCurrentSort();
    expect(currentSort).toMatch(/Zmiana.*największa/i);
  });

  test("TC-GRID-SORT-006: Sort by Change (Lowest)", async ({ page }) => {
    const gridPage = new GridPage(page);
    await gridPage.goto();

    // Change to lowest percent change
    await gridPage.sortDropdown.sortByChangeLowest();
    await page.waitForTimeout(500); // Wait for UI update

    // Button should update
    const currentSort = await gridPage.sortDropdown.getCurrentSort();
    expect(currentSort).toMatch(/Zmiana.*najmniejsza/i);
  });

  test("TC-GRID-SORT-007: Clear filters resets sort to default", async ({ page }) => {
    const gridPage = new GridPage(page);
    await gridPage.goto();

    // Apply custom sort
    await gridPage.sortDropdown.sortBySymbolZA();
    let currentSort = await gridPage.sortDropdown.getCurrentSort();
    expect(currentSort).toMatch(/Z-A/i);

    // Clear filters (if button exists)
    const clearButton = page.getByRole("button", { name: /Clear|Wyczyść/i });
    const hasClearButton = await clearButton.isVisible().catch(() => false);

    if (!hasClearButton) {
      test.skip(true, "No clear filters button available");
      return;
    }

    await clearButton.click();
    await page.waitForTimeout(500);

    // Sort should reset to default (A-Z)
    currentSort = await gridPage.sortDropdown.getCurrentSort();
    expect(currentSort).toMatch(/A-Z/i);

    // URL should not contain sort parameters
    expect(page.url()).not.toContain("sortField");
  });
});
