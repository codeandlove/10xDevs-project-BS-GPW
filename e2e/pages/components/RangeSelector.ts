/**
 * Range Selector Component
 * Handles week/month/quarter selection
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

  private getButton(range: RangeType) {
    return this.page.getByRole("button", { name: RANGE_LABELS[range] });
  }

  /**
   * Select range (week, month, quarter)
   */
  async selectRange(range: RangeType): Promise<void> {
    await this.getButton(range).click();
    await this.verifyRangeSelected(range);
  }

  /**
   * Verify that range is selected
   */
  async verifyRangeSelected(range: RangeType): Promise<void> {
    await expect(this.getButton(range)).toHaveAttribute("aria-pressed", "true");
  }

  /**
   * Get currently selected range
   */
  async getSelectedRange(): Promise<RangeType | null> {
    for (const range of Object.keys(RANGE_LABELS)) {
      const button = this.getButton(range as RangeType);
      const isPressed = await button.getAttribute("aria-pressed");
      if (isPressed === "true") {
        return range as RangeType;
      }
    }
    return null;
  }
}
