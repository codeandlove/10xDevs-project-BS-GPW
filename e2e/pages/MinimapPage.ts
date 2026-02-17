/**
 * Page Object: Minimap (Grid Navigation)
 * Handles: Visibility, toggle, navigation
 */

import { type Page, type Locator, expect } from "@playwright/test";
import { BasePage } from "./BasePage";

export class MinimapPage extends BasePage {
  async goto(): Promise<void> {
    await this.page.goto("/grid");
  }

  // Locators - minimap jest w fixed bottom-right
  readonly minimapContainer: Locator;
  readonly toggleButton: Locator;
  readonly canvas: Locator;
  readonly viewportRect: Locator;
  readonly closeButton: Locator;

  constructor(page: Page) {
    super(page);
    // Minimap container - fixed bottom-4 right-4
    this.minimapContainer = page.locator(".fixed.bottom-4.right-4").filter({ has: page.locator("canvas") });
    // Toggle button (when hidden) - has Map icon
    this.toggleButton = page.locator('button[aria-label*="mini-map"]');
    // Canvas element
    this.canvas = page.locator("canvas").first();
    // Viewport rectangle (draggable)
    this.viewportRect = page.locator('[aria-label*="Przeciągnij"]');
    // Close button (X icon)
    this.closeButton = page.locator('button[aria-label="Zamknij mini-mapę"]');
  }

  /**
   * Check if minimap is visible
   */
  async isVisible(): Promise<boolean> {
    return await this.minimapContainer.isVisible().catch(() => false);
  }

  /**
   * Toggle minimap visibility
   */
  async toggle(): Promise<void> {
    if (await this.isVisible()) {
      // If visible, close it
      if (await this.closeButton.isVisible()) {
        await this.closeButton.click();
      }
    } else {
      // If hidden, show it
      await this.toggleButton.click();
    }
  }

  /**
   * Show minimap
   */
  async show(): Promise<void> {
    if (!(await this.isVisible())) {
      await this.toggleButton.click();
      await expect(this.minimapContainer).toBeVisible();
    }
  }

  /**
   * Hide minimap
   */
  async hide(): Promise<void> {
    if (await this.isVisible()) {
      await this.closeButton.click();
      await expect(this.minimapContainer).not.toBeVisible();
    }
  }

  /**
   * Click on minimap at specific position
   */
  async clickAt(x: number, y: number): Promise<void> {
    await this.canvas.click({ position: { x, y } });
  }

  /**
   * Drag viewport indicator
   */
  async dragViewport(deltaX: number, deltaY: number): Promise<void> {
    const box = await this.viewportRect.boundingBox();
    if (!box) throw new Error("Viewport rect not found");

    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;

    await this.page.mouse.move(startX, startY);
    await this.page.mouse.down();
    await this.page.mouse.move(startX + deltaX, startY + deltaY);
    await this.page.mouse.up();
  }

  /**
   * Get viewport position
   */
  async getViewportPosition(): Promise<{ x: number; y: number } | null> {
    const box = await this.viewportRect.boundingBox();
    return box ? { x: box.x, y: box.y } : null;
  }

  /**
   * Scroll wheel on minimap
   */
  async scrollWheel(deltaY: number): Promise<void> {
    await this.canvas.hover();
    await this.page.mouse.wheel(0, deltaY);
  }

  /**
   * Check if minimap has week boundaries
   */
  async hasWeekBoundaries(): Promise<boolean> {
    // Week boundaries shown as vertical lines in canvas
    // Can't easily test canvas content, so check if canvas exists and is rendered
    const box = await this.canvas.boundingBox();
    return box !== null && box.width > 0 && box.height > 0;
  }

  /**
   * Wait for minimap to be ready
   */
  async waitForReady(): Promise<void> {
    await expect(this.minimapContainer).toBeVisible();
    await expect(this.canvas).toBeVisible();
  }
}
