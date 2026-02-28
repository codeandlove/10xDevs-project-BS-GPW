/**
 * Helper to mock NocoDB API responses in E2E tests
 * This ensures grid renders with test data
 */

import type { Page } from "@playwright/test";
import { mockGridResponse, mockEventDetailsResponse, mockSummariesResponse } from "../fixtures/nocodb-mock.fixture";

/**
 * Setup all NocoDB API mocks for grid tests
 */
export async function setupNocoDBMocks(page: Page) {
  // NOTE: Symbols endpoint NOT mocked - uses real API
  // This is intentional - symbols come from real NocoDB API
  // await page.route("**/api/nocodb/symbols**", async (route) => {
  //   await route.fulfill({
  //     status: 200,
  //     contentType: "application/json",
  //     body: JSON.stringify(mockSymbolsResponse),
  //   });
  // });

  // Mock grid data endpoint
  await page.route("**/api/nocodb/grid**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(mockGridResponse),
    });
  });

  // Mock event details endpoint
  await page.route("**/api/nocodb/events/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(mockEventDetailsResponse),
    });
  });

  // Mock summaries endpoint
  await page.route("**/api/nocodb/summaries**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(mockSummariesResponse),
    });
  });
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
export async function setupErrorGridMock(page: Page, statusCode = 500) {
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
