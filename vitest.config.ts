import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  // @ts-expect-error - Type mismatch between Vite versions in Vitest and plugins
  plugins: [react(), tsconfigPaths()],
  test: {
    globals: true,
    environment: "happy-dom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", "dist", ".astro", "e2e"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      exclude: [
        "node_modules/",
        "src/test/",
        "**/*.d.ts",
        "**/*.config.*",
        "**/mockData",
        "dist",
        ".astro",
        // Exclude files tested by E2E (Playwright)
        "src/pages/**", // Astro pages and API endpoints
        "src/components/**", // React components
        "src/layouts/**", // Astro layouts
        "src/contexts/**", // React contexts (require browser environment)
        "src/hooks/**", // React hooks (require browser environment)
        "src/middleware/**", // Astro middleware
        "e2e/**", // E2E tests themselves
      ],
      all: true,
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },
    mockReset: true,
    restoreMocks: true,
    clearMocks: true,
  },
  resolve: {
    alias: {
      "@": "/src",
    },
  },
});
