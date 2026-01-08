/**
 * Helper to mock NocoDB API responses in E2E tests
 * This ensures grid renders with test data
 */

import { Page } from "@playwright/test";
import { mockGridResponse, mockEventDetailsResponse, mockSummariesResponse } from "../fixtures/nocodb-mock.fixture";

/**
 * Setup all NocoDB API mocks for grid tests
 */
export async function setupNocoDBMocks(page: Page) {
  console.log("Setting up NocoDB API mocks...");

  // Mock grid data endpoint
  await page.route("**/api/nocodb/grid**", async (route) => {
    console.log("Intercepted grid API call:", route.request().url());
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(mockGridResponse),
    });
  });

  // Mock event details endpoint
  await page.route("**/api/nocodb/events/**", async (route) => {
    console.log("Intercepted event details API call:", route.request().url());
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(mockEventDetailsResponse),
    });
  });

  // Mock summaries endpoint
  await page.route("**/api/nocodb/summaries**", async (route) => {
    console.log("Intercepted summaries API call:", route.request().url());
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(mockSummariesResponse),
    });
  });

  console.log("NocoDB API mocks configured successfully");
}

/**
 * Setup mock with empty grid data (for empty state tests)
 */
export async function setupEmptyGridMock(page: Page) {
  await page.route("**/api/nocodb/grid**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          events: [],
          metadata: {
            range: "week",
            symbols: [],
            totalEvents: 0,
          },
        },
        timestamp: new Date().toISOString(),
      }),
    });
  });
}

/**
 * Setup mock that returns error (for error handling tests)
 */
export async function setupErrorGridMock(page: Page, statusCode: number = 500) {
  await page.route("**/api/nocodb/grid**", async (route) => {
    await route.fulfill({
      status: statusCode,
      contentType: "application/json",
      body: JSON.stringify({
        success: false,
        error: {
          message: "Internal server error",
          code: "INTERNAL_ERROR",
        },
      }),
    });
  });
}
