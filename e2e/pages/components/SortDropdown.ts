/**
 * Page Object - Sort Dropdown Component
 * Handles sorting controls in Grid view
 */

import { type Page, type Locator } from "@playwright/test";

export class SortDropdown {
  readonly page: Page;
  readonly sortButton: Locator;

  constructor(page: Page) {
    this.page = page;
    // Find sort button by adjacent listbox (more stable than text-based locator)
    // Sort button is followed by listbox with role="listbox"
    this.sortButton = page
      .locator("button")
      .filter({ has: page.locator('+ [role="listbox"]') })
      .or(page.locator('button:has-text("Symbol:"), button:has-text("Data:"), button:has-text("Zmiana:")'));
  }

  /**
   * Open sort dropdown
   */
  async open() {
    await this.sortButton.click();
  }

  /**
   * Select sort option by name
   * @param optionName - e.g., "Symbol: Z-A", "Date: Oldest first"
   */
  async selectOption(optionName: string) {
    await this.open();
    const option = this.page.getByRole("option", { name: new RegExp(optionName, "i") });
    await option.click();
  }

  /**
   * Get current sort text from button
   */
  async getCurrentSort(): Promise<string> {
    const text = await this.sortButton.textContent();
    return text?.trim() || "";
  }

  /**
   * Sort by symbol A-Z (default)
   */
  async sortBySymbolAZ() {
    await this.selectOption("Symbol: A-Z");
  }

  /**
   * Sort by symbol Z-A
   */
  async sortBySymbolZA() {
    await this.selectOption("Symbol: Z-A");
  }

  /**
   * Sort by date (oldest first) - "Data: najstarsze"
   */
  async sortByDateOldest() {
    await this.selectOption("Data: najstarsze");
  }

  /**
   * Sort by date (newest first) - "Data: najnowsze"
   */
  async sortByDateNewest() {
    await this.selectOption("Data: najnowsze");
  }

  /**
   * Sort by percent change (highest) - "Zmiana: największa"
   */
  async sortByChangeHighest() {
    await this.selectOption("Zmiana: największa");
  }

  /**
   * Sort by percent change (lowest) - "Zmiana: najmniejsza"
   */
  async sortByChangeLowest() {
    await this.selectOption("Zmiana: najmniejsza");
  }
}
