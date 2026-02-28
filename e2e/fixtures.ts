/**
 * Playwright Test Fixtures
 * Provides authenticated page contexts for different user types
 */

import { test as base, expect } from "@playwright/test";
import { loginViaAPI } from "./helpers/auth.helper";
import { setupNocoDBMocks } from "./helpers/mock-nocodb.helper";

// Define fixture types - using undefined since fixture doesn't provide value
interface AuthenticatedPageFixtures {
  authenticatedPage: undefined;
}

// Extend base test with authenticated page fixture
export const test = base.extend<AuthenticatedPageFixtures>({
  /**
   * Authenticated page fixture
   * Automatically logs in based on project configuration
   */
  authenticatedPage: [
    async ({ page }, use, testInfo) => {
      // Setup API mocks
      await setupNocoDBMocks(page);

      // Determine which user based on project name
      const projectName = testInfo.project.name;

      let credentials = { email: "test@example.com", password: "Test123!@#" };

      if (projectName === "expired-user") {
        credentials = { email: "expired@example.com", password: "Test123!@#" };
      } else if (projectName === "trial-user") {
        credentials = { email: "trial@example.com", password: "Test123!@#" };
      } else if (projectName === "auth-tests") {
        // Auth tests don't need automatic login
        await use(undefined);
        return;
      }

      // Login via API
      await loginViaAPI(page, credentials);

      // Use the authenticated page
      await use(undefined);
    },
    { auto: true },
  ], // Auto-run for every test
});

export { expect };
