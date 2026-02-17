/**
 * Global Setup for Playwright E2E Tests
 *
 * This script runs ONCE before all tests to:
 * 1. Create authenticated sessions for test users
 * 2. Save sessions to .auth/ directory for reuse
 *
 * Each test gets a COPY of the session (isolated browser context)
 * so tests don't interfere with each other.
 *
 * IMPORTANT: Sessions are valid for ~1 hour (Supabase default)
 * If tests run longer, sessions may expire and tests will fail.
 */

/* eslint-disable no-console */

import { chromium, type FullConfig } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";
import { fileURLToPath } from "url";
import { loginViaAPI } from "./helpers/auth.helper.js";
import { setupNocoDBMocks } from "./helpers/mock-nocodb.helper.js";

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function globalSetup(config: FullConfig) {
  console.log("🔐 Global Setup: Creating authenticated sessions...");

  const baseURL = config.projects[0].use.baseURL || "http://localhost:3000";

  // Ensure .auth directory exists
  const authDir = path.join(__dirname, ".auth");
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
    console.log("📁 Created .auth/ directory");
  }

  const browser = await chromium.launch();

  try {
    // ====== Setup Active User (test@example.com) ======
    console.log("👤 Logging in as active user (test@example.com)...");
    await setupUserSession(browser, baseURL, {
      email: "test@example.com",
      password: "Test123!@#",
      filename: "active-user.json",
      authDir,
    });

    // ====== Setup Expired User (expired@example.com) ======
    console.log("👤 Logging in as expired user (expired@example.com)...");
    await setupUserSession(browser, baseURL, {
      email: "expired@example.com",
      password: "Test123!@#",
      filename: "expired-user.json",
      authDir,
    });

    // ====== Setup Trial User (trial@example.com) ======
    console.log("👤 Logging in as trial user (trial@example.com)...");
    await setupUserSession(browser, baseURL, {
      email: "trial@example.com",
      password: "Test123!@#",
      filename: "trial-user.json",
      authDir,
    });

    console.log("✅ Global Setup: All sessions created successfully\n");
  } catch (error) {
    console.error("❌ Global Setup Failed:", error);
    throw error;
  } finally {
    await browser.close();
  }
}

interface SetupOptions {
  email: string;
  password: string;
  filename: string;
  authDir: string;
}

async function setupUserSession(
  browser: Awaited<ReturnType<typeof chromium.launch>>,
  baseURL: string,
  options: SetupOptions
): Promise<void> {
  const { email, password, filename, authDir } = options;

  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();

  try {
    // Setup API mocks BEFORE login
    await setupNocoDBMocks(page);

    // Use our proven loginViaAPI helper
    await loginViaAPI(page, { email, password });

    console.log(`  ✓ Logged in as ${email}`);

    // VALIDATION: Navigate to protected route to verify session
    await page.goto("/grid");
    await page.waitForSelector('[role="grid"]', { timeout: 10000 });

    console.log(`  ✓ Session validated for ${email}`);

    // Save authenticated state
    const statePath = path.join(authDir, filename);
    await context.storageState({ path: statePath });

    console.log(`  ✓ Session saved to .auth/${filename}`);
  } catch (error) {
    console.error(`  ✗ Failed to setup session for ${email}:`, error);
    throw error;
  } finally {
    await context.close();
  }
}

export default globalSetup;
