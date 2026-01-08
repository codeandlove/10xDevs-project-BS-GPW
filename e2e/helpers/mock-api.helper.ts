/**
 * Helper for mocking API responses in E2E tests
 */

import { Page } from "@playwright/test";
import { mockGridData, mockEventDetails, mockSummaries } from "../fixtures/grid-data.fixture";

/**
 * Mock grid API to return test data
 */
export async function mockGridAPI(page: Page) {
  await page.route("**/api/nocodb/grid*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: mockGridData,
        timestamp: new Date().toISOString(),
      }),
    });
  });
}

/**
 * Mock event details API
 */
export async function mockEventDetailsAPI(page: Page, eventId: string = "rec_test_001") {
  await page.route(`**/api/nocodb/events/${eventId}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: mockEventDetails,
        timestamp: new Date().toISOString(),
      }),
    });
  });
}

/**
 * Mock summaries API
 */
export async function mockSummariesAPI(page: Page) {
  await page.route("**/api/nocodb/summaries*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: { summaries: mockSummaries },
        timestamp: new Date().toISOString(),
      }),
    });
  });
}

/**
 * Mock all APIs needed for grid tests
 */
export async function mockAllGridAPIs(page: Page) {
  await mockGridAPI(page);
  await mockEventDetailsAPI(page);
  await mockSummariesAPI(page);
}
