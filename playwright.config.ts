import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

/**
 * Playwright Configuration
 * E2E tests for Black Swan Grid (GPW)
 * Per test-plan.md section 6.1
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Allow parallel execution across projects
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ["html", { outputFolder: "playwright-report" }],
    ["json", { outputFile: "playwright-report/results.json" }],
    ["list"],
  ],
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  // Start preview server before running tests
  // NOTE: Due to timing issues with webServer in this environment,
  // you may need to start the preview server manually before running tests:
  // npm run preview (in a separate terminal)
  webServer: process.env.CI
    ? {
        command: "npm run preview",
        port: 3000,
        timeout: 120 * 1000,
        reuseExistingServer: false,
      }
    : undefined,

  projects: [
    // Project 1: Tests using test@example.com (runs serially within project)
    {
      name: "active-user",
      testMatch: /auth\.spec\.ts|grid\.spec\.ts|sidebar\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
      },
      // Run tests serially within this project to avoid user conflicts
      fullyParallel: false,
    },
    // Project 2: Tests using expired@example.com (runs serially, parallel to Project 1)
    {
      name: "expired-user",
      testMatch: /checkout\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
      },
      fullyParallel: false,
    },
    // Uncomment for cross-browser testing
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],
});
