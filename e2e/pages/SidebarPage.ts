/**
 * Page Object: Sidebar (Event Details)
 * Handles: Opening, closing, navigation, focus management
 */

import { type Page, type Locator, expect } from "@playwright/test";
import { BasePage } from "./BasePage";

export class SidebarPage extends BasePage {
  async goto(): Promise<void> {
    await this.page.goto("/grid");
  }

  // Locators
  readonly dialog: Locator;
  readonly closeButton: Locator;
  readonly title: Locator;
  readonly eventSymbol: Locator;
  readonly eventDate: Locator;
  readonly percentChange: Locator;
  readonly retryButton: Locator;

  constructor(page: Page) {
    super(page);
    this.dialog = page.locator('[role="dialog"]');
    this.closeButton = page.locator('[role="dialog"] [aria-label="Zamknij"]');
    this.title = page.locator("#sidebar-title");
    this.eventSymbol = page.locator('[data-testid="event-symbol"]');
    this.eventDate = page.locator('[data-testid="event-date"]');
    this.percentChange = page.locator('[data-testid="percent-change"]');
    this.retryButton = page.getByRole("button", { name: /spróbuj ponownie/i });
  }

  /**
   * Open sidebar by clicking event cell
   * @param index - Which event cell to click (default: first)
   */
  async openByEventCell(index = 0): Promise<boolean> {
    const eventCell = this.page.locator('[data-has-event="true"]').nth(index);
    const hasEvents = (await eventCell.count()) > 0;

    if (!hasEvents) {
      return false; // No events available
    }

    await eventCell.click();
    await expect(this.dialog).toBeVisible();
    return true;
  }

  /**
   * Close sidebar with ESC key
   */
  async closeWithEsc(): Promise<void> {
    await this.page.keyboard.press("Escape");
    await expect(this.dialog).not.toBeVisible({ timeout: 1000 });
  }

  /**
   * Close sidebar with X button
   */
  async closeWithButton(): Promise<void> {
    await this.closeButton.click();
    await expect(this.dialog).not.toBeVisible();
  }

  /**
   * Close sidebar by clicking overlay
   */
  async closeWithOverlay(): Promise<void> {
    // Click far left (outside sidebar)
    await this.page.click("body", { position: { x: 10, y: 10 } });
    await expect(this.dialog).not.toBeVisible();
  }

  /**
   * Check if sidebar is open
   */
  async isOpen(): Promise<boolean> {
    return await this.dialog.isVisible();
  }

  /**
   * Check if URL has eventId param
   */
  async hasEventIdInUrl(): Promise<boolean> {
    return this.page.url().includes("eventId=");
  }

  /**
   * Get sidebar width percentage
   */
  async getWidthPercentage(): Promise<number> {
    const box = await this.dialog.boundingBox();
    const viewport = this.page.viewportSize();

    if (!box || !viewport) {
      return 0;
    }

    return (box.width / viewport.width) * 100;
  }

  /**
   * Get all focusable elements in sidebar
   */
  async getFocusableElements(): Promise<Locator> {
    return this.dialog.locator('button, a, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  }

  /**
   * Check which element is currently focused
   */
  async getFocusedElement(): Promise<Locator | null> {
    await this.page.evaluateHandle(() => document.activeElement);
    return this.page.locator(":focus");
  }

  /**
   * Wait for sidebar to be visible
   */
  async waitForSidebar(): Promise<void> {
    await expect(this.dialog).toBeVisible();
  }

  /**
   * Check if event details are displayed
   */
  async hasEventDetails(): Promise<boolean> {
    const symbolVisible = await this.eventSymbol.isVisible().catch(() => false);
    const dateVisible = await this.eventDate.isVisible().catch(() => false);
    const changeVisible = await this.percentChange.isVisible().catch(() => false);

    return symbolVisible && dateVisible && changeVisible;
  }

  /**
   * Get event ID from localStorage cache
   */
  async getCachedEventId(eventId: string): Promise<string | null> {
    return await this.page.evaluate((id) => {
      return localStorage.getItem(`gpw:cache:v1:black_swans|id=${id}`);
    }, eventId);
  }

  /**
   * Mock API error for sidebar
   */
  async mockApiError(): Promise<void> {
    await this.page.route("**/api/nocodb/events/*", (route) => {
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          error: { message: "Server error" },
        }),
      });
    });
  }

  /**
   * Check if retry button is visible (error state)
   */
  async hasRetryButton(): Promise<boolean> {
    return await this.retryButton.isVisible();
  }

  /**
   * Check if error message is displayed
   */
  async hasErrorMessage(): Promise<boolean> {
    const errorText = this.page.getByText(/błąd/i);
    return await errorText.isVisible();
  }

  /**
   * Navigate browser back
   */
  async browserBack(): Promise<void> {
    await this.page.goBack();
  }

  /**
   * Navigate browser forward
   */
  async browserForward(): Promise<void> {
    await this.page.goForward();
  }

  /**
   * Check if grid has focus
   */
  async isGridFocused(): Promise<boolean> {
    const grid = this.page.locator('[role="grid"]');
    const focused = await this.page.locator(":focus");
    return await grid.evaluate((el, foc) => el === foc || el.contains(foc), await focused.elementHandle());
  }
}
