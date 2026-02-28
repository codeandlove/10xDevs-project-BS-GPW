/**
 * Range Selector Component
 * Handles week/month/quarter selection via dropdown
 * Updated to match new DateRangeSelector component
 */

import { type Page, expect } from "@playwright/test";

export type RangeType = "week" | "month" | "quarter";

const RANGE_LABELS: Record<RangeType, string> = {
  week: "Tydzień",
  month: "Miesiąc",
  quarter: "Kwartał",
};

export class RangeSelector {
  constructor(private page: Page) {}

  /**
   * Get the dropdown trigger button
   */
  private getDropdownButton() {
    // Button has Calendar icon and range label, aria-haspopup="menu"
    return this.page.getByRole("button", { name: /Tydzień|Miesiąc|Kwartał|\./ });
  }

  /**
   * Get menu item by range label
   */
  private getMenuItem(range: RangeType) {
    // Get all menuitems and filter to the exact one
    const label = RANGE_LABELS[range];
    return this.page.locator(`[role="menuitem"]:has-text("${label}")`).first();
  }

  /**
   * Select range (week, month, quarter)
   */
  async selectRange(range: RangeType): Promise<void> {
    // Open dropdown
    await this.getDropdownButton().click();

    // Wait a bit for dropdown to animate
    await this.page.waitForTimeout(500);

    // Click menu item directly - Playwright will auto-wait for it to be visible
    await this.getMenuItem(range).click();

    // Wait for selection to apply
    await this.page.waitForTimeout(500);

    // Verify range is selected
    await this.verifyRangeSelected(range);
  }

  /**
   * Verify that range is selected
   * Checks if dropdown button contains the range label
   */
  async verifyRangeSelected(range: RangeType): Promise<void> {
    const button = this.getDropdownButton();
    await expect(button).toContainText(RANGE_LABELS[range]);
  }

  /**
   * Get currently selected range
   * Reads the dropdown button text to determine selection
   */
  async getSelectedRange(): Promise<RangeType | null> {
    const button = this.getDropdownButton();
    const text = await button.textContent();

    if (!text) return null;

    // Check which label is in the button text
    for (const [range, label] of Object.entries(RANGE_LABELS)) {
      if (text.includes(label)) {
        return range as RangeType;
      }
    }

    return null;
  }
}
