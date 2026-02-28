/**
 * Ticker Filter Component
 * Handles ticker filtering dialog with search and multi-select
 */

import { type Page, type Locator, expect } from "@playwright/test";

export class TickerFilter {
  private readonly openButton: Locator;
  private readonly dialog: Locator;
  private readonly searchInput: Locator;
  private readonly applyButton: Locator;

  constructor(private page: Page) {
    // Match exact selector from old working tests
    // aria-label="Filter by ticker" OR visible text "Tickery"
    this.openButton = page.getByRole("button", { name: /Filter by ticker|Tickery/i });
    this.dialog = page.getByRole("dialog");
    this.searchInput = this.dialog.getByPlaceholder(/Szukaj po symbolu/i);
    this.applyButton = this.dialog.getByRole("button", { name: /zastosuj|apply/i });
  }

  /**
   * Open filter dialog
   */
  async open(): Promise<void> {
    // Wait for button to be ready
    await this.openButton.waitFor({ state: "visible", timeout: 5000 });
    await this.openButton.click();
    await expect(this.dialog).toBeVisible({ timeout: 5000 });

    // Wait for search input to be enabled (symbols loaded from real API)
    // Increased timeout for real API call (not mocked)
    await expect(this.searchInput).toBeEnabled({ timeout: 30000 });
  }

  /**
   * Search for ticker symbol
   */
  async search(query: string): Promise<void> {
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(500); // Wait for search results
  }

  /**
   * Clear search input
   */
  async clearSearch(): Promise<void> {
    await this.searchInput.clear();
    await this.page.waitForTimeout(300);
  }

  /**
   * Select ticker by symbol (with search)
   */
  async selectTicker(symbol: string): Promise<void> {
    await this.search(symbol);
    const checkbox = this.page.locator(`#ticker-${symbol}`).first();
    await checkbox.check();
    await this.page.waitForTimeout(200);
  }

  /**
   * Deselect ticker by symbol (with search)
   */
  async deselectTicker(symbol: string): Promise<void> {
    await this.search(symbol);
    const checkbox = this.page.locator(`#ticker-${symbol}`).first();
    await checkbox.uncheck();
    await this.page.waitForTimeout(200);
  }

  /**
   * Select multiple tickers (searches for each)
   */
  async selectTickers(symbols: string[]): Promise<void> {
    for (const symbol of symbols) {
      await this.selectTicker(symbol);
      await this.clearSearch();
    }
  }

  /**
   * Deselect multiple tickers (searches for each)
   */
  async deselectTickers(symbols: string[]): Promise<void> {
    for (const symbol of symbols) {
      await this.deselectTicker(symbol);
      await this.clearSearch();
    }
  }

  /**
   * Deselect all tickers using "Odznacz wszystkie" button
   */
  async deselectAll(): Promise<void> {
    const deselectAllButton = this.dialog.getByRole("button", { name: /Odznacz wszystkie/i });
    await deselectAllButton.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Replace current filter with new tickers
   * @param currentTickers - Currently selected tickers to uncheck
   * @param newTickers - New tickers to select
   */
  async replaceFilter(currentTickers: string[], newTickers: string[]): Promise<void> {
    await this.deselectTickers(currentTickers);
    await this.selectTickers(newTickers);
  }

  /**
   * Get apply button text (shows selected count)
   */
  async getApplyButtonText(): Promise<string> {
    const text = await this.applyButton.textContent();
    return text?.trim() || "";
  }

  /**
   * Get selected ticker count from apply button
   * E.g., "Zastosuj (3)" returns 3
   */
  async getSelectedCount(): Promise<number> {
    const text = await this.getApplyButtonText();
    const match = text.match(/\((\d+)\)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Apply filters and close dialog
   */
  async apply(): Promise<void> {
    // Scroll button into view (important for mobile/bottom sheet)
    await this.applyButton.scrollIntoViewIfNeeded();

    // Use JavaScript click to bypass viewport restrictions
    await this.applyButton.evaluate((el) => (el as HTMLElement).click());

    await expect(this.dialog).not.toBeVisible({ timeout: 5000 });
  }

  /**
   * Get badge count from filter button (shows currently applied filters)
   */
  async getBadgeCount(): Promise<string | null> {
    const badgeText = await this.openButton.textContent();
    const match = badgeText?.match(/\d+/);
    return match ? match[0] : null;
  }

  /**
   * Close dialog without applying (ESC key)
   */
  async cancel(): Promise<void> {
    await this.page.keyboard.press("Escape");
    await expect(this.dialog).not.toBeVisible({ timeout: 2000 });
  }
}
