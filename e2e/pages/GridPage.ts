/**
 * Grid Page Object
 * Represents the /grid page with all its interactions
 */

import { type Page, type Locator, expect } from "@playwright/test";
import { BasePage } from "./BasePage";
import { RangeSelector } from "./components/RangeSelector";
import { TickerFilter } from "./components/TickerFilter";
import { SortDropdown } from "./components/SortDropdown";

export class GridPage extends BasePage {
  // Sub-components
  readonly rangeSelector: RangeSelector;
  readonly tickerFilter: TickerFilter;
  readonly sortDropdown: SortDropdown;

  // Main grid elements
  private readonly grid: Locator;
  private readonly gridCells: Locator;
  private readonly headerCells: Locator;
  private readonly rows: Locator;
  private readonly skeleton: Locator;
  private readonly emptyState: Locator;

  constructor(page: Page) {
    super(page);
    this.rangeSelector = new RangeSelector(page);
    this.tickerFilter = new TickerFilter(page);
    this.sortDropdown = new SortDropdown(page);

    this.grid = page.locator('[role="grid"]');
    this.gridCells = page.locator('[role="gridcell"]');
    this.headerCells = page.locator('[role="columnheader"]');
    this.rows = page.locator('[role="row"]');
    this.skeleton = page.locator('[data-testid="grid-skeleton"]');
    this.emptyState = page.getByText(/Brak zdarzeń/i);
  }

  async goto(): Promise<void> {
    await this.page.goto("/grid");
    await this.waitForGridReady();
  }

  /**
   * Wait for grid to be fully loaded
   */
  async waitForGridReady(timeout = 10000): Promise<void> {
    await expect(this.grid).toBeVisible({ timeout });
  }

  /**
   * Check if grid is visible
   */
  async isGridVisible(): Promise<boolean> {
    return this.isVisible(this.grid);
  }

  /**
   * Check if skeleton loader is visible
   */
  async isLoadingSkeletonVisible(): Promise<boolean> {
    return this.isVisible(this.skeleton, 100);
  }

  /**
   * Check if empty state is shown
   */
  async isEmptyState(): Promise<boolean> {
    return this.isVisible(this.emptyState);
  }

  /**
   * Get all event cells
   */
  getEventCells(): Locator {
    return this.page.locator('[data-has-event="true"]');
  }

  /**
   * Get grid headers
   */
  async getHeaders(): Promise<string[]> {
    return this.headerCells.allTextContents();
  }

  /**
   * Get row count
   */
  async getRowCount(): Promise<number> {
    return this.rows.count();
  }

  /**
   * Check if grid has data
   */
  async hasData(): Promise<boolean> {
    const count = await this.gridCells.count();
    return count > 0;
  }

  /**
   * Measure grid load time
   */
  async measureLoadTime(): Promise<number> {
    const startTime = Date.now();
    await this.waitForGridReady();
    return Date.now() - startTime;
  }

  /**
   * Get all symbol cells (first column)
   * Returns locator for symbols in all rows
   */
  getSymbolCells(): Locator {
    return this.rows.locator(".sticky.left-0 span").first();
  }

  /**
   * Get symbols from all rows (skipping header)
   * @param limit - Maximum number of symbols to retrieve (default: 5)
   */
  async getSymbols(limit = 5): Promise<string[]> {
    const symbols: string[] = [];
    const rowCount = await this.rows.count();

    // Start at 1 to skip header row
    for (let i = 1; i < Math.min(rowCount, limit + 1); i++) {
      const row = this.rows.nth(i);
      const symbolCell = row.locator(".sticky.left-0 span").first();
      const text = await symbolCell.textContent();
      if (text) {
        symbols.push(text.trim());
      }
    }

    return symbols;
  }

  /**
   * Verify symbols are sorted alphabetically (A-Z)
   */
  async verifySortedAZ(): Promise<boolean> {
    const symbols = await this.getSymbols(3);
    if (symbols.length < 2) return true; // Not enough data to verify

    for (let i = 0; i < symbols.length - 1; i++) {
      if (symbols[i].localeCompare(symbols[i + 1]) > 0) {
        return false; // Not sorted A-Z
      }
    }
    return true;
  }

  /**
   * Verify symbols are sorted reverse alphabetically (Z-A)
   */
  async verifySortedZA(): Promise<boolean> {
    const symbols = await this.getSymbols(3);
    if (symbols.length < 2) return true; // Not enough data to verify

    for (let i = 0; i < symbols.length - 1; i++) {
      if (symbols[i].localeCompare(symbols[i + 1]) < 0) {
        return false; // Not sorted Z-A
      }
    }
    return true;
  }

  /**
   * Click on event cell to open sidebar
   */
  async clickEventCell(index = 0): Promise<void> {
    const cells = this.getEventCells();
    await cells.nth(index).click();
  }
}
