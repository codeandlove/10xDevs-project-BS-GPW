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

  // 4 workers locally for speed, 2 in CI for stability
  workers: process.env.CI ? 2 : 4,

  // NO global setup - using fixtures instead for auth

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

  webServer: process.env.CI
    ? {
        command: "npm run preview",
        port: 3000,
        timeout: 120 * 1000,
        reuseExistingServer: false,
      }
    : undefined,

  projects: [
    // Active user tests - test@example.com
    // ⚡ Uses auto-fixture for authentication
    {
      name: "active-user",
      testMatch: /grid-rendering|grid-filtering|grid-sorting|grid-layout|grid-errors|grid-keyboard|sidebar|minimap/,
      use: {
        ...devices["Desktop Chrome"],
        // NO storageState - using fixtures
      },
      fullyParallel: true,
    },

    // Expired user tests - expired@example.com
    // ⚡ Uses auto-fixture for authentication
    {
      name: "expired-user",
      testMatch: /grid-expired|grid-paywall|grid-pastdue|checkout/,
      use: {
        ...devices["Desktop Chrome"],
        // NO storageState - using fixtures
      },
      fullyParallel: true,
    },

    // Trial user tests - trial@example.com
    // ⚡ Uses auto-fixture for authentication
    {
      name: "trial-user",
      testMatch: /grid-trial/,
      use: {
        ...devices["Desktop Chrome"],
        // NO storageState - using fixtures
      },
      fullyParallel: true,
    },

    // Auth tests - NO auto-login
    // 🔓 These tests manually control authentication
    {
      name: "auth-tests",
      testMatch: /auth\.spec/,
      use: {
        ...devices["Desktop Chrome"],
      },
      fullyParallel: true,
    },
  ],
});
