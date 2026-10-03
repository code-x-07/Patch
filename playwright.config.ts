import { defineConfig } from "@playwright/test";

/**
 * End-to-end checks. Run against the live site with:
 *   PLAYWRIGHT_BASE_URL=https://<deployment> npx playwright test
 * Defaults to a local production server on port 3200.
 */
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3200";

export default defineConfig({
  testDir: "e2e",
  timeout: 120_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"], ["json", { outputFile: "artifacts/e2e-results.json" }]],
  use: { baseURL, channel: "chrome", trace: "off" },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : { command: "npm run build && npx next start -p 3200", url: baseURL, timeout: 240_000, reuseExistingServer: true },
});
