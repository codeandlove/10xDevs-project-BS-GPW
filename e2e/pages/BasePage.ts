/**
 * Base Page Object
 * All page objects inherit from this class
 */

import { type Page, type Locator } from "@playwright/test";

export abstract class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigate to page - implement in subclass
   */
  abstract goto(): Promise<void>;

  /**
   * Check if element is visible
   */
  async isVisible(locator: Locator, timeout = 5000): Promise<boolean> {
    try {
      await locator.waitFor({ state: "visible", timeout });
      return true;
    } catch {
      return false;
    }
  }
}
