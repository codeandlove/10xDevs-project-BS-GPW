/**
 * Range Selector Component
 * Interacts with the dialog-based DateRangeSelector component.
 * There are no preset buttons (week/month/quarter) — ranges are simulated
 * by filling explicit dates in the date picker dialog.
 */

import { type Page, expect } from "@playwright/test";

export type RangeType = "week" | "month" | "quarter";

const RANGE_DAYS: Record<RangeType, number> = {
  week: 7,
  month: 30,
  quarter: 90,
};

export class RangeSelector {
  constructor(private page: Page) {}

  /**
   * DateRangeSelector button — shows current date range, e.g. "19.02 - 05.03.2026"
   */
  private getButton() {
    return this.page.getByRole("button", { name: /\d{2}\.\d{2}/ });
  }

  /**
   * Public alias for the date range button — used by tests that assert visibility directly.
   */
  getDropdownButton() {
    return this.getButton();
  }

  private formatDate(d: Date): string {
    return d.toISOString().split("T")[0]; // YYYY-MM-DD
  }

  /**
   * Select a named range by computing explicit start/end dates and applying via dialog.
   */
  async selectRange(range: RangeType): Promise<void> {
    const days = RANGE_DAYS[range];
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - days);

    // Open dialog
    await this.getButton().click();
    await this.page.waitForSelector("#custom-from-date", { state: "visible", timeout: 5000 });

    // Fill dates
    await this.page.fill("#custom-from-date", this.formatDate(startDate));
    await this.page.fill("#custom-to-date", this.formatDate(today));

    // Apply
    await this.page.getByRole("button", { name: "Zastosuj" }).click();

    // Wait for dialog to close
    await this.page.waitForSelector("#custom-from-date", { state: "hidden", timeout: 5000 });

    // Wait for button text to update
    await expect(this.getButton()).toBeVisible({ timeout: 3000 });
  }

  /**
   * Get displayed text from the button (e.g. "19.02 - 05.03.2026")
   */
  async getDisplayedText(): Promise<string> {
    return (await this.getButton().textContent()) ?? "";
  }

  /**
   * Infer range type from the displayed date span.
   * Parses "DD.MM - DD.MM.YYYY" and calculates day difference.
   */
  async getSelectedRange(): Promise<RangeType | null> {
    const text = await this.getDisplayedText();
    const match = text.match(/(\d{2})\.(\d{2})\s*-\s*(\d{2})\.(\d{2})\.(\d{4})/);
    if (!match) return null;

    const [, startDay, startMonth, endDay, endMonth, endYear] = match;
    const endYearNum = parseInt(endYear);
    const startMonthNum = parseInt(startMonth);
    const endMonthNum = parseInt(endMonth);

    // Start year: same as end year unless month wraps across year boundary
    const startYearNum = startMonthNum <= endMonthNum ? endYearNum : endYearNum - 1;

    const start = new Date(startYearNum, startMonthNum - 1, parseInt(startDay));
    const end = new Date(endYearNum, endMonthNum - 1, parseInt(endDay));
    const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays <= 10) return "week";
    if (diffDays <= 45) return "month";
    return "quarter";
  }

  /**
   * Verify that a specific range is currently selected.
   */
  async verifyRangeSelected(range: RangeType): Promise<void> {
    const selected = await this.getSelectedRange();
    expect(selected).toBe(range);
  }
}
